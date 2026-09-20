const inputErrorTag=Symbol.for('marquesano.admin.input-error');
export class InputError extends Error { constructor(message = 'Dados inválidos.', status = 400) { super(message); this.status = status; this[inputErrorTag]=true; } }
// Proxy and route handlers can load separate module bundles in the same process.
export function isInputError(error) { return error?.[inputErrorTag]===true; }
export const leadStatuses = ['NEW','CONTACTED','QUALIFIED','PROPOSAL','WON','LOST','ARCHIVED'];
export const clientStatuses = ['ACTIVE','INACTIVE','PROSPECT','ARCHIVED'];
export const campaignStatuses = ['DRAFT','ACTIVE','PAUSED','FINISHED','ARCHIVED'];
export function text(value, max = 200, required = false) {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new InputError();
  return value.trim();
}
export function choice(value, list) { if (!list.includes(value)) throw new InputError(); return value; }
export function email(value) { const v = text(value,254,true).toLowerCase(); if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v)) throw new InputError('E-mail inválido.'); return v; }
export function phone(value) { const v = text(value,24); if (v && !/^[+\d\s().-]{10,24}$/.test(v)) throw new InputError('Telefone inválido.'); return v; }
export function website(value) { const v = text(value,500); if (!v) return ''; try { const u=new URL(v); if (!['https:','http:'].includes(u.protocol) || u.username || u.password) throw Error(); return u.href; } catch { throw new InputError('URL inválida.'); } }
export function publicPath(value) { const v = text(value || '/',300); if (!/^\/(?!\/)/.test(v) || /[?#\\\s]/.test(v) || /^\/(admin|api)(\/|$)/.test(v)) throw new InputError('Escolha uma página pública do site.'); return v; }
export function range(params = new URLSearchParams(), now = new Date()) {
  const end = text(params.get('end') || now.toISOString().slice(0,10),10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(end)||!Number.isFinite(Date.parse(end)))throw new InputError('Data inválida.');
  const days = Number(params.get('days') || 30);
  if (![1,7,30,90].includes(days)) throw new InputError('Período inválido.');
  const start = text(params.get('start') || new Date(Date.parse(end) - (days-1)*86400000).toISOString().slice(0,10),10);
  for (const d of [start,end]) if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0,10)!==d) throw new InputError('Data inválida.');
  if (start>end || Date.parse(end)-Date.parse(start)>366*86400000) throw new InputError('Use um período de até 366 dias.');
  return { start, end, from: start+'T00:00:00.000Z', until: new Date(Date.parse(end)+86400000).toISOString() };
}
export async function readJson(request, max = 20000) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new InputError('Formato inválido.',415);
  const reader=request.body?.getReader(); if (!reader) throw new InputError();
  const chunks=[]; let size=0;
  while(true) { const {value,done}=await reader.read(); if(done)break; size+=value.length; if(size>max){await reader.cancel();throw new InputError('Conteúdo muito grande.',413);} chunks.push(Buffer.from(value)); }
  try { const data=JSON.parse(Buffer.concat(chunks).toString('utf8')); if(!data || typeof data!=='object'||Array.isArray(data))throw Error();return data; } catch { throw new InputError(); }
}
