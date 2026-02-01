const runScript = require('./run-script.template');

test('diagnostics script runs (integration)', () => {
  const { status } = runScript('test-diagnostics.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
