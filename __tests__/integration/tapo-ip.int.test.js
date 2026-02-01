const runScript = require('./run-script.template');

test('tapo-ip script runs (integration)', () => {
  const { status } = runScript('test-tapo-ip.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
