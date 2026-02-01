const { spawnSync } = require('child_process');
const path = require('path');

module.exports = function runScript(scriptName, timeout = 5 * 60 * 1000) {
  const scriptPath = path.resolve(__dirname, '..', '..', 'tests', scriptName);
  const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8', timeout });
  // Return { status, stdout, stderr }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};
