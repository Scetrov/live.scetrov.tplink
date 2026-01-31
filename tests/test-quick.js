/**
 * Quick Device Discovery Test
 * Simple, focused test to quickly verify device discovery works
 */

const { Client: KasaClient } = require('tplink-smarthome-api');
const { cloudLogin } = require('tp-link-tapo-connect');

console.log('Quick Device Discovery Test\n');

// Test 1: Kasa Discovery
console.log('1. Testing Kasa device discovery...');
const kasaClient = new KasaClient();
const kasaDevices = [];

kasaClient.startDiscovery().on('device-new', async (device) => {
  try {
    const info = await device.getSysInfo();
    kasaDevices.push({
      name: info.alias,
      ip: device.host,
      model: info.model
    });
    console.log(`   ✓ Found Kasa: ${info.alias} at ${device.host}`);
  } catch (err) {
    console.log(`   ✗ Error: ${err.message}`);
  }
});

setTimeout(async () => {
  kasaClient.stopDiscovery();
  console.log(`   Total Kasa devices: ${kasaDevices.length}\n`);
  
  // Test 2: Tapo Discovery (if credentials provided)
  const tapoEmail = process.env.TAPO_EMAIL;
  const tapoPassword = process.env.TAPO_PASSWORD;
  
  if (tapoEmail && tapoPassword) {
    console.log('2. Testing Tapo device discovery...');
    try {
      const cloudClient = await cloudLogin(tapoEmail, tapoPassword);
      const deviceList = await cloudClient.getDeviceList();
      console.log(`   ✓ Logged in to cloud`);
      console.log(`   Total Tapo devices: ${deviceList.length}`);
      
      deviceList.forEach((device, i) => {
        console.log(`   ${i + 1}. ${device.alias || device.deviceName} at ${device.deviceIp || 'N/A'}`);
      });
    } catch (err) {
      console.log(`   ✗ Tapo error: ${err.message}`);
    }
  } else {
    console.log('2. Skipping Tapo (no credentials)');
    console.log('   Set TAPO_EMAIL and TAPO_PASSWORD to test');
  }
  
  console.log('\nTest complete!');
  process.exit(0);
}, 5000);
