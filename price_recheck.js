// [VERSION: price_recheck.js v1.0 - 2026-11-27 신규: 원재료 단가 비교 '후보 가격 재확인' 계산 (크롬 경유 방식)]
// ============================================================================
// 원재료 단가 비교 — 후보 가격 재확인 계산 (window.PriceRecheck, node 시험에서도 씀)
//  흐름 (스킬 baroga-price-recheck)
//   1. 새 주소 화면에서 targets(자료, 30) → 확인할 후보 목록(품목코드·후보 번호·업체·주소·기록가)만 꺼냄
//   2. Claude 가 상품 페이지를 읽고 결과 목록을 만듦: { code, ri, url, price(읽은 가격|null), status('판매중'|'품절'|'판매종료'|null), judge }
//   3. 화면에서 apply(자료, 결과) → 바뀐 자료를 만들어 [자료 가져오기] 확인 창으로 보여 줌. 저장은 사람이 [DB에 저장]을 눌러야 함
//  계산 규칙은 예전 스킬과 같음
//   · 같은 가격 → confirm / 차이 ±15% 이내 → apply(가격·kg당 단가·차액 다시 계산) / 15% 초과 → review(값 그대로) / 못 읽음 → none
//   · 품절·판매종료 → 재고 칸 '품절(MM-DD 재확인)', 등급 X / 판매중 → '판매중(MM-DD 재확인)', 확인 시각
//   · 품목 안 순위·등급, 품목 요약(1순위), 절감 순위, 합계를 다시 계산
//   · 단, 바꾸기 전 자료에 같은 계산을 해 봤을 때 원래 값이 그대로 나오지 않는 칸은 계산하지 않고 원래 값을 둠(kept 로 알림)
// ============================================================================
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.PriceRecheck = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const AUTO_PCT = 15;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const r1 = (v) => Math.round(v * 10) / 10;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const KEEP_GRADE = new Set(['Q', 'Q★', 'N']); // 가격 없는 후보의 등급(견적 필요·가격 미공개)은 그대로

  // ---------- 1. 확인할 후보 ----------
  function targets(doc, maxPri) {
    const lim = isNum(maxPri) ? maxPri : 30;
    return (doc.items || []).filter((it) => isNum(it.priRank) && it.priRank <= lim).sort((a, b) => a.priRank - b.priRank).map((it) => ({
      code: it.code, name: it.name, priRank: it.priRank, curKg: it.curKg, monthlyKg: it.monthlyKg,
      rows: (it.rows || []).map((r, ri) => ({ ri, vendor: r.vendor, url: r.url || '', price: r.price, pack: r.pack || '', unit: r.unit || '', rank: r.rank == null ? null : r.rank, grade: r.grade || '', stock: r.stock || '' }))
        .filter((r) => r.url && /^https?:\/\//i.test(r.url) && isNum(r.price)),
    })).filter((it) => it.rows.length);
  }

  // ---------- 다시 계산 (자료를 그 자리에서 고침) ----------
  const rankable = (r) => isNum(r.price) && isNum(r.wkg) && r.grade !== 'X' && !KEEP_GRADE.has(r.grade);
  function gradeOf(r) {
    if (r.grade === 'X' || KEEP_GRADE.has(r.grade) || !isNum(r.price) || !isNum(r.m12)) return r.grade;
    if (r.m12 <= -500000 && (r.same === '동일' || r.same === '유사')) return 'A';
    if (r.m12 <= -100000) return 'B';
    if (r.m12 < 0) return 'C';
    return '-';
  }
  const GROUPS = ['row.grade', 'row.rank', 'item.nA', 'item.nB', 'item.bestDiff', 'item.bestVendor', 'item.bestM12', 'item.realSave', 'item.meritRank', 'sum.merit', 'sum.sumM12', 'sum.sumM1', 'sum.A', 'sum.B'];
  function recompute(doc, skip) {
    const on = (g) => !skip || !skip.has(g);
    (doc.items || []).forEach((it) => {
      const rows = it.rows || [];
      if (on('row.grade')) rows.forEach((r) => { r.grade = gradeOf(r); });
      if (on('row.rank')) {
        rows.forEach((r) => { if (!rankable(r)) r.rank = null; });
        rows.filter(rankable).sort((a, b) => a.wkg - b.wkg).forEach((r, i) => { r.rank = i + 1; });
      }
      const best = rows.find((r) => r.rank === 1);
      if (on('item.nA')) it.nA = rows.filter((r) => r.grade === 'A').length;
      if (on('item.nB')) it.nB = rows.filter((r) => r.grade === 'B').length;
      if (best) {
        if (on('item.bestDiff')) it.bestDiff = best.diff;
        if (on('item.bestVendor')) it.bestVendor = best.vendor;
        if (on('item.bestM12')) it.bestM12 = best.m12;
        if (on('item.realSave')) it.realSave = isNum(best.m12) && best.m12 < 0 ? -best.m12 : 0;
      }
    });
    if (on('item.meritRank')) {
      (doc.items || []).forEach((it) => { it.meritRank = null; });
      (doc.items || []).filter((it) => isNum(it.realSave) && it.realSave > 0).sort((a, b) => b.realSave - a.realSave).forEach((it, i) => { it.meritRank = i + 1; });
    }
    const s = doc.sum || (doc.sum = {}), merit = (doc.items || []).filter((it) => isNum(it.realSave) && it.realSave > 0);
    const sumM12 = merit.reduce((a, it) => a + it.realSave, 0);
    if (on('sum.merit')) s.merit = merit.length;
    if (on('sum.sumM12')) s.sumM12 = sumM12;
    if (on('sum.sumM1')) s.sumM1 = Math.round(s.sumM12 / 12);
    if (on('sum.A')) s.A = (doc.items || []).reduce((a, it) => a + (it.rows || []).filter((r) => r.grade === 'A').length, 0);
    if (on('sum.B')) s.B = (doc.items || []).reduce((a, it) => a + (it.rows || []).filter((r) => r.grade === 'B').length, 0);
    return doc;
  }
  // 바꾸기 전 자료에 계산을 해 봤을 때 원래 값과 다른 칸 묶음 → 이번에는 계산하지 않음
  function verify(doc) {
    const bad = new Set(), detail = {};
    GROUPS.forEach((g) => {
      const t = recompute(clone(doc), new Set(GROUPS.filter((x) => x !== g && !(g === 'row.rank' && x === 'row.grade')))); // 순위는 등급(X)에 따라 달라지므로 등급 계산을 함께 둠
      const [lv, key] = g.split('.'), miss = [];
      if (lv === 'sum') { if (JSON.stringify(t.sum[key]) !== JSON.stringify((doc.sum || {})[key])) miss.push(`${(doc.sum || {})[key]} → ${t.sum[key]}`); }
      else (doc.items || []).forEach((it, ii) => {
        if (lv === 'item') { const a = it[key] === undefined ? null : it[key], b = t.items[ii][key] === undefined ? null : t.items[ii][key]; if (JSON.stringify(a) !== JSON.stringify(b)) miss.push(`${it.code} ${a} → ${b}`); }
        else (it.rows || []).forEach((r, ri) => { const a = r[key] === undefined ? null : r[key], b = t.items[ii].rows[ri][key] === undefined ? null : t.items[ii].rows[ri][key]; if (JSON.stringify(a) !== JSON.stringify(b)) miss.push(`${it.code}#${ri} ${a} → ${b}`); });
      });
      if (miss.length) { bad.add(g); detail[g] = { count: miss.length, examples: miss.slice(0, 5) }; }
    });
    return { bad, detail };
  }

  // ---------- 2. 결과 반영 ----------
  // results: [{ code, ri, url, price, status, judge }], opt: { now: Date, scope: '우선순위 상위 30품목' }
  function apply(before, results, opt) {
    opt = opt || {};
    const now = opt.now ? new Date(opt.now) : new Date(), k = new Date(now.getTime() + 9 * 3600000).toISOString();
    const date = k.slice(0, 10), stamp = `${date} ${k.slice(11, 16)} KST`, md = k.slice(5, 10);
    const v = verify(before), doc = clone(before), byCode = {};
    doc.items.forEach((it) => { byCode[it.code] = it; });
    const rank0 = {}, vend0 = {};
    doc.items.forEach((it) => { rank0[it.code] = (it.rows || []).map((r) => r.rank == null ? null : r.rank); vend0[it.code] = it.bestVendor; });
    const lines = [], seen = new Set(); let stockN = 0;
    (results || []).forEach((x) => {
      const it = byCode[x.code]; if (!it) throw new Error(`없는 품목 코드: ${x.code}`);
      const r = (it.rows || [])[x.ri]; if (!r) throw new Error(`없는 후보: ${x.code} #${x.ri}`);
      if ((r.url || '') !== (x.url || '')) throw new Error(`후보 주소가 다릅니다: ${x.code} #${x.ri} (${r.vendor})`);
      const key = x.code + '#' + x.ri; if (seen.has(key)) throw new Error(`같은 후보가 두 번 있습니다: ${key}`); seen.add(key);
      const old = r.price, wkg0 = r.wkg, np = isNum(x.price) ? x.price : null;
      const sold = x.status === '품절' || x.status === '판매종료', selling = x.status === '판매중';
      let act = 'none', pct = null;
      if (sold) {
        r.stock = `품절(${md} 재확인)`; r.grade = 'X'; stockN++;
      } else if (np != null && isNum(old) && old > 0) {
        pct = r1((np - old) / old * 100);
        if (np === old) act = 'confirm';
        else if (Math.abs(pct) <= AUTO_PCT) {
          act = 'apply';
          r.price = np;
          if (isNum(wkg0)) r.wkg = Math.round(wkg0 * np / old);
          if (isNum(r.wkg) && isNum(it.curKg) && it.curKg) { r.diff = r.wkg - it.curKg; r.pct = r1(r.diff / it.curKg * 100); }
          if (isNum(r.diff) && isNum(it.monthlyKg)) { r.m1 = Math.round(r.diff * it.monthlyKg); r.m3 = r.m1 * 3; r.m6 = r.m1 * 6; r.m12 = r.m1 * 12; }
        } else act = 'review';
        if (selling) {
          if (r.grade === 'X') r.grade = '-'; // 다시 판매중이면 등급을 새로 매김(아래 다시 계산)
          r.stock = `판매중(${md} 재확인)`; r.at = stamp; stockN++;
        }
      } else if (selling) { r.stock = `판매중(${md} 재확인)`; r.at = stamp; stockN++; }
      lines.push({ it, r, x, act, old, np, pct, wkg0, sold, selling });
    });
    recompute(doc, v.bad);
    let touched = 0, vchg = 0;
    doc.items.forEach((it) => {
      const now1 = (it.rows || []).map((r) => r.rank == null ? null : r.rank);
      if (JSON.stringify(now1) !== JSON.stringify(rank0[it.code])) touched++;
      if (it.bestVendor !== vend0[it.code]) vchg++;
    });
    doc.recheck = lines.map(({ it, r, x, act, old, np, pct, wkg0, sold, selling }) => ({
      act, code: it.code, name: it.name, vendor: r.vendor, old, new: np, pct, src: 'WebFetch 표시가',
      avail: sold ? '품절' : selling ? '판매중' : '확인불가', stock: r.stock, judge: String(x.judge || ''),
      wkg0, wkg1: r.wkg, r0: rank0[it.code][x.ri], r1: r.rank == null ? null : r.rank, url: r.url, at: stamp,
    }));
    const prevRe = (before.sum && before.sum.recheck) || {};
    doc.sum.recheck = { stamp, date, sheet: '', stock: stockN, touched, vchg, autoPct: AUTO_PCT, schedule: prevRe.schedule || '' };
    doc.source = Object.assign({}, doc.source, { sub: `후보 가격 ${date} 재확인(${opt.scope || '우선순위 상위 30품목'}) · 사용량·현재 단가는 기존 기준 유지`, file: `재확인 ${date}` });
    const count = (a) => a.reduce((m, l) => (m[l.act] = (m[l.act] || 0) + 1, m), {});
    const report = {
      stamp, checked: lines.length, acts: count(lines), stockUpdated: stockN, touched, vchg,
      kept: [...v.bad], keptDetail: v.detail,
      bigMoves: lines.filter((l) => l.pct != null && l.act !== 'confirm').sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 5).map((l) => ({ code: l.it.code, name: l.it.name, vendor: l.r.vendor, old: l.old, new: l.np, pct: l.pct, act: l.act })),
      review: lines.filter((l) => l.act === 'review').map((l) => ({ code: l.it.code, name: l.it.name, vendor: l.r.vendor, old: l.old, new: l.np, pct: l.pct, judge: l.x.judge || '' })),
      newSoldOut: lines.filter((l) => l.sold).map((l) => ({ code: l.it.code, name: l.it.name, vendor: l.r.vendor })),
      vendorChanged: doc.items.filter((it) => it.bestVendor !== vend0[it.code]).map((it) => ({ code: it.code, name: it.name, from: vend0[it.code], to: it.bestVendor })),
    };
    return { doc, report };
  }

  return { targets, apply, verify, recompute, GROUPS, AUTO_PCT };
});
