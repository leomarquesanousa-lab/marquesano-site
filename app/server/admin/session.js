import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminStore, configured, cookieName, canAccess, adminDiagnostic } from './core.mjs';

export async function currentAdmin() {
  if (!configured()) return null;
  try {return await (await adminStore()).getSession((await cookies()).get(cookieName())?.value);}
  catch (error) {adminDiagnostic('ADMIN_SESSION_FAILED', error);return null;}
}
export async function requireAdmin(module) {
  const user = await currentAdmin();
  if (!user) redirect('/admin/login');
  return { user, allowed: !module || canAccess(user.role, module) };
}
