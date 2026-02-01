const { DeviceManager } = require('../plugin');

jest.mock('tp-link-tapo-connect', () => ({
  cloudLogin: jest.fn(async (u, p) => ({
    listDevicesByType: async () => ([{ alias: 'CloudPlug', deviceId: 'cloud1', deviceMac: 'aa:bb:cc' }])
  })),
  loginDeviceByIp: jest.fn()
}));

const { cloudLogin } = require('tp-link-tapo-connect');

describe('Unified discovery (mocked internals)', () => {
  test('discoverAllDevices composes stages and returns aggregated results', async () => {
    const dm = new DeviceManager();

    // Mock Kasa discovery
    dm.discoverDevices = jest.fn(async () => [{ name: 'Kasa1', ip: '10.0.0.3', model: 'HS100' }]);

    // Mock ARP devices
    dm.getArpTableTpLinkDevices = jest.fn(() => [{ ip: '10.0.0.4', mac: '3c-6a-9d-xx' }]);

    // Mock network scanning
    dm.scanSubnetForTpLink = jest.fn(async (subnet) => [
      { ip: '10.0.0.50', tapoPort: true }
    ]);

    // Mock verifyTapoDevice
    dm.verifyTapoDevice = jest.fn(async (ip, u, p) => ({ name: 'TapoLocal', model: 'P110M', ip, deviceId: 'dev-local', verified: true }));

    const results = await dm.discoverAllDevices('me@example.com', 'pw', () => {});

    expect(results.kasa).toEqual(expect.arrayContaining([expect.objectContaining({ ip: '10.0.0.3' })]));
    expect(results.tapo).toEqual(expect.arrayContaining([expect.objectContaining({ ip: '10.0.0.50' })]));
    expect(cloudLogin).toHaveBeenCalledWith('me@example.com', 'pw');
  });
});
