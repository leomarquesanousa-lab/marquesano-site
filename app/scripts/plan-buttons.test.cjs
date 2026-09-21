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
    const articles = (await Cards({ home })).props.children;
    assert.deepEqual(articles.map(article => {
      const button = article.props.children.find(child => child?.type === Button);
      return [button.props.name, button.props.code, button.props.revision];
    }), [['Básico', 'basico', 5], ['Professional', 'professional', 5], ['Business', 'business', 5]]);
  }
});

test('each CTA links to the single local checkout and keeps its visual classes', () => {
  const Button = load('components/PlanCheckoutButton.js', {
    'next/link': { __esModule: true, default: 'a' },
    './PlanCheckoutButton.module.css': { __esModule: true, default: { button: 'button' } },
  });
  for (const [code, name] of [['basico', 'Básico'], ['professional', 'Professional'], ['business', 'Business']]) {
    const result = Button({ code, name, className: 'refinedBtn primary', children: 'arrow' });
    assert.equal(result.props.href, '/checkout/' + code);
    assert.equal(result.props.className, 'refinedBtn primary button');
    assert.ok(result.props.children.includes(name));
  }
});