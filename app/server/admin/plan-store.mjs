import { initialPlans } from '../../config/plans.mjs';
import { InputError, text } from './validation.mjs';

export function migratePlans(db) {
  db.exec(`CREATE TABLE subscription_plans (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
    monthly_price_cents INTEGER, cycles INTEGER NOT NULL, active INTEGER NOT NULL,
    mercadopago_plan_id TEXT UNIQUE, revision INTEGER NOT NULL DEFAULT 1,
    synced_revision INTEGER, sync_state TEXT NOT NULL DEFAULT 'pending', sync_started INTEGER,
    CHECK(monthly_price_cents IS NULL OR monthly_price_cents>0), CHECK(cycles>0), CHECK(active IN (0,1))
  )`);
  const insert = db.prepare('INSERT INTO subscription_plans(id,name,description,monthly_price_cents,cycles,active) VALUES(?,?,?,?,?,?)');
  for (const p of initialPlans) insert.run(p.id,p.name,p.description,p.monthly_price_cents,p.cycles,Number(p.active));
}

export function createPlanStore(db, now=Date.now) {
  const get = id => {
    const row = db.prepare('SELECT * FROM subscription_plans WHERE id=?').get(id);
    if (!row) throw new InputError('Plano não encontrado.',404);
    return {...row, active:Boolean(row.active)};
  };
  const busy = p => p.sync_state==='syncing' && now()-p.sync_started<60000;
  return {
    get,
    list: () => initialPlans.map(p=>get(p.id)),
    save(id,data) {
      const old=get(id);
      if (busy(old)) throw new InputError('Aguarde a sincronização deste plano.',409);
      if (data.revision!==old.revision) throw new InputError('O plano mudou. Recarregue antes de salvar.',409);
      const name=text(data.name,80,true),description=text(data.description,500,true);
      const price=data.monthly_price_cents;
      if (price!==null && (!Number.isSafeInteger(price)||price<=0||price>100000000)) throw new InputError('Informe um preço mensal positivo, em centavos, ou deixe pendente.');
      if (!Number.isInteger(data.cycles)||data.cycles<1||data.cycles>1200) throw new InputError('Informe de 1 a 1200 ciclos mensais.');
      if (typeof data.active!=='boolean'||(data.active&&price===null)) throw new InputError('Defina o preço antes de ativar o plano.');
      const remote=text(data.mercadopago_plan_id,100)||null;
      if (remote&&!/^[a-zA-Z0-9_-]{8,100}$/.test(remote)) throw new InputError('ID do Mercado Pago inválido.');
      if (old.mercadopago_plan_id && remote!==old.mercadopago_plan_id) throw new InputError('O ID de um plano vinculado não pode ser substituído.');
      if (remote && db.prepare('SELECT id FROM subscription_plans WHERE mercadopago_plan_id=? AND id<>?').get(remote,id)) throw new InputError('Esse ID já pertence a outro plano.');
      const uncertain=['syncing','unknown'].includes(old.sync_state)&&!old.mercadopago_plan_id&&!remote;
      const changed=db.prepare("UPDATE subscription_plans SET name=?,description=?,monthly_price_cents=?,cycles=?,active=?,mercadopago_plan_id=?,revision=revision+1,sync_state=?,sync_started=NULL WHERE id=? AND revision=? AND (sync_state<>'syncing' OR sync_started<=?)")
        .run(name,description,price,data.cycles,Number(data.active),remote,uncertain?'unknown':'pending',id,old.revision,now()-60000);
      if(!changed.changes)throw new InputError('O plano mudou ou está sendo sincronizado. Recarregue.',409);
      return get(id);
    },
    start(id) {
      const p=get(id);
      if (busy(p)) throw new InputError('Este plano já está sendo sincronizado.',409);
      if (['unknown','syncing'].includes(p.sync_state)&&!p.mercadopago_plan_id) throw new InputError('Criação anterior sem confirmação. Confira no Mercado Pago e informe o ID criado antes de sincronizar novamente.',409);
      if (!p.monthly_price_cents) throw new InputError('Confirme o preço deste plano antes de sincronizar.');
      if (!p.active&&!p.mercadopago_plan_id) throw new InputError('Ative o plano antes da primeira sincronização.');
      const result=db.prepare("UPDATE subscription_plans SET sync_state='syncing',sync_started=? WHERE id=? AND revision=? AND (sync_state<>'syncing' OR sync_started<=?)").run(now(),id,p.revision,now()-60000);
      if (!result.changes) throw new InputError('Sincronização já em andamento.',409);
      return p;
    },
    finish(p,remote) {
      db.prepare("UPDATE subscription_plans SET mercadopago_plan_id=?,synced_revision=?,sync_state='synced',sync_started=NULL WHERE id=? AND revision=?").run(remote,p.revision,p.id,p.revision);
      return get(p.id);
    },
    fail(p,uncertain) {
      db.prepare('UPDATE subscription_plans SET sync_state=?,sync_started=NULL WHERE id=? AND revision=?').run(uncertain?'unknown':'error',p.id,p.revision);
    },
  };
}
