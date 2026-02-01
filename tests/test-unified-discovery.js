/**
 * Test the unified device discovery feature
 * This tests the tiered discovery strategy:
 * 1. Kasa UDP discovery
 * 2. ARP table scan for TP-Link MACs
 * 3. Network scan for devices with TP-Link ports
 * 4. Cloud login for Tapo device names
 * 5. Local verification of Tapo devices
 * 
 * Usage:
 *   $env:TAPO_EMAIL="your@email.com"
 *   $env:TAPO_PASSWORD="yourpassword"
 *   node tests/test-unified-discovery.js
 */

const { Client: KasaClient } = require('tplink-smarthome-api');
const { loginDeviceByIp, cloudLogin } = require('tp-link-tapo-connect');
const net = require('net');
const { execSync } = require('child_process');
const os = require('os');

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
 * Get local network subnets
 */
function getLocalSubnets() {
  const subnets = new Set();
  const interfaces = os.networkInterfaces();
  
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const parts = addr.address.split('.');
        const prefix = parts.slice(0, 3).join('.');
        subnets.add(prefix);
        
        // For /16 networks, add nearby subnets
        if (addr.netmask === '255.255.0.0') {
          const base = parseInt(parts[2]);
          for (let i = Math.max(0, base - 5); i <= Math.min(255, base + 5); i++) {
            subnets.add(`${parts[0]}.${parts[1]}.${i}`);
          }
        }
        
        console.log(`  Interface ${name}: ${addr.address} (netmask: ${addr.netmask})`);
      }
    }
  }
  
  return Array.from(subnets);
}

/**
 * Get ARP table TP-Link devices
 */
function getArpTableTpLinkDevices() {
  const tplinkDevices = [];
  
  try {
    const arpOutput = execSync('arp -a', { encoding: 'utf8', timeout: 5000 });
    const lines = arpOutput.split('\n');
    
    for (const line of lines) {
      const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f-:]+)/i);
      if (match) {
        const ip = match[1];
        const mac = match[2].toLowerCase();
        
        const isTPLink = TPLINK_MAC_PREFIXES.some(prefix => 
          mac.startsWith(prefix.toLowerCase())
        );
        
        if (isTPLink) {
          tplinkDevices.push({ ip, mac });
        }
      }
    }
  } catch (error) {
    console.error('Error reading ARP table:', error.message);
  }
  
  return tplinkDevices;
}

/**
 * Check if port is open
 */
function checkPort(ip, port, timeout = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    
    socket.connect(port, ip);
  });
}

/**
 * Scan subnet for TP-Link ports
 */
async function scanSubnet(subnet) {
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
          checkPort(ip, 80, 300),
          checkPort(ip, 9999, 300)
        ]).then(([port80, port9999]) => {
          if (port80 || port9999) {
            return { ip, tapoPort: port80, kasaPort: port9999 };
          }
          return null;
        })
      );
    }
    
    const results = await Promise.all(promises);
    results.filter(r => r !== null).forEach(r => found.push(r));
  }
  
  return found;
}

/**
 * Discover Kasa devices via UDP
 */
async function discoverKasa() {
  return new Promise((resolve) => {
    const kasaClient = new KasaClient();
    const discovered = [];
    
    const timeout = setTimeout(() => {
      kasaClient.stopDiscovery();
      resolve(discovered);
    }, 5000);

    kasaClient.startDiscovery().on('device-new', (device) => {
      device.getSysInfo().then((info) => {
        discovered.push({
          name: info.alias || 'Unknown Device',
          type: 'kasa',
          ip: device.host,
          model: info.model || 'Unknown',
          deviceId: info.deviceId
        });
      }).catch(() => {});
    });
  });
}

/**
 * Verify Tapo device
 */
async function verifyTapoDevice(ip, username, password) {
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
    return null;
  }
}

/**
 * Main unified discovery
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Unified TP-Link Device Discovery Test');
  console.log('='.repeat(60));
  
  const username = process.env.TAPO_EMAIL;
  const password = process.env.TAPO_PASSWORD;
  
  const results = {
    kasa: [],
    tapo: [],
    unverified: []
  };

  // Stage 1: Kasa Discovery
  console.log('\n[1/5] Kasa UDP Discovery...');
  results.kasa = await discoverKasa();
  console.log(`  Found ${results.kasa.length} Kasa device(s)`);
  results.kasa.forEach(d => console.log(`    - ${d.name} @ ${d.ip}`));

  // Stage 2: ARP Table
  console.log('\n[2/5] Checking ARP table for TP-Link MACs...');
  const arpDevices = getArpTableTpLinkDevices();
  console.log(`  Found ${arpDevices.length} TP-Link MAC(s)`);
  arpDevices.forEach(d => console.log(`    - ${d.ip} (MAC: ${d.mac})`));

  // Stage 3: Network Scan
  console.log('\n[3/5] Scanning network subnets...');
  console.log('  Detected subnets:');
  const subnets = getLocalSubnets();
  
  let allScanned = [];
  for (const subnet of subnets) {
    process.stdout.write(`  Scanning ${subnet}.x... `);
    const found = await scanSubnet(subnet);
    console.log(`${found.length} device(s)`);
    allScanned = allScanned.concat(found);
  }
  console.log(`  Total: ${allScanned.length} device(s) with TP-Link ports`);

  // Stage 4: Cloud Login
  let cloudDevices = [];
  if (username && password) {
    console.log('\n[4/5] Logging into TP-Link cloud...');
    try {
      const cloudClient = await cloudLogin(username, password);
      const deviceList = await cloudClient.listDevicesByType('SMART.TAPOPLUG');
      cloudDevices = deviceList.map(d => ({
        name: d.alias || d.deviceName || 'Unknown',
        deviceId: d.deviceId,
        mac: d.deviceMac,
        model: d.deviceModel || d.deviceType
      }));
      console.log(`  Found ${cloudDevices.length} device(s) in cloud account`);
      cloudDevices.forEach(d => console.log(`    - ${d.name} (${d.model})`));
    } catch (error) {
      console.log(`  Cloud login failed: ${error.message}`);
    }
  } else {
    console.log('\n[4/5] Skipping cloud login (no credentials)');
  }

  // Stage 5: Verify Tapo Devices
  console.log('\n[5/5] Verifying Tapo devices...');
  
  const kasaIps = new Set(results.kasa.map(k => k.ip));
  const candidateIps = new Set();
  
  arpDevices.forEach(d => candidateIps.add(d.ip));
  allScanned
    .filter(d => d.tapoPort && !kasaIps.has(d.ip))
    .forEach(d => candidateIps.add(d.ip));

  // Remove gateways
  const candidates = Array.from(candidateIps).filter(ip => !ip.endsWith('.1'));
  console.log(`  ${candidates.length} candidate IP(s) to verify`);

  if (username && password && candidates.length > 0) {
    for (const ip of candidates) {
      process.stdout.write(`  Verifying ${ip}... `);
      const device = await verifyTapoDevice(ip, username, password);
      if (device) {
        const cloudMatch = cloudDevices.find(c => c.deviceId === device.deviceId);
        if (cloudMatch) {
          device.name = cloudMatch.name;
        }
        results.tapo.push(device);
        console.log(`✓ ${device.name}`);
      } else {
        console.log('✗ Not a Tapo device');
      }
    }
  } else if (!username || !password) {
    candidates.forEach(ip => {
      results.unverified.push({
        ip,
        type: 'tapo',
        name: 'Unverified Device',
        verified: false
      });
    });
    console.log('  (Cannot verify without credentials)');
  }

  // Add cloud-only devices
  if (cloudDevices.length > 0) {
    const foundIds = new Set(results.tapo.map(t => t.deviceId));
    const notFound = cloudDevices.filter(c => !foundIds.has(c.deviceId));
    notFound.forEach(c => {
      results.unverified.push({
        name: c.name,
        type: 'tapo',
        ip: null,
        model: c.model,
        deviceId: c.deviceId,
        cloudOnly: true
      });
    });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('DISCOVERY SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\nKasa Devices: ${results.kasa.length}`);
  results.kasa.forEach(d => console.log(`  ✓ ${d.name} @ ${d.ip} (${d.model})`));
  
  console.log(`\nTapo Devices: ${results.tapo.length}`);
  results.tapo.forEach(d => console.log(`  ✓ ${d.name} @ ${d.ip} (${d.model})`));
  
  console.log(`\nUnverified/Cloud-Only: ${results.unverified.length}`);
  results.unverified.forEach(d => {
    if (d.cloudOnly) {
      console.log(`  ? ${d.name} - Not found on network (${d.model})`);
    } else {
      console.log(`  ? ${d.ip} - Needs credentials to verify`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
