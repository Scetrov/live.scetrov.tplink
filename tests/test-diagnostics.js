/**
 * Diagnostic test to troubleshoot device discovery issues
 * Tests network connectivity and library functionality
 */

const { Client: KasaClient } = require('tplink-smarthome-api');
const { cloudLogin } = require('tp-link-tapo-connect');
const dgram = require('dgram');
const os = require('os');

console.log('TP-Link Device Discovery Diagnostics');
console.log('=' .repeat(60));
console.log(`Date: ${new Date().toISOString()}`);
console.log(`Node version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log('');

// Display network interfaces
console.log('Network Interfaces:');
const interfaces = os.networkInterfaces();
for (const [name, addresses] of Object.entries(interfaces)) {
  const ipv4 = addresses.filter(addr => addr.family === 'IPv4' && !addr.internal);
  if (ipv4.length > 0) {
    ipv4.forEach(addr => {
      console.log(`  ${name}: ${addr.address} (${addr.netmask})`);
    });
  }
}
console.log('');

// Test UDP broadcast capability (required for Kasa discovery)
async function testUDPBroadcast() {
  console.log('Testing UDP broadcast capability (Kasa discovery uses this)...');
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    
    socket.on('error', (err) => {
      console.log(`  ✗ UDP broadcast error: ${err.message}`);
      socket.close();
      resolve(false);
    });
    
    socket.on('listening', () => {
      try {
        socket.setBroadcast(true);
        console.log('  ✓ UDP broadcast capability available');
        socket.close();
        resolve(true);
      } catch (err) {
        console.log(`  ✗ Cannot enable broadcast: ${err.message}`);
        socket.close();
        resolve(false);
      }
    });
    
    socket.bind();
  });
}

// Test Kasa discovery with detailed events
async function testKasaDiscovery() {
  console.log('\nTesting Kasa Discovery:');
  console.log('-'.repeat(60));
  
  const kasaClient = new KasaClient({
    logLevel: 'info'
  });
  
  const discovered = [];
  let deviceNewCount = 0;
  let deviceOnlineCount = 0;
  let deviceOfflineCount = 0;
  let errorCount = 0;
  
  return new Promise((resolve) => {
    console.log('Starting discovery for 8 seconds...');
    console.log('Listening for devices on UDP port 9999...\n');
    
    const discovery = kasaClient.startDiscovery({
      deviceTypes: ['plug', 'bulb'],
      discoveryInterval: 2000,
      discoveryTimeout: 8000
    });
    
    discovery.on('device-new', (device) => {
      deviceNewCount++;
      console.log(`[EVENT] device-new: ${device.host}`);
      
      device.getSysInfo()
        .then((info) => {
          const deviceInfo = {
            name: info.alias || 'Unknown',
            ip: device.host,
            model: info.model || 'Unknown',
            mac: info.mac,
            deviceId: info.deviceId,
            swVer: info.sw_ver,
            hwVer: info.hw_ver,
            type: info.type || info.mic_type
          };
          
          discovered.push(deviceInfo);
          
          console.log(`  Name: ${deviceInfo.name}`);
          console.log(`  Model: ${deviceInfo.model}`);
          console.log(`  IP: ${deviceInfo.ip}`);
          console.log(`  MAC: ${deviceInfo.mac}`);
          console.log(`  Type: ${deviceInfo.type}`);
          console.log(`  Firmware: ${deviceInfo.swVer}`);
          console.log('');
        })
        .catch((err) => {
          errorCount++;
          console.log(`  ✗ Error getting info: ${err.message}\n`);
        });
    });
    
    discovery.on('device-online', (device) => {
      deviceOnlineCount++;
      console.log(`[EVENT] device-online: ${device.host}`);
    });
    
    discovery.on('device-offline', (device) => {
      deviceOfflineCount++;
      console.log(`[EVENT] device-offline: ${device.host}`);
    });
    
    discovery.on('error', (err) => {
      errorCount++;
      console.log(`[EVENT] error: ${err.message}`);
    });
    
    setTimeout(() => {
      kasaClient.stopDiscovery();
      
      console.log('-'.repeat(60));
      console.log('Discovery complete\n');
      console.log(`Events summary:`);
      console.log(`  device-new: ${deviceNewCount}`);
      console.log(`  device-online: ${deviceOnlineCount}`);
      console.log(`  device-offline: ${deviceOfflineCount}`);
      console.log(`  errors: ${errorCount}`);
      console.log(`  devices found: ${discovered.length}\n`);
      
      if (discovered.length === 0) {
        console.log('⚠ No Kasa devices found. Possible reasons:');
        console.log('  • No Kasa devices on network');
        console.log('  • Devices not powered on');
        console.log('  • Devices on different subnet/VLAN');
        console.log('  • Firewall blocking UDP port 9999');
        console.log('  • Network doesn\'t support broadcast');
        console.log('');
      }
      
      resolve(discovered);
    }, 8000);
  });
}

// Test Tapo cloud discovery
async function testTapoDiscovery() {
  console.log('Testing Tapo Discovery:');
  console.log('-'.repeat(60));
  
  const username = process.env.TAPO_EMAIL;
  const password = process.env.TAPO_PASSWORD;
  
  if (!username || !password) {
    console.log('⚠ Skipped - No credentials provided');
    console.log('Set TAPO_EMAIL and TAPO_PASSWORD environment variables\n');
    return [];
  }
  
  try {
    console.log(`Attempting login with: ${username}`);
    const cloudClient = await cloudLogin(username, password);
    console.log('✓ Cloud login successful\n');
    
    console.log('Fetching device list...');
    const deviceList = await cloudClient.listDevicesByType('SMART.TAPOPLUG');
    console.log(`Found ${deviceList.length} device(s)\n`);
    
    if (deviceList.length === 0) {
      console.log('⚠ No Tapo devices found on account');
      console.log('  • Check devices are registered in Tapo app');
      console.log('  • Verify account has device access\n');
    }
    
    const discovered = deviceList.map((device, index) => {
      const deviceInfo = {
        name: device.alias || device.deviceName || 'Unknown',
        ip: device.deviceIp || 'N/A',
        model: device.deviceModel || device.deviceType || 'Tapo',
        deviceId: device.deviceId,
        mac: device.deviceMac,
        fwVer: device.fwVer
      };
      
      console.log(`[${index + 1}] ${deviceInfo.name}`);
      console.log(`  Model: ${deviceInfo.model}`);
      console.log(`  IP: ${deviceInfo.ip}`);
      console.log(`  MAC: ${deviceInfo.mac}`);
      console.log(`  Device ID: ${deviceInfo.deviceId}`);
      console.log('');
      
      return deviceInfo;
    });
    
    return discovered;
  } catch (error) {
    console.log(`✗ Tapo discovery failed: ${error.message}`);
    console.log(`  Error code: ${error.code || 'N/A'}`);
    console.log(`  Stack: ${error.stack}\n`);
    return [];
  }
}

// Test library versions
function checkLibraryVersions() {
  console.log('Library versions:');
  try {
    const kasaPkg = require('tplink-smarthome-api/package.json');
    console.log(`  tplink-smarthome-api: ${kasaPkg.version}`);
  } catch (e) {
    console.log('  tplink-smarthome-api: unable to detect');
  }
  
  try {
    const tapoPkg = require('tp-link-tapo-connect/package.json');
    console.log(`  tp-link-tapo-connect: ${tapoPkg.version}`);
  } catch (e) {
    console.log('  tp-link-tapo-connect: unable to detect');
  }
  console.log('');
}

// Run all diagnostics
async function runDiagnostics() {
  try {
    checkLibraryVersions();
    
    const udpWorks = await testUDPBroadcast();
    
    if (!udpWorks) {
      console.log('\n⚠ WARNING: UDP broadcast not working. Kasa discovery will fail.');
      console.log('Check Windows Firewall or antivirus settings.\n');
    }
    
    const kasaDevices = await testKasaDiscovery();
    const tapoDevices = await testTapoDiscovery();
    
    // Final summary
    console.log('='.repeat(60));
    console.log('DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    console.log(`Kasa devices found: ${kasaDevices.length}`);
    console.log(`Tapo devices found: ${tapoDevices.length}`);
    console.log(`Total: ${kasaDevices.length + tapoDevices.length}`);
    console.log('');
    
    // Expected vs actual
    const expectedKasa = 1;
    const expectedTapo = 2;
    
    console.log(`Expected devices: ${expectedKasa} Kasa, ${expectedTapo} Tapo`);
    
    if (kasaDevices.length < expectedKasa) {
      console.log(`\n⚠ Missing ${expectedKasa - kasaDevices.length} Kasa device(s)`);
    }
    
    if (tapoDevices.length < expectedTapo) {
      console.log(`⚠ Missing ${expectedTapo - tapoDevices.length} Tapo device(s)`);
    }
    
    if (kasaDevices.length === expectedKasa && tapoDevices.length === expectedTapo) {
      console.log('\n✓ All expected devices found!');
    }
    
    console.log('');
    
    // If plugin scan fails but this test works, suggest integration issues
    if (kasaDevices.length > 0 || tapoDevices.length > 0) {
      console.log('If plugin scan button doesn\'t work but this test does,');
      console.log('the issue is in the Stream Deck integration layer.');
      console.log('Check:');
      console.log('  • WebSocket connection between plugin and property inspector');
      console.log('  • sendToPlugin message handling');
      console.log('  • sendToPropertyInspector response');
      console.log('  • Browser console in property inspector (F12)');
    }
    
  } catch (error) {
    console.error('\n✗ Diagnostic failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run diagnostics
runDiagnostics()
  .then(() => {
    console.log('\nDiagnostics complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
