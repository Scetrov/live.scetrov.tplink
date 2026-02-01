const runScript = require('./run-script.template');

test('tapo simple script runs (integration)', () => {
  const { status } = runScript('test-tapo-simple.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
