const { execSync } = require('child_process');
const os = require('os');
const net = require('net');
const { Client } = require('tplink-smarthome-api');

console.log('Testing updated subnet discovery logic...\n');

// Replicate the updated getLocalSubnets() logic
function getLocalSubnets() {
    const subnets = new Set();
    const interfaces = os.networkInterfaces();
    
    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          // Extract subnet prefix (first 3 octets for /24, adjust for larger)
          const parts = addr.address.split('.');
          const prefix = parts.slice(0, 3).join('.');
          subnets.add(prefix);
          
          // For larger subnets (like /16), add nearby subnets
          if (addr.netmask === '255.255.0.0') {
            const base = parseInt(parts[2]);
            // Scan a wider range for /16 networks to catch devices on different subnets
            for (let i = Math.max(0, base - 15); i <= Math.min(255, base + 15); i++) {
              subnets.add(`${parts[0]}.${parts[1]}.${i}`);
            }
          }
        }
      }
    }
    
    return Array.from(subnets);
}

console.log('1. Testing subnet detection:');
const subnets = getLocalSubnets();
console.log(`   Found ${subnets.length} subnets to scan:`);
subnets.forEach(s => console.log(`   - ${s}.x`));

// Check if 10.229.13 is included
if (subnets.includes('10.229.13')) {
    console.log('\n   ✓ 10.229.13 is included in scan range!');
} else {
    console.log('\n   ✗ 10.229.13 is NOT included in scan range');
}

async function testPort9999OnHS110() {
    console.log('\n2. Testing if port 9999 is open on 10.229.13.3...');
    
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        
        socket.on('connect', () => {
            console.log('   ✓ Port 9999 is open');
            socket.end();
            resolve(true);
        });
        
        socket.on('timeout', () => {
            console.log('   ✗ Port 9999 connection timeout');
            socket.destroy();
            resolve(false);
        });
        
        socket.on('error', (err) => {
            console.log(`   ✗ Port 9999 connection error: ${err.message}`);
            resolve(false);
        });
        
        socket.connect(9999, '10.229.13.3');
    });
}

async function testKasaDiscovery() {
    console.log('\n3. Testing Kasa UDP discovery (5 seconds)...');
    
    const client = new Client();
    const discovered = [];
    
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            client.stopDiscovery();
            resolve(discovered);
        }, 5000);
        
        client.startDiscovery().on('device-new', (device) => {
            device.getSysInfo().then((info) => {
                console.log(`   Found: ${info.alias} at ${device.host} (${info.model})`);
                discovered.push({
                    name: info.alias,
                    ip: device.host,
                    model: info.model
                });
            }).catch(err => {
                console.log(`   Found device at ${device.host} but couldn't get info`);
            });
        });
    });
}

async function main() {
    const portOpen = await testPort9999OnHS110();
    const discovered = await testKasaDiscovery();
    
    console.log(`\n4. Summary:`);
    console.log(`   UDP discovery found ${discovered.length} device(s)`);
    
    if (discovered.length > 0) {
        const foundHS110 = discovered.find(d => d.ip === '10.229.13.3');
        if (foundHS110) {
            console.log('   ✓ HS110 was found via UDP discovery!');
        } else {
            console.log('   ✗ HS110 was NOT found via UDP discovery');
            console.log('   Devices found were at:', discovered.map(d => d.ip).join(', '));
        }
    } else {
        console.log('   ✗ No devices found via UDP discovery');
        if (portOpen) {
            console.log('   Note: Port 9999 is open, but UDP broadcast might be blocked');
        }
    }
}

main().catch(console.error);
