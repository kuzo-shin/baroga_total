// [VERSION: cloud/src/index.js v1.4 - 2026-11-27 계정별 메뉴 권한(/api/perms, /api/me 에 권한 포함, 공장 일지 저장·삭제는 수정 권한만) / v1.3 - 2026-11-27 메뉴 전환 표시(/api/store-active) / v1.2 - 2026-11-27 메뉴별 자료 보관소(/api/store)·구글 DB 원본 백업(/api/backup) 추가 / v1.1 - 2026-11-27 접속 코드 대신 Cloudflare Access 로그인(허용한 구글 계정) · 작성자/수정자 기록 · 화면 파일도 이 서버에서 제공 / v1.0 - 2026-11-27 신규: 공장 일지 API (D1 + R2)]
// ============================================================================
// 바로가 공장 ERP — Cloudflare Worker (DB: D1, 사진: R2, 화면: assets)
//  - 화면 파일(index.html·*.js)과 /api/* 를 같은 주소에서 제공
//  - 보호: Cloudflare Access. 허용한 구글 계정으로 로그인한 사람만 화면·API에 닿음(Access 정책에서 관리)
//          서버는 요청마다 Access가 붙여 주는 토큰(Cf-Access-Jwt-Assertion)의 서명·대상·만료를 다시 확인하고 이메일을 꺼냄 (cloud/src/auth.js)
//          ACCESS_TEAM_DOMAIN·ACCESS_AUD 가 없으면 모든 요청 거부
//  - 표(테이블)는 서버가 첫 요청 때 만듦 (따로 명령을 돌리지 않아도 됨)
//
//   GET    /api/me                                            로그인한 사람의 이메일 · 관리자 여부 · 메뉴별 권한
//   GET    /api/perms · PUT /api/perms                        계정별 메뉴 권한 보기·바꾸기 (관리자만, cloud/src/store.js)
//  메뉴별 자료 보관소: /api/store, /api/backup (cloud/src/store.js)
//  공장 일지
//   GET    /api/factory-log?from=YYYY-MM-DD&to=YYYY-MM-DD   그 기간에 걸친 일지 + 체크리스트가 남은 일지(기간 무관)
//   PUT    /api/factory-log                                   일지 한 건 새로 만들기·고치기 (고칠 때는 id·rev 필요)
//   DELETE /api/factory-log/:id                               일지 한 건과 그 사진 삭제
//   POST   /api/factory-log/:id/photos?name=파일이름          사진 한 장 올리기 (본문 = 사진 파일)
//   GET    /api/photos/:id                                    사진 내려받기
//   DELETE /api/photos/:id                                    사진 한 장 삭제
// ============================================================================
import { getEmail } from './auth.js';
import { STORE_SCHEMA, StoreError, listDomains, readDomain, writeDomain, putBackup, listBackups, setActive, permsFor, requireLevel, getPerms, putPerms } from './store.js';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS factory_log (
    id TEXT PRIMARY KEY, start_date TEXT NOT NULL, end_date TEXT NOT NULL, title TEXT NOT NULL,
    happened TEXT NOT NULL DEFAULT '', action TEXT NOT NULL DEFAULT '',
    assignees TEXT NOT NULL DEFAULT '[]', checklist TEXT NOT NULL DEFAULT '[]', open_items INTEGER NOT NULL DEFAULT 0,
    rev INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL DEFAULT '', updated_by TEXT NOT NULL DEFAULT '')`,
  'CREATE INDEX IF NOT EXISTS factory_log_dates ON factory_log (start_date, end_date)',
  `CREATE TABLE IF NOT EXISTS factory_log_photos (
    id TEXT PRIMARY KEY, log_id TEXT NOT NULL, r2_key TEXT NOT NULL, name TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL)`,
  'CREATE INDEX IF NOT EXISTS factory_log_photos_log ON factory_log_photos (log_id)',
];
const LIMIT = { title: 100, text: 5000, assignees: 20, name: 30, checklist: 50, item: 200, photos: 20, photoBytes: 8 * 1024 * 1024, spanDays: 366 };
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
let schemaReady = null; // 서버 인스턴스마다 한 번만 확인

class HttpError extends Error { constructor(status, message, extra) { super(message); this.status = status; this.extra = extra || {}; } }
const bad = (m, extra) => new HttpError(400, m, extra);

const json = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

async function ensureSchema(env) {
  if (!env.DB) throw new HttpError(503, '서버에 DB(D1)가 연결되지 않았습니다.');
  if (!schemaReady) schemaReady = (async () => {
    await env.DB.batch([...SCHEMA, ...STORE_SCHEMA].map((s) => env.DB.prepare(s.replace(/\s+/g, ' '))));
    // v1.0 에서 만든 표에는 작성자·수정자 칸이 없으므로 더함
    const cols = (await env.DB.prepare('PRAGMA table_info(factory_log)').all()).results.map((c) => c.name);
    const add = ['created_by', 'updated_by'].filter((c) => !cols.includes(c)).map((c) => env.DB.prepare(`ALTER TABLE factory_log ADD COLUMN ${c} TEXT NOT NULL DEFAULT ''`));
    if (add.length) await env.DB.batch(add);
  })().catch((e) => { schemaReady = null; throw e; });
  await schemaReady;
}

const isDate = (s) => { if (!DATE_RE.test(String(s))) return false; const d = new Date(s + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s; };
const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
const text = (v, max, label) => { const s = String(v ?? '').replace(/\r\n/g, '\n').trim(); if (s.length > max) throw bad(`${label}은(는) ${max}자까지 적을 수 있습니다.`); return s; };
const parseArr = (s) => { try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const rowOut = (r, photos) => ({ id: r.id, start: r.start_date, end: r.end_date, title: r.title, happened: r.happened, action: r.action, assignees: parseArr(r.assignees), checklist: parseArr(r.checklist), rev: r.rev, createdAt: r.created_at, updatedAt: r.updated_at, createdBy: r.created_by || '', updatedBy: r.updated_by || '', photos: photos || [] });
const photoOut = (p) => ({ id: p.id, name: p.name, type: p.type, size: p.size, createdAt: p.created_at });

function cleanEntry(b) {
  const start = String(b.start || ''), end = String(b.end || b.start || '');
  if (!isDate(start) || !isDate(end)) throw bad('시작일·종료일을 YYYY-MM-DD 로 적어 주세요.');
  if (end < start) throw bad('종료일이 시작일보다 앞입니다.');
  if (dayDiff(start, end) > LIMIT.spanDays) throw bad('기간은 1년을 넘을 수 없습니다.');
  const title = text(b.title, LIMIT.title, '제목'); if (!title) throw bad('제목을 적어 주세요.');
  const names = []; (Array.isArray(b.assignees) ? b.assignees : []).forEach((n) => { const s = text(n, LIMIT.name, '담당자 이름'); if (s && !names.includes(s)) names.push(s); });
  if (names.length > LIMIT.assignees) throw bad(`담당자는 ${LIMIT.assignees}명까지 지정할 수 있습니다.`);
  const seen = new Set(), list = [];
  (Array.isArray(b.checklist) ? b.checklist : []).forEach((it) => {
    const t = text(it && it.text, LIMIT.item, '체크리스트 항목'); if (!t) return;
    let id = String((it && it.id) || ''); if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || seen.has(id)) id = crypto.randomUUID(); seen.add(id);
    const done = !!(it && it.done), doneAt = done && isDate(String(it.doneAt || '')) ? String(it.doneAt) : '';
    list.push({ id, text: t, done, doneAt });
  });
  if (list.length > LIMIT.checklist) throw bad(`체크리스트는 ${LIMIT.checklist}개까지 넣을 수 있습니다.`);
  return { start, end, title, happened: text(b.happened, LIMIT.text, '일어난 일'), action: text(b.action, LIMIT.text, '사후 대처'), assignees: names, checklist: list, open: list.filter((x) => !x.done).length };
}

async function photosFor(env, ids) {
  const by = {}; if (!ids.length) return by;
  for (let i = 0; i < ids.length; i += 80) { // D1 한 문장에 묶을 수 있는 값은 100개까지
    const part = ids.slice(i, i + 80);
    const { results } = await env.DB.prepare(`SELECT * FROM factory_log_photos WHERE log_id IN (${part.map(() => '?').join(',')}) ORDER BY created_at, id`).bind(...part).all();
    results.forEach((p) => { (by[p.log_id] = by[p.log_id] || []).push(photoOut(p)); });
  }
  return by;
}
async function listLogs(env, url) {
  const from = url.searchParams.get('from') || '', to = url.searchParams.get('to') || '';
  if (!isDate(from) || !isDate(to) || to < from) throw bad('from·to 를 YYYY-MM-DD 로 적어 주세요.');
  if (dayDiff(from, to) > 400) throw bad('한 번에 400일까지만 읽을 수 있습니다.');
  const a = await env.DB.prepare('SELECT * FROM factory_log WHERE end_date >= ? AND start_date <= ? ORDER BY start_date, created_at').bind(from, to).all();
  const b = await env.DB.prepare('SELECT * FROM factory_log WHERE open_items > 0 ORDER BY start_date, created_at LIMIT 300').all();
  const ids = [...new Set([...a.results, ...b.results].map((r) => r.id))], ph = await photosFor(env, ids);
  return { ok: true, from, to, logs: a.results.map((r) => rowOut(r, ph[r.id])), open: b.results.map((r) => rowOut(r, ph[r.id])) };
}
async function oneLog(env, id) {
  const r = await env.DB.prepare('SELECT * FROM factory_log WHERE id = ?').bind(id).first(); if (!r) return null;
  return rowOut(r, (await photosFor(env, [id]))[id]);
}
async function saveLog(env, request, email) {
  let b; try { b = await request.json(); } catch (e) { throw bad('보낸 자료를 읽을 수 없습니다.'); }
  const c = cleanEntry(b || {}), now = new Date().toISOString();
  if (b.id) {
    const id = String(b.id), cur = await env.DB.prepare('SELECT rev FROM factory_log WHERE id = ?').bind(id).first();
    if (!cur) throw new HttpError(404, '이 일지를 찾을 수 없습니다. 다른 사람이 지웠을 수 있습니다.');
    const r = await env.DB.prepare('UPDATE factory_log SET start_date = ?, end_date = ?, title = ?, happened = ?, action = ?, assignees = ?, checklist = ?, open_items = ?, rev = rev + 1, updated_at = ?, updated_by = ? WHERE id = ? AND rev = ?')
      .bind(c.start, c.end, c.title, c.happened, c.action, JSON.stringify(c.assignees), JSON.stringify(c.checklist), c.open, now, email, id, Number(b.rev) || 0).run();
    if (!r.meta || !r.meta.changes) throw new HttpError(409, '다른 사람이 먼저 고쳤습니다. 새로 불러온 뒤 다시 고쳐 주세요.', { conflict: true, log: await oneLog(env, id) });
    return { ok: true, log: await oneLog(env, id) };
  }
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO factory_log (id, start_date, end_date, title, happened, action, assignees, checklist, open_items, rev, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)')
    .bind(id, c.start, c.end, c.title, c.happened, c.action, JSON.stringify(c.assignees), JSON.stringify(c.checklist), c.open, now, now, email, email).run();
  return { ok: true, log: await oneLog(env, id) };
}
async function deleteLog(env, id) {
  const cur = await env.DB.prepare('SELECT id FROM factory_log WHERE id = ?').bind(id).first();
  if (!cur) throw new HttpError(404, '이 일지를 찾을 수 없습니다.');
  const { results } = await env.DB.prepare('SELECT r2_key FROM factory_log_photos WHERE log_id = ?').bind(id).all();
  if (results.length) { if (!env.PHOTOS) throw new HttpError(503, '서버에 사진 저장소(R2)가 연결되지 않았습니다.'); await env.PHOTOS.delete(results.map((p) => p.r2_key)); }
  await env.DB.batch([env.DB.prepare('DELETE FROM factory_log_photos WHERE log_id = ?').bind(id), env.DB.prepare('DELETE FROM factory_log WHERE id = ?').bind(id)]);
  return { ok: true, photos: results.length };
}
async function addPhoto(env, request, url, logId) {
  if (!env.PHOTOS) throw new HttpError(503, '서버에 사진 저장소(R2)가 연결되지 않았습니다. ');
  const log = await env.DB.prepare('SELECT id FROM factory_log WHERE id = ?').bind(logId).first();
  if (!log) throw new HttpError(404, '이 일지를 찾을 수 없습니다.');
  const type = String(request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (!PHOTO_TYPES.includes(type)) throw bad('사진은 JPG·PNG·WEBP 만 올릴 수 있습니다.');
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM factory_log_photos WHERE log_id = ?').bind(logId).first();
  if (n && n.n >= LIMIT.photos) throw bad(`사진은 일지 한 건에 ${LIMIT.photos}장까지 올릴 수 있습니다.`);
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) throw bad('사진 파일이 비어 있습니다.');
  if (buf.byteLength > LIMIT.photoBytes) throw new HttpError(413, '사진 한 장은 8MB까지 올릴 수 있습니다.');
  const id = crypto.randomUUID(), key = `factory-log/${logId}/${id}`, now = new Date().toISOString();
  const name = text(url.searchParams.get('name') || '', 120, '파일 이름');
  await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: type } });
  try { await env.DB.prepare('INSERT INTO factory_log_photos (id, log_id, r2_key, name, type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, logId, key, name, type, buf.byteLength, now).run(); }
  catch (e) { await env.PHOTOS.delete(key); throw e; }
  return { ok: true, photo: { id, name, type, size: buf.byteLength, createdAt: now } };
}
async function getPhoto(env, id) {
  const p = await env.DB.prepare('SELECT * FROM factory_log_photos WHERE id = ?').bind(id).first();
  if (!p) throw new HttpError(404, '사진을 찾을 수 없습니다.');
  if (!env.PHOTOS) throw new HttpError(503, '서버에 사진 저장소(R2)가 연결되지 않았습니다.');
  const obj = await env.PHOTOS.get(p.r2_key);
  if (!obj) throw new HttpError(404, '사진 파일이 저장소에 없습니다.');
  return new Response(obj.body, { status: 200, headers: { 'Content-Type': p.type, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
}
async function deletePhoto(env, id) {
  const p = await env.DB.prepare('SELECT * FROM factory_log_photos WHERE id = ?').bind(id).first();
  if (!p) throw new HttpError(404, '사진을 찾을 수 없습니다.');
  if (!env.PHOTOS) throw new HttpError(503, '서버에 사진 저장소(R2)가 연결되지 않았습니다.');
  await env.PHOTOS.delete(p.r2_key);
  await env.DB.prepare('DELETE FROM factory_log_photos WHERE id = ?').bind(id).run();
  return { ok: true };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), path = url.pathname.replace(/\/+$/, '') || '/', m = request.method;
    try {
      // /api/* 가 아닌 주소는 화면 파일 (보통은 Cloudflare가 서버를 거치지 않고 바로 내려 줌)
      if (!path.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : json({ ok: false, error: '화면 파일이 연결되지 않았습니다.' }, 404);
      let email;
      try { email = await getEmail(request, env); }
      catch (e) { throw new HttpError(e.status || 401, e.message, e.status === 503 ? {} : { unauthorized: true }); }
      await ensureSchema(env);
      if (path === '/api/me' && m === 'GET') { const p = await permsFor(env, email); return json({ ok: true, email, db: !!env.DB, photos: !!env.PHOTOS, admin: p.admin, levels: p.levels }); }
      if (path === '/api/perms' && m === 'GET') return json(await getPerms(env, email));
      if (path === '/api/perms' && m === 'PUT') return json(await putPerms(env, request, email));
      let mm;
      if (path.startsWith('/api/factory-log') || path.startsWith('/api/photos/')) await requireLevel(env, email, 'factory_log', m === 'GET' ? 'view' : 'edit');
      if (path === '/api/factory-log' && m === 'GET') return json(await listLogs(env, url));
      if (path === '/api/factory-log' && m === 'PUT') return json(await saveLog(env, request, email));
      if ((mm = path.match(/^\/api\/factory-log\/([A-Za-z0-9-]{1,40})$/)) && m === 'DELETE') return json(await deleteLog(env, mm[1]));
      if ((mm = path.match(/^\/api\/factory-log\/([A-Za-z0-9-]{1,40})\/photos$/)) && m === 'POST') return json(await addPhoto(env, request, url, mm[1]));
      if ((mm = path.match(/^\/api\/photos\/([A-Za-z0-9-]{1,40})$/)) && m === 'GET') return await getPhoto(env, mm[1]);
      if ((mm = path.match(/^\/api\/photos\/([A-Za-z0-9-]{1,40})$/)) && m === 'DELETE') return json(await deletePhoto(env, mm[1]));
      // 메뉴별 자료 보관소 (cloud/src/store.js)
      if (path === '/api/store' && m === 'GET') return json(await listDomains(env));
      if (path === '/api/store-active' && m === 'PUT') return json(await setActive(env, request, email));
      if ((mm = path.match(/^\/api\/store\/([a-z_]{1,30})$/)) && m === 'GET') return json(await readDomain(env, mm[1], url));
      if ((mm = path.match(/^\/api\/store\/([a-z_]{1,30})$/)) && m === 'PUT') return json(await writeDomain(env, mm[1], request, email));
      if ((mm = path.match(/^\/api\/backup\/([a-z_]{1,30})$/)) && m === 'PUT') return json(await putBackup(env, mm[1], request, email));
      if ((mm = path.match(/^\/api\/backup\/([a-z_]{1,30})$/)) && m === 'GET') return json(await listBackups(env, mm[1]));
      throw new HttpError(404, '없는 주소입니다.');
    } catch (e) {
      if (e instanceof HttpError || e instanceof StoreError) return json(Object.assign({ ok: false, error: e.message }, e.extra), e.status);
      console.error(e && e.stack ? e.stack : e);
      return json({ ok: false, error: '서버 오류: ' + (e && e.message ? e.message : String(e)) }, 500);
    }
  },
};
