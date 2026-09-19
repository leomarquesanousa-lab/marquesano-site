import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const MAX_BYTES = 12000;
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

// Boolean-only diagnostics; never return environment values to the client.
export function contactConfigStatus(env = process.env) {
  return {
    RESEND_API_KEY: typeof env.RESEND_API_KEY === "string" && env.RESEND_API_KEY.trim().length > 0,
    CONTACT_TO_EMAIL: EMAIL_PATTERN.test(env.CONTACT_TO_EMAIL || ""),
    CONTACT_FROM_EMAIL: EMAIL_PATTERN.test(env.CONTACT_FROM_EMAIL || ""),
    CONTACT_FORM_SECRET: (env.CONTACT_FORM_SECRET || "").length >= 32
  };
}
const reply = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
const fail = (message, status) => reply({ ok: false, message }, status);
const hash = value => createHash("sha256").update(value).digest("hex");
const sign = (value, secret) => createHmac("sha256", secret).update(value).digest("base64url");

export function validateContact(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const limits = { name: [2, 100], email: [5, 254], phone: [10, 24], message: [10, 4000], interest: [0, 100] };
  const clean = {};
  for (const [key, [min, max]] of Object.entries(limits)) {
    const value = data[key] ?? "";
    if (typeof value !== "string") return null;
    clean[key] = value.trim();
    if (clean[key].length < min || clean[key].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(clean[key])) return null;
    if (key !== "message" && /[\r\n]/.test(clean[key])) return null;
  }
  if (!EMAIL_PATTERN.test(clean.email)) return null;
  if (!/^[+\d\s().-]+$/.test(clean.phone) || !/^\d{10,15}$/.test(clean.phone.replace(/\D/g, ""))) return null;
  return clean;
}

export function createContactHandler({ env = process.env, fetcher = fetch, now = Date.now, logger = console } = {}) {
  function providerDiagnostic(status, details) {
    if (env.NODE_ENV !== "development") return;
    const redact = value => {
      let text = typeof value === "string" ? value : "";
      for (const secret of [env.RESEND_API_KEY, env.CONTACT_FORM_SECRET]) {
        if (secret) text = text.split(secret).join("[REDACTED]");
      }
      return text.replace(/[\r\n\u0000-\u001f\u007f]/g, " ").slice(0, 1000);
    };
    logger.error("[contact] Resend", { status, name: redact(details?.name), message: redact(details?.message) });
  }
  // Proteção básica por processo. Em múltiplas instâncias, complementar no provedor de hospedagem.
  const requests = new Map();
  function limited(key, count, windowMs) {
    const time = now();
    for (const [k, item] of requests) if (item.expires <= time) requests.delete(k);
    const item = requests.get(key) || { count: 0, expires: time + windowMs };
    item.count++;
    requests.set(key, item);
    return item.count > count;
  }
  function allowedOrigin(request) {
    const origin = request.headers.get("origin");
    const configured = env.CONTACT_SITE_ORIGIN || "https://marquesano.com.br";
    const allowed = [configured, "https://marquesano.com.br", "https://www.marquesano.com.br"];
    if (env.NODE_ENV !== "production") allowed.push(new URL(request.url).origin);
    return (!origin && request.method === "GET") || allowed.includes(origin);
  }
  function ready() {
    const status = contactConfigStatus(env);
    const valid = Object.values(status).every(Boolean);
    if (!valid && env.NODE_ENV === "development") logger.error("[contact] Invalid configuration", status);
    return valid;
  }
  return async function handle(request) {
    if (!["GET", "POST"].includes(request.method)) return fail("Método não permitido.", 405);
    if (!allowedOrigin(request)) return fail("Origem não permitida.", 403);
    if (!ready()) return fail("Não foi possível enviar sua mensagem agora. Tente novamente mais tarde ou fale conosco pelo WhatsApp.", 503);
    if (request.method === "GET") {
      const payload = Buffer.from(JSON.stringify({ at: now(), nonce: randomUUID() })).toString("base64url");
      return reply({ token: `${payload}.${sign(payload, env.CONTACT_FORM_SECRET)}` });
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return fail("Formato inválido.", 415);
    if (Number(request.headers.get("content-length")) > MAX_BYTES) return fail("Mensagem muito longa.", 413);
    let data;
    try {
      const reader = request.body?.getReader();
      if (!reader) return fail("Preencha os campos do formulário.", 400);
      const chunks = [];
      let total = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) { await reader.cancel(); return fail("Mensagem muito longa.", 413); }
        chunks.push(Buffer.from(value));
      }
      data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch { return fail("Não foi possível ler a mensagem.", 400); }
    if (!data || typeof data !== "object" || data.website) return fail("Não foi possível validar o envio.", 400);
    const clean = validateContact(data);
    if (!clean) return fail("Confira nome, e-mail, telefone e mensagem (mínimo de 10 caracteres).", 400);
    try {
      if (typeof data.token !== "string" || data.token.length > 500) throw Error();
      const [payload, signature, extra] = data.token.split(".");
      const expected = sign(payload, env.CONTACT_FORM_SECRET);
      if (extra || !signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw Error();
      const { at, nonce } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      if (!Number.isFinite(at) || typeof nonce !== "string" || now() - at < 1500 || now() - at > 7200000) throw Error();
    } catch { return reply({ ok: false, code: "TOKEN_INVALID", message: "Não foi possível validar a sessão. Tente enviar novamente." }, 400); }
    const globalLimit = limited("global", 40, 3600000);
    if (globalLimit) return reply({ ok: false, message: "Muitas tentativas. Aguarde ou fale pelo WhatsApp." }, 429, { "Retry-After": "3600" });
    const emailLimit = limited(`email:${hash(clean.email.toLowerCase())}`, 3, 900000);
    // Somente configurar esse cabeçalho quando a hospedagem o sobrescrever de forma confiável.
    const ip = env.CONTACT_TRUSTED_IP_HEADER && request.headers.get(env.CONTACT_TRUSTED_IP_HEADER);
    const ipLimit = ip && limited(`ip:${hash(ip)}`, 5, 900000);
    if (emailLimit || ipLimit) return reply({ ok: false, message: "Muitas tentativas. Aguarde alguns minutos ou fale pelo WhatsApp." }, 429, { "Retry-After": "900" });
    try {
      const result = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `contact-${hash(JSON.stringify(clean) + data.token)}` },
        body: JSON.stringify({
          from: `Marquesano <${env.CONTACT_FROM_EMAIL}>`, to: [env.CONTACT_TO_EMAIL], reply_to: clean.email,
          subject: "Novo contato pelo site Marquesano",
          text: `Nome: ${clean.name}\nE-mail: ${clean.email}\nTelefone: ${clean.phone}\nInteresse: ${clean.interest || "Não informado"}\n\nMensagem:\n${clean.message}`
        }),
        signal: AbortSignal.timeout(12000)
      });
      if (!result.ok) {
        const details = await result.json().catch(() => null);
        providerDiagnostic(result.status, details);
        return fail("Não foi possível enviar agora. Tente novamente ou fale pelo WhatsApp.", 502);
      }
      const sent = await result.json();
      if (!sent.id) return fail("Não foi possível confirmar o envio. Tente novamente.", 502);
      return reply({ ok: true, message: "Mensagem enviada. Obrigado pelo contato! Nossa equipe retornará pelos dados informados." });
    } catch { return fail("O envio demorou mais que o esperado. Tente novamente ou fale pelo WhatsApp.", 502); }
  };
}
