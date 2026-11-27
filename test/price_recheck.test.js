// node test/price_recheck.test.js — 가짜 자료로 재확인 계산 규칙 확인 (실자료 아님)
const assert = require('assert');
const PR = require('../price_recheck.js');
const row = (vendor, price, wkg, extra) => Object.assign({ vendor, price, wkg, url: 'https://ex.com/' + vendor, same: '동일', stock: '판매중', grade: '', rank: null }, extra || {});
function mk() {
  const it = { code: 'P1', name: '버터', curKg: 10000, monthlyKg: 100, priRank: 1, rows: [row('a', 9000, 9000), row('b', 9700, 9700), row('c', 12000, 12000), row('q', null, null, { grade: 'Q', url: '' })] };
  const it2 = { code: 'P2', name: '밀가루', curKg: 2000, monthlyKg: 0, priRank: 2, rows: [row('d', 1800, 1800)] };
  const doc = { items: [it, it2], sum: { recheck: { schedule: '매주' } }, recheck: [], source: { title: 't' } };
  [it, it2].forEach((x) => x.rows.forEach((r) => { if (r.price != null) { r.diff = r.wkg - x.curKg; r.pct = Math.round(r.diff / x.curKg * 1000) / 10; r.m1 = Math.round(r.diff * x.monthlyKg); r.m3 = r.m1 * 3; r.m6 = r.m1 * 6; r.m12 = r.m1 * 12; } }));
  PR.recompute(doc); // 처음 상태를 규칙대로 맞춰 둠
  return doc;
}
const d0 = mk();
assert.deepStrictEqual(d0.items[0].rows.map((r) => r.rank), [1, 2, 3, null]);
assert.deepStrictEqual(d0.items[0].rows.map((r) => r.grade), ['A', 'B', '-', 'Q']);
assert.strictEqual(d0.items[1].rows[0].grade, 'C'); // 월 사용량 0, kg당 더 쌈
assert.strictEqual(d0.items[0].bestM12, 1200000); assert.strictEqual(d0.sum.sumM12, 1200000);
assert.deepStrictEqual(Object.keys(PR.verify(d0).skip), []);
const t = PR.targets(d0, 30);
assert.strictEqual(t.length, 2); assert.strictEqual(t[0].rows.length, 3);
const before = JSON.stringify(d0);
const { doc, report } = PR.apply(d0, [
  { code: 'P1', ri: 0, url: 'https://ex.com/a', price: 9900, status: '판매중' },   // +10% → apply, 순위 바뀜
  { code: 'P1', ri: 1, url: 'https://ex.com/b', price: 9700, status: '판매중' },   // 같음 → confirm
  { code: 'P1', ri: 2, url: 'https://ex.com/c', price: 20000, status: '판매중', judge: '용량 다름' }, // +66% → review
  { code: 'P2', ri: 0, url: 'https://ex.com/d', price: null, status: '품절' },       // 품절
], { now: '2026-11-27T01:00:00Z' });
assert.strictEqual(JSON.stringify(d0), before, '원본 자료는 바뀌지 않아야 함');
const r = doc.items[0].rows;
assert.strictEqual(r[0].price, 9900); assert.strictEqual(r[0].wkg, 9900); assert.strictEqual(r[0].diff, -100); assert.strictEqual(r[0].m12, -120000);
assert.deepStrictEqual(r.map((x) => x.rank), [2, 1, 3, null]);
assert.strictEqual(r[2].price, 12000);
assert.strictEqual(doc.items[0].bestVendor, 'b'); assert.strictEqual(doc.items[0].bestM12, 360000);
assert.strictEqual(doc.items[1].rows[0].grade, 'X'); assert.strictEqual(doc.items[1].rows[0].rank, null); assert.strictEqual(doc.items[1].rows[0].stock, '품절(11-27 재확인)');
assert.strictEqual(r[1].stock, '판매중(11-27 재확인)'); assert.strictEqual(r[1].at, '2026-11-27 10:00 KST');
assert.deepStrictEqual(report.acts, { apply: 1, confirm: 1, review: 1, none: 1 });
assert.strictEqual(report.vchg, 1); assert.strictEqual(doc.sum.recheck.schedule, '매주'); assert.strictEqual(doc.recheck.length, 4);
assert.strictEqual(doc.recheck[0].r0, 1); assert.strictEqual(doc.recheck[0].r1, 2);
assert.throws(() => PR.apply(d0, [{ code: 'P1', ri: 0, url: 'https://ex.com/zz', price: 1 }]), /주소가 다릅니다/);
// 원래 값이 규칙과 다른 칸은 그대로 둠
const d1 = mk(); d1.items[0].realSave = 0; // 사람이 일부러 0 으로 둔 경우
const v = PR.verify(d1); assert.ok(v.skip['item.realSave'].has('P1'));
const o = PR.apply(d1, [{ code: 'P1', ri: 1, url: 'https://ex.com/b', price: 9700, status: '판매중' }]);
assert.strictEqual(o.doc.items[0].realSave, 0); assert.ok(o.report.kept.includes('item.realSave'));
console.log('price_recheck.test: 모두 통과');
