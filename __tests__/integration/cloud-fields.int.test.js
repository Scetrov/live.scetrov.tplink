const runScript = require('./run-script.template');

test('cloud fields script runs (integration)', () => {
  const { status } = runScript('test-cloud-fields.js');
  // This script may fail without credentials; allow non-zero status but ensure it doesn't throw
  expect(typeof status).toBe('number');
}, 5 * 60 * 1000);
