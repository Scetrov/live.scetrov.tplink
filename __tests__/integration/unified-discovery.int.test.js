const runScript = require('./run-script.template');

test('unified discovery script runs (integration)', () => {
  const { status } = runScript('test-unified-discovery.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
