import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';

export const META_VERSION = 'v26.0';
export const META_SCOPES = ['ads_read'];
export function metaVersion(env = process.env) {
  const version = env.META_GRAPH_API_VERSION || META_VERSION;
  if (!/^v\d{2}\.0$/.test(version)) throw new MetaError('CONFIG_INVALID');
  return version;
}
export const metaMessages = {
  APP_ID_MISSING: 'App ID ausente. Configure META_APP_ID no servidor.',
  APP_SECRET_MISSING: 'App Secret ausente. Configure META_APP_SECRET no servidor.',
  REDIRECT_URI_MISSING: 'Redirect URI ausente. Configure META_REDIRECT_URI no servidor.',
  REDIRECT_URI_INVALID: 'Redirect URI inválida. Use a origem administrativa seguida de /api/admin/meta/callback.',
  CONFIG_INVALID: 'Configuração Meta inválida no servidor.',
  OAUTH_CANCELLED: 'OAuth cancelado. Nenhuma conexão foi alterada.',
  PERMISSION_DENIED: 'Permissão negada. Autorize a leitura de anúncios para conectar.',
  STATE_INVALID: 'A autorização expirou ou não corresponde a esta sessão. Conecte novamente.',
  TOKEN_INVALID: 'Token inválido ou expirado. Conecte a Meta novamente.',
  NO_ACCOUNTS: 'Nenhuma conta de anúncios encontrada para esta conta Meta.',
  MARKETING_PERMISSION: 'Marketing API sem permissão. Confira ads_read, o acesso à conta e a aprovação do App.',
  ACCOUNT_REQUIRED: 'Selecione uma conta de anúncios nas Configurações.',
  ACCOUNT_INVALID: 'Conta de anúncios indisponível para esta conexão.',
  NOT_CONNECTED: 'Meta não conectada. Autorize sua conta para continuar.',
  RATE_LIMIT: 'Limite de consultas da Meta atingido. Tente novamente mais tarde.',
  PROVIDER_ERROR: 'Não foi possível consultar a Meta. Tente novamente.',
  CONNECTION_CHANGED: 'A conexão mudou durante a operação. Atualize a página.',
  CONNECTED: 'Meta conectada com sucesso. Selecione uma conta de anúncios.',
  DISCONNECTED: 'Meta desconectada deste painel.'
};
export class MetaError extends Error {constructor(code, status = 400) {super(metaMessages[code] || metaMessages.PROVIDER_ERROR);this.code = Object.hasOwn(metaMessages, code) ? code : 'PROVIDER_ERROR';this.status = status;}}
export const safeMetaError = (error) => error instanceof MetaError ? error : new MetaError('PROVIDER_ERROR', 502);
const clean = (value, max = 200) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : '';
const parse = (value) => {try {return JSON.parse(value || 'null');} catch {return null;}};

export function metaConfig(env = process.env) {
  if (!/^\d+$/.test(env.META_APP_ID || '')) throw new MetaError('APP_ID_MISSING');
  if (!env.META_APP_SECRET) throw new MetaError('APP_SECRET_MISSING');
  if (!env.META_REDIRECT_URI) throw new MetaError('REDIRECT_URI_MISSING');
  try {
    const uri = new URL(env.META_REDIRECT_URI),origin = new URL(env.ADMIN_SITE_ORIGIN);
    if (uri.origin !== origin.origin || uri.pathname !== '/api/admin/meta/callback' || uri.username || uri.password || uri.search || uri.hash || !(uri.protocol === 'https:' || env.NODE_ENV !== 'production' && uri.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(uri.hostname))) throw Error();
  } catch {throw new MetaError('REDIRECT_URI_INVALID');}
  if (env.META_TOKEN_ENCRYPTION_KEY && !/^[a-fA-F0-9]{64}$/.test(env.META_TOKEN_ENCRYPTION_KEY)) throw new MetaError('CONFIG_INVALID');
  return { appId: env.META_APP_ID, secret: env.META_APP_SECRET, redirect: env.META_REDIRECT_URI };
}
function key(env) {
  const config = metaConfig(env);
  return env.META_TOKEN_ENCRYPTION_KEY ? Buffer.from(env.META_TOKEN_ENCRYPTION_KEY, 'hex') : Buffer.from(hkdfSync('sha256', config.secret, config.appId, 'marquesano-meta-token-v1', 32));
}
export function encryptToken(token, env) {
  const iv = randomBytes(12),cipher = createCipheriv('aes-256-gcm', key(env), iv);
  cipher.setAAD(Buffer.from('meta:' + env.META_APP_ID));
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}
function decryptToken(value, env) {
  try {const [version, iv, tag, data] = value.split('.');if (version !== 'v1') throw Error();const decipher = createDecipheriv('aes-256-gcm', key(env), Buffer.from(iv, 'base64url'));decipher.setAAD(Buffer.from('meta:' + env.META_APP_ID));decipher.setAuthTag(Buffer.from(tag, 'base64url'));return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');}
  catch {throw new MetaError('TOKEN_INVALID', 401);}
}
export async function metaStatus(env = process.env, store) {
  let config, error;try {config = metaConfig(env);} catch (e) {error = safeMetaError(e);}
  const row = await store?.get(),valid = Boolean(config && row?.token_ciphertext && row.app_id === config.appId && row.expires_at > store.now());
  let connected = valid;if (valid) {try {decryptToken(row.token_ciphertext, env);} catch {connected = false;}}
  const profile = connected ? parse(row.profile_json) : null,account = connected ? parse(row.account_json) : null;
  console.info('META_CONNECTED=' + connected);
  console.info('META_OAUTH_AVAILABLE=' + Boolean(config));
  console.info('META_AD_ACCOUNT_SELECTED=' + Boolean(account));
  return { status: connected ? 'Conectado' : 'Não conectado', appId: /^\d+$/.test(env.META_APP_ID || '') ? env.META_APP_ID : '', appConfigured: Boolean(config), appSecretConfigured: Boolean(env.META_APP_SECRET), redirectConfigured: Boolean(config), oauthReady: Boolean(config), oauthStatus: connected ? 'Conectado' : 'Não conectado', accountConnected: connected, hasStoredConnection: Boolean(row?.token_ciphertext), profile, adAccountId: account?.id || '', adAccountSelected: Boolean(account), selectedAccount: account, expiresAt: connected ? new Date(row.expires_at).toISOString() : null, message: error?.message || (row?.token_ciphertext && !connected ? metaMessages.TOKEN_INVALID : null), capabilities: { accounts: connected, campaigns: connected && Boolean(account), insights: connected && Boolean(account), adSets: false, ads: false, budgets: false, delivery: false } };
}
async function responseJson(response) {
  const data = await response.json().catch(() => null);
  if (data?.error) console.error('META_API_ERROR', { http_status:response.status, code:Number.isInteger(data.error.code)?data.error.code:null, subcode:Number.isInteger(data.error.error_subcode)?data.error.error_subcode:null, request_id:/^[\w-]{1,120}$/.test(data.error.fbtrace_id||'')?data.error.fbtrace_id:null });
  if (!response.ok || !data || data.error) {const code = Number(data?.error?.code),kind = code === 190 || response.status === 401 ? 'TOKEN_INVALID' : [10, 200, 294].includes(code) || response.status === 403 ? 'MARKETING_PERMISSION' : [4, 17, 32, 613, 80004].includes(code) || response.status === 429 ? 'RATE_LIMIT' : 'PROVIDER_ERROR';const error = new MetaError(kind, kind === 'TOKEN_INVALID' ? 409 : kind === 'MARKETING_PERMISSION' ? 403 : kind === 'RATE_LIMIT' ? 429 : 502); error.requestId = /^[\w-]{1,120}$/.test(data?.error?.fbtrace_id || '') ? data.error.fbtrace_id : null; throw error;}
  return data;
}
export function createMetaClient(token, env = process.env, fetcher = fetch) {
  const config = metaConfig(env),proof = createHmac('sha256', config.secret).update(token).digest('hex');
  const scrub = value => {
    if(typeof value==='string')return value.split(token).join('[redacted]').split(config.secret).join('[redacted]').split(proof).join('[redacted]');
    if(Array.isArray(value))return value.map(scrub);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['access_token','appsecret_proof','client_secret'].includes(key)).map(([key,v])=>[key,scrub(v)]));
    return value;
  };
  async function get(path, params = {}) {
    if (!/^(search|me(?:\/(?:permissions|adaccounts|accounts))?|(?:act_)?\d+(?:\/(?:campaigns|adsets|ads|adcreatives|adimages|insights|adspixels|customconversions|stats|previews|leadgen_forms|saved_audiences))?)$/.test(path)) throw new MetaError('ACCOUNT_INVALID');
    const url = new URL(`https://graph.facebook.com/${metaVersion(env)}/${path}`);
    for (const [k, v] of Object.entries({ ...params, appsecret_proof: proof })) url.searchParams.set(k, String(v));
    try {return scrub(await responseJson(await fetcher(url.href, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) })));}
    catch (e) {throw safeMetaError(e);}
  }
  async function list(path, params = {}) {
    const rows = [];let after;
    for (let page = 0; page < 20; page++) {
      const data = await get(path, { ...params, limit: 100, ...(after ? { after } : {}) });
      if (!Array.isArray(data.data)) throw new MetaError('PROVIDER_ERROR', 502);
      rows.push(...data.data);
      if (!data.paging?.next) return { rows, truncated: false };
      const next = data.paging?.cursors?.after;
      if (typeof next !== 'string' || next.length > 4096 || next === after) return { rows, truncated: true };
      after = next; // Never follow a provider-supplied URL with credentials.
    }
    return { rows, truncated: true };
  }
  async function post(path, body) {
    if (!/^(?:act_)?\d+(?:\/(?:campaigns|adsets|ads|adcreatives|adimages|copies))?$/.test(path)) throw new MetaError('ACCOUNT_INVALID');
    const data = new URLSearchParams({ appsecret_proof: proof });
    for (const [key, value] of Object.entries(body)) data.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    try {
      const response = await fetcher(`https://graph.facebook.com/${metaVersion(env)}/${path}`, { method:'POST', headers:{Authorization:`Bearer ${token}`}, body:data, redirect:'error', signal:AbortSignal.timeout(30000) });
      const requestId = response.headers.get('x-fb-trace-id');
      console.info('META_ADS_WRITE', { http_status:response.status, request_id:/^[\w-]{1,120}$/.test(requestId||'')?requestId:null });
      const result = await responseJson(response);
      return { ...scrub(result), request_id:/^[\w-]{1,120}$/.test(requestId||'')?requestId:null };
    } catch (error) { throw safeMetaError(error); }
  }
  return { get, list, post };
}
export async function exchangeMetaCode(code, env = process.env, fetcher = fetch) {
  const config = metaConfig(env);
  async function exchange(params) {
    try {const data = await responseJson(await fetcher(`https://graph.facebook.com/${metaVersion(env)}/oauth/access_token`, { method: 'POST', body: new URLSearchParams({ client_id: config.appId, client_secret: config.secret, ...params }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) }));
      if (typeof data.access_token !== 'string' || !data.access_token || !Number.isFinite(Number(data.expires_in)) || Number(data.expires_in) <= 0) throw new MetaError('TOKEN_INVALID');return data;
    } catch (e) {throw safeMetaError(e);}
  }
  const short = await exchange({ code, redirect_uri: config.redirect });
  return await exchange({ grant_type: 'fb_exchange_token', fb_exchange_token: short.access_token });
}
export async function metaIdentity(client) {
  const permissions = await client.list('me/permissions');
  if (!permissions.rows.some((p) => p.permission === 'ads_read' && p.status === 'granted')) throw new MetaError('PERMISSION_DENIED', 403);
  const profile = await client.get('me', { fields: 'id,name' });
  if (!/^\d+$/.test(profile.id || '')) throw new MetaError('TOKEN_INVALID');
  return { id: profile.id, name: clean(profile.name) };
}
export async function metaAccounts(client) {
  const result = await client.list('me/adaccounts', { fields: 'id,name,account_status,currency,timezone_name' });
  const businesses = new Map();let businessesAvailable = true;
  // Business details are optional; a missing business permission must not block ads_read.
  if (result.rows.length) {
    try {const detail = await client.list('me/adaccounts', { fields: 'id,business{id,name}' });for (const row of detail.rows) if (/^\d+$/.test(row.business?.id || '')) businesses.set(row.business.id, { id: row.business.id, name: clean(row.business.name) });}
    catch (error) {if (error.code === 'TOKEN_INVALID') throw error;businessesAvailable = false;}
  }
  const rows = result.rows.filter((row) => /^act_\d+$/.test(row.id || '')).map((row) => {
    return { id: row.id, name: clean(row.name), status: Number(row.account_status) || 0, currency: clean(row.currency, 8), timezone: clean(row.timezone_name, 100) };
  });
  return { accounts: rows, businesses: [...businesses.values()], businessesAvailable, businessScope: 'Negócios associados às contas acessíveis', truncated: result.truncated };
}
export async function metaAccess(store, env = process.env, fetcher = fetch) {
  metaConfig(env);const row = await store.get();
  if (!row?.token_ciphertext) throw new MetaError('NOT_CONNECTED', 409);
  if (row.app_id !== env.META_APP_ID || row.expires_at <= store.now()) throw new MetaError('TOKEN_INVALID', 401);
  return { row, client: createMetaClient(decryptToken(row.token_ciphertext, env), env, fetcher) };
}
const numeric = (value) => value != null && Number.isFinite(Number(value)) ? Number(value) : null;
export async function metaCampaigns(store, period, env = process.env, fetcher = fetch) {
  const { row, client } = await metaAccess(store, env, fetcher),account = parse(row.account_json);
  if (!account) throw new MetaError('ACCOUNT_REQUIRED', 409);
  // Confirm continued access to the selected account before querying performance.
  await client.get(account.id, { fields: 'id' });
  const [campaigns, insights, totals] = await Promise.all([
  client.list(account.id + '/campaigns', { fields: 'id,name,effective_status,daily_budget,lifetime_budget' }),
  client.list(account.id + '/insights', { level: 'campaign', fields: 'campaign_id,spend,impressions,reach,clicks,cpc,cpm,ctr', time_range: JSON.stringify({ since: period.start, until: period.end }) }),
  client.get(account.id + '/insights', { level: 'account', fields: 'spend,impressions,reach,clicks,cpc,cpm,ctr', time_range: JSON.stringify({ since: period.start, until: period.end }) })]
  );
  const metrics = (data) => Object.fromEntries(['spend', 'impressions', 'reach', 'clicks', 'cpc', 'cpm', 'ctr'].map((k) => [k, numeric(data?.[k])]));
  const byId = new Map(insights.rows.map((r) => [r.campaign_id, r]));
  const rows = campaigns.rows.map((c) => ({ id: clean(c.id, 40), name: clean(c.name), status: clean(c.effective_status, 50), dailyBudget: numeric(c.daily_budget), lifetimeBudget: numeric(c.lifetime_budget), ...metrics(byId.get(c.id)) }));
  if ((await store.get()).revision !== row.revision) throw new MetaError('CONNECTION_CHANGED', 409);
  return { account, period, rows, totals: metrics(totals.data?.[0]), truncated: campaigns.truncated || insights.truncated };
}
