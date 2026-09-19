import test from "node:test";
import assert from "node:assert/strict";
import { createContactHandler, validateContact, contactConfigStatus } from "../server/contact.mjs";

const origin = "https://marquesano.com.br";
const env = { NODE_ENV: "production", CONTACT_TO_EMAIL: "inbox@example.com", CONTACT_FROM_EMAIL: "site@example.com", RESEND_API_KEY: "test-only-not-a-real-key", CONTACT_FORM_SECRET: "test-only-secret-with-at-least-32-characters" };
const fields = { name: "Pessoa Teste", email: "visitor@example.com", phone: "11999998888", message: "Gostaria de conhecer o serviço de criação de sites.", interest: "Profissional", website: "" };
const request = (body, from = origin) => new Request(`${origin}/api/contato`, { method: "POST", headers: { Origin: from, "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("configuracao real aceita emails Marquesano e segredo a partir de 32 caracteres", async () => {
  const config = { ...env, CONTACT_TO_EMAIL: "suporte@maconfeccoes.com.br", CONTACT_FROM_EMAIL: "noreply@maconfeccoes.com.br", CONTACT_FORM_SECRET: "x".repeat(32) };
  assert(Object.values(contactConfigStatus(config)).every(value => value === true));
  assert.equal((await setup(undefined, config).handle(new Request(`${origin}/api/contato`))).status, 200);
  for (const key of Object.keys(contactConfigStatus(config))) {
    const invalid = { ...config, [key]: key === "CONTACT_FORM_SECRET" ? "x".repeat(31) : "" };
    assert.equal(contactConfigStatus(invalid)[key], false);
    assert.equal((await setup(undefined, invalid).handle(new Request(`${origin}/api/contato`))).status, 503);
  }
  for (const email of ["Marquesano <noreply@maconfeccoes.com.br>", "a@b", "a@b.com\n", "a b@c.com"]) {
    assert.equal(contactConfigStatus({ ...config, CONTACT_FROM_EMAIL: email }).CONTACT_FROM_EMAIL, false);
  }
});

test("diagnostico do Resend fica no servidor em desenvolvimento e remove segredos", async () => {
  for (const mode of ["development", "production"]) {
    const logs = [];
    let time = 10000;
    const handle = createContactHandler({
      env: { ...env, NODE_ENV: mode }, now: () => time,
      logger: { error: (...args) => logs.push(args) },
      fetcher: async () => Response.json({ name: "validation_error", message: `Domain is not verified ${env.RESEND_API_KEY} ${env.CONTACT_FORM_SECRET}`, extra: "private" }, { status: 403 })
    });
    const { token } = await (await handle(new Request(`${origin}/api/contato`))).json();
    time += 2000;
    const response = await handle(request({ ...fields, token }));
    assert.equal(response.status, 502);
    assert(!(await response.text()).includes("Domain"));
    assert.equal(logs.length, mode === "development" ? 1 : 0);
    const output = JSON.stringify(logs);
    assert(!output.includes(env.RESEND_API_KEY));
    assert(!output.includes(env.CONTACT_FORM_SECRET));
    if (mode === "development") {
      assert(output.includes("Domain is not verified"));
      assert.equal(logs[0][1].status, 403);
      assert(!output.includes("private"));
    }
  }
});
function setup(fetcher = async () => Response.json({ id: "email-test" }), config = env) {
  let time = Date.UTC(2026, 8, 19, 12);
  const handle = createContactHandler({ env: config, fetcher, now: () => time });
  return { handle, advance: ms => { time += ms; }, token: async () => (await (await handle(new Request(`${origin}/api/contato`))).json()).token };
}
test("envio validado usa credenciais do servidor, reply-to e idempotência", async () => {
  const calls = [];
  const s = setup(async (url, options) => { calls.push({ url, options }); return Response.json({ id: "email-test" }); });
  const token = await s.token(); s.advance(2000);
  assert.equal((await s.handle(request({ ...fields, token }))).status, 200);
  assert.equal((await s.handle(request({ ...fields, token }))).status, 200);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  const email = JSON.parse(calls[0].options.body);
  assert.deepEqual(email.to, [env.CONTACT_TO_EMAIL]);
  assert.equal(email.reply_to, fields.email);
  assert.equal(calls[0].options.headers["Idempotency-Key"], calls[1].options.headers["Idempotency-Key"]);
  assert(!email.text.includes(env.RESEND_API_KEY));
});
test("valida campos, tamanho e rejeita injeção de cabeçalhos", () => {
  assert(validateContact(fields));
  for (const change of [{ name: " " }, { email: "abc" }, { email: "a@b.com\r\nBcc:x@y.com" }, { phone: "abc123" }, { message: "curta" }, { message: "x".repeat(4001) }, { interest: {} }]) assert.equal(validateContact({ ...fields, ...change }), null);
});
test("sem configuração, recusa envio sem simular sucesso", async () => {
  const s = setup(() => { throw Error("Não deve chamar provedor"); }, {});
  assert.equal((await s.handle(request(fields))).status, 503);
});
test("bloqueia origem externa, honeypot, token inválido e envio rápido", async () => {
  let calls = 0; const s = setup(async () => { calls++; return Response.json({ id: "test" }); });
  const token = await s.token();
  assert.equal((await s.handle(request({ ...fields, token }, "https://outro.example"))).status, 403);
  assert.equal((await s.handle(request({ ...fields, token }))).status, 400);
  s.advance(2000);
  assert.equal((await s.handle(request({ ...fields, token, website: "spam" }))).status, 400);
  assert.equal((await s.handle(request({ ...fields, token: token + "x" }))).status, 400);
  assert.equal(calls, 0);
});
test("token expira e mensagens excessivas não chegam ao provedor", async () => {
  const s = setup(); const token = await s.token(); s.advance(7200001);
  assert.equal((await s.handle(request({ ...fields, token }))).status, 400);
  assert.equal((await s.handle(request({ ...fields, message: "x".repeat(15000), token }))).status, 413);
});
test("falhas do provedor e conexão retornam erro claro sem credenciais", async () => {
  for (const fetcher of [async () => Response.json({ error: "secret-details" }, { status: 401 }), async () => { throw Error("secret-details"); }, async () => Response.json({})]) {
    const s = setup(fetcher); const token = await s.token(); s.advance(2000);
    const response = await s.handle(request({ ...fields, token }));
    assert.equal(response.status, 502); assert(!(await response.text()).includes("secret-details"));
  }
});
test("limita tentativas repetidas e recupera depois da janela", async () => {
  let calls = 0; const s = setup(async () => { calls++; return Response.json({ id: "test" }); });
  const token = await s.token(); s.advance(2000);
  for (let i = 0; i < 3; i++) assert.equal((await s.handle(request({ ...fields, token }))).status, 200);
  assert.equal((await s.handle(request({ ...fields, token }))).status, 429);
  assert.equal(calls, 3); s.advance(900001);
  assert.equal((await s.handle(request({ ...fields, token }))).status, 200);
});
