// Mock child_process.execSync before importing the plugin so module-local bindings are mocked
jest.mock('child_process', () => ({ execSync: jest.fn() }));
const child_process = require('child_process');
const { DeviceManager } = require('../plugin');

describe('ARP table parsing', () => {
  test('parses TP-Link entries from arp -a output', () => {
    const sample = `Interface: 192.168.1.10 --- 0x8
      Internet Address      Physical Address      Type
      192.168.1.2           40-8d-5c-d1-a8-f6     dynamic
      192.168.1.3           aa-bb-cc-11-22-33     dynamic
      10.229.13.3           50:c7:bf:4b:e7:e3     dynamic
    `;

    child_process.execSync.mockImplementation(() => sample);

    const dm = new DeviceManager();
    const devices = dm.getArpTableTpLinkDevices();

    expect(devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ip: '192.168.1.2', mac: expect.stringMatching(/40[:\-]8d[:\-]5c/i) }),
        expect.objectContaining({ ip: '10.229.13.3', mac: expect.stringMatching(/50[:\-]c7[:\-]bf/i) })
      ])
    );

    child_process.execSync.mockRestore();
  });
});
