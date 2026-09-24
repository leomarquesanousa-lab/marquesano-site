export const CHECKOUT_COOLDOWN_MS = 15000;
export const DEVICE_UNAVAILABLE = 'Não foi possível iniciar a verificação de segurança. Aguarde alguns instantes e tente novamente. Se persistir, recarregue a página.';
export const RISK_DECLINED = 'Não foi possível aprovar este pagamento. Confira seus dados ou tente outro cartão. Evite repetir várias tentativas em sequência.';
// Opaque provider identifier: bounded printable ASCII, never a header delimiter.
export const validDeviceId = value => typeof value === 'string' && /^[\x21-\x7e]{1,1024}$/.test(value);

export async function waitForDeviceId(read = () => window.MP_DEVICE_SESSION_ID, wait = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const value = read();
    if (validDeviceId(value)) return value;
    if (attempt < 11) await wait(200);
  }
  return null;
}
