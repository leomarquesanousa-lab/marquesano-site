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

test('home and plans cards pass the correct public code to each direct checkout button', async () => {
  const { checkoutPlans } = await import('../config/checkout-plans.mjs');
  const Button = () => null;
  const Cards = load('components/PlanCards.js', {
    '../server/plans': { publicPlans: () => ['basico', 'intermediario', 'professional'].map(id => ({ id, revision: 5, monthly_price_cents: 9900 })) },
    './Experience': { Arrow: () => null }, './PlanCheckoutButton': { __esModule: true, default: Button },
    '../config/checkout-plans.mjs': { checkoutPlans },
  });
  for (const home of [true, false]) {
    const articles = Cards({ home }).props.children;
    assert.deepEqual(articles.map(article => {
      const button = article.props.children.find(child => child?.type === Button);
      return [button.props.name, button.props.code, button.props.revision];
    }), [['Básico', 'basico', 5], ['Professional', 'professional', 5], ['Business', 'business', 5]]);
  }
});

test('button sends only revision, blocks duplicate clicks, shows loading and redirects directly', async t => {
  let resolve;
  const calls = [], redirects = [], state = [];
  let cursor = 0;
  const ref = { current: false };
  const Button = load('components/PlanCheckoutButton.js', {
    react: { useRef: () => ref, useState: initial => {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = value; }];
    } }, './PlanCheckoutButton.module.css': { __esModule: true, default: {} },
  });
  const originalFetch = global.fetch, originalWindow = global.window;
  t.after(() => { global.fetch = originalFetch; global.window = originalWindow; });
  global.fetch = (...args) => { calls.push(args); return new Promise(done => { resolve = done; }); };
  global.window = { location: { assign: url => redirects.push(url) } };
  const render = () => { cursor = 0; return Button({ code: 'professional', name: 'Professional', revision: 5, className: 'refinedBtn' }).props.children; };
  const click = render()[0].props.onClick;
  const first = click();
  await click();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/api/checkout/professional');
  assert.deepEqual(JSON.parse(calls[0][1].body), { revision: 5 });
  assert.equal(render()[0].props.disabled, true);
  assert.equal(render()[0].props.children[0], 'Iniciando…');
  resolve({ ok: true, json: async () => ({ url: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=test' }) });
  await first;
  assert.equal(redirects.length, 1);
  ref.current = false;
  const failure = render()[0].props.onClick();
  resolve({ ok: false, json: async () => ({ error: 'Plano temporariamente indisponível' }) });
  await failure;
  assert.equal(render()[1].props.role, 'alert');
  assert.equal(render()[1].props.children, 'Plano temporariamente indisponível');
  assert.equal(render()[0].props.disabled, false);
  assert.equal(redirects.length, 1);
});
