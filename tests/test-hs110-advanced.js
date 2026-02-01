const { Client } = require('tplink-smarthome-api');
const dgram = require('dgram');
const { execSync } = require('child_process');

console.log('Advanced HS110 Diagnostic Test\n');

async function testUDPBroadcast() {
    console.log('1. Testing UDP broadcast manually...');
    
    // The message that tplink-smarthome-api sends for discovery
    const discoveryMessage = JSON.stringify({
        "system": {
            "get_sysinfo": {}
        }
    });
    
    // Encrypt the message (basic XOR cipher used by TP-Link)
    function encrypt(plaintext) {
        let key = 0xAB;
        let result = Buffer.alloc(plaintext.length + 4);
        result.writeInt32BE(plaintext.length, 0);
        
        for (let i = 0; i < plaintext.length; i++) {
            const byte = plaintext.charCodeAt(i);
            result[i + 4] = byte ^ key;
            key = result[i + 4];
        }
        return result;
    }
    
    const encryptedMessage = encrypt(discoveryMessage);
    
    const socket = dgram.createSocket('udp4');
    const responses = [];
    
    return new Promise((resolve) => {
        socket.bind(0, () => {
            socket.setBroadcast(true);
            
            // Listen for responses
            socket.on('message', (msg, rinfo) => {
                console.log(`  UDP response from ${rinfo.address}:${rinfo.port}`);
                responses.push({ address: rinfo.address, port: rinfo.port, data: msg });
                
                // Try to decrypt response
                try {
                    let key = 0xAB;
                    const length = msg.readInt32BE(0);
                    let decrypted = '';
                    
                    for (let i = 4; i < Math.min(msg.length, length + 4); i++) {
                        const decryptedByte = msg[i] ^ key;
                        key = msg[i];
                        decrypted += String.fromCharCode(decryptedByte);
                    }
                    
                    const parsed = JSON.parse(decrypted);
                    if (parsed.system && parsed.system.get_sysinfo) {
                        const info = parsed.system.get_sysinfo;
                        console.log(`    Device: ${info.alias || 'Unknown'} (${info.model || 'Unknown'})`);
                        console.log(`    MAC: ${info.mac || 'Unknown'}`);
                        if (info.model && info.model.includes('110')) {
                            console.log(`    *** FOUND HS110! ***`);
                        }
                    }
                } catch (e) {
                    console.log(`    Could not decrypt response: ${e.message}`);
                }
            });
            
            // Send broadcast to common subnets
            const subnets = ['172.23.32', '169.254.208', '10.229.2', '172.19.192', '10.229.5', '10.229.0', '10.229.10'];
            
            for (const subnet of subnets) {
                const broadcastIP = `${subnet}.255`;
                console.log(`  Broadcasting to ${broadcastIP}:9999`);
                
                socket.send(encryptedMessage, 9999, broadcastIP, (err) => {
                    if (err) console.log(`    Error sending to ${broadcastIP}: ${err.message}`);
                });
            }
            
            // Also try general broadcast
            socket.send(encryptedMessage, 9999, '255.255.255.255', (err) => {
                if (err) console.log(`    Error sending general broadcast: ${err.message}`);
            });
            
            setTimeout(() => {
                socket.close();
                resolve(responses);
            }, 5000);
        });
    });
}

async function testFirewallAndNetwork() {
    console.log('\n2. Testing network configuration...');
    
    try {
        // Check if Windows Firewall might be blocking
        console.log('  Checking firewall status...');
        const firewallStatus = execSync('netsh advfirewall show allprofiles state', { encoding: 'utf8' });
        if (firewallStatus.includes('State                                 ON')) {
            console.log('  Windows Firewall is ON - this might block UDP discovery');
        } else {
            console.log('  Windows Firewall appears to be off');
        }
    } catch (e) {
        console.log('  Could not check firewall status');
    }
    
    try {
        // Check network interfaces
        console.log('  Network interfaces:');
        const interfaces = require('os').networkInterfaces();
        for (const [name, addrs] of Object.entries(interfaces)) {
            for (const addr of addrs) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    console.log(`    ${name}: ${addr.address}/${addr.netmask}`);
                }
            }
        }
    } catch (e) {
        console.log('  Could not enumerate network interfaces');
    }
}

async function testLibraryVersions() {
    console.log('\n3. Checking library versions...');
    
    try {
        const pkg = require('../package.json');
        console.log('  tplink-smarthome-api version:', pkg.dependencies['tplink-smarthome-api']);
        
        // Test if we can create a client
        const client = new Client();
        console.log('  Client created successfully');
        
        // Check default options
        console.log('  Default discovery options:');
        console.log('    Default timeout: should be 10000ms for discovery');
        console.log('    Default broadcast: should include local subnets');
        
    } catch (e) {
        console.log('  Error checking library:', e.message);
    }
}

async function main() {
    try {
        await testFirewallAndNetwork();
        await testLibraryVersions();
        
        const responses = await testUDPBroadcast();
        
        console.log(`\nFound ${responses.length} UDP response(s)`);
        
        if (responses.length === 0) {
            console.log('\nTROUBLESHOOTING SUGGESTIONS:');
            console.log('1. Check if HS110 is powered on and connected to Wi-Fi');
            console.log('2. Make sure HS110 is on the same network/VLAN as this computer');
            console.log('3. Try temporarily disabling Windows Firewall');
            console.log('4. Check if your router has AP isolation enabled (blocks device-to-device communication)');
            console.log('5. Try resetting HS110 and setting it up again with the Kasa app');
            console.log('6. Some enterprise networks block UDP broadcasts');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

main();