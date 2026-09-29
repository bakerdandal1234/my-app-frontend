import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

let handleRequest = (config) => { throw new Error(`Unexpected request: ${config.url}`); };
const originalAdapter = axios.defaults.adapter;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
axios.defaults.adapter = (config) => Promise.resolve().then(() => handleRequest(config));
Object.defineProperty(globalThis, 'document', { configurable: true, value: { cookie: '' } });

// Install the fake transport before loading the client: no test can reach a real server.
const client = await import('../src/api/client.ts');
const auth = await import('../src/auth/api.ts');
const access = await import('../src/auth/authorization-api.ts');
const tokens = await import('../src/api/tokenStore.ts');
const { getCsrfToken } = await import('../src/api/csrf.ts');
const { getErrorMessage } = await import('../src/api/errors.ts');
const { InvalidApiResponseError } = await import('../src/api/validation.ts');

function response(config, data, status = 200) {
  const result = { config, data, status, statusText: String(status), headers: {} };
  if (status >= 400) throw new axios.AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, result);
  return result;
}
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
function body(config) {
  assert.equal(typeof config.data, 'string');
  return JSON.parse(config.data);
}
beforeEach(() => {
  tokens.setAccessToken('original-token');
  document.cookie = '';
  handleRequest = (config) => { throw new Error(`Unexpected request: ${config.url}`); };
});
after(() => {
  axios.defaults.adapter = originalAdapter;
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else delete globalThis.document;
});

test('CSRF reads the exact cookie and decodes its value', () => {
  document.cookie = 'other_csrf_token=wrong; csrf_token=a%2Bb%3D; other=value';
  assert.equal(getCsrfToken(), 'a+b=');
  document.cookie = 'other_csrf_token=wrong';
  assert.equal(getCsrfToken(), null);
});

test('concurrent refresh calls share one request without changing the auth version', async () => {
  const started = deferred();
  const release = deferred();
  const version = tokens.getAuthVersion();
  let calls = 0;
  document.cookie = 'csrf_token=csrf-value';
  handleRequest = async (config) => {
    assert.equal(config.url, '/auth/refresh');
    assert.equal(config.headers.get('X-CSRF-Token'), 'csrf-value');
    assert.equal(config.withCredentials, true);
    calls++;
    started.resolve();
    await release.promise;
    return response(config, { accessToken: 'refreshed-token' });
  };
  const first = client.refreshAccessToken();
  const second = client.refreshAccessToken();
  assert.equal(first, second);
  await started.promise;
  release.resolve();
  assert.deepEqual(await Promise.all([first, second]), ['refreshed-token', 'refreshed-token']);
  assert.equal(calls, 1);
  assert.equal(tokens.getAuthVersion(), version);
  assert.equal(tokens.getAccessToken(), 'refreshed-token');
});

test('parallel 401 responses refresh once and retry with the current bearer token', async () => {
  let refreshes = 0;
  let retries = 0;
  handleRequest = (config) => {
    if (config.url === '/auth/refresh') {
      refreshes++;
      return response(config, { accessToken: 'new-token' });
    }
    if (config.headers.get('Authorization') === 'Bearer original-token') return response(config, {}, 401);
    assert.equal(config.headers.get('Authorization'), 'Bearer new-token');
    retries++;
    return response(config, { ok: true });
  };
  await Promise.all([client.apiClient.get('/protected/first'), client.apiClient.get('/protected/second')]);
  assert.equal(refreshes, 1);
  assert.equal(retries, 2);
});

test('a retried 401 ends the session without a refresh loop', async () => {
  let refreshes = 0;
  let resourceCalls = 0;
  handleRequest = (config) => {
    if (config.url === '/auth/refresh') {
      refreshes++;
      return response(config, { accessToken: 'new-token' });
    }
    resourceCalls++;
    return response(config, {}, 401);
  };
  await assert.rejects(client.apiClient.get('/protected'), axios.isAxiosError);
  assert.equal(resourceCalls, 2);
  assert.equal(refreshes, 1);
  assert.equal(tokens.getAccessToken(), null);
});

test('refresh network failure preserves the existing local session', async () => {
  handleRequest = () => { throw new axios.AxiosError('Network unavailable', 'ERR_NETWORK'); };
  await assert.rejects(client.refreshAccessToken(), axios.isAxiosError);
  assert.equal(tokens.getAccessToken(), 'original-token');
});

for (const status of [401, 403]) {
  test(`refresh ${status} invalidates the current session`, async () => {
    handleRequest = (config) => response(config, {}, status);
    await assert.rejects(client.refreshAccessToken(), axios.isAxiosError);
    assert.equal(tokens.getAccessToken(), null);
  });
}

test('a malformed refresh token response cannot replace the existing token', async () => {
  handleRequest = (config) => response(config, { accessToken: 42 });
  await assert.rejects(client.refreshAccessToken(), InvalidApiResponseError);
  assert.equal(tokens.getAccessToken(), 'original-token');
});

test('logout waits for an in-flight refresh and prevents it from restoring the session', async () => {
  const started = deferred();
  const release = deferred();
  const calls = [];
  handleRequest = async (config) => {
    calls.push(config.url);
    if (config.url === '/auth/refresh') {
      started.resolve();
      await release.promise;
      return response(config, { accessToken: 'obsolete-token' });
    }
    assert.equal(config.url, '/auth/logout');
    return response(config);
  };
  const refresh = client.refreshAccessToken();
  const rejectedRefresh = assert.rejects(refresh, axios.isCancel);
  await started.promise;
  const logout = client.logoutSession();
  assert.equal(tokens.getAccessToken(), null);
  assert.deepEqual(calls, ['/auth/refresh']);
  release.resolve();
  await Promise.all([rejectedRefresh, logout]);
  assert.deepEqual(calls, ['/auth/refresh', '/auth/logout']);
  assert.equal(tokens.getAccessToken(), null);
});

test('a refresh belonging to a previous account cannot overwrite a new login', async () => {
  const started = deferred();
  const release = deferred();
  handleRequest = async (config) => {
    started.resolve();
    await release.promise;
    return response(config, { accessToken: 'old-account-token' });
  };
  const refresh = client.refreshAccessToken();
  const rejectedRefresh = assert.rejects(refresh, axios.isCancel);
  await started.promise;
  tokens.setAccessToken('new-account-token');
  release.resolve();
  await rejectedRefresh;
  assert.equal(tokens.getAccessToken(), 'new-account-token');
});

test('logout retries revocation after 401 without publishing refresh credentials', async () => {
  let logoutCalls = 0;
  const published = [];
  const unsubscribe = tokens.subscribeToAccessToken((token) => published.push(token));
  handleRequest = (config) => {
    if (config.url === '/auth/refresh') return response(config, { accessToken: 'revocation-token' });
    assert.equal(config.url, '/auth/logout');
    logoutCalls++;
    if (logoutCalls === 1) return response(config, {}, 401);
    assert.equal(config.headers.get('Authorization'), 'Bearer revocation-token');
    return response(config);
  };
  try {
    const first = client.logoutSession();
    const second = client.logoutSession();
    assert.equal(first, second);
    await Promise.all([first, second]);
    assert.deepEqual(published, [null]);
    assert.equal(logoutCalls, 2);
    assert.equal(tokens.getAccessToken(), null);
  } finally {
    unsubscribe();
  }
});

test('cookie mutations are serialized and refresh reads the latest CSRF cookie', async () => {
  const started = deferred();
  const release = deferred();
  const calls = [];
  handleRequest = async (config) => {
    calls.push(config.url);
    if (config.url === '/auth/login') {
      started.resolve();
      await release.promise;
      document.cookie = 'csrf_token=rotated';
      return response(config, { accessToken: 'login-token' });
    }
    assert.equal(config.url, '/auth/refresh');
    assert.equal(config.headers.get('X-CSRF-Token'), 'rotated');
    return response(config, { accessToken: 'refreshed-token' });
  };
  const login = auth.login({ email: 'user@example.com', password: 'Password1' });
  await started.promise;
  const refresh = client.refreshAccessToken();
  assert.deepEqual(calls, ['/auth/login']);
  release.resolve();
  await Promise.all([login, refresh]);
  assert.deepEqual(calls, ['/auth/login', '/auth/refresh']);
});

test('a late history response is canceled after the authentication version changes', async () => {
  const started = deferred();
  const release = deferred();
  handleRequest = async (config) => {
    started.resolve();
    await release.promise;
    return response(config, []);
  };
  const rejectedHistory = assert.rejects(auth.getLoginHistory(), axios.isCancel);
  await started.promise;
  tokens.setAccessToken('another-account');
  release.resolve();
  await rejectedHistory;
  assert.equal(tokens.getAccessToken(), 'another-account');
});

test('read APIs forward cancellation and reject an aborted response', async () => {
  const controller = new AbortController();
  const started = deferred();
  const release = deferred();
  handleRequest = async (config) => {
    assert.equal(config.signal, controller.signal);
    started.resolve();
    await release.promise;
    return response(config, []);
  };
  const rejectedRead = assert.rejects(auth.getSessions({ signal: controller.signal }), axios.isCancel);
  await started.promise;
  controller.abort();
  release.resolve();
  await rejectedRead;
});

test('login, OAuth and 2FA distinguish challenge and access-token responses', async () => {
  handleRequest = (config) => {
    switch (config.url) {
      case '/auth/login':
        assert.deepEqual(body(config), { email: 'user@example.com', password: 'Password1' });
        return response(config, { twoFactorRequired: true });
      case '/auth/oauth/exchange':
        assert.deepEqual(body(config), { code: 'one-time-code' });
        return response(config, { accessToken: 'oauth-token' });
      case '/auth/2fa/verify':
        assert.deepEqual(body(config), { code: '123456' });
        return response(config, { accessToken: 'two-factor-token' });
      default: throw new Error('Unexpected auth request');
    }
  };
  assert.deepEqual(await auth.login({ email: 'user@example.com', password: 'Password1' }), { twoFactorRequired: true });
  assert.deepEqual(await auth.exchangeOAuthCode('one-time-code'), { accessToken: 'oauth-token' });
  assert.deepEqual(await auth.verifyTwoFactorLogin('123456'), { accessToken: 'two-factor-token' });
});

test('a rejected 2FA challenge is not retried through refresh', async () => {
  const calls = [];
  handleRequest = (config) => {
    calls.push(config.url);
    return response(config, { message: 'Invalid code' }, 401);
  };
  await assert.rejects(auth.verifyTwoFactorLogin('000000'), axios.isAxiosError);
  assert.deepEqual(calls, ['/auth/2fa/verify']);
});

test('email verification forwards its token and honors the message contract', async () => {
  handleRequest = (config) => {
    assert.equal(config.url, '/auth/verify-email');
    assert.deepEqual(config.params, { token: 'email-token' });
    return response(config, { message: 'Verified' });
  };
  assert.deepEqual(await auth.verifyEmail('email-token'), { message: 'Verified' });
  handleRequest = (config) => response(config, { message: 42 });
  await assert.rejects(auth.verifyEmail('email-token'), InvalidApiResponseError);
});

test('authorization rejects access belonging to the wrong user', async () => {
  handleRequest = (config) => response(config, { userId: 'someone-else', roles: [], permissions: [] });
  await assert.rejects(access.getCurrentUserAccess('current-user'), InvalidApiResponseError);
  await assert.rejects(access.getUserAccess('current-user'), InvalidApiResponseError);
});

test('read APIs reject malformed external data at the shared API boundary', async () => {
  handleRequest = (config) => response(config, [{ id: 'invalid' }]);
  for (const request of [auth.getCurrentUser, auth.getSessions, auth.getLoginHistory, access.getRoles, access.getPermissions]) {
    await assert.rejects(request(), InvalidApiResponseError);
  }
});

test('history reads accept nullable details and preserve a failed attempt', async () => {
  const entries = [{
    id: 'attempt-1', userId: 'user-1', ipAddress: null, userAgent: null,
    success: false, failureReason: 'Invalid credentials', createdAt: '2026-01-01T00:00:00.000Z',
  }];
  handleRequest = (config) => response(config, entries);
  assert.deepEqual(await auth.getLoginHistory(), entries);
});

test('password mutations send only their intended fields and accept an unused empty body', async () => {
  const requests = [];
  handleRequest = (config) => {
    requests.push([config.url, body(config)]);
    return response(config, undefined, 204);
  };
  await auth.requestPasswordReset('user@example.com');
  await auth.resetPassword({ token: 'reset-token', newPassword: 'NewPassword1' });
  await auth.changePassword({ currentPassword: 'OldPassword1', newPassword: 'NewPassword1' });
  await auth.setPassword('NewPassword1');
  assert.deepEqual(requests, [
    ['/auth/forgot-password', { email: 'user@example.com' }],
    ['/auth/reset-password', { token: 'reset-token', newPassword: 'NewPassword1' }],
    ['/auth/change-password', { currentPassword: 'OldPassword1', newPassword: 'NewPassword1' }],
    ['/auth/set-password', { newPassword: 'NewPassword1' }],
  ]);
});

test('permission edits preserve an empty description and encode path identifiers', async () => {
  const requests = [];
  handleRequest = (config) => {
    requests.push([config.url, config.data ? body(config) : null]);
    return response(config, null, 204);
  };
  await access.updateRole('role/a', { description: '' });
  await access.updatePermission('permission/a', { description: '' });
  await access.assignRoleToUser('user/a', 'role/a');
  await access.assignPermissionToRole('role/a', 'permission/a');
  assert.deepEqual(requests, [
    ['/authorization/roles/role%2Fa', { description: '' }],
    ['/authorization/permissions/permission%2Fa', { description: '' }],
    ['/authorization/users/user%2Fa/roles/role%2Fa', null],
    ['/authorization/roles/role%2Fa/permissions/permission%2Fa', null],
  ]);
});

test('error messages accept validated API errors and safely handle unknown thrown values', () => {
  const fallback = 'Something went wrong. Please try again.';
  for (const error of [null, undefined, 'failure', { message: 'untrusted' }, new Error('internal')]) {
    assert.equal(getErrorMessage(error), fallback);
  }
  const config = { headers: new axios.AxiosHeaders() };
  const apiError = new axios.AxiosError('Request failed', undefined, config, undefined, {
    data: { message: ['First', 'Second'] }, status: 400, statusText: 'Bad Request', headers: {}, config,
  });
  assert.equal(getErrorMessage(apiError), 'First Second');
  apiError.response.data = { message: { unexpected: true } };
  assert.equal(getErrorMessage(apiError), fallback);
});
