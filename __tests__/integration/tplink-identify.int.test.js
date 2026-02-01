const runScript = require('./run-script.template');

test('tplink identify script runs (integration)', () => {
  const { status } = runScript('test-tplink-identify.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
