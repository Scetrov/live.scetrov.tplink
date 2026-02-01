const runScript = require('./run-script.template');

test('device discovery script runs (integration)', () => {
  const { status } = runScript('test-device-discovery.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
