import { checkoutPlans } from '../../config/checkout-plans.mjs';
import { InputError } from './validation.mjs';

const base = `SELECT s.*,p.name AS plan_name,
  c.name AS customer_name,c.phone,c.document,
  COALESCE(pay.charges,0) AS charges,COALESCE(pay.paid_cycles,0) AS paid_cycles,pay.total_paid AS total_paid,
  COALESCE(s.currency,pay.paid_currency) AS total_paid_currency,
  lastpay.created_at AS last_payment_date,lastpay.status AS last_payment_status,
  CASE WHEN s.cycles IS NOT NULL THEN GREATEST(0,s.cycles-COALESCE(pay.paid_cycles,0)) END AS remaining_cycles,
  CASE WHEN s.cycles IS NOT NULL AND s.amount_cents IS NOT NULL THEN GREATEST(0,s.cycles-COALESCE(pay.paid_cycles,0))*s.amount_cents END AS remaining_amount
  FROM mp_subscriptions s JOIN subscription_plans p ON p.id=s.plan_id
  LEFT JOIN LATERAL (SELECT name,phone,document FROM clients WHERE LOWER(email)=LOWER(s.payer_email)
    AND (SELECT count(*) FROM clients WHERE LOWER(email)=LOWER(s.payer_email))=1 LIMIT 1) c ON true
  LEFT JOIN LATERAL (SELECT count(*) AS charges,
    count(DISTINCT COALESCE(invoice_id,id)) FILTER (WHERE status='approved') AS paid_cycles,
    max(currency) FILTER(WHERE status='approved') AS paid_currency,
    CASE WHEN s.currency IS NULL AND count(DISTINCT currency) FILTER(WHERE status='approved')>1 THEN NULL
      ELSE COALESCE(sum(GREATEST(0,amount_cents-refunded_cents)) FILTER (WHERE status='approved' AND (s.currency IS NULL OR currency=s.currency)),0)::bigint END AS total_paid
    FROM mp_payments WHERE subscription_id=s.id) pay ON true
  LEFT JOIN LATERAL (SELECT COALESCE(created_at,paid_at) AS created_at,status FROM mp_payments WHERE subscription_id=s.id ORDER BY COALESCE(created_at,paid_at) DESC NULLS LAST,updated_at DESC,id DESC LIMIT 1) lastpay ON true`;

function dayBounds(now) {
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
  const start=Date.parse(day+'T00:00:00-03:00');
  return {today:new Date(start).toISOString(),tomorrow:new Date(start+86400000).toISOString(),seven:new Date(start+8*86400000).toISOString(),thirty:new Date(start+31*86400000).toISOString(),month:day.slice(0,7)+'-01T03:00:00.000Z'};
}
function filters(params) {
  const where=[],args=[];
  const plan=params.get('plan');
  if (plan) {if(!Object.hasOwn(checkoutPlans,plan)) throw new InputError('Plano inválido.');where.push('s.plan_id=?');args.push(checkoutPlans[plan].storedId);}
  const status=params.get('status');
  if(status){if(!['authorized','pending','rejected','cancelled','paused','finished','overdue'].includes(status))throw new InputError('Status inválido.');where.push('s.status=?');args.push(status);}
  const payment=params.get('payment');
  if(payment){if(!['approved','rejected','pending'].includes(payment))throw new InputError('Pagamento inválido.');where.push(payment==='pending'?"EXISTS(SELECT 1 FROM mp_payments f WHERE f.subscription_id=s.id AND f.status IN ('pending','in_process','authorized'))":'EXISTS(SELECT 1 FROM mp_payments f WHERE f.subscription_id=s.id AND f.status=?)');if(payment!=='pending')args.push(payment);}
  const q=params.get('q')?.trim();
  if(q){if(q.length>100)throw new InputError('Busca muito longa.');where.push("(s.payer_email ILIKE ? OR c.name ILIKE ? OR s.id ILIKE ? OR s.external_reference ILIKE ?)");args.push(...Array(4).fill('%'+q.replace(/[\\%_]/g,'\\$&')+'%'));}
  for(const key of ['start','end']) {
    const value=params.get(key);
    if(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw new InputError('Data inválida.');where.push(`s.created_at${key==='start'?'>=':'<'}?`);args.push(new Date(Date.parse(value+'T00:00:00-03:00')+(key==='end'?86400000:0)).toISOString());}
  }
  if(params.get('start')&&params.get('end')&&params.get('start')>params.get('end'))throw new InputError('Período inválido.');
  return {sql:where.length?' WHERE '+where.join(' AND '):'',args};
}
export function createSalesStore(db,now=Date.now) {
  const all=(sql,...args)=>db.prepare(sql).all(...args);
  return {
    async summary() {
      const b=dayBounds(now());
      const subscriptions=await db.prepare(`SELECT count(*) FILTER(WHERE status='authorized') AS active,
        count(*) FILTER(WHERE created_at>=? AND created_at<=?) AS new_month,
        COALESCE(sum(amount_cents) FILTER(WHERE status='authorized' AND currency='BRL'),0)::bigint AS mrr,
        count(*) FILTER(WHERE status='authorized' AND amount_cents IS NULL) AS unknown_amounts,
        count(*) FILTER(WHERE status='cancelled') AS cancellations,
        count(*) FILTER(WHERE status='authorized' AND next_payment_date>=? AND next_payment_date<?) AS upcoming7,
        count(*) FILTER(WHERE status='authorized' AND next_payment_date>=? AND next_payment_date<?) AS upcoming30
        FROM mp_subscriptions`).get(b.month,new Date(now()).toISOString(),b.today,b.seven,b.today,b.thirty);
      const payments=await db.prepare(`SELECT COALESCE(sum(GREATEST(0,amount_cents-refunded_cents)) FILTER(WHERE status='approved' AND currency='BRL' AND paid_at>=? AND paid_at<=?),0)::bigint AS revenue_month,
        count(*) FILTER(WHERE status='approved') AS approved,count(*) FILTER(WHERE status='rejected') AS rejected,
        count(*) FILTER(WHERE status IN ('pending','in_process','authorized')) AS pending FROM mp_payments WHERE subscription_id IS NOT NULL`).get(b.month,new Date(now()).toISOString());
      return {...subscriptions,...payments};
    },
    async list(params=new URLSearchParams()) {
      const {sql,args}=filters(params),page=Number(params.get('page')||1);
      if(!Number.isSafeInteger(page)||page<1||page>100000)throw new InputError('Página inválida.');
      const count=await db.prepare(`SELECT count(*) AS total FROM (${base}${sql}) result`).get(...args);
      return {rows:await all(base+sql+' ORDER BY s.created_at DESC NULLS LAST,s.id LIMIT 25 OFFSET ?',...args,(page-1)*25),total:count.total,page,limit:25};
    },
    async detail(id) {
      const record=await db.prepare(base+' WHERE s.id=?').get(id);
      if(!record)throw new InputError('Assinatura não encontrada.',404);
      return {record,payments:await all('SELECT * FROM mp_payments WHERE subscription_id=? ORDER BY created_at DESC NULLS LAST,updated_at DESC,id',id),
        invoices:await all('SELECT * FROM mp_invoices WHERE subscription_id=? ORDER BY debit_date DESC NULLS LAST,id',id),
        communications:await all('SELECT created_at,sent_at,type,recipient,state FROM sales_notifications WHERE subscription_id=? ORDER BY created_at DESC,id',id)};
    },
    async upcoming(params=new URLSearchParams()) {
      const b=dayBounds(now()),page=Number(params.get('due_page')||1),period=params.get('due')||'30';
      if(!['today','7','30'].includes(period)||!Number.isSafeInteger(page)||page<1)throw new InputError('Período inválido.');
      const until=period==='today'?b.tomorrow:period==='7'?b.seven:b.thirty;
      const sql=" WHERE s.status='authorized' AND s.next_payment_date>=? AND s.next_payment_date<?";
      const count=await db.prepare(`SELECT count(*) AS total FROM mp_subscriptions s${sql}`).get(b.today,until);
      return {rows:await all(base+sql+' ORDER BY s.next_payment_date,s.id LIMIT 25 OFFSET ?',b.today,until,(page-1)*25),total:count.total,page,limit:25,period};
    },
    known: (after='')=>all('SELECT id,updated_at FROM mp_subscriptions WHERE id>? ORDER BY id LIMIT 10',after),
    paymentCount: async()=>Number((await db.prepare('SELECT count(*) n FROM mp_payments').get()).n),
  };
}
