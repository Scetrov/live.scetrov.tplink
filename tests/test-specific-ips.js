const { Client } = require('tplink-smarthome-api');

console.log('Testing specific TP-Link IPs found in ARP table...\n');

const tpLinkIPs = [
    '10.229.5.75',   // 3c-6a-9d-18-97-84
    '10.229.5.140',  // 3c-6a-9d-1f-0a-b5  
    '10.229.5.173',  // 3c-6a-9d-16-a8-68
    '10.229.10.2'    // 40-8d-5c-d1-a8-f6
];

async function testSpecificIP(ip) {
    console.log(`Testing ${ip}...`);
    
    // Test if port 9999 is open (Kasa)
    const net = require('net');
    const portOpen = await new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        
        socket.on('connect', () => {
            socket.end();
            resolve(true);
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        
        socket.on('error', () => {
            resolve(false);
        });
        
        socket.connect(9999, ip);
    });
    
    console.log(`  Port 9999 open: ${portOpen}`);
    
    if (portOpen) {
        // Try to get device info
        try {
            const client = new Client();
            const device = client.getDevice({ host: ip });
            
            console.log('  Attempting to get device info...');
            const info = await device.getSysInfo();
            
            console.log(`  SUCCESS! Found Kasa device:`);
            console.log(`    Name: ${info.alias || 'Unknown'}`);
            console.log(`    Model: ${info.model || 'Unknown'}`);
            console.log(`    MAC: ${info.mac || 'Unknown'}`);
            console.log(`    Device ID: ${info.deviceId || 'Unknown'}`);
            console.log(`    Hardware: ${info.hw_ver || 'Unknown'}`);
            console.log(`    Software: ${info.sw_ver || 'Unknown'}`);
            
            // Check if it's an HS110
            if (info.model && info.model.includes('110')) {
                console.log(`  *** THIS IS LIKELY YOUR HS110! ***`);
            }
            
            return { ip, success: true, info };
            
        } catch (error) {
            console.log(`  Kasa connection failed: ${error.message}`);
        }
    }
    
    // Test port 80 (might be Tapo)
    const port80Open = await new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        
        socket.on('connect', () => {
            socket.end();
            resolve(true);
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        
        socket.on('error', () => {
            resolve(false);
        });
        
        socket.connect(80, ip);
    });
    
    console.log(`  Port 80 open: ${port80Open} ${port80Open ? '(likely Tapo)' : ''}`);
    console.log('');
    
    return { ip, success: false };
}

async function main() {
    const results = [];
    
    for (const ip of tpLinkIPs) {
        const result = await testSpecificIP(ip);
        results.push(result);
    }
    
    console.log('\nSUMMARY:');
    const kasaDevices = results.filter(r => r.success);
    console.log(`Found ${kasaDevices.length} Kasa device(s)`);
    
    if (kasaDevices.length === 0) {
        console.log('No Kasa devices found. Possible reasons:');
        console.log('1. HS110 might be offline or in a different network segment');
        console.log('2. HS110 might be configured for a different protocol');
        console.log('3. Firewall might be blocking port 9999');
        console.log('4. HS110 might need to be reset and reconfigured');
    }
}

main().catch(console.error);