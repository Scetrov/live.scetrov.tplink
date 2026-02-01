const runScript = require('./run-script.template');

test('hs110 direct script runs (integration)', () => {
  const { status } = runScript('test-hs110-direct.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
