// Transporte do formulário: sem credenciais; o envio de e-mail acontece no servidor.
export function createContactSession({ fetcher = fetch, now = Date.now, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  let token = "", receivedAt = 0, preparing = null;
  async function prepare() {
    if (preparing) return preparing;
    preparing = (async () => {
      const response = await fetcher("/api/contato", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      const body = await response.json();
      if (!response.ok || typeof body.token !== "string" || !body.token) throw Error(body.message || "Não foi possível preparar o envio. Tente novamente.");
      token = body.token;
      receivedAt = now();
    })();
    try { await preparing; } finally { preparing = null; }
  }
  async function send(fields) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!token || now() - receivedAt > 6900000) await prepare();
      const remaining = 1600 - (now() - receivedAt);
      if (remaining > 0) await wait(remaining);
      const response = await fetcher("/api/contato", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, token }), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (response.status === 400 && result.code === "TOKEN_INVALID" && attempt === 0) { token = ""; continue; }
      if (!response.ok || !result.ok) throw Error(result.message || "Não foi possível enviar sua mensagem.");
      token = "";
      return result;
    }
  }
  return { prepare, send };
}
