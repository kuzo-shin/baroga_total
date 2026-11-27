// [VERSION: cloud/src/store.js v1.1 - 2026-11-27 메뉴별 전환 표시(active): 켜진 메뉴만 화면이 Cloudflare 를 읽고 씀 / v1.0 - 2026-11-27 신규: 메뉴별 자료 보관소(조각 저장 + 지난 판 보관) · 구글 DB 원본 백업]
// ============================================================================
// 메뉴별 자료 보관소 — 구글 시트 DB(메뉴마다 JSON 한 덩어리)를 옮겨 오는 곳
//  - 메뉴(domain)의 자료를 '조각(section)'으로 나눠 보관: 달별 기록, 품목별 레시피처럼. 바뀐 조각만 올림
//    · 나누고 합치는 규칙은 화면 쪽(cloud_store.js)에 있고, 서버는 조각을 글자 그대로 보관만 함
//  - 판(rev): 메뉴마다 저장할 때 1씩 오름. 저장할 때 내가 불러온 판(baseRev)과 지금 판이 다르면 거부(409) = 구글 DB의 revision 과 같은 규칙
//  - 지난 판 보관: 조각이 바뀌거나 지워지면 이전 내용을 store_history 에 남김 → 어느 판으로든 되돌려 읽을 수 있음(?rev=)
//    · 180일이 지난 지난 판은 저장할 때 조금씩 지움
//  - 한 번 저장에 조각 150개·합계 6MB·조각 하나 1.5MB 까지 (D1 한 줄 2MB 제한). 여러 조각을 한 문장에 묶어 쿼리 수를 줄임(무료 요금제 요청당 50개)
//
//   GET  /api/store                         메뉴별 판·조각 수·크기 + 전환된 메뉴 목록(active)
//   PUT  /api/store-active                  { domain, on } 메뉴 전환 켜기·끄기 (관리자 = ADMIN_EMAILS 만)
//   GET  /api/store/:domain[?rev=N]         조각 전부 (rev 를 주면 그 판 때의 모습)
//   PUT  /api/store/:domain                 { baseRev, put:{조각이름:글자}, del:[조각이름], note }
//   PUT  /api/backup/:domain                구글 DB 원본 응답을 그대로 R2 에 보관 (본문 = JSON 글자)
//   GET  /api/backup/:domain                보관된 백업 목록
// ============================================================================
export const STORE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS store_domains (domain TEXT PRIMARY KEY, rev INTEGER NOT NULL DEFAULT 0, token TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '', updated_by TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS store_sections (domain TEXT NOT NULL, key TEXT NOT NULL, rev INTEGER NOT NULL, data TEXT NOT NULL, bytes INTEGER NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL DEFAULT '', PRIMARY KEY (domain, key))`,
  `CREATE TABLE IF NOT EXISTS store_history (domain TEXT NOT NULL, key TEXT NOT NULL, rev INTEGER NOT NULL, data TEXT, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL DEFAULT '', PRIMARY KEY (domain, key, rev))`,
  'CREATE INDEX IF NOT EXISTS store_history_time ON store_history (updated_at)',
  `CREATE TABLE IF NOT EXISTS store_flags (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL DEFAULT '')`,
];
export const DOMAINS = ['raw', 'recipe', 'price', 'production', 'ms_inbound', 'ms_stock', 'invoice', 'price_compare'];
const MAX = { sections: 150, sectionBytes: 1500000, totalBytes: 6000000, key: 200, backupBytes: 20000000, historyDays: 180 };

class StoreError extends Error { constructor(status, message, extra) { super(message); this.status = status; this.extra = extra || {}; } }
const bad = (m) => new StoreError(400, m);
const byteLen = (s) => new TextEncoder().encode(s).length;
function domainOf(d) { if (!DOMAINS.includes(d)) throw new StoreError(404, '없는 메뉴입니다: ' + d); return d; }

export async function listDomains(env) {
  const a = await env.DB.prepare('SELECT domain, rev, updated_at, updated_by, note FROM store_domains ORDER BY domain').all();
  const b = await env.DB.prepare('SELECT domain, COUNT(*) AS sections, SUM(bytes) AS bytes FROM store_sections GROUP BY domain').all();
  const size = Object.fromEntries(b.results.map((r) => [r.domain, r]));
  return { ok: true, active: await activeList(env), domains: a.results.map((r) => ({ domain: r.domain, rev: r.rev, updatedAt: r.updated_at, updatedBy: r.updated_by, note: r.note, sections: (size[r.domain] || {}).sections || 0, bytes: (size[r.domain] || {}).bytes || 0 })) };
}

async function activeList(env) {
  const r = await env.DB.prepare("SELECT value FROM store_flags WHERE key = 'active'").first();
  try { const a = JSON.parse(r ? r.value : '[]'); return Array.isArray(a) ? a.filter((d) => DOMAINS.includes(d)) : []; } catch (e) { return []; }
}
// 메뉴 전환: 켜면 그 메뉴는 화면이 Cloudflare 를 읽고 씀. 자료가 비어 있는 메뉴는 켤 수 없음
export async function setActive(env, request, email) {
  const admins = String(env.ADMIN_EMAILS || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
  if (!admins.includes(email)) throw new StoreError(403, '관리자만 메뉴 전환을 바꿀 수 있습니다.');
  let b; try { b = await request.json(); } catch (e) { throw bad('보낸 자료를 읽을 수 없습니다.'); }
  const domain = domainOf(String((b && b.domain) || '')), on = !!(b && b.on);
  if (on) { const h = await env.DB.prepare('SELECT rev FROM store_domains WHERE domain = ?').bind(domain).first(); if (!h || !h.rev) throw bad('이 메뉴는 Cloudflare 에 자료가 없어 전환할 수 없습니다. 먼저 가져오기를 해 주세요.'); }
  const cur = await activeList(env), next = on ? [...new Set([...cur, domain])] : cur.filter((d) => d !== domain), now = new Date().toISOString();
  await env.DB.prepare("INSERT OR REPLACE INTO store_flags (key, value, updated_at, updated_by) VALUES ('active', ?, ?, ?)").bind(JSON.stringify(next), now, email).run();
  return { ok: true, active: next };
}

export async function readDomain(env, domain, url) {
  domainOf(domain);
  const head = await env.DB.prepare('SELECT rev, updated_at, updated_by, note FROM store_domains WHERE domain = ?').bind(domain).first();
  if (!head) return { ok: true, domain, rev: 0, empty: true, sections: {} };
  const want = url && url.searchParams.get('rev');
  if (want !== null && want !== undefined && want !== '') {
    const R = Number(want); if (!Number.isInteger(R) || R < 1 || R > head.rev) throw bad('rev 는 1 ~ ' + head.rev + ' 사이여야 합니다.');
    // 그 판 때의 모습: 조각마다 rev <= R 인 것 중 가장 늦은 판 (지금 조각 + 지난 판). data 가 NULL 이면 그때 지워져 있던 것
    const { results } = await env.DB.prepare(`SELECT key, rev, data FROM (
        SELECT key, rev, data FROM store_sections WHERE domain = ?1 AND rev <= ?2
        UNION ALL SELECT key, rev, data FROM store_history WHERE domain = ?1 AND rev <= ?2
      ) AS v WHERE rev = (SELECT MAX(rev) FROM (
        SELECT rev FROM store_sections s WHERE s.domain = ?1 AND s.key = v.key AND s.rev <= ?2
        UNION ALL SELECT rev FROM store_history h WHERE h.domain = ?1 AND h.key = v.key AND h.rev <= ?2))`.replace(/\s+/g, ' ')).bind(domain, R).all();
    const sections = {}; results.forEach((r) => { if (r.data !== null) sections[r.key] = r.data; });
    return { ok: true, domain, rev: R, latest: head.rev, past: true, sections };
  }
  const { results } = await env.DB.prepare('SELECT key, data FROM store_sections WHERE domain = ?').bind(domain).all();
  const sections = {}; results.forEach((r) => { sections[r.key] = r.data; });
  return { ok: true, domain, rev: head.rev, updatedAt: head.updated_at, updatedBy: head.updated_by, note: head.note, sections };
}

export async function writeDomain(env, domain, request, email) {
  domainOf(domain);
  let b; try { b = await request.json(); } catch (e) { throw bad('보낸 자료를 읽을 수 없습니다.'); }
  const put = b && b.put && typeof b.put === 'object' && !Array.isArray(b.put) ? b.put : {}, del = Array.isArray(b && b.del) ? b.del.map(String) : [];
  const putKeys = Object.keys(put), baseRev = Number(b && b.baseRev);
  if (!Number.isInteger(baseRev) || baseRev < 0) throw bad('baseRev(불러온 판)이 필요합니다.');
  if (!putKeys.length && !del.length) throw bad('바뀐 조각이 없습니다.');
  if (putKeys.length + del.length > MAX.sections) throw bad(`한 번에 조각 ${MAX.sections}개까지 저장할 수 있습니다.`);
  let total = 0; const sizes = {};
  for (const k of [...putKeys, ...del]) { if (!k || k.length > MAX.key) throw bad('조각 이름이 비었거나 너무 깁니다.'); }
  if (del.some((k) => putKeys.includes(k))) throw bad('같은 조각을 넣으면서 지울 수 없습니다.');
  for (const k of putKeys) {
    if (typeof put[k] !== 'string') throw bad(`조각 '${k}' 은(는) JSON 글자여야 합니다.`);
    try { JSON.parse(put[k]); } catch (e) { throw bad(`조각 '${k}' 이(가) 올바른 JSON 이 아닙니다.`); }
    sizes[k] = byteLen(put[k]); total += sizes[k];
    if (sizes[k] > MAX.sectionBytes) throw new StoreError(413, `조각 '${k}' 이(가) 너무 큽니다 (${sizes[k]}바이트, 한도 ${MAX.sectionBytes}).`);
  }
  if (total > MAX.totalBytes) throw new StoreError(413, `한 번에 보낼 수 있는 크기를 넘었습니다 (${total}바이트, 한도 ${MAX.totalBytes}).`);

  const head = await env.DB.prepare('SELECT rev FROM store_domains WHERE domain = ?').bind(domain).first();
  const curRev = head ? head.rev : 0;
  if (curRev !== baseRev) throw new StoreError(409, '다른 사람이 먼저 저장했습니다. 새로 불러온 뒤 다시 저장해 주세요.', { conflict: true, rev: curRev });
  const newRev = curRev + 1, now = new Date().toISOString(), token = crypto.randomUUID(), note = String((b && b.note) || '').slice(0, 200);
  // 첫 문장이 '판이 그대로일 때만' 판을 올리고 표식(token)을 남김. 뒤 문장들은 그 표식이 있을 때만 실행 → 동시에 저장해도 한쪽만 들어감
  const guard = 'EXISTS (SELECT 1 FROM store_domains WHERE domain = ? AND rev = ? AND token = ?)';
  const st = [];
  st.push(head
    ? env.DB.prepare('UPDATE store_domains SET rev = ?, token = ?, updated_at = ?, updated_by = ?, note = ? WHERE domain = ? AND rev = ?').bind(newRev, token, now, email, note, domain, curRev)
    : env.DB.prepare('INSERT OR IGNORE INTO store_domains (domain, rev, token, updated_at, updated_by, note) VALUES (?, ?, ?, ?, ?, ?)').bind(domain, newRev, token, now, email, note));
  const touched = [...putKeys, ...del];
  for (let i = 0; i < touched.length; i += 80) { // 바뀌거나 지워지는 조각의 지금 내용을 지난 판으로 옮김
    const part = touched.slice(i, i + 80);
    st.push(env.DB.prepare(`INSERT OR REPLACE INTO store_history (domain, key, rev, data, updated_at, updated_by) SELECT domain, key, rev, data, updated_at, updated_by FROM store_sections WHERE domain = ? AND key IN (${part.map(() => '?').join(',')}) AND ${guard}`).bind(domain, ...part, domain, newRev, token));
  }
  // 조각 넣기: 한 문장에 여러 줄(최대 13줄 = 값 91개, 합계 1.8MB)씩 묶음
  let group = [], gBytes = 0;
  const flush = () => {
    if (!group.length) return;
    st.push(env.DB.prepare(`INSERT OR REPLACE INTO store_sections (domain, key, rev, data, bytes, updated_at, updated_by) SELECT * FROM (VALUES ${group.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}) WHERE ${guard}`)
      .bind(...group.flatMap((k) => [domain, k, newRev, put[k], sizes[k], now, email]), domain, newRev, token));
    group = []; gBytes = 0;
  };
  for (const k of putKeys) { if (group.length >= 13 || (group.length && gBytes + sizes[k] > 1800000)) flush(); group.push(k); gBytes += sizes[k]; }
  flush();
  for (let i = 0; i < del.length; i += 80) {
    const part = del.slice(i, i + 80);
    st.push(env.DB.prepare(`DELETE FROM store_sections WHERE domain = ? AND key IN (${part.map(() => '?').join(',')}) AND ${guard}`).bind(domain, ...part, domain, newRev, token));
  }
  for (let i = 0; i < del.length; i += 18) { // 지운 표시
    const part = del.slice(i, i + 18);
    st.push(env.DB.prepare(`INSERT OR REPLACE INTO store_history (domain, key, rev, data, updated_at, updated_by) SELECT * FROM (VALUES ${part.map(() => '(?, ?, ?, NULL, ?, ?)').join(', ')}) WHERE ${guard}`)
      .bind(...part.flatMap((k) => [domain, k, newRev, now, email]), domain, newRev, token));
  }
  st.push(env.DB.prepare(`DELETE FROM store_history WHERE rowid IN (SELECT rowid FROM store_history WHERE updated_at < ? LIMIT 200) AND ${guard}`).bind(new Date(Date.now() - MAX.historyDays * 86400000).toISOString(), domain, newRev, token));
  const res = await env.DB.batch(st);
  if (!res[0] || !res[0].meta || res[0].meta.changes !== 1) {
    const now2 = await env.DB.prepare('SELECT rev FROM store_domains WHERE domain = ?').bind(domain).first();
    throw new StoreError(409, '다른 사람이 먼저 저장했습니다. 새로 불러온 뒤 다시 저장해 주세요.', { conflict: true, rev: now2 ? now2.rev : 0 });
  }
  return { ok: true, domain, rev: newRev, updatedAt: now, put: putKeys.length, del: del.length, bytes: total };
}

export async function putBackup(env, domain, request, email) {
  domainOf(domain);
  if (!env.PHOTOS) throw new StoreError(503, '서버에 저장소(R2)가 연결되지 않았습니다.');
  const text = await request.text();
  if (!text) throw bad('백업할 내용이 비어 있습니다.');
  const bytes = byteLen(text); if (bytes > MAX.backupBytes) throw new StoreError(413, '백업이 너무 큽니다.');
  try { JSON.parse(text); } catch (e) { throw bad('백업 내용이 올바른 JSON 이 아닙니다.'); }
  const now = new Date().toISOString(), key = `backup/gas/${domain}/${now.replace(/[:.]/g, '-')}.json`;
  await env.PHOTOS.put(key, text, { httpMetadata: { contentType: 'application/json; charset=utf-8' }, customMetadata: { by: email, domain } });
  return { ok: true, key, bytes, at: now };
}
export async function listBackups(env, domain) {
  domainOf(domain);
  if (!env.PHOTOS) throw new StoreError(503, '서버에 저장소(R2)가 연결되지 않았습니다.');
  const l = await env.PHOTOS.list({ prefix: `backup/gas/${domain}/`, limit: 1000 });
  return { ok: true, backups: (l.objects || []).map((o) => ({ key: o.key, bytes: o.size, uploaded: o.uploaded })) };
}
export { StoreError };
