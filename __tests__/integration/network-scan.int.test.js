const runScript = require('./run-script.template');

test('network scan script runs (integration)', () => {
  const { status } = runScript('test-network-scan.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
