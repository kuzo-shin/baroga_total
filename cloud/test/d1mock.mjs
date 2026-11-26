// D1 흉내 (node:sqlite) — 시험용
import { DatabaseSync } from 'node:sqlite';
export function makeD1() {
  const db = new DatabaseSync(':memory:');
  let queries = 0;
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => { queries++; const r = db.prepare(sql).get(...args); return r ? { ...r } : null; },
    all: async () => { queries++; return { results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }; },
    run: async () => { queries++; const r = db.prepare(sql).run(...args); return { success: true, meta: { changes: r.changes } }; },
    _run: () => (/^\s*(SELECT|WITH)/i.test(sql) ? { results: db.prepare(sql).all(...args).map((r) => ({ ...r })) } : (db.prepare(sql).run(...args), { results: [] })),
  });
  return {
    prepare: (sql) => stmt(sql),
    exec: async (sql) => { queries++; db.exec(sql); },
    batch: async (list) => { queries += list.length; db.exec('BEGIN'); try { const out = list.map((s) => s._run()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } },
    get queries() { return queries; }, reset() { queries = 0; }, raw: db,
  };
}
