/**
 * Test TP-Link device identification based on MAC addresses and port scanning
 * Focuses on devices in the 10.229.x.x range
 */

const net = require('net');
const { cloudLogin, loginDeviceByIp } = require('tp-link-tapo-connect');

// TP-Link OUI prefixes (MAC address vendor prefixes)
const TPLINK_MAC_PREFIXES = [
  '40-8d-5c', '40:8d:5c',  // TP-Link
  '98-da-c4', '98:da:c4',  // TP-Link
  '50-c7-bf', '50:c7:bf',  // TP-Link
  'b0-4e-26', 'b0:4e:26',  // TP-Link
  '60-a4-b7', '60:a4:b7',  // TP-Link
  'a8-42-a1', 'a8:42:a1',  // TP-Link
  '3c-6a-9d', '3c:6a:9d',  // TP-Link (some Tapo devices)
  'c0-c9-e3', 'c0:c9:e3',  // TP-Link
  '5c-e9-31', '5c:e9:31',  // TP-Link
  '54-af-97', '54:af:97',  // TP-Link
];

// Known devices from ARP scan
const CANDIDATE_IPS = [
  { ip: '10.229.5.75', mac: '3c-6a-9d-18-97-84', note: 'TP-Link MAC' },
  { ip: '10.229.5.140', mac: '3c-6a-9d-1f-0a-b5', note: 'TP-Link MAC' },
  { ip: '10.229.5.173', mac: '3c-6a-9d-16-a8-68', note: 'TP-Link MAC' },
  { ip: '10.229.10.2', mac: '40-8d-5c-d1-a8-f6', note: 'TP-Link MAC' },
  { ip: '10.229.53.2', mac: '40-8d-5c-d1-a8-f6', note: 'TP-Link MAC (same device?)' },
];

async function checkPorts(ip) {
  const ports = [80, 443, 9999, 20002];
  const results = {};
  
  for (const port of ports) {
    results[port] = await new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(500);
      
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
  
  return results;
}

async function tryTapoLogin(ip, username, password) {
  try {
    console.log(`  Attempting Tapo login to ${ip}...`);
    const device = await loginDeviceByIp(username, password, ip);
    const info = await device.getDeviceInfo();
    return { success: true, info };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('TP-Link Device Identification Test');
  console.log('='.repeat(50));
  console.log('');
  console.log('Checking devices with TP-Link MAC addresses...\n');
  
  const username = process.env.TAPO_EMAIL;
  const password = process.env.TAPO_PASSWORD;
  
  for (const device of CANDIDATE_IPS) {
    console.log(`\n--- ${device.ip} ---`);
    console.log(`MAC: ${device.mac} (${device.note})`);
    
    // Check ports
    const ports = await checkPorts(device.ip);
    console.log(`Open ports: ${Object.entries(ports).filter(([k,v]) => v).map(([k]) => k).join(', ') || 'none'}`);
    
    // If port 80 is open and we have credentials, try Tapo login
    if (ports[80] && username && password) {
      const result = await tryTapoLogin(device.ip, username, password);
      if (result.success) {
        console.log(`✓ TAPO DEVICE FOUND!`);
        console.log(`  Device Info:`, JSON.stringify(result.info, null, 2));
      } else {
        console.log(`  Tapo login failed: ${result.error}`);
      }
    }
    
    // Classify device type
    if (ports[9999]) {
      console.log(`  -> Likely KASA device (port 9999)`);
    } else if (ports[80] || ports[443]) {
      console.log(`  -> Likely TAPO device or other TP-Link (port 80/443)`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Summary of TP-Link devices found:');
  console.log('='.repeat(50));
  
  const tapoDevices = CANDIDATE_IPS.filter(d => 
    d.mac.toLowerCase().startsWith('40-8d-5c') || 
    d.mac.toLowerCase().startsWith('40:8d:5c') ||
    d.mac.toLowerCase().startsWith('3c-6a-9d') ||
    d.mac.toLowerCase().startsWith('3c:6a:9d')
  );
  
  console.log('\nPotential Tapo device IPs to try:');
  tapoDevices.forEach(d => console.log(`  ${d.ip}  (MAC: ${d.mac})`));
  
  if (!username || !password) {
    console.log('\nSet TAPO_EMAIL and TAPO_PASSWORD to test login to these devices.');
  }
}

main().catch(console.error);
