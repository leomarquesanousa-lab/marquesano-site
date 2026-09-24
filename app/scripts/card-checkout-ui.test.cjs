const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { transformSync } = require('next/dist/build/swc');

function load(file, dependencies) {
  const { code } = transformSync(fs.readFileSync(file, 'utf8'), { filename: file,
    jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => Object.hasOwn(dependencies, id) ? dependencies[id] : require(id), module, module.exports);
  return module.exports.default;
}
function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  const children = Array.isArray(node.props?.children) ? node.props.children.flat(Infinity) : [node.props?.children];
  return [node, ...children.flatMap(flatten)];
}
function harness(t) {
  const state = [], refs = [], effects = [];
  let stateCursor = 0, refCursor = 0, effectCursor = 0, scheduled = [];
  const hooks = {
    useState: initial => { const i = stateCursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = value; }]; },
    useRef: initial => { const i = refCursor++; return refs[i] ||= { current: initial }; },
    useEffect: (fn, deps) => { const i = effectCursor++; if (!effects[i] || deps.some((d, n) => d !== effects[i][n])) { effects[i] = deps; scheduled.push(fn); } },
  };
  let config, token = 'official_token_for_test';
  const original = { window: global.window, fetch: global.fetch, sessionStorage: global.sessionStorage };
  const redirects = [], calls = [], storage = new Map();
  global.window = { MP_DEVICE_SESSION_ID: 'device-session-fixture', MercadoPago: class { cardForm(options) { config = options; options.callbacks.onReady(); return { getCardFormData: () => ({ token, cardNumber: 'must-not-be-sent', securityCode: 'must-not-be-sent', amount: 1 }), unmount() {} }; } }, location: { assign: value => redirects.push(value) } };
  global.sessionStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  let response = { ok: true, status: 200, json: async () => ({ url: '/checkout/sucesso' }) };
  global.fetch = async (...args) => { calls.push(args); return response; };
  t.after(() => Object.assign(global, original));
  const Component = load('checkout/CardCheckout.js', {
    '../config/payment-security.mjs': require('../config/payment-security.mjs'),
    react: hooks, 'next/script': { __esModule: true, default: 'script' },
    '../config/plans.mjs': { priceLabel: cents => 'R$ ' + cents / 100 },
    './Checkout.module.css': { __esModule: true, default: {} },
  });
  const render = () => {
    stateCursor = refCursor = effectCursor = 0;
    const tree = Component({ code: 'professional', revision: 3, amount: 19900, publicKey: 'public-test' });
    for (const fn of scheduled.splice(0)) fn();
    return flatten(tree);
  };
  let nodes = render();
  const fields = { email: { value: 'buyer@example.test' }, terms: { checked: true } };
  refs[0].current = { elements: fields };
  nodes.find(n => n.type === 'script').props.onReady();
  render();
  return { render, fields, calls, redirects, storage, get config() { return config; }, setResponse(value) { response = value; }, tick: () => new Promise(resolve => setImmediate(resolve)) };
}

test('official SDK uses iframe card fields, sends only token and allowed data, then redirects locally', async t => {
  const h = harness(t);
  assert.equal(h.config.iframe, true);
  assert.equal(h.config.amount, '199.00');
  for (const id of ['mp-card-number','mp-card-expiry','mp-card-cvv']) assert.equal(h.render().find(n => n.props?.id === id).type, 'div');
  h.config.callbacks.onSubmit({ preventDefault() {} });
  await h.tick();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][0], '/api/checkout/professional');
  const data = JSON.parse(h.calls[0][1].body);
  assert.deepEqual(Object.keys(data).sort(), ['card_token_id','device_id','payer_email','request_id','revision','terms']);
  assert.equal(data.card_token_id, 'official_token_for_test');
  assert.equal(data.device_id, 'device-session-fixture');
  assert.equal(data.payer_email, 'buyer@example.test');
  assert.equal(JSON.stringify(data).includes('must-not-be-sent'), false);
  assert.equal([...h.storage.values()].some(v => v.includes('official_token')), false);
  assert.deepEqual(h.redirects, ['/checkout/sucesso']);
});

test('security script is unique, checkout-scoped; double submission and rejection cooldown block requests', async t => {
  const h = harness(t);
  const script = h.render().filter(n => n.props?.src === 'https://www.mercadopago.com/v2/security.js');
  assert.equal(script.length, 1);
  assert.equal(script[0].props.id, 'mercadopago-security');
  assert.equal(script[0].props.view, 'checkout');
  h.setResponse({ ok: false, status: 422, json: async () => ({ error: 'Rejected' }) });
  h.config.callbacks.onSubmit({ preventDefault() {} });
  h.config.callbacks.onSubmit({ preventDefault() {} });
  await h.tick();
  h.config.callbacks.onSubmit({ preventDefault() {} });
  await h.tick();
  assert.equal(h.calls.length, 1);
  assert.equal([...h.storage.values()].some(v => v.includes('device-session')), false);
});

test('device wait is bounded, accepts delayed value and rejects header injection', async () => {
  const { waitForDeviceId, validDeviceId } = await import('../config/payment-security.mjs');
  let reads = 0, waits = 0;
  assert.equal(await waitForDeviceId(() => ++reads === 3 ? 'device-fixture' : undefined, async () => waits++), 'device-fixture');
  assert.equal(waits, 2);
  waits = 0;
  assert.equal(await waitForDeviceId(() => undefined, async () => waits++), null);
  assert.equal(waits, 11);
  assert.equal(validDeviceId('device\r\nAuthorization: bad'), false);
});

test('missing device shows friendly error without sending token or creating an attempt', async t => {
  const h = harness(t);
  delete global.window.MP_DEVICE_SESSION_ID;
  h.config.callbacks.onSubmit({ preventDefault() {} });
  await new Promise(resolve => setTimeout(resolve, 2400));
  assert.equal(h.calls.length, 0);
  assert.equal(h.storage.size, 0);
  assert.match(h.render().find(n => n.props?.role === 'alert').props.children, /verificação de segurança/);
});

test('required consent blocks submission; rejection stays inline and preserves non-sensitive fields', async t => {
  const h = harness(t);
  h.fields.terms.checked = false;
  h.config.callbacks.onSubmit({ preventDefault() {} });
  await h.tick();
  assert.equal(h.calls.length, 0);
  h.fields.terms.checked = true;
  h.setResponse({ ok: false, status: 422, json: async () => ({ error: 'Cartão não autorizado.' }) });
  h.config.callbacks.onSubmit({ preventDefault() {} });
  await h.tick();
  assert.equal(h.render().find(n => n.props?.role === 'alert').props.children, 'Cartão não autorizado.');
  assert.equal(h.fields.email.value, 'buyer@example.test');
  assert.equal(h.fields.terms.checked, true);
  assert.deepEqual(h.redirects, []);
});

test('uncertain response switches to verification without retransmitting card token', async t => {
  const h = harness(t);
  h.setResponse({ ok: true, status: 202, json: async () => ({ error: 'Verifique a assinatura.' }) });
  h.config.callbacks.onSubmit({ preventDefault() {} });
  await h.tick();
  const verify = h.render().find(n => n.type === 'button');
  assert.equal(verify.props.children, 'Verificar assinatura');
  h.setResponse({ ok: true, status: 200, json: async () => ({ url: '/checkout/sucesso' }) });
  verify.props.onClick();
  await h.tick();
  const first = JSON.parse(h.calls[0][1].body), second = JSON.parse(h.calls[1][1].body);
  assert.equal(second.request_id, first.request_id);
  assert.equal(second.card_token_id, undefined);
  assert.deepEqual(h.redirects, ['/checkout/sucesso']);
});

test('new checkout pages and API parse as JSX/modules without running a build', () => {
  for (const file of ['checkout/[plan]/page.js','checkout/sucesso/page.js','api/checkout/[plan]/route.js','assinar/[plan]/page.js','api/assinaturas/[plan]/route.js']) {
    assert.doesNotThrow(() => transformSync(fs.readFileSync(file, 'utf8'), { filename: file, jsc: { parser: { syntax: 'ecmascript', jsx: true } } }));
  }
});

test('server passes public key and PostgreSQL price to the real form even for inactive or unsynced plans', async t => {
  const { checkoutPlans } = await import('../config/checkout-plans.mjs');
  const planConfig = await import('../config/plans.mjs');
  const original = { publicKey: process.env.MERCADOPAGO_PUBLIC_KEY, accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN };
  process.env.MERCADOPAGO_PUBLIC_KEY = 'public-key-fixture';
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'private-token-fixture';
  t.after(() => {
    for (const [key, value] of [['MERCADOPAGO_PUBLIC_KEY', original.publicKey], ['MERCADOPAGO_ACCESS_TOKEN', original.accessToken]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const Form = () => null;
  const Page = load('checkout/[plan]/page.js', {
    'next/navigation': { notFound() { throw Error('not found'); } },
    '../../server/checkout.mjs': { checkoutStore: async () => ({ repository: { plans: { get: async id => ({ id, revision: 7, monthly_price_cents: 15321, active: false, mercadopago_plan_id: null }) } } }) },
    '../../config/checkout-plans.mjs': { checkoutPlans },
    '../../config/plans.mjs': planConfig,
    '../../components/Experience': { Navigation: () => null, Footer: () => null },
    '../CardCheckout': { __esModule: true, default: Form },
    '../Checkout.module.css': { __esModule: true, default: {} },
  });
  for (const code of ['basico','professional','business']) {
    const tree = await Page({ params: Promise.resolve({ plan: code }) });
    const form = flatten(tree).find(node => node.type === Form);
    assert.ok(form);
    assert.equal(form.props.code, code);
    assert.equal(form.props.amount, 15321);
    assert.equal(form.props.publicKey, 'public-key-fixture');
    assert.equal(JSON.stringify(tree).includes('private-token-fixture'), false);
  }
});
