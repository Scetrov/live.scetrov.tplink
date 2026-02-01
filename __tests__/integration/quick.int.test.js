const runScript = require('./run-script.template');

test('quick script runs (integration)', () => {
  const { status } = runScript('test-quick.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
