import test from "node:test";
import assert from "node:assert/strict";
import { createContactSession } from "../components/contact-session.mjs";
import { createContactHandler } from "../server/contact.mjs";

function setup({ initialFailure = false, deliveryFailure = false } = {}) {
  let clientTime = Date.UTC(2026, 8, 19, 12), serverOffset = 0, deliveries = 0, preparations = 0;
  const env = { NODE_ENV: "production", CONTACT_TO_EMAIL: "inbox@example.com", CONTACT_FROM_EMAIL: "site@example.com", RESEND_API_KEY: "test-only", CONTACT_FORM_SECRET: "test-only-secret-at-least-32-characters" };
  const handler = createContactHandler({ env, now: () => clientTime + serverOffset, fetcher: async () => { deliveries++; return Response.json(deliveryFailure ? { error: "failure" } : { id: "test-message" }, { status: deliveryFailure ? 500 : 200 }); } });
  const session = createContactSession({
    now: () => clientTime,
    wait: async ms => { clientTime += ms; },
    fetcher: async (url, options = {}) => {
      if (!options.method) {
        preparations++;
        if (initialFailure && preparations === 1) return Response.json({ message: "Falha temporária" }, { status: 503 });
      }
      return handler(new Request(`https://marquesano.com.br${url}`, { ...options, headers: { ...options.headers, Origin: "https://marquesano.com.br" } }));
    }
  });
  return { session, get deliveries() { return deliveries; }, get preparations() { return preparations; }, expireOnServer: () => { serverOffset = 7200001; } };
}
const fields = { name: "Pessoa Teste", email: "teste@example.com", phone: "11999998888", message: "Quero conhecer os planos de criação de sites.", website: "" };
test("primeiro clique prepara sessão e envia sem exigir novo clique", async () => {
  const s = setup();
  const result = await s.session.send(fields);
  assert.equal(result.ok, true); assert.equal(s.deliveries, 1);
});
test("falha na preparação inicial permite recuperação no envio", async () => {
  const s = setup({ initialFailure: true });
  await assert.rejects(s.session.prepare());
  assert.equal((await s.session.send(fields)).ok, true);
  assert.equal(s.deliveries, 1);
});
test("sessão expirada é renovada automaticamente antes de entregar", async () => {
  const s = setup(); await s.session.prepare(); s.expireOnServer();
  assert.equal((await s.session.send(fields)).ok, true);
  assert.equal(s.preparations, 2); assert.equal(s.deliveries, 1);
});
test("falha real de envio é apresentada sem sucesso falso ou repetição automática", async () => {
  const s = setup({ deliveryFailure: true });
  await assert.rejects(s.session.send(fields), /Não foi possível enviar/);
  assert.equal(s.deliveries, 1);
});
test("preparações concorrentes compartilham a mesma sessão", async () => {
  const s = setup();
  await Promise.all([s.session.prepare(), s.session.prepare()]);
  assert.equal(s.preparations, 1);
});
