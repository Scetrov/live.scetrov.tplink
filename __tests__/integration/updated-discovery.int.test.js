const runScript = require('./run-script.template');

test('updated discovery script runs (integration)', () => {
  const { status } = runScript('test-updated-discovery.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
