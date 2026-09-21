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
    if (!rawOrigin) return false;
    const source = new URL(rawOrigin);
    if (rawOrigin !== source.origin || !allowed.has(source.origin)) return false;
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
    const proto = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.slice(0, -1);
    // Reject ambiguous forwarded chains and malformed authorities.
    if (!/^[a-zA-Z0-9.\-:\[\]]+$/.test(host) || !['https', 'http'].includes(proto)) return false;
    const destination = new URL(`${proto}://${host}`).origin;
    return allowed.has(destination);
  } catch { return false; }
}
