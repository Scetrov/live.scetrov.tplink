const runScript = require('./run-script.template');

test('broad scan script runs (integration)', () => {
  const { status } = runScript('test-broad-scan.js');
  expect(status).toBe(0);
}, 5 * 60 * 1000);
