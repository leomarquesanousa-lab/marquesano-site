import { NextResponse } from 'next/server';
import { adminStore, configured, cookieName, canAccess } from './app/server/admin/core.mjs';

export function proxy(request) {
  const path = request.nextUrl.pathname;
  const api = path === '/api/admin' || path.startsWith('/api/admin/');
  const publicLogin = (path === '/admin/login' && ['GET', 'HEAD'].includes(request.method)) || (path === '/api/admin/login' && request.method === 'POST');
  const finish = response => {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', path.startsWith('/api/admin/meta/') ? 'no-referrer' : 'same-origin');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  };
  // OAuth callback validates its one-use state, browser cookie and original active session.
  // The Strict admin cookie is intentionally not required on this cross-site return.
  if (path === '/api/admin/meta/callback' && request.method === 'GET') return finish(NextResponse.next());
  if (publicLogin) return finish(NextResponse.next());
  let user = null;
  try { if (configured()) user = adminStore().getSession(request.cookies.get(cookieName())?.value); } catch {}
  if (!user) return finish(api ? NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) : NextResponse.redirect(new URL('/admin/login', request.url)));
  const routeModule = path.split('/')[api ? 3 : 2];
  const module = api && routeModule === 'meta' ? 'configuracoes' : routeModule;
  if (module && !['session', 'logout'].includes(module) && !canAccess(user.role, module)) return finish(new NextResponse('Forbidden', { status: 403 }));
  return finish(NextResponse.next());
}
export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
