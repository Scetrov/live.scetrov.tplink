const runScript = require('./run-script.template');

test('specific-ips script runs (integration)', () => {
  const { status } = runScript('test-specific-ips.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
