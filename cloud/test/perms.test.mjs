// 계정별 메뉴 권한 시험 (가짜 자료).  실행: node test/perms.test.mjs
import assert from 'node:assert';
import worker from '../src/index.js';
import { makeD1 } from './d1mock.mjs';
const DB = makeD1(), PHOTOS = { put: async () => {}, list: async () => ({ objects: [] }), delete: async () => {} };
const call = async (email, method, path, body) => { const res = await worker.fetch(new Request('http://localhost' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }), { DB, PHOTOS, DEV_EMAIL: email, ADMIN_EMAILS: 'Boss@Example.com' }); return { s: res.status, j: await res.json() }; };
const put1 = (email, domain, baseRev) => call(email, 'PUT', '/api/store/' + domain, { baseRev, put: { _manifest: JSON.stringify({ n: baseRev }) } });
let r;
// 권한을 정하기 전: 누구나 수정 (지금까지와 같음)
r = await call('kim@example.com', 'GET', '/api/me'); assert.strictEqual(r.j.admin, false); assert.strictEqual(r.j.levels.price, 'edit'); assert.strictEqual(Object.keys(r.j.levels).length, 8);
r = await put1('kim@example.com', 'price', 0); assert.strictEqual(r.s, 200);
// 관리자만 설정을 보고 바꿈
r = await call('kim@example.com', 'GET', '/api/perms'); assert.strictEqual(r.s, 403);
r = await call('kim@example.com', 'PUT', '/api/perms', { users: { 'kim@example.com': { price: 'edit' } } }); assert.strictEqual(r.s, 403);
r = await call('boss@example.com', 'PUT', '/api/perms', { def: { price: 'none' }, users: { 'Kim@Example.com': { price: 'view', raw: 'view', invoice: 'none', factory_log: 'view', bogus: 'edit', recipe: 'weird' }, 'boss@example.com': { price: 'none' } } });
assert.strictEqual(r.s, 200); assert.deepStrictEqual(r.j.users, { 'kim@example.com': { raw: 'view', price: 'view', invoice: 'none', factory_log: 'view' } }); assert.deepStrictEqual(r.j.def, { price: 'none' });
r = await call('boss@example.com', 'PUT', '/api/perms', { users: { 'not-an-email': {} } }); assert.strictEqual(r.s, 400);
// 적용
r = await call('kim@example.com', 'GET', '/api/me'); assert.deepStrictEqual([r.j.levels.price, r.j.levels.raw, r.j.levels.invoice, r.j.levels.recipe], ['view', 'view', 'none', 'edit']);
r = await call('lee@example.com', 'GET', '/api/me'); assert.strictEqual(r.j.levels.price, 'none'); assert.strictEqual(r.j.levels.raw, 'edit'); // 목록에 없는 계정 = 기본값
r = await call('boss@example.com', 'GET', '/api/me'); assert.strictEqual(r.j.admin, true); assert.strictEqual(r.j.levels.price, 'edit'); // 관리자는 항상 수정
r = await put1('kim@example.com', 'price', 1); assert.strictEqual(r.s, 403); assert.ok(/보기 권한/.test(r.j.error));
r = await put1('kim@example.com', 'price_compare', 0); assert.strictEqual(r.s, 403); // 단가 비교는 원재료 권한을 따름
r = await put1('kim@example.com', 'invoice', 0); assert.strictEqual(r.s, 403);
r = await put1('lee@example.com', 'price', 1); assert.strictEqual(r.s, 403);
r = await put1('kim@example.com', 'recipe', 0); assert.strictEqual(r.s, 200);
r = await put1('boss@example.com', 'price', 1); assert.strictEqual(r.s, 200);
r = await call('kim@example.com', 'GET', '/api/store/price'); assert.strictEqual(r.s, 200); // 읽기는 막지 않음(다른 메뉴 계산에 필요)
// 공장 일지: 보기 = 읽기만
r = await call('kim@example.com', 'GET', '/api/factory-log?from=2026-11-01&to=2026-11-30'); assert.strictEqual(r.s, 200);
r = await call('kim@example.com', 'PUT', '/api/factory-log', { start: '2026-11-27', end: '2026-11-27', title: 't' }); assert.strictEqual(r.s, 403);
r = await call('lee@example.com', 'PUT', '/api/factory-log', { start: '2026-11-27', end: '2026-11-27', title: 't' }); assert.strictEqual(r.s, 200);
await call('boss@example.com', 'PUT', '/api/perms', { users: { 'kim@example.com': { factory_log: 'none' } } });
r = await call('kim@example.com', 'GET', '/api/factory-log?from=2026-11-01&to=2026-11-30'); assert.strictEqual(r.s, 403);
r = await put1('kim@example.com', 'price', 2); assert.strictEqual(r.s, 200); // 설정에서 빠지면 다시 기본(수정)
console.log('perms.test: 모두 통과');
