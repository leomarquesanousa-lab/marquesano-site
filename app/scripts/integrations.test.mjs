import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { googleReport } from '../server/admin/google.mjs';
import { metaStatus } from '../server/admin/meta.mjs';
import { operations } from '../server/admin/operations.mjs';
import { createTestAdminStore as createAdminStore } from './postgres-test-store.mjs';
import { range } from '../server/admin/validation.mjs';

const period = range(new URLSearchParams('days=7'));
const settings = { GA4_PROPERTY_ID: '123', GSC_SITE_URL: 'sc-domain:marquesano.com.br' };
test('GOOGLE_SERVICE_ACCOUNT_EMAIL alias authenticates GA4 and preserves connected report shape', async () => {
  const legacy = credential();
  const env = { GOOGLE_SERVICE_ACCOUNT_EMAIL: legacy.GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY: legacy.GOOGLE_PRIVATE_KEY };
  const result = await googleReport('ga4', settings, period, { env, fetcher: async (url, options) => {
    if (url.includes('oauth2.googleapis.com')) {
      const claims = JSON.parse(Buffer.from(options.body.get('assertion').split('.')[1], 'base64url'));
      assert.equal(claims.iss, env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
      return Response.json({ access_token: 'mock-token' });
    }
    return Response.json({ rows: [{ metricValues: [{ value: '22' }, { value: '40' }, { value: '262' }] }], rowCount: 1 });
  } });
  assert.equal(result.status, 'Ativo');
  assert.deepEqual(result.reports.summary.rows[0], ['22', '40', '262']);
  assert.deepEqual(result.reports.summary.columns.slice(0, 3), ['activeUsers', 'sessions', 'screenPageViews']);
});
function credential() {return { GOOGLE_CLIENT_EMAIL: 'test@example.iam.gserviceaccount.com', GOOGLE_PRIVATE_KEY: generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } }).privateKey };}

test('GSC distinguishes disabled API, permission, wrong property, missing property, scope and invalid token', async () => {
  const env = credential();
  for (const [status, reason, expected] of [[403, 'SERVICE_DISABLED', 'API_DISABLED'], [403, 'accessNotConfigured', 'API_DISABLED'], [403, 'forbidden', 'ACCESS_DENIED'], [400, 'invalidParameter', 'PROPERTY_INVALID'], [404, 'notFound', 'PROPERTY_NOT_FOUND'], [401, 'authError', 'TOKEN_INVALID'], [403, 'ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'SCOPE_INVALID'], [429, 'rateLimitExceeded', 'RATE_LIMIT']]) {
    const result = await googleReport('gsc', settings, period, { env, fetcher: async (url, options) => {
        if (url.includes('oauth2.googleapis.com')) return Response.json({ access_token: 'secret-token' });
        assert.equal(options.headers.Authorization, 'Bearer secret-token');
        return Response.json({ error: { message: 'secret raw error', details: [{ reason }], errors: [{ reason }] } }, { status });
      } });
    assert.equal(result.code, expected);assert(result.message);
    assert(!JSON.stringify(result).includes('secret'));assert(!JSON.stringify(result).includes(env.GOOGLE_CLIENT_EMAIL));
  }
  const mismatch = await googleReport('gsc', settings, period, { env, fetcher: async (url) => {
      if (url.endsWith('/sites')) return Response.json({ siteEntry: [{ siteUrl: 'https://marquesano.com.br/', permissionLevel: 'siteOwner' }] });
      return Response.json({ error: { errors: [{ reason: 'forbidden' }] } }, { status: 403 });
    } });
  assert.equal(mismatch.code, 'PROPERTY_MISMATCH');
});

test('GA4 and Search Console use separate token scopes and real report dimensions', async () => {
  const env = credential(),scopes = [],requests = [];
  const fetcher = async (url, options) => {
    if (url.includes('oauth2.googleapis.com')) {
      const jwt = options.body.get('assertion');scopes.push(JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url')).scope);
      return Response.json({ access_token: 'safe-test-token' });
    }
    const body = JSON.parse(options.body);requests.push({ url, body });return Response.json({ rows: [], metadata: { timeZone: 'America/Sao_Paulo' } });
  };
  const ga = await googleReport('ga4', settings, period, { env, fetcher });
  const gsc = await googleReport('gsc', settings, period, { env, fetcher });
  assert.equal(ga.status, 'Ativo');assert.equal(gsc.status, 'Ativo');
  assert.deepEqual(scopes, ['https://www.googleapis.com/auth/analytics.readonly', 'https://www.googleapis.com/auth/webmasters.readonly']);
  assert(ga.reports.summary.columns.includes('sessionKeyEventRate'));assert(ga.reports.summary.columns.includes('newUsers'));
  const timeline = requests.find((r) => r.body.dimensions?.[0]?.name === 'date');assert.equal(timeline.body.limit, 367);assert.deepEqual(timeline.body.orderBys, [{ dimension: { dimensionName: 'date' } }]);
  assert(requests.some((r) => r.url.includes('sc-domain%3Amarquesano.com.br/searchAnalytics/query')));
});

test('Meta status never returns secrets or claims that credentials are an authorized connection', async () => {
  const env = { META_APP_ID: '123', META_APP_SECRET: 'private-secret', ADMIN_SITE_ORIGIN: 'https://marquesano.com.br', META_REDIRECT_URI: 'https://marquesano.com.br/api/admin/meta/callback', META_AD_ACCOUNT_ID: 'act_456', META_ACCESS_TOKEN: 'private-token' };
  const status = await metaStatus(env);assert.equal(status.appConfigured, true);assert.equal(status.accountConnected, false);assert.equal(status.adAccountSelected, false);assert.equal(status.oauthReady, true);
  assert(Object.values(status.capabilities).every((value) => value === false));
  assert(!JSON.stringify(status).includes('private-'));
  assert.equal((await metaStatus({ ...env, META_REDIRECT_URI: 'https://user:private@host/' })).redirectConfigured, false);
  assert.equal((await metaStatus({})).status, 'Não conectado');
});

test('Meta configuration endpoints preserve admin permissions and never expose campaign writes', async () => {
  const repository = { settings: () => ({}), report: () => ({ counts: { leads: 2 } }) };
  const request = (method) => new Request('https://marquesano.com.br/api/admin/configuracoes/meta/connect', { method, headers: { 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: '{}' } : {}) });
  for (const role of ['VIEWER', 'SALES', 'MARKETING']) await assert.rejects(operations(request('POST'), ['configuracoes', 'meta', 'connect'], { role }, repository), (e) => e.status === 403);
  const result = await operations(request('POST'), ['configuracoes', 'meta', 'connect'], { role: 'OWNER' }, repository);assert.equal(result.authorizationUrl, '/api/admin/meta/connect');
  const status = await operations(request('GET'), ['configuracoes', 'meta'], { role: 'ADMIN' }, repository);assert.equal(status.oauthReady, false);
  const marketing = await operations(request('GET'), ['marketing'], { role: 'MARKETING' }, repository);assert.equal(marketing.counts.leads, 2);assert.equal(marketing.meta.accountConnected, false);
  await assert.rejects(operations(request('POST'), ['marketing', 'meta', 'campaigns'], { role: 'ADMIN' }, repository), (e) => e.status === 403);
});

test('audit filters match totals, last login derives from audit and local traffic counts visits', async () => {
  const store = await createAdminStore(':memory:');const repo = store.repository;
  try {
    await store.createOwner('qa@example.com', 'test-only-long-password');
    const actor = await store.authenticate('qa@example.com', 'test-only-long-password');
    await repo.audit(actor, 'login', 'auth', actor.id);
    assert((await repo.list('usuarios', new URLSearchParams(), period)).rows[0].last_login);
    await repo.audit(null, 'login', 'auth', 'test-login');await repo.audit(null, 'settings', 'configuracoes', 'test-setting');
    const filtered = await repo.list('auditoria', new URLSearchParams('action=login&entity=auth&q=Sistema'), period);
    assert.equal(filtered.total, 1);assert.equal(filtered.rows.length, 1);assert.equal(filtered.rows[0].action, 'login');
    assert.equal((await repo.list('auditoria', new URLSearchParams('action=login&entity=configuracoes'), period)).total, 0);
    const id = await repo.recordEvent(null, { id: crypto.randomUUID(), name: 'page_view', path: '/' }, {});
    await repo.recordEvent(id, { id: crypto.randomUUID(), name: 'page_view', path: '/planos' }, {});
    const report = await repo.report(period);assert.equal(report.traffic[0].visitors, 1);assert.equal(report.traffic[0].views, 2);assert.equal(report.counts.forms, 0);
  } finally {await store.close();}
});
