const os = require('os');
const { DeviceManager } = require('../plugin');

describe('CIDR and subnet calculations', () => {
  test('netmaskToCIDR and getNetworkAddress', () => {
    const dm = new DeviceManager();
    expect(dm.netmaskToCIDR('255.255.255.0')).toBe(24);
    expect(dm.netmaskToCIDR('255.255.0.0')).toBe(16);
    expect(dm.netmaskToCIDR('255.255.240.0')).toBe(20);

    expect(dm.getNetworkAddress('10.229.2.10', '255.255.0.0')).toBe('10.229.0.0');
    expect(dm.getNetworkAddress('172.23.34.5', '255.255.240.0')).toBe('172.23.32.0');
  });

  test('shouldScanNetwork filters out link-local/loopback/carrier-NAT and non-private', () => {
    const dm = new DeviceManager();
    expect(dm.shouldScanNetwork([127, 0, 0, 1])).toBe(false); // loopback
    expect(dm.shouldScanNetwork([169, 254, 10, 5])).toBe(false); // link-local
    expect(dm.shouldScanNetwork([100, 64, 1, 1])).toBe(false); // carrier-NAT

    expect(dm.shouldScanNetwork([10, 1, 2, 3])).toBe(true);
    expect(dm.shouldScanNetwork([192, 168, 0, 5])).toBe(true);
    expect(dm.shouldScanNetwork([172, 16, 0, 1])).toBe(true);
    expect(dm.shouldScanNetwork([8, 8, 8, 8])).toBe(false); // public
  });

  test('getLocalSubnets respects skip rules and includes expected subnets', () => {
    const dm = new DeviceManager();

    // Mock os.networkInterfaces
    const orig = os.networkInterfaces;
    os.networkInterfaces = () => ({
      'eth0': [
        { address: '10.229.2.10', netmask: '255.255.0.0', family: 'IPv4', internal: false },
        { address: '169.254.208.1', netmask: '255.255.0.0', family: 'IPv4', internal: false },
        { address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', internal: false }
      ]
    });

    const subs = dm.getLocalSubnets();
    // Should include 10.229.13 (since /16 covers it)
    expect(subs).toContain('10.229.13');
    // Should include many 10.229.* /24s
    expect(subs).toContain('10.229.0');
    expect(subs).toContain('10.229.255');

    // Should NOT include 169.254.* (link-local)
    const has169 = subs.some(s => s.startsWith('169.254'));
    expect(has169).toBe(false);

    // Restore
    os.networkInterfaces = orig;
  });
});
