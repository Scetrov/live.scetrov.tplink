const net = require('net');

console.log('Broad TCP Port 9999 Scan - Looking for any Kasa devices\n');

// Expand to scan more subnets based on your network interfaces
const subnetsToScan = [
    '172.23.32',    // vEthernet (Default Switch)
    '169.254.208',  // vEthernet (Pentesting Switch) - but likely won't have devices
    '10.229.2',     // vEthernet (External Switch)
    '10.229.0',     // Common network
    '10.229.1',     // Common network
    '10.229.5',     // Where we found some TP-Link devices
    '10.229.10',    // Where we found the Tapo device
    '192.168.1',    // Very common home network
    '192.168.0',    // Very common home network
    '172.19.192'    // vEthernet (WSL)
];

async function scanSubnetForPort9999(subnet) {
    console.log(`Scanning ${subnet}.x for port 9999...`);
    const promises = [];
    
    for (let i = 1; i <= 254; i++) {
        const ip = `${subnet}.${i}`;
        promises.push(testTCP(ip, 9999, 300));
    }
    
    const results = await Promise.all(promises);
    const openDevices = results.filter(r => r.open);
    
    if (openDevices.length > 0) {
        console.log(`  Found ${openDevices.length} device(s) with port 9999 open:`);
        for (const device of openDevices) {
            console.log(`    ${device.ip}`);
            
            // Try to identify it as a Kasa device
            await testKasaDevice(device.ip);
        }
    } else {
        console.log(`  No devices found with port 9999 open`);
    }
    
    return openDevices;
}

function testTCP(ip, port, timeout = 300) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            socket.end();
            resolve({ ip, open: true });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ ip, open: false });
        });
        
        socket.on('error', () => {
            resolve({ ip, open: false });
        });
        
        socket.connect(port, ip);
    });
}

async function testKasaDevice(ip) {
    try {
        const { Client } = require('tplink-smarthome-api');
        const client = new Client();
        const device = client.getDevice({ host: ip });
        
        const info = await device.getSysInfo();
        console.log(`      SUCCESS: ${info.alias} (${info.model}) - MAC: ${info.mac}`);
        
        if (info.model && info.model.toLowerCase().includes('hs110')) {
            console.log(`      *** THIS IS YOUR HS110! ***`);
        }
        
        return true;
    } catch (error) {
        console.log(`      Not a Kasa device or connection failed: ${error.message.substring(0, 50)}...`);
        return false;
    }
}

async function main() {
    let totalFound = 0;
    
    for (const subnet of subnetsToScan) {
        try {
            const devices = await scanSubnetForPort9999(subnet);
            totalFound += devices.length;
        } catch (error) {
            console.log(`  Error scanning ${subnet}: ${error.message}`);
        }
        console.log(''); // Empty line between subnets
    }
    
    console.log(`\nTOTAL: Found ${totalFound} device(s) with port 9999 open`);
    
    if (totalFound === 0) {
        console.log('\nYour HS110 might be:');
        console.log('1. On a different subnet not scanned above');
        console.log('2. Powered off or disconnected');
        console.log('3. Behind a firewall that blocks port 9999');
        console.log('4. In need of a factory reset');
        console.log('\nNext steps:');
        console.log('- Check what IP your HS110 has in your router admin panel');
        console.log('- Try the Kasa mobile app to see if it can find the device');
        console.log('- Try temporarily disabling Windows Firewall');
    }
}

main().catch(console.error);