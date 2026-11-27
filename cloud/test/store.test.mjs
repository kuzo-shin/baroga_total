// 자료 보관소 시험: 나누기·합치기(cloud_store.js) + 서버(cloud/src/store.js). 모두 가짜 자료.  실행: node test/store.test.mjs
import assert from 'node:assert';
import { createRequire } from 'node:module';
import worker from '../src/index.js';
import { makeD1 } from './d1mock.mjs';
const require = createRequire(import.meta.url);
const CS = require('../../cloud_store.js');

// ---------- 나누기·합치기: 원본과 글자 그대로 같아야 함 ----------
const round = (domain, doc) => { const text = JSON.stringify(doc), s = CS.split(domain, JSON.parse(text)); assert.strictEqual(JSON.stringify(CS.join(domain, s)), text, domain + ' 왕복'); return s; };
{
  // 생산일지: 날짜별 → 달마다. 순서가 뒤섞여 있어도, 날짜가 아닌 키가 있어도 그대로
  const prod = { version: 3, days: { '2026-11-02': { a: 1 }, '2026-10-30': { a: 2 }, '2026-11-03': { a: 3 }, memo: 'x' }, semiItems: [], stockBase: null, crew: {}, pack: { '2026-11-02': [1, 2] }, scrap: { '2026-09-01': {} }, updatedAt: '2026-11-27' };
  const s = round('production', prod);
  assert.deepStrictEqual(Object.keys(s).filter((k) => k.startsWith('p:days:')).sort(), ['p:days:2026-10', 'p:days:2026-11', 'p:days:_']);
  assert.ok(JSON.parse(s._manifest).parts.days.keys, '달끼리 이어지지 않으면 날짜 순서를 통째로 적음');
  const sorted = round('production', { days: { '2026-10-01': 1, '2026-10-02': 2, '2026-11-01': 3 } });
  assert.strictEqual(JSON.parse(sorted._manifest).parts.days.keys, undefined, '달끼리 이어지면 달 순서만');
  round('production', { days: [], crew: null, pack: 'x' }); // 모양이 다르면 통째로
  round('production', {});
}
{
  // 원재료: 줄 순서가 달과 상관없이 섞여 있어도 원래 순서 그대로
  const orders = []; const months = ['2026-11', '2026-10', '', '2026-11', '2025-12', '2026-10', 'bad'];
  for (let i = 0; i < 200; i++) orders.push({ id: 'r' + i, date: months[i % months.length] ? months[i % months.length] + '-' + String((i % 27) + 1).padStart(2, '0') : '', colA: '품목 "' + i + '"', amount: i * 1.5, colE: i % 3 ? null : { n: [i] } });
  const s = round('raw', { orders });
  assert.ok(Object.keys(s).includes('p:orders:_') && Object.keys(s).includes('p:orders:2025-12'));
  round('raw', { orders: [] }); round('raw', { orders: [1, 2] });
  // 한 달이 너무 크면 그 달만 날짜별 조각으로
  const bigM = []; for (let i = 0; i < 900; i++) bigM.push({ id: 'x' + i, date: i % 50 === 0 ? '2026-11' : '2026-11-' + String((i % 28) + 1).padStart(2, '0'), colE: 'y'.repeat(400) });
  for (let i = 0; i < 30; i++) bigM.splice(i * 7, 0, { id: 'o' + i, date: '2026-10-' + String((i % 28) + 1).padStart(2, '0') });
  const sb = round('raw', { orders: bigM }), kb = Object.keys(sb);
  assert.ok(kb.includes('p:orders:2026-10') && kb.includes('p:orders:2026-11-05') && kb.includes('p:orders:2026-11-_') && !kb.includes('p:orders:2026-11'), '큰 달만 날짜별');
  assert.ok(Math.max(...kb.map((k) => sb[k].length)) < 300000);
  const oneDay = []; for (let i = 0; i < 2000; i++) oneDay.push({ id: 'd' + i, date: '2026-11-04', colE: 'z'.repeat(450) });
  const so = round('raw', { orders: oneDay.concat([{ id: 'e', date: '2026-11-05' }], oneDay.slice(0, 3)) }), ko = Object.keys(so);
  assert.ok(ko.includes('p:orders:2026-11-04#0') && ko.includes('p:orders:2026-11-04#3') && ko.includes('p:orders:2026-11-05'), '하루가 크면 #n 으로 더 나눔');
  assert.ok(Math.max(...ko.map((k) => so[k].length)) < 310000);
}
{
  // 레시피: 품목마다. id 가 겹치거나 비면 통째로
  const data = [{ id: 'a1', productCode: '1001', ingredientsJson: '[{"n":"버터"}]' }, { id: 'b2', productCode: '1002', x: [1, { y: 'ㅎ' }] }];
  const s = round('recipe', { data }); assert.ok(s['p:data:a1'] && s['p:data:b2']);
  const dup = round('recipe', { data: [{ id: 'a' }, { id: 'a' }] }); assert.ok(dup['k:data']);
  const noid = round('recipe', { data: [{ id: '' }, { name: 1 }] }); assert.ok(noid['k:data']);
}
{
  round('ms_stock', { v: 2, asOf: '2026-11-24 16:21', hist: { '2026-11': { rows: [[1, 0, 0, 2, 0]] }, '2024-12': { rows: [] } }, orders: [[1, 2]], cfg: { own: { 157794: true, 99: false } } });
  round('price', { settings: { a: 1 }, categoryDbs: { 파이: [{ c: 1 }], '알생지': [] }, pkCostRows: [], msUpdatedDate: '' });
  round('invoice', { v: 1, docs: [{ id: 'x' }], cfg: { defaults: {} } });
  round('ms_inbound', { records: [], returns: [], unitPrices: {}, recipeLinks: {}, updatedAt: '' });
  round('price_compare', { items: [{ a: 1 }], hand: 'x', sum: {} });
  assert.throws(() => CS.split('nope', {}));
  assert.throws(() => CS.join('raw', { _manifest: JSON.stringify({ v: 1, top: ['orders'], parts: { orders: { type: 'arrayByMonth', runs: [['2026-11', 2]] } } }), 'p:orders:2026-11': '[{"id":1}]' }), /개수가 맞지 않습니다/, '조각이 모자라면 오류');
  assert.throws(() => CS.join('raw', { _manifest: JSON.stringify({ v: 1, top: ['orders'], parts: {} }) }), /찾을 수 없습니다/);
  { const c = CS.splitChecked('raw', { orders: [], f: () => 1, n: NaN, u: undefined }); assert.strictEqual(c.text, '{"orders":[],"n":null}', '함수·undefined 는 빠지고 NaN 은 null (구글 DB에 저장할 때와 같음)'); }
  const d = CS.diff({ a: '1', b: '2', c: '3' }, { a: '1', b: '9', d: '4' }); assert.deepStrictEqual([Object.keys(d.put).sort(), d.del], [['b', 'd'], ['c']]);
}

// ---------- 서버 ----------
const store = new Map();
const PHOTOS = { put: async (k, v) => { store.set(k, v); }, get: async (k) => (store.has(k) ? { body: store.get(k) } : null), delete: async () => {}, list: async ({ prefix }) => ({ objects: [...store.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k, size: store.get(k).length, uploaded: new Date() })) }) };
const DB = makeD1(), env = { DB, PHOTOS, DEV_EMAIL: 'boss@example.com' };
const call = async (method, path, body, e) => { DB.reset(); const res = await worker.fetch(new Request('http://localhost' + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) }), e || env); const j = await res.json(); assert.ok(DB.queries <= 50, `${method} ${path}: 쿼리 ${DB.queries}개`); return { status: res.status, j, q: DB.queries }; };

let r = await call('GET', '/api/store/production'); assert.deepStrictEqual([r.j.rev, r.j.empty], [0, true]);
r = await call('GET', '/api/store/nope'); assert.strictEqual(r.status, 404);
r = await call('PUT', '/api/store/production', { baseRev: 0, put: {} }); assert.strictEqual(r.status, 400);
r = await call('PUT', '/api/store/production', { baseRev: 0, put: { a: 'not json{' } }); assert.strictEqual(r.status, 400);
r = await call('PUT', '/api/store/production', { baseRev: 0, put: { a: { x: 1 } } }); assert.strictEqual(r.status, 400, '조각은 글자여야 함');
r = await call('PUT', '/api/store/production', { baseRev: 3, put: { a: '1' } }); assert.strictEqual(r.status, 409);
r = await call('PUT', '/api/store/production', { baseRev: 0, put: { 'k:big': JSON.stringify('x'.repeat(1500001)) } }); assert.strictEqual(r.status, 413);

// 실제 흐름: 나눠서 올리고 → 읽어서 합침
const docV1 = { version: 1, days: { '2026-10-30': { t: 1 }, '2026-11-02': { t: 2 }, '2026-11-03': { t: 3 } }, crew: { '2026-11-02': ['가'] }, pack: {}, scrap: {}, updatedAt: 'a' };
const s1 = CS.splitChecked('production', docV1);
r = await call('PUT', '/api/store/production', { baseRev: 0, put: s1.sections, note: '첫 저장' }); assert.ok(r.j.ok, JSON.stringify(r.j)); assert.strictEqual(r.j.rev, 1);
r = await call('GET', '/api/store/production'); assert.strictEqual(JSON.stringify(CS.join('production', r.j.sections)), s1.text); assert.strictEqual(r.j.updatedBy, 'boss@example.com');
// 11월 하루만 고침 → 그 달 조각과 목록만 올라감
const docV2 = JSON.parse(s1.text); docV2.days['2026-11-03'].t = 33; docV2.days['2026-11-04'] = { t: 4 }; docV2.updatedAt = 'b';
const s2 = CS.splitChecked('production', docV2), d2 = CS.diff(s1.sections, s2.sections);
assert.deepStrictEqual(Object.keys(d2.put).sort(), ['_manifest', 'k:updatedAt', 'p:days:2026-11'].sort().filter((k) => k !== '_manifest' || s1.sections._manifest !== s2.sections._manifest));
r = await call('PUT', '/api/store/production', { baseRev: 0, put: d2.put, del: d2.del }); assert.strictEqual(r.status, 409, '옛 판으로는 저장 못 함'); assert.strictEqual(r.j.rev, 1);
r = await call('PUT', '/api/store/production', { baseRev: 1, put: d2.put, del: d2.del }); assert.ok(r.j.ok); assert.strictEqual(r.j.rev, 2);
// 10월 기록을 지움 → 조각 삭제
const docV3 = JSON.parse(s2.text); delete docV3.days['2026-10-30'];
const s3 = CS.splitChecked('production', docV3), d3 = CS.diff(s2.sections, s3.sections); assert.deepStrictEqual(d3.del, ['p:days:2026-10']);
r = await call('PUT', '/api/store/production', { baseRev: 2, put: d3.put, del: d3.del }); assert.ok(r.j.ok); assert.strictEqual(r.j.rev, 3);
r = await call('GET', '/api/store/production'); assert.strictEqual(JSON.stringify(CS.join('production', r.j.sections)), s3.text);
// 지난 판으로 되돌려 읽기: 1판·2판·3판이 각각 그때 모습과 글자 그대로 같음
for (const [rev, s] of [[1, s1], [2, s2], [3, s3]]) { r = await call('GET', '/api/store/production?rev=' + rev); assert.strictEqual(JSON.stringify(CS.join('production', r.j.sections)), s.text, rev + '판 되돌려 읽기'); }
r = await call('GET', '/api/store/production?rev=9'); assert.strictEqual(r.status, 400);
// 지웠던 조각을 다시 넣어도 판마다 맞게 읽힘
r = await call('PUT', '/api/store/production', { baseRev: 3, put: CS.diff(s3.sections, s1.sections).put, del: CS.diff(s3.sections, s1.sections).del }); assert.strictEqual(r.j.rev, 4);
r = await call('GET', '/api/store/production?rev=3'); assert.strictEqual(JSON.stringify(CS.join('production', r.j.sections)), s3.text);
r = await call('GET', '/api/store/production'); assert.strictEqual(JSON.stringify(CS.join('production', r.j.sections)), s1.text);

// 동시에 저장: 둘 다 같은 판에서 출발하면 하나만 들어감
{
  const mk = (v) => worker.fetch(new Request('http://localhost/api/store/invoice', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseRev: 0, put: { 'k:v': String(v) } }) }), env).then((x) => x.json());
  const [a, b] = await Promise.all([mk(1), mk(2)]);
  assert.strictEqual([a, b].filter((x) => x.ok).length, 1, '하나만 성공'); assert.strictEqual([a, b].filter((x) => x.conflict).length, 1);
  r = await call('GET', '/api/store/invoice'); assert.strictEqual(r.j.rev, 1); assert.strictEqual(r.j.sections['k:v'], String(a.ok ? 1 : 2));
}

// 조각이 많아도(레시피 150개) 쿼리 50개 안
{
  const data = []; for (let i = 0; i < 148; i++) data.push({ id: 'r' + i, productName: '품목' + i, ingredientsJson: 'x'.repeat(3000) });
  const s = CS.splitChecked('recipe', { data });
  r = await call('PUT', '/api/store/recipe', { baseRev: 0, put: s.sections }); assert.ok(r.j.ok, JSON.stringify(r.j)); assert.ok(r.q <= 20, '쿼리 ' + r.q);
  data.forEach((x) => { x.productName += '!'; }); const sB = CS.splitChecked('recipe', { data });
  r = await call('PUT', '/api/store/recipe', { baseRev: 1, put: CS.diff(s.sections, sB.sections).put }); assert.ok(r.j.ok); assert.ok(r.q <= 20, '쿼리 ' + r.q);
  r = await call('GET', '/api/store/recipe'); assert.strictEqual(JSON.stringify(CS.join('recipe', r.j.sections)), sB.text);
  r = await call('GET', '/api/store/recipe?rev=1'); assert.strictEqual(JSON.stringify(CS.join('recipe', r.j.sections)), s.text);
  r = await call('PUT', '/api/store/recipe', { baseRev: 2, put: Object.fromEntries(Array.from({ length: 151 }, (_, i) => ['x' + i, '1'])) }); assert.strictEqual(r.status, 400, '한 번에 150개까지');
}

// 목록·백업
r = await call('GET', '/api/store'); assert.deepStrictEqual(r.j.domains.map((d) => [d.domain, d.rev]), [['invoice', 1], ['production', 4], ['recipe', 2]]); assert.ok(r.j.domains[2].bytes > 400000);
r = await call('PUT', '/api/backup/raw', JSON.stringify({ ok: true, orders: [1] })); assert.ok(r.j.ok); assert.ok(r.j.key.startsWith('backup/gas/raw/'));
r = await call('PUT', '/api/backup/raw', 'not json'); assert.strictEqual(r.status, 400);
r = await call('GET', '/api/backup/raw'); assert.strictEqual(r.j.backups.length, 1);
r = await call('GET', '/api/store/raw', undefined, { DB, PHOTOS, ACCESS_TEAM_DOMAIN: 't.cloudflareaccess.com', ACCESS_AUD: 'x' }); assert.strictEqual(r.status, 401, '로그인 필요');
console.log('store.test: 모두 통과');
