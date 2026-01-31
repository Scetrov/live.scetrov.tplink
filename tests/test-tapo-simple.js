/**
 * Simple Tapo Test
 * Directly tests Tapo login and device discovery
 */

const { cloudLogin } = require('tp-link-tapo-connect');

async function testTapo() {
  const username = process.env.TAPO_EMAIL;
  const password = process.env.TAPO_PASSWORD;
  
  console.log('Simple Tapo Discovery Test\n');
  console.log(`Email: ${username || '(not set)'}`);
  console.log(`Password: ${password ? '***' + password.slice(-3) : '(not set)'}\n`);
  
  if (!username || !password) {
    console.log('ERROR: Please set TAPO_EMAIL and TAPO_PASSWORD environment variables');
    console.log('\nExample:');
    console.log('  $env:TAPO_EMAIL="your@email.com"');
    console.log('  $env:TAPO_PASSWORD="yourpassword"');
    console.log('  node test-tapo-simple.js');
    process.exit(1);
  }
  
  try {
    console.log('Step 1: Logging in to TP-Link cloud...');
    const cloudClient = await cloudLogin(username, password);
    console.log('✓ Login successful!\n');
    
    console.log('Step 2: Fetching device list...');
    const deviceList = await cloudClient.listDevicesByType('SMART.TAPOPLUG');
    console.log(`✓ Found ${deviceList.length} device(s)\n`);
    
    if (deviceList.length === 0) {
      console.log('⚠ No Tapo devices found on this account');
      console.log('Check:');
      console.log('  • Devices are added in Tapo mobile app');
      console.log('  • Using the correct TP-Link account');
      console.log('  • Account has device permissions');
    } else {
      console.log('Devices found:\n');
      deviceList.forEach((device, i) => {
        console.log(`Device ${i + 1}:`);
        console.log(`  Name: ${device.alias || device.deviceName || 'Unknown'}`);
        console.log(`  Model: ${device.deviceModel || device.deviceType || 'N/A'}`);
        console.log(`  IP: ${device.deviceIp || 'N/A'}`);
        console.log(`  Device ID: ${device.deviceId || 'N/A'}`);
        console.log(`  MAC: ${device.deviceMac || 'N/A'}`);
        console.log(`  Status: ${device.status === 1 ? 'Online' : 'Offline'}`);
        console.log('');
      });
      
      console.log(`✓ SUCCESS: Found ${deviceList.length} Tapo device(s)`);
      console.log('\nThis confirms:');
      console.log('  • Tapo library is working');
      console.log('  • Credentials are correct');
      console.log('  • Devices are accessible');
      console.log('\nIf plugin scan still fails, check Stream Deck integration.');
    }
    
  } catch (error) {
    console.log('✗ Test failed!\n');
    console.log(`Error: ${error.message}`);
    console.log(`Type: ${error.name}`);
    
    if (error.errorCode) {
      console.log(`Error Code: ${error.errorCode}`);
    }
    
    console.log('\nCommon issues:');
    console.log('  • Invalid email or password');
    console.log('  • Account doesn\'t exist');
    console.log('  • Two-factor authentication enabled');
    console.log('  • Network/firewall blocking TP-Link cloud');
    console.log('  • Internet connection issue');
    
    console.log('\nFull error:');
    console.log(error);
    
    process.exit(1);
  }
}

testTapo()
  .then(() => {
    console.log('\nTest complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
