const { DeviceManager } = require('../plugin');

// Mock tp-link-tapo-connect loginDeviceByIp
jest.mock('tp-link-tapo-connect', () => ({
  loginDeviceByIp: jest.fn(async (email, pwd, ip) => ({
    getDeviceInfo: async () => ({ nickname: 'Fake Tapo', model: 'P110M', device_id: 'dev123' })
  })),
  cloudLogin: jest.fn()
}));

const { loginDeviceByIp } = require('tp-link-tapo-connect');

describe('Tapo verification', () => {
  test('verifyTapoDevice returns device info when login succeeds', async () => {
    const dm = new DeviceManager();

    const info = await dm.verifyTapoDevice('10.0.0.50', 'me@example.com', 'pass');

    expect(info).toEqual(expect.objectContaining({ name: 'Fake Tapo', model: 'P110M', ip: '10.0.0.50', verified: true }));
    expect(loginDeviceByIp).toHaveBeenCalledWith('me@example.com', 'pass', '10.0.0.50');
  });
});
