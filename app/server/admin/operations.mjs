import { canAccess, hashPassword } from './core.mjs';
import { InputError, readJson, range, text } from './validation.mjs';
import { googleReport, integrationStatus, testGoogleConnection } from './google.mjs';
import { seoDiagnostics, publishedSeoStatus } from '../seo.mjs';
import { metaStatus } from './meta.mjs';
import { randomUUID } from 'node:crypto';

export async function operations(request, path, user, repository, { env = process.env } = {}) {
  const [module, id, action] = path;
  if (request.method === 'GET' && ['dashboard', 'analytics'].includes(module)) console.info('ANALYTICS_RECEIVED', { module });
  if (!canAccess(user.role, module) || path.length > 3) throw new InputError('Acesso não permitido.', 403);
  const params = new URL(request.url).searchParams,period = range(params);
  const settings = await repository.settings(),integrations = integrationStatus(settings);
  if (request.method === 'GET') {
    if (path.length > 2) throw new InputError('Rota inválida.', 404);
    if (module === 'configuracoes' && id === 'meta') return await metaStatus(env, repository.meta);
    if (id) return await repository.detail(module, text(id, 100, true));
    if (module === 'marketing') return { ...(await repository.report(period)), settings, integrations, meta: await metaStatus(env, repository.meta), googleAds: { status: 'Integração futura' } };
    if (['dashboard', 'analytics'].includes(module)) {
      const trace = randomUUID();
      console.info('ANALYTICS_REQUEST', { trace, module, remote: params.get('remote') === '1', property_available: Boolean(settings.GA4_PROPERTY_ID), service_account_available: Boolean(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY), start: period.start, end: period.end });
      try {
        const result = { ...(await repository.report(period)), settings, integrations, ...(params.get('remote') === '1' ? { google: await googleReport('ga4', settings, period, { trace }) } : {}) };
        const summary = result.google?.reports?.summary;
        console.info('ANALYTICS_RESPONSE', { trace, status: result.google?.status || 'remote_not_requested', code: result.google?.code, rows: summary?.rowCount || 0, aggregates: Object.fromEntries(['activeUsers', 'sessions', 'screenPageViews'].map(key => [key, summary ? Number(summary.rows[0]?.[summary.columns.indexOf(key)] || 0) : null])) });
        return result;
      } catch (error) {
        console.error('ANALYTICS_FAILED', { trace, name: ['Error', 'TypeError', 'RangeError'].includes(error.name) ? error.name : 'Error' });
        throw error;
      }
    }
    if (module === 'seo') return { ...seoDiagnostics(), integrations, ...(params.get('diagnose') === '1' ? { published: await publishedSeoStatus() } : {}), ...(params.get('remote') === '1' ? { google: await googleReport('gsc', settings, period) } : {}) };
    if (module === 'configuracoes') return { settings, integrations, meta: await metaStatus(env, repository.meta) };
    return await repository.list(module, params, period);
  }
  if (!['POST', 'PATCH'].includes(request.method)) throw new InputError('Método não permitido.', 405);
  if (user.role === 'VIEWER' || ['dashboard', 'analytics', 'marketing', 'seo', 'auditoria', 'formularios'].includes(module)) throw new InputError('Acesso de leitura.', 403);
  const data = await readJson(request);
  if (module === 'configuracoes' && id === 'meta' && action === 'connect' && request.method === 'POST') return { ok: true, authorizationUrl: '/api/admin/meta/connect' };
  if (module === 'configuracoes' && ['ga4', 'gsc'].includes(id) && action === 'test' && request.method === 'POST') return testGoogleConnection(id, settings, period);
  if (module === 'configuracoes' && !id && request.method === 'PATCH') return await repository.saveSettings(data, user);
  if (module === 'usuarios' && user.role === 'OWNER' && !action && (id && request.method === 'PATCH' || !id && request.method === 'POST')) return await repository.saveUser(data, user, id, hashPassword);
  if (module === 'leads' && id && request.method === 'POST') {
    if (action === 'notes') return await repository.note(id, data.body, user);
    if (action === 'convert') return await repository.convert(id, user);
  }
  if (['leads', 'clientes', 'campanhas'].includes(module) && !action && (id && request.method === 'PATCH' || !id && request.method === 'POST')) return await repository.save(module, data, user, id);
  throw new InputError('Rota ou método inválido.', 405);
}
