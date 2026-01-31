/**
 * Standalone test script for TP-Link device discovery
 * Tests both Kasa and Tapo device discovery independently
 * 
 * Usage:
 *   node test-device-discovery.js
 *   
 * For Tapo devices, set environment variables:
 *   $env:TAPO_EMAIL="your@email.com"
 *   $env:TAPO_PASSWORD="yourpassword"
 *   node test-device-discovery.js
 */

const { Client: KasaClient } = require('tplink-smarthome-api');
const { loginDeviceByIp, cloudLogin } = require('tp-link-tapo-connect');

/**
 * Test Kasa device discovery
 * Should find TP-Link Kasa smart plugs on the local network
 */
async function testKasaDiscovery() {
  console.log('='.repeat(60));
  console.log('Testing Kasa Device Discovery');
  console.log('='.repeat(60));
  
  const kasaClient = new KasaClient();
  const discovered = [];
  
  return new Promise((resolve) => {
    console.log('Starting discovery... (5 second timeout)');
    
    const timeout = setTimeout(() => {
      kasaClient.stopDiscovery();
      console.log(`\nDiscovery complete: found ${discovered.length} Kasa device(s)`);
      resolve(discovered);
    }, 5000);

    kasaClient.startDiscovery().on('device-new', (device) => {
      console.log(`\n[FOUND] Device discovered at ${device.host}`);
      
      device.getSysInfo().then((info) => {
        const deviceInfo = {
          name: info.alias || 'Unknown Device',
          type: 'kasa',
          ip: device.host,
          model: info.model || 'Unknown',
          deviceId: info.deviceId,
          mac: info.mac
        };
        discovered.push(deviceInfo);
        
        console.log(`  Name: ${deviceInfo.name}`);
        console.log(`  Model: ${deviceInfo.model}`);
        console.log(`  IP: ${deviceInfo.ip}`);
        console.log(`  MAC: ${deviceInfo.mac}`);
        console.log(`  Device ID: ${deviceInfo.deviceId}`);
      }).catch((err) => {
        console.error(`  Error getting device info: ${err.message}`);
      });
    });

    kasaClient.on('device-online', (device) => {
      console.log(`[ONLINE] Device came online: ${device.host}`);
    });

    kasaClient.on('device-offline', (device) => {
      console.log(`[OFFLINE] Device went offline: ${device.host}`);
    });
  });
}

/**
 * Test Tapo device discovery
 * Requires TP-Link cloud account credentials
 */
async function testTapoDiscovery() {
  console.log('\n' + '='.repeat(60));
  console.log('Testing Tapo Device Discovery');
  console.log('='.repeat(60));
  
  const username = process.env.TAPO_EMAIL;
  const password = process.env.TAPO_PASSWORD;
  
  if (!username || !password) {
    console.log('⚠ Skipping Tapo discovery - No credentials provided');
    console.log('  Set TAPO_EMAIL and TAPO_PASSWORD environment variables to test');
    return [];
  }
  
  try {
    console.log(`Logging in to TP-Link cloud with: ${username}`);
    const cloudClient = await cloudLogin(username, password);
    console.log('✓ Cloud login successful');
    
    console.log('Fetching device list from cloud...');
    const deviceList = await cloudClient.listDevicesByType('SMART.TAPOPLUG');
    console.log(`\nFound ${deviceList.length} Tapo device(s) on account\n`);
    
    const discovered = deviceList.map((device, index) => {
      const deviceInfo = {
        name: device.alias || device.deviceName || 'Unknown Device',
        type: 'tapo',
        ip: device.deviceIp || 'Unknown',
        model: device.deviceModel || device.deviceType || 'Tapo Device',
        deviceId: device.deviceId
      };
      
      console.log(`[DEVICE ${index + 1}]`);
      console.log(`  Name: ${deviceInfo.name}`);
      console.log(`  Model: ${deviceInfo.model}`);
      console.log(`  IP: ${deviceInfo.ip}`);
      console.log(`  Device ID: ${deviceInfo.deviceId}`);
      console.log('');
      
      return deviceInfo;
    });
    
    return discovered;
  } catch (error) {
    console.error(`✗ Tapo discovery failed: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
    return [];
  }
}

/**
 * Test device control for a discovered device
 */
async function testDeviceControl(kasaDevices, tapoDevices) {
  console.log('\n' + '='.repeat(60));
  console.log('Testing Device Control');
  console.log('='.repeat(60));
  
  // Test Kasa device if found
  if (kasaDevices.length > 0) {
    const testDevice = kasaDevices[0];
    console.log(`\nTesting Kasa device: ${testDevice.name} (${testDevice.ip})`);
    
    try {
      const kasaClient = new KasaClient();
      const device = await kasaClient.getDevice({ host: testDevice.ip });
      const sysInfo = await device.getSysInfo();
      const currentState = sysInfo.relay_state === 1;
      
      console.log(`  Current state: ${currentState ? 'ON' : 'OFF'}`);
      console.log('  ✓ Successfully connected and read state');
    } catch (error) {
      console.error(`  ✗ Control test failed: ${error.message}`);
    }
  }
  
  // Test Tapo device if found and credentials available
  if (tapoDevices.length > 0) {
    const testDevice = tapoDevices[0];
    const username = process.env.TAPO_EMAIL;
    const password = process.env.TAPO_PASSWORD;
    
    if (username && password && testDevice.ip !== 'Unknown') {
      console.log(`\nTesting Tapo device: ${testDevice.name} (${testDevice.ip})`);
      
      try {
        const device = await loginDeviceByIp(username, password, testDevice.ip);
        const deviceInfo = await device.getDeviceInfo();
        const currentState = deviceInfo.device_on;
        
        console.log(`  Current state: ${currentState ? 'ON' : 'OFF'}`);
        console.log('  ✓ Successfully connected and read state');
      } catch (error) {
        console.error(`  ✗ Control test failed: ${error.message}`);
      }
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\nTP-Link Device Discovery Test Suite');
  console.log('Started:', new Date().toISOString());
  console.log('\n');
  
  try {
    // Test Kasa discovery
    const kasaDevices = await testKasaDiscovery();
    
    // Test Tapo discovery
    const tapoDevices = await testTapoDiscovery();
    
    // Test device control
    await testDeviceControl(kasaDevices, tapoDevices);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log(`Kasa devices found: ${kasaDevices.length}`);
    console.log(`Tapo devices found: ${tapoDevices.length}`);
    console.log(`Total devices found: ${kasaDevices.length + tapoDevices.length}`);
    
    if (kasaDevices.length > 0) {
      console.log('\nKasa devices:');
      kasaDevices.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.name} (${d.ip}) - ${d.model}`);
      });
    }
    
    if (tapoDevices.length > 0) {
      console.log('\nTapo devices:');
      tapoDevices.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.name} (${d.ip}) - ${d.model}`);
      });
    }
    
    console.log('\nTest completed:', new Date().toISOString());
    
    // Verify expectations
    console.log('\n' + '='.repeat(60));
    console.log('Verification');
    console.log('='.repeat(60));
    
    const expectedKasa = 1;
    const expectedTapo = 2;
    const kasaMatch = kasaDevices.length === expectedKasa;
    const tapoMatch = tapoDevices.length === expectedTapo;
    
    console.log(`Expected: ${expectedKasa} Kasa device(s), ${expectedTapo} Tapo device(s)`);
    console.log(`Found: ${kasaDevices.length} Kasa device(s), ${tapoDevices.length} Tapo device(s)`);
    
    if (kasaMatch && tapoMatch) {
      console.log('\n✓ All expected devices found!');
    } else {
      console.log('\n⚠ Device count mismatch:');
      if (!kasaMatch) {
        console.log(`  Kasa: expected ${expectedKasa}, found ${kasaDevices.length}`);
      }
      if (!tapoMatch) {
        console.log(`  Tapo: expected ${expectedTapo}, found ${tapoDevices.length}`);
      }
    }
    
  } catch (error) {
    console.error('\n✗ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests().then(() => {
  console.log('\nExiting...');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
