import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server.js';
import { cookieName } from './core.mjs';
import { readJson, range } from './validation.mjs';
import { META_VERSION, META_SCOPES, MetaError, safeMetaError, metaConfig, metaStatus, exchangeMetaCode, createMetaClient, metaIdentity, metaAccounts, encryptToken, metaAccess, metaCampaigns } from './meta.mjs';

const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' };
const json = (body, status = 200) => NextResponse.json(body, { status, headers });
export const metaCookieName = (env) => env.NODE_ENV === 'production' ? '__Host-marquesano_meta_oauth' : 'marquesano_meta_oauth';
const cookieOptions = (env) => ({ httpOnly: true, secure: env.NODE_ENV === 'production' || env.META_REDIRECT_URI?.startsWith('https:'), sameSite: 'lax', path: '/', maxAge: 600 });

function callbackResult(code, env) {
  // Commit a same-origin document before navigating so the unchanged Strict session
  // cookie is sent. No OAuth code, token, secret or provider message enters this HTML.
  const destination = '/admin/configuracoes?meta=' + encodeURIComponent(code) + '#meta';
  const nonce = randomBytes(18).toString('base64');
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Conexão Meta</title><p>Retornando às configurações… <a href="${destination}">Continuar</a></p><script nonce="${nonce}">window.location.replace(${JSON.stringify(destination)});</script></html>`;
  const response = new NextResponse(html, { status: 200, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'` } });
  response.cookies.set(metaCookieName(env), '', { ...cookieOptions(env), maxAge: 0 });return response;
}

export async function handleMetaApi(request, path, store, env = process.env, { fetcher = fetch } = {}) {
  const action = path.join('/'),meta = store.repository.meta;
  if (action === 'callback' && request.method === 'GET') {
    try {
      const params = new URL(request.url).searchParams,state = params.get('state') || '',browser = request.cookies.get(metaCookieName(env))?.value || '';
      if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(browser)) throw new MetaError('STATE_INVALID');
      const flow = await meta.consume(state, browser);
      if (!flow) throw new MetaError('STATE_INVALID');
      const current = request.cookies.get(cookieName(env))?.value;
      if (current && (await store.getSession(current))?.id !== flow.user.id) throw new MetaError('STATE_INVALID');
      if (params.has('error')) throw new MetaError(params.get('error') === 'access_denied' ? 'OAUTH_CANCELLED' : 'PERMISSION_DENIED');
      const code = params.get('code');if (!code || code.length > 4096) throw new MetaError('STATE_INVALID');
      const config = metaConfig(env),token = await exchangeMetaCode(code, env, fetcher),client = createMetaClient(token.access_token, env, fetcher);
      const profile = await metaIdentity(client),accounts = await metaAccounts(client);
      const expiresAt = meta.now() + Math.min(Number(token.expires_in), 90 * 86400) * 1000;
      if (!(await meta.save(flow, { appId: config.appId, ciphertext: encryptToken(token.access_token, env), expiresAt, profile }))) throw new MetaError('CONNECTION_CHANGED');
      await store.repository.audit(flow.user, 'connect', 'meta', profile.id);
      return callbackResult(accounts.accounts.length ? 'CONNECTED' : 'NO_ACCOUNTS', env);
    } catch (error) {return callbackResult(safeMetaError(error).code, env);}
  }
  const sessionToken = request.cookies.get(cookieName(env))?.value,user = await store.getSession(sessionToken);
  if (!user) return json({ error: 'Autenticação necessária.' }, 401);
  if (!['OWNER', 'ADMIN'].includes(user.role)) return json({ error: 'Acesso não permitido.' }, 403);
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('origin') !== env.ADMIN_SITE_ORIGIN) return json({ error: 'Origem inválida.' }, 403);
  let revision;
  try {
    if (action === 'connect' && request.method === 'GET') {
      if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Inicie a conexão pelo painel administrativo.' }, 403);
      const config = metaConfig(env),state = randomBytes(32).toString('hex'),browser = randomBytes(32).toString('hex');
      await meta.begin(state, browser, sessionToken);
      const url = new URL(`https://www.facebook.com/${META_VERSION}/dialog/oauth`);
      for (const [key, value] of Object.entries({ client_id: config.appId, redirect_uri: config.redirect, response_type: 'code', scope: META_SCOPES.join(','), state, auth_type: 'rerequest' })) url.searchParams.set(key, value);
      const response = NextResponse.redirect(url, { status: 303, headers });response.cookies.set(metaCookieName(env), browser, cookieOptions(env));return response;
    }
    if (action === 'status' && request.method === 'GET') return json(await metaStatus(env, meta));
    if (action === 'disconnect' && request.method === 'POST') {
      await readJson(request);const row = await meta.get();
      if (!(await meta.clear(row.revision))) throw new MetaError('CONNECTION_CHANGED', 409);
      await store.repository.audit(user, 'disconnect', 'meta', 'connection');
      // Local disconnect drops the encrypted token and pending authorizations. It does
      // not revoke the user's grant for other applications or installations.
      return json({ ok: true, message: 'Meta desconectada deste painel.', meta: await metaStatus(env, meta) });
    }
    if (!(['ad-accounts', 'campaigns'].includes(action) && request.method === 'GET') && !(['select-account', 'test'].includes(action) && request.method === 'POST')) return json({ error: 'Rota ou método inválido.' }, 405);
    const access = await metaAccess(meta, env, fetcher);revision = access.row.revision;
    if (action === 'campaigns') return json(await metaCampaigns(meta, range(new URL(request.url).searchParams), env, fetcher));
    if (action === 'test') {
      await readJson(request);const profile = await metaIdentity(access.client),accounts = await metaAccounts(access.client);
      const selected = (await metaStatus(env, meta)).selectedAccount;
      if (selected && !accounts.accounts.some((a) => a.id === selected.id)) await access.client.get(selected.id, { fields: 'id' });
      if ((await meta.get()).revision !== revision) throw new MetaError('CONNECTION_CHANGED', 409);
      return json({ ok: true, message: accounts.accounts.length ? 'Conexão Meta validada.' : 'Conexão Meta validada, mas nenhuma conta de anúncios foi encontrada.', profile, ...accounts, meta: await metaStatus(env, meta) });
    }
    const accounts = await metaAccounts(access.client);
    if ((await meta.get()).revision !== revision) throw new MetaError('CONNECTION_CHANGED', 409);
    if (action === 'ad-accounts') return json(accounts);
    const body = await readJson(request),account = accounts.accounts.find((a) => a.id === body.accountId);
    if (!account) throw new MetaError('ACCOUNT_INVALID');
    if (!(await meta.select(account, revision))) throw new MetaError('CONNECTION_CHANGED', 409);
    await store.repository.audit(user, 'select', 'meta', account.id);
    return json({ ok: true, meta: await metaStatus(env, meta) });
  } catch (error) {
    const safe = safeMetaError(error);
    if (safe.code === 'TOKEN_INVALID' && revision !== undefined) await meta.clear(revision);
    if (action === 'connect' && request.method === 'GET') return NextResponse.redirect(new URL('/admin/configuracoes?meta=' + safe.code + '#meta', env.ADMIN_SITE_ORIGIN), { status: 303, headers });
    // Provider authentication errors must not look like an expired ADMIN session.
    return json({ error: safe.message, code: safe.code }, safe.status === 401 ? 409 : safe.status);
  }
}
