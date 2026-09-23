const productionOrigins = new Set(['https://marquesano.com.br', 'https://www.marquesano.com.br']);

export function adminOrigin(env = process.env) {
  const url = new URL(env.ADMIN_SITE_ORIGIN);
  if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) throw Error('Origem administrativa inválida.');
  if (env.NODE_ENV === 'production' && !productionOrigins.has(url.origin)) throw Error('Origem administrativa inválida.');
  return url.origin;
}

// Proxy headers describe the destination; they never add trusted origins.
export function validAdminRequestOrigin(request, env = process.env) {
  try {
    const configuredOrigin = adminOrigin(env);
    const allowed = productionOrigins.has(configuredOrigin) ? productionOrigins : new Set([configuredOrigin]);
    const rawOrigin = request.headers.get('origin');
    if (rawOrigin !== null) {
      const source = new URL(rawOrigin);
      return !source.username && !source.password && allowed.has(source.origin);
    }
    // Without Origin, destination headers alone cannot prove a same-site request.
    const referer = request.headers.get('referer');
    const site = request.headers.get('sec-fetch-site');
    if (site === 'cross-site') return false;
    if (referer) {
      if (!allowed.has(new URL(referer).origin)) return false;
    } else if (!['same-origin', 'same-site'].includes(site)) return false;
    // The first forwarded value describes the original public request. Never
    // search a chain for any allowed value after a disallowed first value.
    const first = value => value.split(',')[0].trim();
    const host = first(request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host);
    const proto = first(request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.slice(0, -1));
    if (!/^[a-zA-Z0-9.\-:\[\]]+$/.test(host) || !['https', 'http'].includes(proto)) return false;
    const destination = new URL(`${proto}://${host}`).origin;
    return allowed.has(destination);
  } catch { return false; }
}
