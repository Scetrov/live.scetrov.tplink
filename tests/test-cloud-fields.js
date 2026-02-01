/**
 * Debug test to see exactly what fields the TP-Link cloud API returns
 * This will help us understand why the IP address is missing
 * 
 * Usage:
 *   $env:TAPO_EMAIL="your@email.com"
 *   $env:TAPO_PASSWORD="yourpassword"
 *   node tests/test-cloud-fields.js
 */

const { cloudLogin } = require('tp-link-tapo-connect');

async function main() {
  const email = process.env.TAPO_EMAIL;
  const password = process.env.TAPO_PASSWORD;
  
  if (!email || !password) {
    console.log('ERROR: Set TAPO_EMAIL and TAPO_PASSWORD environment variables first');
    console.log('');
    console.log('Example:');
    console.log('  $env:TAPO_EMAIL="your@email.com"');
    console.log('  $env:TAPO_PASSWORD="yourpassword"');
    console.log('  node tests/test-cloud-fields.js');
    process.exit(1);
  }
  
  console.log('TP-Link Cloud API Field Analysis');
  console.log('='.repeat(60));
  console.log(`Logging in as: ${email}\n`);
  
  try {
    const cloudClient = await cloudLogin(email, password);
    console.log('✓ Login successful\n');
    
    // Get all device types to be thorough
    const plugs = await cloudClient.listDevicesByType('SMART.TAPOPLUG');
    
    console.log(`Found ${plugs.length} SMART.TAPOPLUG device(s)\n`);
    
    plugs.forEach((device, index) => {
      console.log('='.repeat(60));
      console.log(`DEVICE ${index + 1}`);
      console.log('='.repeat(60));
      
      // Sort keys for easier reading
      const keys = Object.keys(device).sort();
      
      keys.forEach(key => {
        const value = device[key];
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        // Highlight IP-related fields
        if (key.toLowerCase().includes('ip')) {
          console.log(`  *** ${key}: ${valueStr} ***`);
        } else {
          console.log(`  ${key}: ${valueStr}`);
        }
      });
      
      console.log('');
      
      // Summary
      console.log('SUMMARY:');
      console.log(`  Name: ${device.alias || device.deviceName || 'Unknown'}`);
      console.log(`  Model: ${device.deviceModel || device.deviceType || 'Unknown'}`);
      console.log(`  Device ID: ${device.deviceId || 'Unknown'}`);
      console.log(`  IP Address: ${device.deviceIp || device.ip || 'NOT PROVIDED'}`);
      console.log(`  MAC: ${device.deviceMac || device.mac || 'Unknown'}`);
      console.log('');
    });
    
    // Check if there are other methods on the cloud client
    console.log('='.repeat(60));
    console.log('Available methods on cloudClient:');
    console.log('='.repeat(60));
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(cloudClient))
      .filter(m => m !== 'constructor' && typeof cloudClient[m] === 'function');
    methods.forEach(m => console.log(`  - ${m}()`));
    
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
  }
}

main();
