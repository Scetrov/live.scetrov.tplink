/**
 * Test the new CIDR calculation logic
 * Verifies that proper CIDR ranges are computed for various network configurations
 */

const os = require('os');

// Replicate the new CIDR calculation methods
class SubnetCalculator {
  netmaskToCIDR(netmask) {
    const parts = netmask.split('.').map(Number);
    let cidr = 0;
    for (const part of parts) {
      const binary = part.toString(2);
      cidr += (binary.match(/1/g) || []).length;
    }
    return cidr;
  }

  getNetworkAddress(ip, netmask) {
    const ipParts = ip.split('.').map(Number);
    const maskParts = netmask.split('.').map(Number);
    const networkParts = ipParts.map((part, i) => part & maskParts[i]);
    return networkParts.join('.');
  }

  getLocalSubnets() {
    const subnets = new Set();
    const interfaces = os.networkInterfaces();
    
    console.log('Detecting network interfaces and calculating CIDR ranges...\n');
    
    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const cidr = this.netmaskToCIDR(addr.netmask);
          const networkAddr = this.getNetworkAddress(addr.address, addr.netmask);
          
          console.log(`Interface: ${name}`);
          console.log(`  IP: ${addr.address}`);
          console.log(`  Netmask: ${addr.netmask}`);
          console.log(`  CIDR: /${cidr}`);
          console.log(`  Network: ${networkAddr}/${cidr}`);
          
          // Calculate all /24 subnets within this CIDR range
          const ipParts = addr.address.split('.').map(Number);
          const maskParts = addr.netmask.split('.').map(Number);
          const networkParts = networkAddr.split('.').map(Number);

          // Skip link-local, loopback, carrier-NAT and non-private ranges by default
          const shouldScan = (parts) => {
            const a = parts[0];
            const b = parts[1];
            if (a === 127) return false; // loopback
            if (a === 169 && b === 254) return false; // link-local
            if (a === 100 && b >= 64 && b <= 127) return false; // carrier NAT
            if (a === 10) return true;
            if (a === 192 && b === 168) return true;
            if (a === 172 && b >= 16 && b <= 31) return true;
            return false;
          };

          if (!shouldScan(networkParts)) {
            console.log(`    Skipping network ${networkAddr}/${cidr} (non-private or not useful)`);
            continue;
          }

          if (cidr >= 24) {
            // /24 or smaller - just scan this single /24 subnet
            const prefix = ipParts.slice(0, 3).join('.');
            subnets.add(prefix);
            console.log(`  Adding: ${prefix}.x (single /24)\n`);
          } else if (cidr >= 16) {
            // Between /16 and /24 - calculate all /24s in the range
            const networkParts = networkAddr.split('.').map(Number);
            const hostBits = 32 - cidr;
            const numSubnets = Math.pow(2, Math.max(0, hostBits - 8));
            
            const thirdOctetStart = networkParts[2];
            const thirdOctetBits = Math.max(0, 24 - cidr);
            const thirdOctetRange = Math.pow(2, thirdOctetBits);
            
            console.log(`  CIDR /${cidr}: will scan ${thirdOctetRange} /24 subnets`);
            console.log(`  Range: ${networkParts[0]}.${networkParts[1]}.${thirdOctetStart} to ${networkParts[0]}.${networkParts[1]}.${thirdOctetStart + thirdOctetRange - 1}`);
            
            const added = [];
            for (let i = 0; i < thirdOctetRange && i < 256; i++) {
              const thirdOctet = thirdOctetStart + i;
              if (thirdOctet <= 255) {
                const prefix = `${networkParts[0]}.${networkParts[1]}.${thirdOctet}`;
                subnets.add(prefix);
                added.push(`${prefix}.x`);
              }
            }
            console.log(`  Adding ${added.length} subnets: ${added.slice(0, 5).join(', ')}${added.length > 5 ? '...' : ''}\n`);
          } else {
            // /15 or larger - too big, use heuristic approach
            console.log(`  Large network (/${cidr}): using heuristic ±32 subnets`);
            const base = ipParts[2];
            const added = [];
            for (let i = Math.max(0, base - 32); i <= Math.min(255, base + 32); i++) {
              const prefix = `${ipParts[0]}.${ipParts[1]}.${i}`;
              subnets.add(prefix);
              added.push(`${prefix}.x`);
            }
            console.log(`  Adding ${added.length} subnets around ${ipParts[0]}.${ipParts[1]}.${base}.x\n`);
          }
        }
      }
    }
    
    return Array.from(subnets).sort();
  }
}

// Test specific subnets
console.log('='.repeat(70));
console.log('CIDR Calculation Test');
console.log('='.repeat(70));
console.log('');

const calc = new SubnetCalculator();

// Test netmask to CIDR conversion
console.log('Testing netmask to CIDR conversion:');
const testMasks = [
  ['255.255.255.0', 24],
  ['255.255.0.0', 16],
  ['255.255.255.128', 25],
  ['255.255.252.0', 22],
  ['255.255.240.0', 20]
];

testMasks.forEach(([mask, expected]) => {
  const result = calc.netmaskToCIDR(mask);
  const status = result === expected ? '✓' : '✗';
  console.log(`  ${status} ${mask} → /${result} (expected: /${expected})`);
});

console.log('\n' + '='.repeat(70));
console.log('');

// Get actual subnets
const subnets = calc.getLocalSubnets();

console.log('='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log(`Total /24 subnets to scan: ${subnets.length}`);
console.log('');

// Check for critical subnets
const criticalSubnets = ['10.229.13', '10.229.2'];
criticalSubnets.forEach(subnet => {
  if (subnets.includes(subnet)) {
    console.log(`✓ ${subnet}.x is included (HS110 subnet)`);
  } else {
    console.log(`✗ ${subnet}.x is NOT included (MISSING!)`);
  }
});

console.log('');
// Verify link-local and other un-useful ranges are NOT included
const disallowedPrefixes = ['169.', '127.', '100.64.'];
disallowedPrefixes.forEach(prefix => {
  const found = subnets.some(s => s.startsWith(prefix));
  if (found) {
    console.log(`✗ Found disallowed prefix ${prefix} in subnets - SHOULD be skipped`);
  } else {
    console.log(`✓ ${prefix} correctly excluded from scan list`);
  }
});

console.log('All subnets:');
subnets.forEach((subnet, i) => {
  if (i % 10 === 0) process.stdout.write('\n  ');
  process.stdout.write(`${subnet}.x `);
});
console.log('\n');
