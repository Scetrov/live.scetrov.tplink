/**
 * Test script to discover Tapo device IPs
 * Tries multiple methods to find IP addresses for Tapo devices
 * 
 * Usage:
 *   Set environment variables first:
 *   $env:TAPO_EMAIL="your@email.com"
 *   $env:TAPO_PASSWORD="yourpassword"
 *   node tests/test-tapo-ip.js
 */

const { cloudLogin } = require('tp-link-tapo-connect');
const dgram = require('dgram');
const dns = require('dns');
const net = require('net');

const TAPO_PORT = 80;  // Tapo devices respond on port 80
const NETWORK_PREFIX = '10.229';  // Expected network prefix

/**
 * Method 1: Check all fields from cloud API
 */
async function checkCloudApiFields() {
  console.log('='.repeat(60));
  console.log('Method 1: Cloud API - All Device Fields');
  console.log('='.repeat(60));
  
  const username = process.env.TAPO_EMAIL;
  const password = process.env.TAPO_PASSWORD;
  
  if (!username || !password) {
    console.log('❌ Skipping - No credentials provided');
    console.log('   Set TAPO_EMAIL and TAPO_PASSWORD environment variables');
    return [];
  }
  
  try {
    console.log(`Logging in as: ${username}`);
    const cloudClient = await cloudLogin(username, password);
    console.log('✓ Cloud login successful\n');
    
    const deviceList = await cloudClient.listDevicesByType('SMART.TAPOPLUG');
    console.log(`Found ${deviceList.length} device(s)\n`);
    
    const devices = [];
    deviceList.forEach((device, index) => {
      console.log(`--- Device ${index + 1} ---`);
      console.log('All fields from cloud API:');
      
      // Log all properties to find IP-related fields
      for (const [key, value] of Object.entries(device)) {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
        
        // Check if any field contains an IP-like string
        if (typeof value === 'string' && value.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
          console.log(`    ^ This looks like an IP address!`);
        }
        if (typeof value === 'string' && value.includes(NETWORK_PREFIX)) {
          console.log(`    ^ This contains our network prefix ${NETWORK_PREFIX}!`);
        }
      }
      
      devices.push({
        name: device.alias || device.deviceName,
        deviceId: device.deviceId,
        mac: device.deviceMac || device.mac,
        model: device.deviceModel
      });
      
      console.log('');
    });
    
    return devices;
  } catch (error) {
    console.error(`❌ Cloud API failed: ${error.message}`);
    return [];
  }
}

/**
 * Method 2: Scan network range for Tapo devices
 */
async function scanNetworkForTapo(subnet = '10.229.0') {
  console.log('\n' + '='.repeat(60));
  console.log('Method 2: Network Scan for Tapo Devices');
  console.log('='.repeat(60));
  console.log(`Scanning ${subnet}.1 - ${subnet}.254 on port ${TAPO_PORT}...\n`);
  
  const foundDevices = [];
  const scanPromises = [];
  
  for (let i = 1; i <= 254; i++) {
    const ip = `${subnet}.${i}`;
    scanPromises.push(checkTapoDevice(ip));
  }
  
  const results = await Promise.all(scanPromises);
  results.forEach(result => {
    if (result) {
      foundDevices.push(result);
    }
  });
  
  console.log(`\nFound ${foundDevices.length} potential Tapo device(s):`);
  foundDevices.forEach(device => {
    console.log(`  - ${device.ip}`);
  });
  
  return foundDevices;
}

/**
 * Check if an IP has a Tapo device
 */
function checkTapoDevice(ip) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);  // 500ms timeout
    
    socket.on('connect', () => {
      process.stdout.write(`✓`);
      socket.destroy();
      resolve({ ip });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(null);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(null);
    });
    
    socket.connect(TAPO_PORT, ip);
  });
}

/**
 * Method 3: Try to resolve device using mDNS/DNS
 */
async function tryMdnsDiscovery() {
  console.log('\n' + '='.repeat(60));
  console.log('Method 3: DNS/mDNS Lookup');
  console.log('='.repeat(60));
  
  const hostnames = [
    'tapo',
    'tapo.local',
    'tplink',
    'tplink.local'
  ];
  
  for (const hostname of hostnames) {
    try {
      const addresses = await new Promise((resolve, reject) => {
        dns.lookup(hostname, { all: true }, (err, addresses) => {
          if (err) reject(err);
          else resolve(addresses);
        });
      });
      console.log(`✓ ${hostname}: ${JSON.stringify(addresses)}`);
    } catch (error) {
      console.log(`✗ ${hostname}: Not found`);
    }
  }
}

/**
 * Method 4: UDP broadcast discovery
 */
async function udpBroadcastDiscovery() {
  console.log('\n' + '='.repeat(60));
  console.log('Method 4: UDP Broadcast Discovery');
  console.log('='.repeat(60));
  
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    const foundDevices = [];
    
    socket.on('listening', () => {
      socket.setBroadcast(true);
      console.log('Sending broadcast discovery packets...');
      
      // Try different broadcast addresses
      const broadcasts = [
        '255.255.255.255',
        '10.229.255.255',
        '10.229.0.255'
      ];
      
      // Tapo/Kasa discovery message
      const discoveryMsg = Buffer.from('{"system":{"get_sysinfo":{}}}');
      
      broadcasts.forEach(addr => {
        try {
          socket.send(discoveryMsg, 0, discoveryMsg.length, 9999, addr);
          console.log(`  Sent to ${addr}:9999`);
        } catch (e) {
          console.log(`  Failed to send to ${addr}: ${e.message}`);
        }
      });
    });
    
    socket.on('message', (msg, rinfo) => {
      console.log(`\n✓ Response from ${rinfo.address}:${rinfo.port}`);
      console.log(`  Data: ${msg.toString().substring(0, 100)}...`);
      foundDevices.push({ ip: rinfo.address, data: msg.toString() });
    });
    
    socket.on('error', (err) => {
      console.error(`Socket error: ${err.message}`);
    });
    
    socket.bind(9999);
    
    // Wait 3 seconds for responses
    setTimeout(() => {
      socket.close();
      console.log(`\nDiscovery complete. Found ${foundDevices.length} device(s).`);
      resolve(foundDevices);
    }, 3000);
  });
}

/**
 * Method 5: Try specific subnets based on 10.229.x.x
 */
async function scanMultipleSubnets() {
  console.log('\n' + '='.repeat(60));
  console.log('Method 5: Scan Multiple Subnets (10.229.x.x)');
  console.log('='.repeat(60));
  
  // Common subnet patterns to try
  const subnets = ['10.229.0', '10.229.1', '10.229.2', '10.229.10', '10.229.100'];
  
  console.log('Quick scanning common IPs in each subnet...\n');
  
  const allFound = [];
  
  for (const subnet of subnets) {
    process.stdout.write(`Scanning ${subnet}.x: `);
    
    // Just check common DHCP ranges
    const commonIps = [1, 2, 10, 20, 50, 100, 101, 102, 150, 200, 254];
    const scanPromises = commonIps.map(i => checkTapoDevice(`${subnet}.${i}`));
    const results = await Promise.all(scanPromises);
    
    const found = results.filter(r => r !== null);
    console.log(` (${found.length} found)`);
    
    allFound.push(...found);
  }
  
  if (allFound.length > 0) {
    console.log('\nFound devices at:');
    allFound.forEach(d => console.log(`  ${d.ip}`));
  }
  
  return allFound;
}

/**
 * Main test runner
 */
async function main() {
  console.log('Tapo Device IP Discovery Test');
  console.log('Looking for devices on network prefix:', NETWORK_PREFIX);
  console.log('');
  
  // Method 1: Cloud API
  const cloudDevices = await checkCloudApiFields();
  
  // Method 2: Quick subnet scan
  await scanMultipleSubnets();
  
  // Method 3: DNS lookup
  await tryMdnsDiscovery();
  
  // Method 4: UDP broadcast
  await udpBroadcastDiscovery();
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Devices from cloud: ${cloudDevices.length}`);
  cloudDevices.forEach(d => {
    console.log(`  - ${d.name} (MAC: ${d.mac || 'unknown'})`);
  });
  
  console.log('\nTo find your Tapo device IPs:');
  console.log('1. Check your router\'s DHCP client list');
  console.log('2. Use the Tapo app (Device Settings > Device Info)');
  console.log('3. Run: arp -a | findstr "10.229"');
}

main().catch(console.error);
