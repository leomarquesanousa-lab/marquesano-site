// Log only provider diagnostic fields, never request payloads or arbitrary objects.
export function paymentDiagnostic(response, data, { env = process.env, body } = {}) {
  const hidden = [...Object.entries(env).filter(([key]) => /TOKEN|SECRET|PASSWORD|PRIVATE_KEY|DATABASE_URL/i.test(key)).map(([, value]) => value),
    ...['card_token_id', 'payer_email', 'external_reference'].map(key => body?.[key])].filter(value => typeof value === 'string' && value.length >= 3);
  const clean = value => {
    if (typeof value !== 'string' && typeof value !== 'number') return undefined;
    let text = String(value);
    for (const secret of hidden) text = text.split(secret).join('[redacted]');
    return text.replace(/(?:https?|postgres(?:ql)?):\/\/\S+/gi, '[url]')
      .replace(/[\w.+-]+@[\w.-]+/g, '[email]')
      .replace(/(?:TEST-|APP_USR-)[\w-]+/g, '[credential]')
      .replace(/\b[a-f0-9]{24,}\b/gi, '[identifier]')
      .replace(/(?:\d[ -]?){12,19}/g, '[card]')
      .replace(/\b\d{3,4}\b/g, '[number]')
      .replace(/[\r\n\x00-\x1f\x7f]/g, ' ').slice(0, 1000);
  };
  const fields = object => Object.fromEntries(['status', 'status_detail', 'error', 'message', 'code', 'description']
    .map(key => [key, clean(object?.[key])]).filter(([, value]) => value !== undefined));
  const requestId = response.headers?.get?.('x-request-id') || data?.request_id;
  console.info('MERCADOPAGO_RESPONSE', {
    endpoint: 'POST /preapproval', http_status: response.status, ...fields(data),
    ...(data?.cause ? { cause: Array.isArray(data.cause) ? data.cause.slice(0, 10).map(cause => typeof cause === 'object' ? fields(cause) : clean(cause)) : typeof data.cause === 'object' ? fields(data.cause) : clean(data.cause) } : {}),
    ...(typeof requestId === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(requestId) && !hidden.includes(requestId) ? { request_id: requestId } : {})
  });
}
