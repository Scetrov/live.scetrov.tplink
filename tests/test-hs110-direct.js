const { Client } = require('tplink-smarthome-api');

console.log('Testing direct connection to HS110 at 10.229.13.3...\n');

async function testDevice() {
    try {
        const client = new Client();
        const device = await client.getDevice({ host: '10.229.13.3' });
        
        console.log('Device object created successfully');
        console.log('Getting system info...');
        
        const info = await device.getSysInfo();
        
        console.log('\nSUCCESS! Device found:');
        console.log(`  Name: ${info.alias}`);
        console.log(`  Model: ${info.model}`);
        console.log(`  MAC: ${info.mac}`);
        console.log(`  Device ID: ${info.deviceId}`);
        console.log(`  Hardware: ${info.hw_ver}`);
        console.log(`  Software: ${info.sw_ver}`);
        
        return info;
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testDevice();
