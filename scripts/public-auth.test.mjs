import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { after, before, test } from 'node:test';
import { createServer as createViteServer } from 'vite';

let vite;
let backend;
let api;
let publicApi;
let storedToken;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

before(async () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key) => key === 'access_token' ? storedToken : null },
  });
  backend = createHttpServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    // Match the registration guard: no JWT is allowed, an expired JWT is rejected.
    response.writeHead(request.headers.authorization === 'Bearer expired-jwt' ? 401 : 200, {
      'Content-Type': 'application/json',
    });
    response.end(JSON.stringify({
      authorization: request.headers.authorization ?? null,
      body: body ? JSON.parse(body) : null,
    }));
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  vite = await createViteServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  });
  ({ api, publicApi } = await vite.ssrLoadModule('/src/lib/api.ts'));
  const baseURL = `http://127.0.0.1:${backend.address().port}`;
  api.defaults.baseURL = baseURL;
  publicApi.defaults.baseURL = baseURL;
});

after(async () => {
  await vite?.close();
  if (backend) await new Promise(resolve => backend.close(resolve));
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
});

test('LINE registration succeeds with an expired school token and preserves LINE proof', async () => {
  storedToken = 'expired-jwt';
  const registration = {
    citizenId: '0000000000000',
    firstName: 'Test',
    lastName: 'Parent',
    password: 'test-password',
    students: [{ studentId: 'test-student', invitationCode: 'aB3xY' }],
    lineUserId: 'test-line-user',
    accessToken: 'test-line-access-token',
  };

  await assert.rejects(api.post('/parents/register', registration), error => error.response?.status === 401);
  const response = await publicApi.post('/parents/register', registration);
  assert.equal(response.status, 200);
  assert.equal(response.data.authorization, null);
  assert.deepEqual(response.data.body, registration);
});

test('pre-login requests omit the previous school token', async () => {
  storedToken = 'expired-jwt';
  for (const path of ['/auth/login', '/auth/line-login', '/auth/bind-line', '/parents/classroom-invitations/resolve']) {
    const response = await publicApi.post(path, {});
    assert.equal(response.data.authorization, null, path);
  }
});

test('protected requests still use the current school token', async () => {
  storedToken = 'current-jwt';
  assert.equal((await api.get('/users/me')).data.authorization, 'Bearer current-jwt');
  storedToken = 'renewed-jwt';
  assert.equal((await api.get('/users/me')).data.authorization, 'Bearer renewed-jwt');
  assert.equal((await publicApi.post('/parents/register', {})).data.authorization, null);
  storedToken = null;
  assert.equal((await api.get('/users/me')).data.authorization, null);
});
