import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

// Uses installed Chrome. Never fills a card or submits a payment.
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if (!chrome) throw Error('Chrome/Edge não encontrado para a validação visual.');
const output = mkdtempSync(join(tmpdir(), 'marquesano-checkout-'));
const port = 9437;
const browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-address=127.0.0.1', `--remote-debugging-port=${port}`, `--user-data-dir=${join(output, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let target;
  for (let i = 0; i < 40; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); if (target) break; } catch {}
    await pause(250);
  }
  if (!target) throw Error('Navegador de teste não iniciou.');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let serial = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(Error('Browser operation timed out: ' + method)); }, 30000);
    pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: () => { clearTimeout(timer); reject(Error('Browser operation failed: ' + method)); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const operation = pending.get(message.id); pending.delete(message.id); if (message.error) operation?.reject(); else operation?.resolve(message.result); }
    if (message.method === 'Fetch.requestPaused') void send('Fetch.failRequest', { requestId: message.params.requestId, errorReason: 'Aborted' });
    if (message.method === 'Runtime.consoleAPICalled' && message.params.args[0]?.value === 'CHECKOUT_LOCAL_CARDFORM') {
      // This explicit diagnostic contains only public plan codes and booleans.
      console.info('BROWSER_CHECKOUT_DIAGNOSTIC', message.params.args[1]?.preview?.properties?.filter(p => ['plan_code_received','mercado_pago_public_key_available','mercado_pago_sdk_loaded','cardform_initialized'].includes(p.name)).map(p => ({ name: p.name, value: p.value })));
    }
  });
  await send('Page.enable'); await send('Runtime.enable');
  // Enforce a no-payment test even if the page changes in the future.
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/checkout/*', requestStage: 'Request' }] });
  for (const [code, name, price] of [['basico','Básico','99,00'],['professional','Professional','149,00'],['business','Business','249,00']]) {
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `http://localhost:3000/checkout/${code}` });
    let result;
    for (let i = 0; i < 90; i++) {
      const evaluated = await send('Runtime.evaluate', { expression: `JSON.stringify({text:document.body?.innerText||'',iframes:['mp-card-number','mp-card-expiry','mp-card-cvv'].map(id=>Boolean(document.getElementById(id)?.querySelector('iframe'))),button:document.querySelector('#marquesano-card-form button')?.innerText,ready:document.querySelector('#marquesano-card-form button')?.disabled===false,overflow:document.documentElement.scrollWidth>innerWidth})`, returnByValue: true });
      result = JSON.parse(evaluated.result.value);
      if (result.ready && result.iframes.every(Boolean)) break;
      await pause(500);
    }
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    writeFileSync(join(output, code + '.png'), Buffer.from(screenshot.data, 'base64'));
    const summary = { plan: code, name_visible: result.text.includes('Plano ' + name), price_visible: result.text.includes(price), contract_visible: result.text.includes('Plano com duração de 12 meses, cobrado mensalmente.'), secure_card_iframes: result.iframes, button_ready: result.ready, unavailable_value: result.text.includes('Valor indisponível'), overflow: result.overflow };
    console.info('CHECKOUT_VISUAL_RESULT', summary);
    assert.ok(summary.name_visible && summary.price_visible && summary.contract_visible && summary.secure_card_iframes.every(Boolean) && summary.button_ready && !summary.unavailable_value && !summary.overflow, 'Checkout visual incompleto: ' + code);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await pause(300);
    const mobile = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    writeFileSync(join(output, code + '-mobile.png'), Buffer.from(mobile.data, 'base64'));
    const size = await send('Runtime.evaluate', { expression: 'document.documentElement.scrollWidth <= innerWidth', returnByValue: true });
    assert.equal(size.result.value, true, 'Overflow mobile: ' + code);
  }
  console.info('CHECKOUT_VISUAL_OK', { screenshots: output, submitted_payments: 0 });
} finally { socket?.close(); browser.kill(); }
