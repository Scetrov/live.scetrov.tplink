/**
 * Full network scan for Tapo devices
 * Scans 10.229.x.x range for devices responding on port 80 (Tapo) or 9999 (Kasa)
 */

const net = require('net');

const TAPO_PORT = 80;
const KASA_PORT = 9999;

async function checkPort(ip, port, timeout = 300) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, ip);
  });
}

async function scanSubnet(subnet) {
  const results = { tapo: [], kasa: [] };
  
  console.log(`\nScanning ${subnet}.1-254...`);
  
  // Scan in batches of 50 to avoid overwhelming the network
  for (let batch = 0; batch < 6; batch++) {
    const start = batch * 50 + 1;
    const end = Math.min((batch + 1) * 50, 254);
    
    process.stdout.write(`  IPs ${start}-${end}: `);
    
    const promises = [];
    for (let i = start; i <= end; i++) {
      const ip = `${subnet}.${i}`;
      promises.push(
        Promise.all([
          checkPort(ip, TAPO_PORT).then(ok => ok ? { ip, port: TAPO_PORT } : null),
          checkPort(ip, KASA_PORT).then(ok => ok ? { ip, port: KASA_PORT } : null)
        ])
      );
    }
    
    const batchResults = await Promise.all(promises);
    let tapoCount = 0, kasaCount = 0;
    
    batchResults.forEach(([tapo, kasa]) => {
      if (tapo) { results.tapo.push(tapo.ip); tapoCount++; }
      if (kasa) { results.kasa.push(kasa.ip); kasaCount++; }
    });
    
    console.log(`Tapo: ${tapoCount}, Kasa: ${kasaCount}`);
  }
  
  return results;
}

async function main() {
  console.log('Full Network Scan for TP-Link Devices');
  console.log('Scanning 10.229.x.x range');
  console.log('Port 80 = Tapo devices, Port 9999 = Kasa devices');
  
  const allTapo = [];
  const allKasa = [];
  
  // Scan common subnet patterns
  const subnets = [
    '10.229.0', '10.229.1', '10.229.2', 
    '10.229.10', '10.229.20', 
    '10.229.100', '10.229.101',
    '10.229.200'
  ];
  
  for (const subnet of subnets) {
    const results = await scanSubnet(subnet);
    allTapo.push(...results.tapo);
    allKasa.push(...results.kasa);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('RESULTS');
  console.log('='.repeat(50));
  
  console.log('\nPotential Tapo devices (port 80):');
  if (allTapo.length === 0) {
    console.log('  None found');
  } else {
    allTapo.forEach(ip => console.log(`  ${ip}`));
  }
  
  console.log('\nPotential Kasa devices (port 9999):');
  if (allKasa.length === 0) {
    console.log('  None found');
  } else {
    allKasa.forEach(ip => console.log(`  ${ip}`));
  }
  
  // Also try to get more info about found Tapo devices
  if (allTapo.length > 0) {
    console.log('\nNote: Tapo devices on port 80 are the smart plug candidates.');
    console.log('Try these IPs in the Stream Deck plugin.');
  }
}

main().catch(console.error);
