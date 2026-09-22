import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { registerHooks } from 'node:module';
import { directCheckout } from '../server/admin/direct-checkout.mjs';

test('real HTTP POSTs use production origin rules in both checkout route handlers', async () => {
  // Resolve the extensionless Next import as its bundler does.
  const hooks = registerHooks({ resolve(specifier, context, next) {
    return next(specifier === 'next/headers' ? 'next/headers.js' : specifier, context);
  } });
  const saved = { ...process.env };
  const key = Symbol.for('marquesano.public.checkout.store');
  const previousStore = globalThis[key];
  // Fail if validation ever reaches persistence. No Neon, migrations or payments.
  const repository = new Proxy({}, { get() { throw Error('Unexpected persistence access'); } });
  globalThis[key] = Promise.resolve({ repository });
  process.env.NODE_ENV = 'production';
  process.env.MERCADOPAGO_SITE_ORIGIN = 'https://marquesano.com.br/';
  process.env.DATABASE_URL = 'postgresql://unused/test';
  let server;
  try {
    const checkout = await import('../api/checkout/[plan]/route.js');
    const subscriptions = await import('../api/assinaturas/[plan]/route.js');
    server = createServer(async (incoming, outgoing) => {
      try {
        const chunks = [];
        for await (const chunk of incoming) chunks.push(chunk);
        const request = new Request(`http://internal:3000${incoming.url}`, {
          method: 'POST', headers: incoming.headers, body: Buffer.concat(chunks)
        });
        const handler = incoming.url.startsWith('/api/checkout/') ? checkout.POST : subscriptions.POST;
        const response = await handler(request, { params: Promise.resolve({ plan: 'basico' }) });
        outgoing.writeHead(response.status, Object.fromEntries(response.headers));
        outgoing.end(await response.text());
      } catch { outgoing.writeHead(500); outgoing.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    for (const path of ['/api/checkout/basico', '/api/assinaturas/basico']) {
      for (const [origin, allowed] of [
        ['https://marquesano.com.br', true], ['https://www.marquesano.com.br', true],
        ['https://external.example', false], ['http://marquesano.com.br', false],
        ['http://www.marquesano.com.br', false]
      ]) {
        const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
          method: 'POST', headers: { origin, 'content-type': 'application/json',
            'x-forwarded-host': 'marquesano.com.br', 'x-forwarded-proto': 'https' }, body: '{}'
        });
        const data = await response.json();
        assert.equal(response.status, allowed ? (path.includes('/checkout/') ? 400 : 200) : 403);
        if (allowed && path.includes('/checkout/')) assert.match(data.error, /Termos de Servi/);
        if (allowed && path.includes('/assinaturas/')) assert.equal(data.url, '/checkout/basico');
        console.info(JSON.stringify({ path, origin, status: response.status }));
        await assert.rejects(directCheckout(new Request(`https://marquesano.com.br${path}`, {
          method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{}'
        }), 'basico', repository), error => error.status === (allowed ? 400 : 403));
      }
    }
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    hooks.deregister();
    if (previousStore === undefined) delete globalThis[key]; else globalThis[key] = previousStore;
    for (const name of ['NODE_ENV', 'MERCADOPAGO_SITE_ORIGIN', 'DATABASE_URL']) {
      if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name];
    }
  }
});
