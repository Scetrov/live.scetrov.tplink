const runScript = require('./run-script.template');

test('hs110 advanced script runs (integration)', () => {
  const { status } = runScript('test-hs110-advanced.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
