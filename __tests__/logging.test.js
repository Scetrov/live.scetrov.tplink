const {
  DeviceManager,
  handleSendToPlugin,
  sanitizeLogValue,
  setGlobalSettings,
  setWebSocketForTesting,
} = require('../plugin');

describe('log sanitization', () => {
  test.each([
    ['carriage returns', 'button-1\rforged entry', 'button-1forged entry'],
    ['line feeds', 'button-1\nforged entry', 'button-1forged entry'],
    ['combined line breaks', 'button-1\r\nforged entry', 'button-1forged entry'],
    ['other control characters', 'button\u0000\t\u001fentry', 'buttonentry'],
    ['ordinary printable text', 'button-1: healthy!', 'button-1: healthy!'],
  ])('neutralizes %s', (_description, input, expected) => {
    expect(sanitizeLogValue(input)).toBe(expected);
  });

  test('normalizes nullish and non-string values', () => {
    expect(sanitizeLogValue(null)).toBe('');
    expect(sanitizeLogValue(undefined)).toBe('');
    expect(sanitizeLogValue(42)).toBe('42');
  });
});

describe('safe diagnostics', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    setWebSocketForTesting(null);
  });

  test('keeps an externally influenced diagnostic to one logical record', async () => {
    const manager = new DeviceManager();
    await manager.initializeDevice('button-1\nforged entry', {});

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls.flat().join('')).not.toContain('\n');
  });

  test('does not expose credentials or serialize global settings in diagnostics', async () => {
    const sent = [];
    const email = 'secret@example.com';
    const password = 'correct horse battery staple';
    setWebSocketForTesting({ readyState: 1, send: (message) => sent.push(message) });

    setGlobalSettings({ tapoEmail: email, tapoPassword: password, startIp: '192.168.1.2' });
    await handleSendToPlugin('button-1', { action: 'getGlobalCredentials' });

    const diagnostics = logSpy.mock.calls.flat().join(' ');
    expect(diagnostics).not.toContain(email);
    expect(diagnostics).not.toContain(password);
    expect(diagnostics).not.toContain('tapoEmail');
    expect(diagnostics).not.toContain('tapoPassword');

    const response = JSON.parse(sent.at(-1)).payload;
    expect(response).toEqual({
      action: 'globalCredentialsRetrieved',
      credentialsConfigured: true,
    });
  });

  test('reports an unconfigured credential state without credential values', async () => {
    const sent = [];
    setWebSocketForTesting({ readyState: 1, send: (message) => sent.push(message) });
    setGlobalSettings({ tapoEmail: '', tapoPassword: '' });

    await handleSendToPlugin('button-1', { action: 'getGlobalCredentials' });

    expect(JSON.parse(sent.at(-1)).payload).toEqual({
      action: 'globalCredentialsRetrieved',
      credentialsConfigured: false,
    });
  });

  test('updates credential-presence state after saving and clearing credentials', async () => {
    const sent = [];
    setWebSocketForTesting({ readyState: 1, send: (message) => sent.push(message) });

    await handleSendToPlugin('button-1', {
      action: 'saveCredentials',
      email: 'secret@example.com',
      password: 'correct horse battery staple',
    });
    await handleSendToPlugin('button-1', { action: 'getGlobalCredentials' });
    expect(JSON.parse(sent.at(-1)).payload.credentialsConfigured).toBe(true);

    await handleSendToPlugin('button-1', { action: 'clearCredentials' });
    await handleSendToPlugin('button-1', { action: 'getGlobalCredentials' });
    expect(JSON.parse(sent.at(-1)).payload).toEqual({
      action: 'globalCredentialsRetrieved',
      credentialsConfigured: false,
    });
  });
});
