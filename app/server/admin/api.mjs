import { adminStore, configured, cookieName, cookieOptions, canAccess, adminDiagnostic } from './core.mjs';
import { NextResponse } from 'next/server.js';
import { operations } from './operations.mjs';
import { isInputError } from './validation.mjs';
import { handleMetaApi } from './meta-api.mjs';
import { paymentOperations } from './payment-api.mjs';
import { validAdminRequestOrigin } from './origin.mjs';
import { salesOperations } from './sales-api.mjs';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
export async function handleAdminApi(request, path, dependencies = {}) {
  const env = dependencies.env || process.env;
  if (!configured(env)) {
    adminDiagnostic('ADMIN_API_FAILED', Error('Configuração administrativa inválida.'));
    return json({ error: 'Acesso administrativo indisponível.' }, 503);
  }
  const action = path.join('/');
  try {
    const store = dependencies.store || (await adminStore());
    if (path[0] === 'meta') return handleMetaApi(request, path.slice(1), store, env, { fetcher: dependencies.fetcher || fetch });
    const token = request.cookies.get(cookieName(env))?.value;
    // All unsafe requests, including login/logout, require the configured origin.
    if (!['GET', 'HEAD'].includes(request.method) && !validAdminRequestOrigin(request, env)) return json({ error: 'Origem inválida.' }, 403);
    if (action === 'login' && request.method === 'POST') {
      if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Formato inválido.' }, 415);
      if (Number(request.headers.get('content-length')) > 2048) return json({ error: 'Requisição inválida.' }, 413);
      const reader = request.body?.getReader();
      if (!reader) return json({ error: 'Requisição inválida.' }, 400);
      const chunks = [];let size = 0;
      while (true) {const { value, done } = await reader.read();if (done) break;size += value.length;if (size > 2048) {await reader.cancel();return json({ error: 'Requisição inválida.' }, 413);}chunks.push(Buffer.from(value));}
      let data;
      try {data = JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {return json({ error: 'Requisição inválida.' }, 400);}
      const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
      if (!email || email.length > 254 || typeof data?.password !== 'string' || Buffer.byteLength(data.password) > 256) return json({ error: 'Credenciais inválidas.' }, 401);
      if (!(await store.consumeLogin(email))) {const response = json({ error: 'Muitas tentativas. Aguarde 15 minutos.' }, 429);response.headers.set('Retry-After', '900');return response;}
      const user = await store.authenticate(email, data.password);
      if (!user) return json({ error: 'Credenciais inválidas.' }, 401);
      await store.repository.audit(user, 'login', 'auth', user.id);
      await store.revokeSession(token);
      const response = json({ ok: true });
      response.cookies.set(cookieName(env), await store.createSession(user.id), cookieOptions(env));
      return response;
    }
    const user = await store.getSession(token);
    if (!user) return json({ error: 'Autenticação necessária.' }, 401);
    if (action === 'logout' && request.method === 'POST') {
      await store.repository.audit(user, 'logout', 'auth', user.id);
      await store.revokeSession(token);
      const response = json({ ok: true });
      response.cookies.set(cookieName(env), '', { ...cookieOptions(env), maxAge: 0 });
      return response;
    }
    if (action === 'session' && request.method === 'GET') return json({ user });
    if (path[0] === 'vendas') return json(await salesOperations(request,path.slice(1),user,store.repository,{env,fetcher:dependencies.fetcher||fetch}));
    if (path[0] === 'configuracoes' && path[1] === 'pagamentos') return json(await paymentOperations(request, path.slice(2), user, store.repository, { env, fetcher: dependencies.fetcher || fetch }));
    return json(await operations(request, path, user, store.repository, { env }));
  } catch (error) {
    if (isInputError(error)) return json({ error: error.message }, error.status);
    adminDiagnostic('ADMIN_API_FAILED', error);
    // No credentials, DB paths or internal errors leave the server.
    return json({ error: 'Acesso administrativo indisponível.' }, 503);
  }
}
