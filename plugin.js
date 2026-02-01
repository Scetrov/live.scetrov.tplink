/**
 * TP-Link Smart Control Plugin for Elgato Stream Deck
 * Supports both Kasa and Tapo smart plug devices
 */

const { Client: KasaClient } = require('tplink-smarthome-api');
const { loginDeviceByIp, cloudLogin } = require('tp-link-tapo-connect');
const net = require('net');
const { execSync } = require('child_process');
const os = require('os');

// Stream Deck plugin websocket
let websocket = null;
let pluginUUID = null;
let globalSettings = {}; // Global settings shared across all buttons

// TP-Link MAC address prefixes (OUI)
const TPLINK_MAC_PREFIXES = [
  '40-8d-5c', '40:8d:5c',
  '98-da-c4', '98:da:c4',
  '50-c7-bf', '50:c7:bf',
  'b0-4e-26', 'b0:4e:26',
  '60-a4-b7', '60:a4:b7',
  'a8-42-a1', 'a8:42:a1',
  '3c-6a-9d', '3c:6a:9d',
  'c0-c9-e3', 'c0:c9:e3',
  '5c-e9-31', '5c:e9:31',
  '54-af-97', '54:af:97',
  '1c-3b-f3', '1c:3b:f3',
  'b4-b0-24', 'b4:b0:24',
];

/**
 * DeviceManager - Handles communication with TP-Link devices
 * Supports both Kasa (local API) and Tapo (cloud-based authentication)
 */
class DeviceManager {
  constructor() {
    this.devices = new Map(); // Store device connections by context
    this.kasaClient = new KasaClient();
    this.discoveredDevices = []; // Cache of discovered devices
    this.tapoCloudClient = null; // Tapo cloud connection
    this.cachedDiscoveryResults = null; // Cache discovery results
    this.lastDiscoveryTime = null; // Timestamp of last discovery
  }

  /**
   * Convert netmask to CIDR prefix length
   * @param {string} netmask - Netmask in dotted decimal notation (e.g., '255.255.255.0')
   * @returns {number} - CIDR prefix length (e.g., 24)
   */
  netmaskToCIDR(netmask) {
    const parts = netmask.split('.').map(Number);
    let cidr = 0;
    for (const part of parts) {
      const binary = part.toString(2);
      cidr += (binary.match(/1/g) || []).length;
    }
    return cidr;
  }

  /**
   * Calculate network address from IP and netmask
   * @param {string} ip - IP address
   * @param {string} netmask - Netmask
   * @returns {string} - Network address
   */
  getNetworkAddress(ip, netmask) {
    const ipParts = ip.split('.').map(Number);
    const maskParts = netmask.split('.').map(Number);
    const networkParts = ipParts.map((part, i) => part & maskParts[i]);
    return networkParts.join('.');
  }

  /**
   * Decide whether a network should be scanned by default
   * Skips link-local (169.254.x.x), loopback (127.x.x.x), carrier-NAT (100.64.0.0/10),
   * and any non-private network by default to avoid wasteful scanning.
   * @param {Array<number>} networkParts - [a,b,c,d]
   * @returns {boolean}
   */
  shouldScanNetwork(networkParts) {
    const a = networkParts[0];
    const b = networkParts[1];

    // Skip loopback
    if (a === 127) return false;

    // Skip link-local (APIPA)
    if (a === 169 && b === 254) return false;

    // Skip carrier-grade NAT reserved block 100.64.0.0/10
    if (a === 100 && b >= 64 && b <= 127) return false;

    // Only scan private ranges by default (RFC1918)
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;

    // Otherwise skip non-private networks
    return false;
  }

  /**
   * Get local network subnets from system interfaces with proper CIDR calculation
   * @returns {Array} - Array of subnet prefixes (e.g., ['192.168.1', '10.0.0'])
   */
  getLocalSubnets() {
    const subnets = new Set();
    const interfaces = os.networkInterfaces();
    
    console.log('Detecting network interfaces and calculating CIDR ranges...');
    
    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const cidr = this.netmaskToCIDR(addr.netmask);
          const networkAddr = this.getNetworkAddress(addr.address, addr.netmask);
          
          console.log(`  Interface ${name}: ${addr.address}/${cidr} (network: ${networkAddr})`);
          
          // Calculate all /24 subnets within this CIDR range
          const ipParts = addr.address.split('.').map(Number);
          const maskParts = addr.netmask.split('.').map(Number);
          
          const networkParts = networkAddr.split('.').map(Number);

          // Skip networks that are not useful to scan
          if (!this.shouldScanNetwork(networkParts)) {
            console.log(`    Skipping network ${networkAddr}/${cidr} (non-private or not useful)`);
            continue;
          }

          if (cidr >= 24) {
            // /24 or smaller - just scan this single /24 subnet
            const prefix = ipParts.slice(0, 3).join('.');
            subnets.add(prefix);
            console.log(`    Adding /24 subnet: ${prefix}.x`);
          } else if (cidr >= 16) {
            // Between /16 and /24 - calculate all /24s in the range
            const networkParts = networkAddr.split('.').map(Number);
            const thirdOctetBits = Math.max(0, 24 - cidr);
            const thirdOctetRange = Math.pow(2, thirdOctetBits);
            
            if (cidr === 16) {
              // For /16 networks, scan ALL 256 subnets (devices can be anywhere)
              console.log(`    CIDR /16: scanning all 256 /24 subnets in ${networkParts[0]}.${networkParts[1]}.0.0/16`);
              for (let i = 0; i < 256; i++) {
                const prefix = `${networkParts[0]}.${networkParts[1]}.${i}`;
                subnets.add(prefix);
              }
            } else {
              // For /17 through /23, calculate the exact range
              const thirdOctetStart = networkParts[2];
              console.log(`    CIDR /${cidr}: scanning ${thirdOctetRange} /24 subnets starting at ${thirdOctetStart}`);
              
              for (let i = 0; i < thirdOctetRange && i < 256; i++) {
                const thirdOctet = thirdOctetStart + i;
                if (thirdOctet <= 255) {
                  const prefix = `${networkParts[0]}.${networkParts[1]}.${thirdOctet}`;
                  subnets.add(prefix);
                }
              }
            }
          } else {
            // /15 or larger - too big, use heuristic approach
            // Scan ±32 subnets around the current interface IP
            console.log(`    Large network (/${cidr}): using heuristic ±32 subnets`);
            const base = ipParts[2];
            for (let i = Math.max(0, base - 32); i <= Math.min(255, base + 32); i++) {
              subnets.add(`${ipParts[0]}.${ipParts[1]}.${i}`);
            }
          }
        }
      }
    }
    
    const subnetArray = Array.from(subnets).sort();
    console.log(`Total subnets to scan: ${subnetArray.length}`);
    return subnetArray;
  }

  /**
   * Get ARP table entries with TP-Link MAC addresses
   * @returns {Array} - Array of {ip, mac} for TP-Link devices
   */
  getArpTableTpLinkDevices() {
    const tplinkDevices = [];
    
    try {
      const arpOutput = execSync('arp -a', { encoding: 'utf8', timeout: 5000 });
      const lines = arpOutput.split('\n');
      
      for (const line of lines) {
        // Parse ARP table entries (Windows format: IP  MAC  Type)
        const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f-:]+)/i);
        if (match) {
          const ip = match[1];
          const mac = match[2].toLowerCase();
          
          // Check if MAC belongs to TP-Link
          const isTPLink = TPLINK_MAC_PREFIXES.some(prefix => 
            mac.startsWith(prefix.toLowerCase())
          );
          
          if (isTPLink) {
            tplinkDevices.push({ ip, mac });
            console.log(`ARP: Found TP-Link device at ${ip} (MAC: ${mac})`);
          }
        }
      }
    } catch (error) {
      console.error('Error reading ARP table:', error.message);
    }
    
    return tplinkDevices;
  }

  /**
   * Check if a port is open on a host
   * @param {string} ip - IP address
   * @param {number} port - Port number
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<boolean>}
   */
  checkPort(ip, port, timeout = 500) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(port, ip);
    });
  }

  /**
   * Scan a subnet for TP-Link devices
   * @param {string} subnet - Subnet prefix (e.g., '192.168.1')
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Promise<Array>} - Array of found devices
   */
  async scanSubnetForTpLink(subnet, progressCallback) {
    const found = [];
    const batchSize = 50;
    
    for (let batch = 0; batch < 6; batch++) {
      const start = batch * batchSize + 1;
      const end = Math.min((batch + 1) * batchSize, 254);
      
      const promises = [];
      for (let i = start; i <= end; i++) {
        const ip = `${subnet}.${i}`;
        promises.push(
          Promise.all([
            this.checkPort(ip, 80, 300),   // Tapo
            this.checkPort(ip, 9999, 300)  // Kasa
          ]).then(([port80, port9999]) => {
            if (port80 || port9999) {
              return { 
                ip, 
                tapoPort: port80, 
                kasaPort: port9999,
                type: port9999 ? 'kasa' : 'tapo'
              };
            }
            return null;
          })
        );
      }
      
      const results = await Promise.all(promises);
      results.filter(r => r !== null).forEach(r => found.push(r));
      
      if (progressCallback) {
        progressCallback(Math.round(((batch + 1) / 6) * 100));
      }
    }
    
    return found;
  }

  /**
   * Verify a Tapo device by attempting to connect
   * @param {string} ip - Device IP
   * @param {string} username - Tapo username
   * @param {string} password - Tapo password
   * @returns {Promise<object|null>} - Device info or null
   */
  async verifyTapoDevice(ip, username, password) {
    try {
      const device = await loginDeviceByIp(username, password, ip);
      const info = await device.getDeviceInfo();
      return {
        name: info.nickname || info.alias || 'Tapo Device',
        model: info.model || 'Unknown',
        ip: ip,
        type: 'tapo',
        deviceId: info.device_id || info.deviceId,
        verified: true
      };
    } catch (error) {
      console.log(`Could not verify Tapo device at ${ip}: ${error.message}`);
      return null;
    }
  }

  /**
   * Unified device discovery - combines all methods
   * @param {string} username - TP-Link username (for Tapo)
   * @param {string} password - TP-Link password (for Tapo)
   * @param {Function} progressCallback - Progress callback
   * @returns {Promise<object>} - { kasa: [], tapo: [], unverified: [] }
   */
  async discoverAllDevices(username, password, progressCallback) {
    const results = {
      kasa: [],
      tapo: [],
      unverified: []
    };
    
    const sendProgress = (stage, percent, message) => {
      if (progressCallback) {
        progressCallback({ stage, percent, message });
      }
      console.log(`[Discovery] ${stage}: ${message} (${percent}%)`);
    };

    try {
      // Stage 1: Kasa UDP Discovery (0-25%)
      sendProgress('kasa', 0, 'Starting Kasa discovery...');
      results.kasa = await this.discoverDevices();
      sendProgress('kasa', 25, `Found ${results.kasa.length} Kasa device(s)`);

      // Stage 2: Check ARP table for TP-Link devices (25-30%)
      sendProgress('arp', 25, 'Checking ARP table for TP-Link devices...');
      const arpDevices = this.getArpTableTpLinkDevices();
      sendProgress('arp', 30, `Found ${arpDevices.length} TP-Link MAC(s) in ARP table`);

      // Stage 3: Network scan for devices with open ports (30-60%)
      sendProgress('scan', 30, 'Scanning network for TP-Link devices...');
      const subnets = this.getLocalSubnets();
      let allScannedDevices = [];
      
      for (let i = 0; i < subnets.length; i++) {
        const subnet = subnets[i];
        sendProgress('scan', 30 + Math.round((i / subnets.length) * 30), `Scanning ${subnet}.x...`);
        const found = await this.scanSubnetForTpLink(subnet);
        allScannedDevices = allScannedDevices.concat(found);
      }
      sendProgress('scan', 60, `Found ${allScannedDevices.length} device(s) with TP-Link ports`);

      // Stage 4: Get Tapo devices from cloud (60-70%)
      let cloudDevices = [];
      if (username && password) {
        sendProgress('cloud', 60, 'Logging into TP-Link cloud...');
        try {
          this.tapoCloudClient = await cloudLogin(username, password);
          const deviceList = await this.tapoCloudClient.listDevicesByType('SMART.TAPOPLUG');
          cloudDevices = deviceList.map(d => ({
            name: d.alias || d.deviceName || 'Unknown',
            deviceId: d.deviceId,
            mac: d.deviceMac,
            model: d.deviceModel || d.deviceType
          }));
          sendProgress('cloud', 70, `Found ${cloudDevices.length} device(s) in cloud account`);
        } catch (error) {
          sendProgress('cloud', 70, `Cloud login failed: ${error.message}`);
        }
      } else {
        sendProgress('cloud', 70, 'Skipping cloud (no credentials)');
      }

      // Stage 5: Verify Tapo devices by connecting (70-95%)
      sendProgress('verify', 70, 'Verifying Tapo devices...');
      
      // Combine ARP and scanned devices, prefer ones with port 80 open
      const candidateIps = new Set();
      
      // Add devices from ARP with TP-Link MACs
      arpDevices.forEach(d => candidateIps.add(d.ip));
      
      // Add scanned devices with port 80 (Tapo) that aren't already Kasa
      const kasaIps = new Set(results.kasa.map(k => k.ip));
      allScannedDevices
        .filter(d => d.tapoPort && !kasaIps.has(d.ip))
        .forEach(d => candidateIps.add(d.ip));

      // Remove router/gateway IPs (usually .1)
      const candidateList = Array.from(candidateIps).filter(ip => !ip.endsWith('.1'));
      
      if (username && password && candidateList.length > 0) {
        let verified = 0;
        for (let i = 0; i < candidateList.length; i++) {
          const ip = candidateList[i];
          sendProgress('verify', 70 + Math.round((i / candidateList.length) * 25), 
            `Verifying ${ip}...`);
          
          const device = await this.verifyTapoDevice(ip, username, password);
          if (device) {
            // Match with cloud device for name if possible
            const cloudMatch = cloudDevices.find(c => 
              c.deviceId === device.deviceId || 
              c.name === device.name
            );
            if (cloudMatch) {
              device.name = cloudMatch.name;
              device.cloudMatched = true;
            }
            results.tapo.push(device);
            verified++;
          }
        }
        sendProgress('verify', 95, `Verified ${verified} Tapo device(s)`);
      } else {
        // Without credentials, add as unverified
        candidateList.forEach(ip => {
          results.unverified.push({
            ip,
            type: 'tapo',
            name: 'Unverified Tapo Device',
            model: 'Unknown',
            verified: false
          });
        });
        sendProgress('verify', 95, `${candidateList.length} unverified device(s) found`);
      }

      // Stage 6: Add cloud devices that weren't found locally (95-100%)
      if (cloudDevices.length > 0) {
        const foundDeviceIds = new Set(results.tapo.map(t => t.deviceId));
        const notFound = cloudDevices.filter(c => !foundDeviceIds.has(c.deviceId));
        
        notFound.forEach(c => {
          results.unverified.push({
            name: c.name,
            type: 'tapo',
            ip: null,
            model: c.model,
            deviceId: c.deviceId,
            cloudOnly: true,
            verified: false
          });
        });
        
        if (notFound.length > 0) {
          sendProgress('complete', 100, `${notFound.length} cloud device(s) not found on network`);
        }
      }

      sendProgress('complete', 100, 
        `Discovery complete: ${results.kasa.length} Kasa, ${results.tapo.length} Tapo, ${results.unverified.length} unverified`);

      return results;
    } catch (error) {
      console.error('Discovery error:', error);
      throw error;
    }
  }

  /**
   * Discover TP-Link devices on the local network
   * @returns {Array} - Array of discovered devices with name, type, and IP
   */
  async discoverDevices() {
    return new Promise((resolve) => {
      const discovered = [];
      const timeout = setTimeout(() => {
        this.kasaClient.stopDiscovery();
        this.discoveredDevices = discovered;
        console.log(`Discovery complete: found ${discovered.length} device(s)`);
        resolve(discovered);
      }, 5000); // 5 second discovery window

      this.kasaClient.startDiscovery().on('device-new', (device) => {
        device.getSysInfo().then((info) => {
          const deviceInfo = {
            name: info.alias || 'Unknown Device',
            type: 'kasa',
            ip: device.host,
            model: info.model || 'Unknown',
            deviceId: info.deviceId
          };
          discovered.push(deviceInfo);
          console.log(`Discovered: ${deviceInfo.name} (${deviceInfo.ip})`);
        }).catch((err) => {
          console.error('Error getting device info:', err);
        });
      });
    });
  }

  /**
   * Login to TP-Link cloud and discover Tapo devices
   * @param {string} username - TP-Link account email
   * @param {string} password - TP-Link account password
   * @returns {Array} - Array of discovered Tapo devices
   */
  async discoverTapoDevices(username, password) {
    try {
      console.log('Logging in to TP-Link cloud...');
      
      // Login to cloud
      this.tapoCloudClient = await cloudLogin(username, password);
      console.log('Cloud login successful');
      
      // Get device list from cloud
      const deviceList = await this.tapoCloudClient.listDevicesByType('SMART.TAPOPLUG');
      console.log(`Found ${deviceList.length} Tapo device(s) on account`);
      
      // Format device list
      const discovered = deviceList.map(device => ({
        name: device.alias || device.deviceName || 'Unknown Device',
        type: 'tapo',
        ip: device.deviceIp || 'Unknown',
        model: device.deviceModel || device.deviceType || 'Tapo Device',
        deviceId: device.deviceId
      }));
      
      return discovered;
    } catch (error) {
      console.error('Failed to discover Tapo devices:', error.message);
      throw error;
    }
  }

  /**
   * Initialize a device connection based on settings
   * @param {string} context - Stream Deck context identifier
   * @param {object} settings - Device settings (ip, type, username, password)
   */
  async initializeDevice(context, settings) {
    try {
      const { ip, deviceType, username, password } = settings;

      if (!ip) {
        console.log(`[${context}] No IP address configured`);
        return null;
      }

      // Create device object based on type
      if (deviceType === 'kasa') {
        // Kasa devices use local API without authentication
        const device = await this.kasaClient.getDevice({ host: ip });
        this.devices.set(context, { type: 'kasa', device });
        console.log(`[${context}] Kasa device initialized at ${ip}`);
        return device;
      } else if (deviceType === 'tapo') {
        // Tapo devices require authentication
        if (!username || !password) {
          console.log(`[${context}] Tapo device requires username and password`);
          this.showAlert(context);
          return null;
        }

        // Login to Tapo device
        const device = await loginDeviceByIp(username, password, ip);
        this.devices.set(context, { type: 'tapo', device });
        console.log(`[${context}] Tapo device initialized at ${ip}`);
        return device;
      }

      return null;
    } catch (error) {
      console.error(`[${context}] Failed to initialize device:`, error.message);
      this.showAlert(context);
      return null;
    }
  }

  /**
   * Toggle device power state
   * @param {string} context - Stream Deck context identifier
   * @returns {boolean} - New power state (true = on, false = off)
   */
  async toggleDevice(context) {
    try {
      const deviceInfo = this.devices.get(context);

      if (!deviceInfo) {
        console.log(`[${context}] Device not initialized`);
        this.showAlert(context);
        return null;
      }

      const { type, device } = deviceInfo;

      if (type === 'kasa') {
        // Get current state and toggle
        const sysInfo = await device.getSysInfo();
        const currentState = sysInfo.relay_state === 1;
        const newState = !currentState;

        await device.setPowerState(newState);
        console.log(`[${context}] Kasa device toggled to ${newState ? 'ON' : 'OFF'}`);
        return newState;
      } else if (type === 'tapo') {
        // Get current state and toggle
        const deviceInfo = await device.getDeviceInfo();
        const currentState = deviceInfo.device_on;
        const newState = !currentState;

        if (newState) {
          await device.turnOn();
        } else {
          await device.turnOff();
        }
        console.log(`[${context}] Tapo device toggled to ${newState ? 'ON' : 'OFF'}`);
        return newState;
      }

      return null;
    } catch (error) {
      console.error(`[${context}] Failed to toggle device:`, error.message);
      this.showAlert(context);
      return null;
    }
  }

  /**
   * Set device power state
   * @param {string} context - Stream Deck context identifier
   * @param {boolean} powerOn - Desired power state (true = on, false = off)
   * @returns {boolean} - Resulting power state
   */
  async setDeviceState(context, powerOn) {
    try {
      const deviceInfo = this.devices.get(context);

      if (!deviceInfo) {
        console.log(`[${context}] Device not initialized`);
        this.showAlert(context);
        return null;
      }

      const { type, device } = deviceInfo;

      if (type === 'kasa') {
        await device.setPowerState(powerOn);
        console.log(`[${context}] Kasa device set to ${powerOn ? 'ON' : 'OFF'}`);
        return powerOn;
      } else if (type === 'tapo') {
        if (powerOn) {
          await device.turnOn();
        } else {
          await device.turnOff();
        }
        console.log(`[${context}] Tapo device set to ${powerOn ? 'ON' : 'OFF'}`);
        return powerOn;
      }

      return null;
    } catch (error) {
      console.error(`[${context}] Failed to set device state:`, error.message);
      this.showAlert(context);
      return null;
    }
  }

  /**
   * Get current device power state
   * @param {string} context - Stream Deck context identifier
   * @returns {boolean|null} - Power state or null if unavailable
   */
  async getDeviceState(context) {
    try {
      const deviceInfo = this.devices.get(context);

      if (!deviceInfo) {
        return null;
      }

      const { type, device } = deviceInfo;

      if (type === 'kasa') {
        const sysInfo = await device.getSysInfo();
        return sysInfo.relay_state === 1;
      } else if (type === 'tapo') {
        const info = await device.getDeviceInfo();
        return info.device_on;
      }

      return null;
    } catch (error) {
      console.error(`[${context}] Failed to get device state:`, error.message);
      return null;
    }
  }

  /**
   * Remove device from manager
   * @param {string} context - Stream Deck context identifier
   */
  removeDevice(context) {
    this.devices.delete(context);
    console.log(`[${context}] Device removed from manager`);
  }

  /**
   * Show alert on Stream Deck key (yellow exclamation mark)
   * @param {string} context - Stream Deck context identifier
   */
  showAlert(context) {
    if (websocket) {
      websocket.send(JSON.stringify({
        event: 'showAlert',
        context: context
      }));
    }
  }

  /**
   * Update key state on Stream Deck
   * @param {string} context - Stream Deck context identifier
   * @param {boolean} state - Power state (true = on/state 1, false = off/state 0)
   */
  setState(context, state) {
    if (websocket) {
      websocket.send(JSON.stringify({
        event: 'setState',
        context: context,
        payload: {
          state: state ? 1 : 0
        }
      }));
    }
  }

  /**
   * Send data to Property Inspector
   * @param {string} context - Stream Deck context identifier
   * @param {object} payload - Data to send
   */
  sendToPropertyInspector(context, payload) {
    if (websocket) {
      websocket.send(JSON.stringify({
        event: 'sendToPropertyInspector',
        context: context,
        payload: payload
      }));
    }
  }
}

// Create device manager instance
const deviceManager = new DeviceManager();

/**
 * Stream Deck Plugin Entry Point
 * @param {string} inPort - WebSocket port
 * @param {string} inPluginUUID - Plugin UUID
 * @param {string} inRegisterEvent - Registration event name
 * @param {string} inInfo - Plugin info JSON string
 */
function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
  pluginUUID = inPluginUUID;

  // Create WebSocket connection to Stream Deck
  websocket = new WebSocket(`ws://127.0.0.1:${inPort}`);

  // Register plugin on connection
  websocket.onopen = () => {
    const registerJSON = {
      event: inRegisterEvent,
      uuid: inPluginUUID
    };
    websocket.send(JSON.stringify(registerJSON));
    console.log('Plugin connected to Stream Deck');
  };

  // Handle messages from Stream Deck
  websocket.onmessage = async (evt) => {
    try {
      const jsonObj = JSON.parse(evt.data);
      const event = jsonObj.event;
      const context = jsonObj.context;
      const settings = jsonObj.payload?.settings || {};

      console.log(`Received event: ${event}`);

      switch (event) {
        // Key pressed on Stream Deck
        case 'keyDown':
          await handleKeyDown(context, jsonObj.action, settings);
          break;

        // Action appears on Stream Deck (initialize device)
        case 'willAppear':
          await handleWillAppear(context, settings);
          break;

        // Action disappears from Stream Deck (cleanup)
        case 'willDisappear':
          deviceManager.removeDevice(context);
          break;

        // Settings changed in Property Inspector
        case 'didReceiveSettings':
          await handleWillAppear(context, settings);
          break;

        // Message from Property Inspector
        case 'sendToPlugin':
          await handleSendToPlugin(context, jsonObj.payload);
          break;

        // Global settings received
        case 'didReceiveGlobalSettings':
          globalSettings = jsonObj.payload.settings || {};
          console.log('Global settings received:', globalSettings);
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  websocket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  websocket.onclose = () => {
    console.log('WebSocket connection closed');
  };
}

/**
 * Handle keyDown event - Control device power based on action type
 * @param {string} context - Stream Deck context
 * @param {string} action - Action UUID (toggle, on, or off)
 * @param {object} settings - Device settings
 */
async function handleKeyDown(context, action, settings) {
  console.log(`[${context}] Key pressed for action: ${action}`);

  // Initialize device if not already done
  if (!deviceManager.devices.has(context)) {
    await deviceManager.initializeDevice(context, settings);
  }

  let newState = null;

  // Determine action based on UUID
  if (action === 'live.scetrov.tplink.toggle') {
    // Toggle device power
    newState = await deviceManager.toggleDevice(context);
  } else if (action === 'live.scetrov.tplink.on') {
    // Turn device on
    newState = await deviceManager.setDeviceState(context, true);
  } else if (action === 'live.scetrov.tplink.off') {
    // Turn device off
    newState = await deviceManager.setDeviceState(context, false);
  }

  // Update key visual state if action succeeded
  if (newState !== null) {
    deviceManager.setState(context, newState);
  }
}

/**
 * Handle willAppear event - Initialize device connection
 * @param {string} context - Stream Deck context
 * @param {object} settings - Device settings
 */
async function handleWillAppear(context, settings) {
  console.log(`[${context}] Action appeared with settings:`, settings);

  // Initialize device connection
  const device = await deviceManager.initializeDevice(context, settings);

  // Get and display current state
  if (device) {
    const state = await deviceManager.getDeviceState(context);
    if (state !== null) {
      deviceManager.setState(context, state);
    }
  }
}

/**
 * Send global settings to Stream Deck
 */
function setGlobalSettings(settings) {
  globalSettings = { ...globalSettings, ...settings };
  if (websocket && websocket.readyState === 1) {
    const json = {
      event: 'setGlobalSettings',
      context: pluginUUID,
      payload: globalSettings
    };
    websocket.send(JSON.stringify(json));
    console.log('Global settings saved:', globalSettings);
  }
}

/**
 * Request global settings from Stream Deck
 */
function getGlobalSettings() {
  if (websocket && websocket.readyState === 1) {
    const json = {
      event: 'getGlobalSettings',
      context: pluginUUID
    };
    websocket.send(JSON.stringify(json));
  }
}

/**
 * Handle sendToPlugin event - Process messages from Property Inspector
 * @param {string} context - Stream Deck context
 * @param {object} payload - Message payload
 */
async function handleSendToPlugin(context, payload) {
  console.log(`[${context}] Received from PI:`, payload);

  if (payload.action === 'discoverDevices') {
    console.log('Starting Kasa device discovery...');
    const devices = await deviceManager.discoverDevices();
    deviceManager.sendToPropertyInspector(context, {
      action: 'devicesDiscovered',
      devices: devices
    });
  } else if (payload.action === 'discoverTapoDevices') {
    console.log('Starting Tapo device discovery...');
    try {
      const devices = await deviceManager.discoverTapoDevices(
        payload.username,
        payload.password
      );
      deviceManager.sendToPropertyInspector(context, {
        action: 'tapoDevicesDiscovered',
        devices: devices,
        success: true
      });
    } catch (error) {
      deviceManager.sendToPropertyInspector(context, {
        action: 'tapoDevicesDiscovered',
        devices: [],
        success: false,
        error: error.message
      });
    }
  } else if (payload.action === 'discoverAllDevices') {
    // Unified discovery - finds both Kasa and Tapo devices
    console.log('Starting unified device discovery...');
    
    // Save credentials to global settings if provided
    if (payload.username && payload.password) {
      setGlobalSettings({
        tapoEmail: payload.username,
        tapoPassword: payload.password
      });
    }
    
    try {
      const results = await deviceManager.discoverAllDevices(
        payload.username,
        payload.password,
        (progress) => {
          // Send progress updates to Property Inspector
          deviceManager.sendToPropertyInspector(context, {
            action: 'discoveryProgress',
            ...progress
          });
        }
      );
      
      // Cache the results with timestamp
      deviceManager.cachedDiscoveryResults = results;
      deviceManager.lastDiscoveryTime = Date.now();
      
      deviceManager.sendToPropertyInspector(context, {
        action: 'allDevicesDiscovered',
        kasa: results.kasa,
        tapo: results.tapo,
        unverified: results.unverified,
        success: true
      });
    } catch (error) {
      deviceManager.sendToPropertyInspector(context, {
        action: 'allDevicesDiscovered',
        kasa: [],
        tapo: [],
        unverified: [],
        success: false,
        error: error.message
      });
    }
  } else if (payload.action === 'getCachedDevices') {
    // Return cached discovery results if available
    if (deviceManager.cachedDiscoveryResults) {
      const cacheAge = Date.now() - deviceManager.lastDiscoveryTime;
      deviceManager.sendToPropertyInspector(context, {
        action: 'cachedDevicesRetrieved',
        kasa: deviceManager.cachedDiscoveryResults.kasa,
        tapo: deviceManager.cachedDiscoveryResults.tapo,
        unverified: deviceManager.cachedDiscoveryResults.unverified,
        cacheAge: Math.floor(cacheAge / 1000), // Age in seconds
        success: true
      });
    } else {
      deviceManager.sendToPropertyInspector(context, {
        action: 'cachedDevicesRetrieved',
        success: false,
        message: 'No cached devices available'
      });
    }
  } else if (payload.action === 'getGlobalCredentials') {
    // Send global credentials to Property Inspector
    deviceManager.sendToPropertyInspector(context, {
      action: 'globalCredentialsRetrieved',
      tapoEmail: globalSettings.tapoEmail || '',
      tapoPassword: globalSettings.tapoPassword || ''
    });
  }
}

// Global WebSocket requirement for Stream Deck SDK
global.WebSocket = require('ws');

// Parse command line arguments from Stream Deck
function parseArgs() {
  const args = {};
  const argv = process.argv;
  
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '-port' && argv[i + 1]) {
      args.port = argv[i + 1];
    } else if (argv[i] === '-pluginUUID' && argv[i + 1]) {
      args.pluginUUID = argv[i + 1];
    } else if (argv[i] === '-registerEvent' && argv[i + 1]) {
      args.registerEvent = argv[i + 1];
    } else if (argv[i] === '-info' && argv[i + 1]) {
      args.info = argv[i + 1];
    }
  }
  
  return args;
}

// Initialize plugin when started by Stream Deck
const args = parseArgs();
if (args.port && args.pluginUUID && args.registerEvent) {
  connectElgatoStreamDeckSocket(args.port, args.pluginUUID, args.registerEvent, args.info);
  // Request global settings on startup
  setTimeout(() => getGlobalSettings(), 1000);
}

// Export the entry point function
module.exports = { connectElgatoStreamDeckSocket };
