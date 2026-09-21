export function createCheckoutStore(db) {
  return {
    get: key => db.prepare('SELECT * FROM checkout_attempts WHERE id=?').get(key),
    reserve: attempt => db.transaction(async () => {
      const previous = await db.prepare('SELECT * FROM checkout_attempts WHERE id=?').get(attempt.id);
      if (previous) return false;
      const existing = await db.prepare("SELECT id FROM checkout_attempts WHERE fingerprint=? AND state IN ('pending','unknown','authorized')").get(attempt.fingerprint);
      if (existing) return false;
      await db.prepare(`INSERT INTO checkout_attempts(id,fingerprint,plan_code,amount_cents,state,created_at,terms_version)
        VALUES(?,?,?,?,'pending',?,'2026-09-checkout-12-months')`).run(attempt.id, attempt.fingerprint, attempt.code, attempt.amount, Date.now());
      return true;
    }),
    state: (key, state) => db.prepare('UPDATE checkout_attempts SET state=? WHERE id=?').run(state, key),
    complete: (key, resource, billing) => db.transaction(async () => {
      await billing();
      await db.prepare("UPDATE checkout_attempts SET state='authorized',subscription_id=? WHERE id=?").run(resource, key);
    }),
  };
}
