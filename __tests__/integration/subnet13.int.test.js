const runScript = require('./run-script.template');

test('subnet13 scan script runs (integration)', () => {
  const { status } = runScript('test-subnet13-scan.js');
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
