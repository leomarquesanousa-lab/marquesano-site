import { createHash } from 'node:crypto';
import { whatsappConfig } from '../../config/whatsapp.js';

const escape = value => String(value ?? 'Não informado').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'A confirmar';
const money = (value, currency = 'BRL') => value == null ? 'A confirmar' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value / 100);
export const salesWhatsApp = () => `https://wa.me/${whatsappConfig.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Olá, sou cliente da Marquesano e gostaria de falar sobre minha assinatura.')}`;
export function salesEmail(type, data) {
  const messages = {
    welcome: ['Sua assinatura foi confirmada! — Marquesano', 'Sua assinatura foi confirmada!', 'Sua contratação foi realizada com sucesso.'],
    approved: ['Pagamento confirmado — Marquesano', 'Pagamento confirmado', 'Recebemos o pagamento da sua assinatura.'],
    rejected: ['Atenção necessária na sua assinatura Marquesano', 'Atenção à sua assinatura', 'Não conseguimos confirmar a cobrança da sua assinatura. Entre em contato para receber ajuda.'],
    cancelled: ['Sua assinatura Marquesano foi cancelada', 'Assinatura cancelada', 'Confirmamos o cancelamento da sua assinatura.'],
  };
  const [subject, title, intro] = messages[type];
  const fields = [
    ['Plano', data.plan_name], ['Valor mensal', money(data.amount_cents, data.currency || 'BRL')],
    ['Duração / número de cobranças', data.cycles ? `${data.cycles} meses / ${data.cycles} cobranças` : 'A confirmar'],
    ['Forma de cobrança', 'Mensal recorrente'], ['Data da contratação', date(data.created_at)],
    ['Próxima cobrança', date(data.next_payment_date)],
    ['Status', ({ welcome:'Ativa', approved:'Pagamento aprovado', rejected:'Pagamento recusado', cancelled:'Cancelada' })[type]],
  ];
  if (['approved','rejected'].includes(type)) fields.push(['Valor da cobrança', money(data.payment_amount, data.payment_currency || 'BRL')], ['Data da cobrança', date(data.payment_date)]);
  if (type === 'cancelled') fields.push(['Data do cancelamento', date(data.cancelled_at)]);
  const text = `Olá${data.name ? ', ' + data.name : ''}.\n\n${intro}\n\n${fields.map(([k,v]) => `${k}: ${v ?? 'A confirmar'}`).join('\n')}\n\nFalar com a Marquesano no WhatsApp: ${salesWhatsApp()}\nGuarde este e-mail como comprovante da sua contratação. Os pagamentos serão processados pelo Mercado Pago.\nTermos: https://marquesano.com.br/termos-de-servico\nPrivacidade: https://marquesano.com.br/politica-de-privacidade`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3f5fa;font-family:Arial,sans-serif;color:#17213b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" style="width:100%;max-width:600px;background:white;border-radius:16px" cellpadding="0" cellspacing="0"><tr><td style="padding:32px;background:#17213b;color:#fff;border-radius:16px 16px 0 0"><strong style="letter-spacing:3px">MARQUESANO</strong><h1 style="font-size:26px;line-height:1.3">${escape(title)}</h1></td></tr><tr><td style="padding:28px"><p>Olá${data.name ? ', ' + escape(data.name) : ''}.</p><p style="line-height:1.7">${escape(intro)}</p><h2 style="font-size:19px">Resumo da assinatura</h2><table role="presentation" width="100%" cellpadding="10" cellspacing="0">${fields.map(([k,v]) => `<tr><td style="border-bottom:1px solid #e8edf3;font-size:14px">${escape(k)}</td><td style="border-bottom:1px solid #e8edf3;font-size:14px"><strong>${escape(v)}</strong></td></tr>`).join('')}</table><h2 style="font-size:20px;margin-top:32px">Precisa de ajuda?</h2><p>Nossa equipe está disponível pelo WhatsApp.</p><a href="${escape(salesWhatsApp())}" style="display:block;padding:20px 12px;background:#147d43;color:#fff;text-align:center;font-weight:bold;text-decoration:none;border-radius:8px;line-height:1.5">Falar com a Marquesano no WhatsApp</a><p style="font-size:13px;line-height:1.7;margin-top:28px">Guarde este e-mail como comprovante da sua contratação.<br>Os pagamentos serão processados pelo Mercado Pago.</p><p style="font-size:13px"><a href="https://marquesano.com.br/termos-de-servico">Termos de Serviço</a> · <a href="https://marquesano.com.br/politica-de-privacidade">Política de Privacidade</a></p></td></tr><tr><td style="padding:24px;text-align:center;color:#596780">Marquesano<br><a href="https://marquesano.com.br">marquesano.com.br</a></td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text };
}

// Called inside the same transaction as the authoritative billing resource updates.
export async function queueSalesMail(db, type, resourceId, subscriptionId, payment, now) {
  const s = await db.prepare(`SELECT s.*,p.name AS plan_name FROM mp_subscriptions s JOIN subscription_plans p ON p.id=s.plan_id WHERE s.id=?`).get(subscriptionId);
  if (!s || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s.payer_email || '')) return;
  const customers = await db.prepare('SELECT name FROM clients WHERE LOWER(email)=LOWER(?) LIMIT 2').all(s.payer_email);
  // Immutable allowlisted snapshot: retries must send exactly the same provider payload.
  const snapshot = { name: customers.length === 1 ? customers[0].name : null, plan_name:s.plan_name,
    amount_cents:s.amount_cents, currency:s.currency, cycles:s.cycles, created_at:s.created_at,
    next_payment_date:s.next_payment_date, cancelled_at:s.cancelled_at,
    payment_amount:payment?.amount_cents, payment_currency:payment?.currency, payment_date:payment?.paid_at || payment?.created_at };
  const id = createHash('sha256').update(`${type}:${resourceId}`).digest('hex');
  await db.prepare('INSERT INTO sales_notifications(id,subscription_id,type,recipient,snapshot,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING')
    .run(id, subscriptionId, type, s.payer_email, JSON.stringify(snapshot), new Date(now()).toISOString());
}

export function createSalesMailStore(db, now = Date.now) {
  return {
    async dispatch({env=process.env, fetcher=fetch, limit=20,subscriptionId}={}) {
      if (!env.RESEND_API_KEY || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.CONTACT_FROM_EMAIL || '')) return { configured:false, sent:0 };
      let sent=0;
      for (let i=0;i<limit;i++) {
        const job = await db.transaction(async () => {
          // Resend retains idempotency for 24h. Uncertain deliveries older than 23h require
          // manual provider reconciliation, never automatic resend with an expired key.
          await db.prepare("UPDATE sales_notifications SET state='REVIEW' WHERE state IN ('SENDING','UNKNOWN') AND first_attempt<?").run(now()-23*3600000);
          const row = await db.prepare("SELECT * FROM sales_notifications WHERE state IN ('PENDING','SENDING','UNKNOWN') AND (lease_until IS NULL OR lease_until<?)"+(subscriptionId?' AND subscription_id=?':'')+" ORDER BY created_at,id LIMIT 1").get(now(),...(subscriptionId?[subscriptionId]:[]));
          if (!row) return null;
          const snapshot=JSON.parse(row.snapshot);
          if (!snapshot.mail) {
            snapshot.mail={from:`Marquesano <${env.CONTACT_FROM_EMAIL}>`,to:[row.recipient],...salesEmail(row.type,snapshot)};
            row.snapshot=JSON.stringify(snapshot);
          }
          await db.prepare("UPDATE sales_notifications SET state='SENDING',first_attempt=COALESCE(first_attempt,?),lease_until=?,snapshot=? WHERE id=?").run(now(),now()+60000,row.snapshot,row.id);
          return row;
        });
        if (!job) break;
        try {
          const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':'sales-'+job.id},body:JSON.stringify(JSON.parse(job.snapshot).mail),signal:AbortSignal.timeout(12000),redirect:'error'});
          const result=await response.json().catch(()=>null);
          if (!response.ok || typeof result?.id!=='string') throw Error('Delivery unconfirmed');
          await db.prepare("UPDATE sales_notifications SET state='SENT',provider_id=?,sent_at=?,lease_until=NULL WHERE id=?").run(result.id,new Date(now()).toISOString(),job.id);
          sent++;
        } catch {
          await db.prepare("UPDATE sales_notifications SET state='UNKNOWN',lease_until=? WHERE id=? AND state<>'SENT'").run(now()+60000,job.id);
          console.error('SALES_EMAIL_DELIVERY_UNCONFIRMED');
        }
      }
      return { configured:true,sent };
    }
  };
}
