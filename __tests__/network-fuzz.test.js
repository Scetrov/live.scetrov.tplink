const fc = require("fast-check");
const { DeviceManager } = require("../plugin");

const octet = fc.integer({ min: 0, max: 255 });
const prefixLength = fc.integer({ min: 0, max: 32 });

function prefixToNetmask(prefix) {
  return Array.from({ length: 4 }, (_, index) => {
    const remainingBits = Math.max(0, Math.min(8, prefix - index * 8));
    return remainingBits === 0 ? 0 : (256 - 2 ** (8 - remainingBits)) & 255;
  }).join(".");
}

describe("network parsing fuzz tests", () => {
  const deviceManager = new DeviceManager();

  test("CIDR conversion round-trips every valid prefix length", () => {
    fc.assert(
      fc.property(prefixLength, (prefix) => {
        expect(deviceManager.netmaskToCIDR(prefixToNetmask(prefix))).toBe(
          prefix,
        );
      }),
    );
  });

  test("network addresses never retain host bits", () => {
    fc.assert(
      fc.property(
        octet,
        octet,
        octet,
        octet,
        prefixLength,
        (a, b, c, d, prefix) => {
          const ip = `${a}.${b}.${c}.${d}`;
          const netmask = prefixToNetmask(prefix);
          const network = deviceManager.getNetworkAddress(ip, netmask);
          const networkOctets = network.split(".").map(Number);
          const maskOctets = netmask.split(".").map(Number);

          expect(networkOctets).toHaveLength(4);
          networkOctets.forEach((part, index) => {
            expect(part & (~maskOctets[index] & 255)).toBe(0);
          });
        },
      ),
    );
  });
});
