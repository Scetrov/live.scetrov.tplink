const { Client } = require('tplink-smarthome-api');

console.log('Testing HS110 (Kasa) Discovery...\n');

async function testKasaDiscovery() {
    console.log('1. Creating Kasa client...');
    const client = new Client();
    
    console.log('2. Starting discovery with extended timeout...');
    const discovered = [];
    
    return new Promise((resolve) => {
        // Use longer timeout for thorough discovery
        const timeout = setTimeout(() => {
            client.stopDiscovery();
            console.log(`\nDiscovery complete: found ${discovered.length} Kasa device(s)`);
            resolve(discovered);
        }, 10000); // 10 second discovery window
        
        client.startDiscovery().on('device-new', (device) => {
            console.log(`\nFound device: ${device.host}`);
            
            device.getSysInfo().then((info) => {
                const deviceInfo = {
                    name: info.alias || 'Unknown Device',
                    type: 'kasa',
                    ip: device.host,
                    model: info.model || 'Unknown',
                    deviceId: info.deviceId,
                    mac: info.mac,
                    hw_ver: info.hw_ver,
                    sw_ver: info.sw_ver
                };
                discovered.push(deviceInfo);
                console.log(`  Name: ${deviceInfo.name}`);
                console.log(`  Model: ${deviceInfo.model}`);
                console.log(`  MAC: ${deviceInfo.mac}`);
                console.log(`  Hardware: ${deviceInfo.hw_ver}`);
                console.log(`  Software: ${deviceInfo.sw_ver}`);
                console.log(`  Device ID: ${deviceInfo.deviceId}`);
            }).catch((err) => {
                console.error(`  Error getting device info: ${err.message}`);
                // Still add basic info
                discovered.push({
                    name: 'Unknown Device',
                    type: 'kasa',
                    ip: device.host,
                    model: 'Unknown',
                    error: err.message
                });
            });
        }).on('error', (err) => {
            console.error('Discovery error:', err.message);
        });
        
        console.log('Discovery started - listening for devices...');
    });
}

async function testDirectConnection() {
    console.log('\n3. Testing direct connection methods...');
    
    // Get local subnet and try common Kasa addresses
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const subnets = new Set();
    
    for (const [name, addrs] of Object.entries(interfaces)) {
        for (const addr of addrs) {
            if (addr.family === 'IPv4' && !addr.internal) {
                const parts = addr.address.split('.');
                const prefix = parts.slice(0, 3).join('.');
                subnets.add(prefix);
                console.log(`Local subnet detected: ${prefix}.x`);
            }
        }
    }
    
    // Test common HS110 ports and responses
    const net = require('net');
    
    function testPort(ip, port, timeout = 1000) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(timeout);
            
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
            
            socket.connect(port, ip);
        });
    }
    
    // Scan common IPs for port 9999 (Kasa default)
    for (const subnet of subnets) {
        console.log(`\nScanning ${subnet}.x for Kasa devices on port 9999...`);
        const promises = [];
        
        for (let i = 1; i <= 254; i++) {
            const ip = `${subnet}.${i}`;
            promises.push(
                testPort(ip, 9999, 500).then(open => ({ ip, open }))
            );
        }
        
        const results = await Promise.all(promises);
        const openPorts = results.filter(r => r.open);
        
        for (const result of openPorts) {
            console.log(`  Port 9999 open at ${result.ip} - potential Kasa device`);
            
            // Try to connect directly
            try {
                const client = new Client();
                const device = client.getDevice({ host: result.ip });
                const info = await device.getSysInfo();
                console.log(`    Confirmed Kasa device: ${info.alias} (${info.model})`);
            } catch (err) {
                console.log(`    Connection failed: ${err.message}`);
            }
        }
    }
}

async function main() {
    try {
        await testKasaDiscovery();
        await testDirectConnection();
    } catch (error) {
        console.error('Test failed:', error);
    }
}

main();