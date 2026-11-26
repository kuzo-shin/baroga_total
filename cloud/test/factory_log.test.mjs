// 공장 일지 서버 시험 (가짜 자료, node:sqlite 로 D1 흉내 · Map 으로 R2 흉내)  실행: node test/factory_log.test.mjs
import assert from 'node:assert';
import worker from '../src/index.js';
import { makeD1 } from './d1mock.mjs';

const store = new Map();
const PHOTOS = {
  put: async (k, v, o) => { store.set(k, { buf: new Uint8Array(v), type: o && o.httpMetadata && o.httpMetadata.contentType }); },
  get: async (k) => (store.has(k) ? { body: store.get(k).buf } : null),
  delete: async (k) => { (Array.isArray(k) ? k : [k]).forEach((x) => store.delete(x)); },
};
const DB = makeD1();
const env = { DB, PHOTOS, ACCESS_CODE: '시험코드-12', ALLOWED_ORIGINS: 'https://kuzo-shin.github.io' };
const ORIGIN = 'https://kuzo-shin.github.io';
const call = async (method, path, body, opt = {}) => {
  const headers = { Origin: opt.origin || ORIGIN };
  if (opt.code !== null) headers['X-Access-Code'] = encodeURIComponent(opt.code === undefined ? env.ACCESS_CODE : opt.code);
  let payload;
  if (opt.raw) { payload = opt.raw; headers['Content-Type'] = opt.type || 'image/jpeg'; }
  else if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const res = await worker.fetch(new Request('https://x.test' + path, { method, headers, body: payload }), opt.env || env);
  const ct = res.headers.get('Content-Type') || '';
  return { status: res.status, headers: res.headers, j: ct.includes('json') ? await res.json() : null, res };
};

// 접속 코드·CORS
let r = await call('GET', '/api/health', undefined, { code: null }); assert.strictEqual(r.status, 200); assert.deepStrictEqual([r.j.accessCode, r.j.db, r.j.photos], [true, true, true]);
assert.strictEqual(r.headers.get('Access-Control-Allow-Origin'), ORIGIN);
r = await call('GET', '/api/health', undefined, { origin: 'https://evil.example' }); assert.strictEqual(r.headers.get('Access-Control-Allow-Origin'), null, '허용하지 않은 주소에는 CORS 머리말 없음');
r = await call('OPTIONS', '/api/factory-log', undefined, { code: null }); assert.strictEqual(r.status, 204); assert.ok(r.headers.get('Access-Control-Allow-Headers').includes('X-Access-Code'));
r = await call('GET', '/api/factory-log?from=2026-11-01&to=2026-11-30', undefined, { code: null }); assert.strictEqual(r.status, 401); assert.strictEqual(r.j.unauthorized, true);
r = await call('GET', '/api/factory-log?from=2026-11-01&to=2026-11-30', undefined, { code: '틀린코드' }); assert.strictEqual(r.status, 401);
r = await call('GET', '/api/factory-log?from=2026-11-01&to=2026-11-30', undefined, { env: { DB, PHOTOS } }); assert.strictEqual(r.status, 503, '서버에 코드가 없으면 모두 거부');

// 빈 상태
r = await call('GET', '/api/factory-log?from=2026-11-01&to=2026-11-30'); assert.ok(r.j.ok); assert.deepStrictEqual([r.j.logs.length, r.j.open.length], [0, 0]);
r = await call('GET', '/api/factory-log?from=2026-11-30&to=2026-11-01'); assert.strictEqual(r.status, 400);

// 저장: 검증
const base = { start: '2026-11-10', end: '2026-11-12', title: '론도 벨트 끊어짐', happened: '오전 작업 중 벨트가 끊어짐', action: '업체 불러 교체', assignees: ['가반장', '나기사', '가반장', ' '], checklist: [{ text: '예비 벨트 주문', done: false }, { text: '업체 견적서 보관', done: true, doneAt: '2026-11-11' }, { text: '  ' }] };
r = await call('PUT', '/api/factory-log', { ...base, title: ' ' }); assert.strictEqual(r.status, 400);
r = await call('PUT', '/api/factory-log', { ...base, end: '2026-11-09' }); assert.strictEqual(r.status, 400);
r = await call('PUT', '/api/factory-log', { ...base, start: '2026-02-30', end: '2026-03-01' }); assert.strictEqual(r.status, 400, '없는 날짜');
r = await call('PUT', '/api/factory-log', { ...base, title: 'x'.repeat(101) }); assert.strictEqual(r.status, 400);
r = await call('PUT', '/api/factory-log', { ...base, end: '2028-01-01' }); assert.strictEqual(r.status, 400, '1년 넘는 기간');

// 저장: 새로 만들기
r = await call('PUT', '/api/factory-log', base); assert.ok(r.j.ok, JSON.stringify(r.j));
const A = r.j.log; assert.strictEqual(A.rev, 1); assert.deepStrictEqual(A.assignees, ['가반장', '나기사']); assert.strictEqual(A.checklist.length, 2);
assert.deepStrictEqual(A.checklist.map((c) => [c.text, c.done, c.doneAt]), [['예비 벨트 주문', false, ''], ['업체 견적서 보관', true, '2026-11-11']]);
r = await call('PUT', '/api/factory-log', { start: '2026-12-03', title: '배수구 누수' }); assert.ok(r.j.ok); const B = r.j.log; assert.strictEqual(B.end, '2026-12-03', '종료일을 비우면 시작일과 같음');

// 읽기: 기간에 걸친 것만, 남은 체크리스트는 기간과 무관
r = await call('GET', '/api/factory-log?from=2026-11-12&to=2026-11-30'); assert.deepStrictEqual(r.j.logs.map((l) => l.title), ['론도 벨트 끊어짐']);
r = await call('GET', '/api/factory-log?from=2026-11-13&to=2026-11-30'); assert.strictEqual(r.j.logs.length, 0); assert.deepStrictEqual(r.j.open.map((l) => l.title), ['론도 벨트 끊어짐']);
r = await call('GET', '/api/factory-log?from=2026-11-30&to=2027-01-03'); assert.deepStrictEqual(r.j.logs.map((l) => l.title), ['배수구 누수']);

// 고치기: rev 가 다르면 거부, 맞으면 +1, 체크리스트를 다 끝내면 '남은 것' 목록에서 빠짐
r = await call('PUT', '/api/factory-log', { ...base, id: A.id, rev: 99 }); assert.strictEqual(r.status, 409); assert.strictEqual(r.j.log.rev, 1);
r = await call('PUT', '/api/factory-log', { ...base, id: 'no-such', rev: 1 }); assert.strictEqual(r.status, 404);
const done = A.checklist.map((c) => ({ ...c, done: true, doneAt: c.doneAt || '2026-11-20' }));
r = await call('PUT', '/api/factory-log', { ...base, id: A.id, rev: 1, checklist: done }); assert.ok(r.j.ok); assert.strictEqual(r.j.log.rev, 2);
assert.deepStrictEqual(r.j.log.checklist.map((c) => c.id), A.checklist.map((c) => c.id), '항목 id 유지');
r = await call('GET', '/api/factory-log?from=2026-11-01&to=2026-11-30'); assert.strictEqual(r.j.open.length, 0);

// 사진: 올리기·형식·크기·내려받기·삭제
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
r = await call('POST', `/api/factory-log/${A.id}/photos?name=${encodeURIComponent('벨트 사진.jpg')}`, undefined, { raw: jpg }); assert.ok(r.j.ok, JSON.stringify(r.j));
const P1 = r.j.photo; assert.strictEqual(P1.size, 8); assert.strictEqual(P1.name, '벨트 사진.jpg'); assert.strictEqual(store.size, 1);
r = await call('POST', `/api/factory-log/${A.id}/photos`, undefined, { raw: jpg, type: 'application/pdf' }); assert.strictEqual(r.status, 400);
r = await call('POST', `/api/factory-log/${A.id}/photos`, undefined, { raw: new Uint8Array(8 * 1024 * 1024 + 1) }); assert.strictEqual(r.status, 413);
r = await call('POST', '/api/factory-log/no-such/photos', undefined, { raw: jpg }); assert.strictEqual(r.status, 404);
r = await call('GET', `/api/photos/${P1.id}`, undefined, { code: null }); assert.strictEqual(r.status, 401, '사진도 접속 코드 필요');
r = await call('GET', `/api/photos/${P1.id}`); assert.strictEqual(r.status, 200); assert.strictEqual(r.headers.get('Content-Type'), 'image/jpeg');
assert.deepStrictEqual([...new Uint8Array(await r.res.arrayBuffer())], [...jpg]);
r = await call('GET', '/api/factory-log?from=2026-11-01&to=2026-11-30'); assert.deepStrictEqual(r.j.logs[0].photos.map((p) => p.id), [P1.id]);
r = await call('POST', `/api/factory-log/${A.id}/photos`, undefined, { raw: jpg, type: 'image/png' }); const P2 = r.j.photo;
r = await call('DELETE', `/api/photos/${P1.id}`); assert.ok(r.j.ok); assert.strictEqual(store.size, 1);
r = await call('GET', `/api/photos/${P1.id}`); assert.strictEqual(r.status, 404);

// 사진 장수 제한 (20장)
for (let i = 0; i < 19; i++) { r = await call('POST', `/api/factory-log/${B.id}/photos`, undefined, { raw: jpg }); assert.ok(r.j.ok); }
r = await call('POST', `/api/factory-log/${B.id}/photos`, undefined, { raw: jpg }); assert.ok(r.j.ok);
r = await call('POST', `/api/factory-log/${B.id}/photos`, undefined, { raw: jpg }); assert.strictEqual(r.status, 400, '21번째는 거부');

// 일지 삭제 → 사진도 함께
r = await call('DELETE', `/api/factory-log/${A.id}`); assert.ok(r.j.ok); assert.strictEqual(r.j.photos, 1);
r = await call('GET', `/api/photos/${P2.id}`); assert.strictEqual(r.status, 404); assert.strictEqual(store.size, 20);
r = await call('DELETE', `/api/factory-log/${A.id}`); assert.strictEqual(r.status, 404);
r = await call('GET', '/api/factory-log?from=2026-11-01&to=2026-12-31'); assert.deepStrictEqual(r.j.logs.map((l) => [l.title, l.photos.length]), [['배수구 누수', 20]]);

// 한 번 요청에 쓰는 쿼리 수 (무료 요금제 50개 제한)
DB.reset(); await call('GET', '/api/factory-log?from=2026-11-01&to=2026-12-31'); assert.ok(DB.queries <= 10, '쿼리 ' + DB.queries);
r = await call('GET', '/nothing'); assert.strictEqual(r.status, 404);
console.log('factory_log.test: 모두 통과');
