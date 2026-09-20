import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, existsSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createAdminStore, hashPassword } from '../server/admin/core.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'marquesano-admin-test-'));
const filename = join(dir, 'admin.sqlite');
const origin = 'https://marquesano.com.br';
const port = 3197;
const base = `http://127.0.0.1:${port}`;
const password = randomBytes(24).toString('hex');
let child, db, output = '';
try {
  const store = createAdminStore(filename);
  await store.createOwner('owner@example.com', password);
  store.close();
  db = new DatabaseSync(filename);
  const hash = await hashPassword(password);
  for (const role of ['ADMIN', 'MARKETING', 'SALES', 'VIEWER']) db.prepare('INSERT INTO users (id,email,password_hash,role) VALUES (?,?,?,?)').run(role, `${role.toLowerCase()}@example.com`, hash, role);
  child = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'start', '--port', String(port)], { cwd: root, env: { ...process.env, NODE_ENV: 'production', ADMIN_DATABASE_PATH: filename, ADMIN_SITE_ORIGIN: origin, CONTACT_SITE_ORIGIN:origin }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
  const request = (path, options = {}) => fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(15000), ...options });
  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (child.exitCode !== null) throw Error('Test server exited: ' + output);
    try { if ((await request('/admin/login')).status === 200) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, 'Test server did not start');
  const loginHtml = await (await request('/admin/login')).text();
  assert(loginHtml.includes('noindex')); assert(!loginHtml.includes('property="og:image"'));
  for (const path of ['/admin','/admin/dashboard','/admin/marketing','/admin/analytics','/admin/leads','/admin/clientes','/admin/seo','/admin/configuracoes','/admin/formularios','/admin/campanhas','/admin/usuarios','/admin/auditoria','/admin/unknown']) {
    const response = await request(path); assert.equal(response.status, 307, path); assert(response.headers.get('location').endsWith('/admin/login'));
  }
  for (const path of ['session','dashboard','marketing','analytics','leads','clientes','seo','configuracoes','formularios','campanhas','usuarios','auditoria','unknown']) assert.equal((await request('/api/admin/' + path)).status, 401, path);
  assert.equal((await request('/api/admin/session', { headers: { Cookie: '__Host-marquesano_admin=' + 'a'.repeat(64), 'x-middleware-subrequest': 'proxy:proxy:proxy:proxy:proxy' } })).status, 401);
  const login = async (email, originHeader = origin) => request('/api/admin/login', { method: 'POST', headers: { Origin: originHeader, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  assert.equal((await login('owner@example.com', 'https://evil.example')).status, 403);
  const loginResponse = await login('owner@example.com'); assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get('set-cookie').split(';')[0];
  assert(loginResponse.headers.get('set-cookie').includes('Secure'));
  const authenticated = path => request(path, { headers: { Cookie: cookie } });
  for (const module of ['dashboard','marketing','analytics','leads','clientes','seo','configuracoes','formularios','campanhas','usuarios','auditoria']) {
    const page = await authenticated('/admin/' + module); assert.equal(page.status, 200); const html = await page.text();
    assert(html.includes('Marquesano')); assert(!html.includes('Contato pelo WhatsApp'));
    assert.equal((await authenticated('/api/admin/' + module)).status, 200);
    assert(page.headers.get('cache-control').includes('no-store'));
  }
  for (const [role, allowed, denied] of [['viewer','analytics','configuracoes'], ['marketing','seo','clientes'], ['sales','leads','marketing'], ['admin','configuracoes','unknown']]) {
    const response = await login(`${role}@example.com`); assert.equal(response.status, 200);
    const roleCookie = response.headers.get('set-cookie').split(';')[0];
    for (const prefix of ['/admin/', '/api/admin/']) {
      assert.equal((await request(prefix + allowed, { headers: { Cookie: roleCookie } })).status, 200);
      assert.equal((await request(prefix + denied, { headers: { Cookie: roleCookie } })).status, 403);
    }
  }
  const mutate=async(path,body,method='POST')=>request('/api/admin/'+path,{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const draft={name:'Contato de teste integrado',email:'test@example.com',phone:'11999999999',status:'NEW',priority:'NORMAL',message:'Teste isolado, sem envio de email.'};
  let response=await mutate('leads',draft);assert.equal(response.status,200);const lead=await response.json();
  assert.equal((await authenticated('/admin/leads/'+lead.id)).status,200);
  assert.equal((await mutate('leads/'+lead.id+'/convert',{})).status,400);
  assert.equal((await mutate('leads/'+lead.id,{...draft,status:'WON'},'PATCH')).status,200);
  assert.equal((await mutate('leads/'+lead.id+'/notes',{body:'Nota de teste'})).status,200);
  response=await mutate('leads/'+lead.id+'/convert',{});assert.equal(response.status,200);const client=await response.json();
  assert.equal((await authenticated('/admin/clientes/'+client.id)).status,200);
  const record=await(await authenticated('/api/admin/leads/'+lead.id)).json();assert.equal(record.notes.length,1);assert.equal(record.history.length,2);
  response=await mutate('campanhas',{name:'Campanha isolada',source:'test',medium:'internal',slug:'test_campaign',landing_page:'/planos',status:'ACTIVE'});assert.equal(response.status,200);
  assert.equal((await mutate('configuracoes',{TRACKING_ENABLED:'true',GA4_MEASUREMENT_ID:'G-ABCDE',GTM_CONTAINER_ID:''},'PATCH')).status,200);
  const trackingConfig=await(await request('/api/marketing')).json();assert.equal(trackingConfig.ga4,'G-ABCDE');assert(!JSON.stringify(trackingConfig).includes('PRIVATE'));
  const tracking=await request('/api/marketing',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({id:randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5'),name:'page_view',path:'/planos',attribution:{utm_source:'test',utm_campaign:'test_campaign',landing_page:'/planos'}})});
  assert.equal(tracking.status,200);assert(tracking.headers.get('set-cookie').includes('HttpOnly'));
  const dashboard=await(await authenticated('/api/admin/dashboard')).json();assert.equal(dashboard.counts.leads,1);assert.equal(dashboard.counts.won,1);assert.equal(dashboard.counts.visitors,1);
  const lastOwner=await mutate('usuarios/'+(await(await authenticated('/api/admin/session')).json()).user.id,{email:'owner@example.com',role:'ADMIN',active:true},'PATCH');assert.equal(lastOwner.status,409);
  const robots=await(await request('/robots.txt')).text();assert(robots.includes('/admin'));const sitemap=await(await request('/sitemap.xml')).text();assert(!sitemap.includes('/admin'));assert(sitemap.includes('https://marquesano.com.br/servicos'));
  // Disabling an account invalidates existing sessions immediately.
  db.prepare('UPDATE users SET active=0 WHERE email=?').run('owner@example.com');
  assert.equal((await authenticated('/api/admin/session')).status, 401);
  db.prepare('UPDATE users SET active=1 WHERE email=?').run('owner@example.com');
  db.prepare('UPDATE users SET role=? WHERE email=?').run('VIEWER', 'owner@example.com');
  assert.equal((await authenticated('/api/admin/configuracoes')).status, 403);
  db.prepare('UPDATE users SET role=? WHERE email=?').run('OWNER', 'owner@example.com');
  assert.equal((await request('/api/admin/logout', { method: 'POST', headers: { Origin: origin, Cookie: cookie } })).status, 200);
  assert.equal((await authenticated('/api/admin/session')).status, 401);
  // Public site and contact GET remain available; no real email is sent.
  for (const path of ['/','/servicos','/portfolio','/planos','/contato','/sobre']) {
    const response = await request(path); assert.equal(response.status, 200); const html = await response.text();
    assert(!/<a[^>]+href="\/admin/.test(html));
  }
  assert.equal((await request('/api/contato')).status, 200);
  for (let i = 0; i < 5; i++) assert.equal((await login('missing@example.com')).status, 401);
  assert.equal((await login('missing@example.com')).status, 429);
  await new Promise((resolve, reject) => {
    const metadata = spawn(process.execPath, [join(root, 'app/scripts/verify-metadata.cjs'), base], { cwd: root, stdio: 'inherit', windowsHide: true });
    metadata.on('error', reject); metadata.on('exit', code => code === 0 ? resolve() : reject(Error('Public metadata regression')));
  });
  console.log('PASS: all admin routes/APIs protected, five roles, CSRF, secure session, logout/replay, account disabling and public routes.');
} catch (error) {
  console.error(output);
  throw error;
} finally {
  db?.close();
  if (child && child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
  for (const suffix of ['', '-wal', '-shm']) if (existsSync(filename + suffix)) unlinkSync(filename + suffix);
  rmdirSync(dir);
}
