import { InputError } from './validation.mjs';
import { CHECKOUT_COOLDOWN_MS } from '../../config/payment-security.mjs';

export function createCheckoutStore(db) {
  return {
    get: key => db.prepare('SELECT * FROM checkout_attempts WHERE id=?').get(key),
    reserve: attempt => db.transaction(async () => {
      const previous = await db.prepare('SELECT * FROM checkout_attempts WHERE id=?').get(attempt.id);
      if (previous) return false;
      const existing = await db.prepare("SELECT id FROM checkout_attempts WHERE fingerprint=? AND state IN ('pending','unknown','authorized')").get(attempt.fingerprint);
      if (existing) return false;
      const limitKey = 'card-checkout:' + attempt.fingerprint;
      const limit = await db.prepare('SELECT expires FROM public_limits WHERE key=?').get(limitKey);
      if (limit?.expires > Date.now()) throw new InputError('Aguarde 15 segundos antes de tentar novamente.', 429);
      await db.prepare('INSERT INTO public_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET expires=excluded.expires').run(limitKey, Date.now() + CHECKOUT_COOLDOWN_MS);
      await db.prepare(`INSERT INTO checkout_attempts(id,fingerprint,plan_code,amount_cents,state,created_at,terms_version)
        VALUES(?,?,?,?,'pending',?,'2026-09-checkout-12-months')`).run(attempt.id, attempt.fingerprint, attempt.code, attempt.amount, Date.now());
      return true;
    }),
    state: (key, state) => db.transaction(async () => {
      await db.prepare('UPDATE checkout_attempts SET state=? WHERE id=?').run(state, key);
      if (state === 'rejected') {
        const attempt = await db.prepare('SELECT fingerprint FROM checkout_attempts WHERE id=?').get(key);
        if (attempt) await db.prepare('UPDATE public_limits SET expires=? WHERE key=?').run(Date.now() + CHECKOUT_COOLDOWN_MS, 'card-checkout:' + attempt.fingerprint);
      }
    }),
    complete: (key, resource, billing) => db.transaction(async () => {
      await billing();
      await db.prepare("UPDATE checkout_attempts SET state='authorized',subscription_id=? WHERE id=?").run(resource, key);
    }),
  };
}
