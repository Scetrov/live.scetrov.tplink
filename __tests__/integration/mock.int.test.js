const runScript = require('./run-script.template');

test('mock script runs (integration)', () => {
  const { status } = runScript('test-mock.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
