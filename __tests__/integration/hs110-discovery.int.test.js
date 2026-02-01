const runScript = require('./run-script.template');

test('hs110 discovery script runs (integration)', () => {
  const { status } = runScript('test-hs110-discovery.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
