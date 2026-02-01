const { DeviceManager } = require('../plugin');

describe('Subnet scanning (mocked checkPort)', () => {
  test('scanSubnetForTpLink returns found devices when checkPort indicates open ports', async () => {
    const dm = new DeviceManager();

    // Stub checkPort to return port80 true for .2 and port9999 true for .3
    dm.checkPort = jest.fn((ip, port) => {
      if (ip.endsWith('.2') && port === 80) return Promise.resolve(true);
      if (ip.endsWith('.3') && port === 9999) return Promise.resolve(true);
      return Promise.resolve(false);
    });

    const found = await dm.scanSubnetForTpLink('10.0.0');

    expect(found).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ip: '10.0.0.2', tapoPort: true }),
        expect.objectContaining({ ip: '10.0.0.3', kasaPort: true })
      ])
    );
  });
});
