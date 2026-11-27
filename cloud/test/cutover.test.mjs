// 메뉴 전환 시험: 구글 DB와 같은 말투의 연결(CloudStore.gas) + 전환 표시. 가짜 자료.  실행: node test/cutover.test.mjs
import assert from 'node:assert';
import { createRequire } from 'node:module';
import worker from '../src/index.js';
import { makeD1 } from './d1mock.mjs';
const require = createRequire(import.meta.url);

const DB = makeD1(), PHOTOS = { put: async () => {}, list: async () => ({ objects: [] }) };
let email = 'boss@example.com';
const env = () => ({ DB, PHOTOS, DEV_EMAIL: email, ADMIN_EMAILS: 'Boss@Example.com' });
// 브라우저 흉내: 새 주소에서 연 것처럼, fetch 는 서버 코드로 바로 연결
globalThis.window = globalThis; globalThis.BAROGA_CLOUD_API = 'http://localhost'; globalThis.location = { hostname: 'baroga-total.example.workers.dev', protocol: 'https:' };
globalThis.fetch = (u, o) => worker.fetch(new Request(u, o), env());
const CS = require('../../cloud_store.js');
const MOVED_NOW = CS.MOVED.slice(); CS.MOVED.length = 0; // 시험은 '전환이 끝난 메뉴 없음'에서 시작 (실제 목록은 아래에서 따로 확인)
assert.ok(MOVED_NOW.every((d) => CS.DOMAINS.includes(d)));

// 구글 DB 흉내 (판 번호와 자료를 가짐)
const fakeGas = (first) => { const g = { rev: 5, doc: first, calls: 0 }; g.fn = async (body) => { g.calls++; if (body.action === 'getAll') return { ok: true, status: 'ok', revision: g.rev, source: 'GAS', payload: JSON.parse(JSON.stringify(g.doc)) }; if (Number(body.baseRevision) !== g.rev) return { ok: false, conflict: true, revision: g.rev }; g.doc = JSON.parse(JSON.stringify(body.payload)); g.rev++; return { ok: true, status: 'ok', revision: g.rev }; }; return g; };
const G = fakeGas({ v: 1, docs: [{ id: 'a', to: '가나점' }], cfg: { defaults: { pay: 'x' } } });
const inv = CS.gas('invoice', G.fn);

// 전환 전: 그대로 구글 DB
let r = await inv({ action: 'getAll' }); assert.strictEqual(r.source, 'GAS'); assert.strictEqual(G.calls, 1);
// 자료가 없는 메뉴는 전환 못 함, 관리자만 전환
await assert.rejects(() => CS.setActive('invoice', true), /자료가 없어/);
await CS.save('invoice', G.doc, 0, {}, '가져옴');
email = 'kim@example.com'; await assert.rejects(() => CS.setActive('invoice', true), /관리자만/); email = 'boss@example.com';
assert.deepStrictEqual(await CS.setActive('invoice', true), ['invoice']);
assert.strictEqual(await CS.isActive('invoice'), true); assert.strictEqual(await CS.isActive('price'), false);

// 전환 후: Cloudflare 가 구글 DB와 같은 모양으로 답함, 구글 DB는 더 부르지 않음
r = await inv({ action: 'getAll' }); assert.strictEqual(G.calls, 1, '구글 DB를 부르지 않음');
assert.deepStrictEqual([r.ok, r.status, r.revision, r.source], [true, 'ok', 1, 'CLOUDFLARE']); assert.strictEqual(JSON.stringify(r.payload), JSON.stringify(G.doc)); assert.match(r.updatedAt, /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/);
const db = r.payload; db.docs.push({ id: 'b', to: '다라점' });
r = await inv({ action: 'replaceAll', baseRevision: 1, payload: db }); assert.deepStrictEqual([r.ok, r.status, r.revision], [true, 'ok', 2]);
r = await inv({ action: 'replaceAll', baseRevision: 1, payload: db }); assert.deepStrictEqual([r.ok, r.conflict, r.revision], [false, true, 2], '옛 판으로 저장하면 구글 DB처럼 거부'); assert.ok(r.message && r.error);
r = await inv({ action: 'replaceAll', payload: db }); assert.strictEqual(r.conflict, true, '판 번호 없이 저장하면 거부');
r = await inv({ action: 'replaceAll', baseRevision: 2, payload: db }); assert.deepStrictEqual([r.ok, r.revision, r.changed], [true, 2, 0], '바뀐 것이 없으면 판을 올리지 않음');
r = await inv({ action: 'replaceAll', baseRevision: 2, payload: 'x' }); assert.strictEqual(r.ok, false);
r = await inv({ action: 'nope' }); assert.strictEqual(r.ok, false);
// 다른 기기(다른 연결)가 저장한 뒤 내 저장은 거부되고, 새로 불러오면 최신
const other = CS.gas('invoice', G.fn); // 같은 모듈이지만 판 상태를 새로 읽게 함
r = await other({ action: 'getAll' }); const db2 = r.payload; db2.cfg.defaults.pay = 'y';
r = await other({ action: 'replaceAll', baseRevision: 2, payload: db2 }); assert.strictEqual(r.revision, 3);
r = await inv({ action: 'replaceAll', baseRevision: 2, payload: db }); assert.deepStrictEqual([r.ok, r.conflict, r.revision], [false, true, 3]);
r = await inv({ action: 'getAll' }); assert.strictEqual(r.payload.cfg.defaults.pay, 'y'); assert.strictEqual(r.payload.docs.length, 2);
assert.strictEqual(G.calls, 1);

// 원재료·레시피·제품 출고 모양
await CS.save('raw', { orders: [{ id: 'o1', date: '2026-11-01' }] }, 0, {}); await CS.setActive('raw', true);
const raw = CS.gas('raw', async () => { throw new Error('구글 DB를 부르면 안 됨'); });
r = await raw({ action: 'getAll' }); assert.deepStrictEqual([r.ok, r.revision, r.count, r.orders.length], [true, 1, 1, 1]);
r = await raw({ action: 'replaceAll', baseRevision: 1, orders: [...r.orders, { id: 'o2', date: '2026-11-02' }] }); assert.deepStrictEqual([r.ok, r.revision, r.count], [true, 2, 2]);
await CS.save('recipe', { data: [{ id: 'r1', productName: '가' }] }, 0, {}); await CS.setActive('recipe', true);
const rec = CS.gas('recipe', async () => { throw new Error('x'); });
r = await rec({ action: 'replaceAll', baseRevision: 1, data: [{ id: 'r1', productName: '가' }, { id: 'r2', productName: '나', imageData: '옛 값은 버림' }] }); assert.strictEqual(r.ok, false, 'images 없이 저장하면 구글 DB처럼 거부');
r = await rec({ action: 'replaceAll', baseRevision: 1, data: [{ id: 'r1', productName: '가' }, { id: 'r2', productName: '나' }], images: [{ id: 'r2', data: 'data:image/png;base64,AAA' }, { id: 'r1', data: '' }] }); assert.deepStrictEqual([r.ok, r.count, r.images], [true, 2, 1]);
r = await rec({ action: 'getAll' }); assert.deepStrictEqual(r.data.map((x) => x.imageData), [undefined, 'data:image/png;base64,AAA'], '이미지는 구글 DB처럼 레시피에 붙어서 옴');
await CS.save('ms_inbound', { records: [], returns: [] }, 0, {}); await CS.setActive('ms_inbound', true);
r = await CS.gas('ms_inbound', async () => { throw new Error('x'); })({ action: 'getAll' }); assert.deepStrictEqual(Object.keys(r.data), ['records', 'returns']);
// 전환 끄기 → 다시 구글 DB
await CS.setActive('invoice', false); r = await inv({ action: 'getAll' }); assert.strictEqual(r.source, 'GAS'); assert.strictEqual(G.calls, 2);

// 서버에 못 닿으면(전환 여부를 모르면) 구글 DB로 넘기지 않고 멈춤
{
  const keep = globalThis.fetch; globalThis.fetch = async () => { throw new Error('offline'); }; await CS.flags(true).catch(() => {});
  let called = 0; await assert.rejects(() => CS.gas('price', async () => { called++; return {}; })({ action: 'getAll' })); assert.strictEqual(called, 0);
  globalThis.fetch = keep; await CS.flags(true);
}
// 옛 주소: 전환 안 된 메뉴는 구글 DB 그대로, 전환이 끝난(MOVED) 메뉴는 막음
{
  delete globalThis.BAROGA_CLOUD_API; globalThis.location = { hostname: 'kuzo-shin.github.io', protocol: 'https:' };
  let called = 0; r = await CS.gas('price', async () => { called++; return { ok: true }; })({ action: 'getAll' }); assert.strictEqual(called, 1);
  CS.MOVED.push('invoice'); await assert.rejects(() => CS.gas('invoice', async () => { called++; return {}; })({ action: 'getAll' }), /새 주소/); assert.strictEqual(called, 1); CS.MOVED.pop();
}
console.log('cutover.test: 모두 통과');
