// 옛 프로그램 입고내역 → 원재료 DB 이관 (1회용). 계획(plan)만 만들고, apply는 별도 호출
// 사용자 결정 (2026-11-21): 10~11월은 옛 프로그램 기록으로 교체 · 1~9월도 재고로 추가 · 품목명은 옛 프로그램 기준
//   · 옛 프로그램에 없는 10~11월 사이트 기록은 남김(비고 표시) · 밤다이스 7.5kg 등 사이트 규격으로 통일 · 개수 단위
(function () {
  const DB_NAME_TO_CODE = {"밤다이스(서울)":500091,"하이론델)고당냉동이스트":500113,"생이스트/국산(제니코)":500112,"행주(1묶음=10장)(30*46)":800050,"낙우밀":500042,"아이엠에그난황액":500034,"아이엠에그난백액":500035,"전란":500036,"리오퐁":800072,"고급강력분":500138,"플래차드 드라이 버터":500168,"리치스올리브슬라이스":500090,"*대한제분-중력1등급":500015,"*강력통밀가루(中)강력제빵용":500018,"호밀가루(꼬미다)":500019,"콤플릿크라프트":500189,"트리몰린(제원)":500062,"*미국산)호두분태벌크A급":500085,"몰트엑기스":500059,"매일)바리스타":500037,"유기농강력제빵용(맥선)":500017,"레스큐어":500045,"*레스큐어크림35.1%":500045,"GMP T45":500166,"GMP 트레디션T65":500013,"로건픽스":500022,"트레할로스(삼양사)":500057,"트레할로스":500057,"선인)프레첼블렌드(프랑스)":500119,"*백설)정백당(흰설탕)  50포":500152,"★스페인산)엑스트라버진올리브유":500154,"사과다이스(설정)_국산":500092,"칼리바우트 초콜릿 스틱":500191,"두꺼운 노루지(450*600)":800014,"소프트-T(대두)":500025,"소프트-C":500026,"소프트202":500118,"사양벌꿀":500139,"성림)계피분":500129,"건조무화과다이스(1b=12ea)":500175,"베이커리롤치즈(서울)":500054,"*본식용유":500080,"롤백(30*40cm/500매)":800019,"랩500*500":800021,"오징어먹물":500126,"에스500키모":500117,"코인트로 40%":500132,"마가린(오뚜기브레드2000)":500199,"대두완두배기":500075,"대두팥배기":500074,"*큐원)물엿":500068,"볶음땅콩분태":500201,"호박씨":500200,"해바라기씨":500203,"고구마다이스(껍질X)":500202,"호밀가루997(베이크)":500020,"앵커버터":500029,"하이론델)저당냉동이스트":500205,"유통기한스티커":800082,"에멘탈치즈(가는슈레드)":500051,"라스카스크림치즈(제니코)":500049,"엑스트라다크코코아파우더":500104,"초코칩다크카카오트레이스":500103,"케레스빈야드루즈(와인)":500135,"사워크림LP":500056,"제뉘베르데":500023,"(오뚜기)콤비쇼팅":500033,"양조식초":500078,"레몬":500098,"백설꽃소금":500176,"포리쉐 T45":500159,"포리쉐 T65":500179,"포장비닐 0.05*40*50":800004,"롤재단 4*60*45(200매)":800071,
    // 레시피에만 쓰인 이름
    "하얀설탕(백설)":500152,"전란액(살균)":500036,"냉동이스트(고당)":500113,"T45(포리쉐)":500159};
  const VENDOR = {"웰푸드":"㈜웰푸드시스템","엠즈푸드시스템":"엠즈푸드시스템㈜","베이크플러스":"(주)베이크플러스","알토리":"농업회사법인주식회사 알토리"};
  const SITE_ONLY_NOTE = '사이트에만 있던 기록(옛 프로그램 없음)';
  const day = (s) => Math.round(new Date(s + 'T00:00:00Z').getTime() / 86400000);

  function buildPlan(legacyOrders, orders, recipes, parseSpec) {
    const L = legacyOrders.map(o => ({ ...o }));
    // 레스큐어: 박스(12개) 단가로 적힌 줄 → 1L 단위 (11-20: 4박스=48개, 11-12: 사용자 확인 60개)
    L.forEach(o => {
      if (String(o.itemCode) !== '500045' || !(o.legacyPrice >= 50000)) return;
      const unit = Math.round(98660 / 12);
      if (o.date === '2026-11-12' && o.colD === 60) { o.amount = unit; o.taxType = '과세'; o.fix = '레스큐어 60개(사용자 확인), 단가 박스가 98,660÷12'; }
      else { o.fix = `레스큐어 ${o.colD}박스 → ${o.colD * 12}개, 단가 ÷12`; o.colD = o.colD * 12; o.remainQty = o.colD; o.amount = unit; }
    });
    const master = {};
    L.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(o => { master[o.itemCode] = { name: o.colB, spec: o.colC, vendor: o.colA }; });
    const codeOf = (name) => DB_NAME_TO_CODE[String(name || '').trim()] || null;

    const remove = [], keep = [], matchedPairs = [];
    const octNov = [];
    orders.forEach((o, idx) => {
      const code = codeOf(o.colB);
      if (o.date >= '2026-10-01') { if (code) octNov.push({ o, idx, code: String(code) }); else keep.push({ o, code: null, why: 'A' }); return; }
      // 10월 이전 사이트 기록: 옛 프로그램과 같은 날·같은 수량이면 중복, 2026-01-01 수량 1 단가 기록은 자리표시 → 삭제
      if (code && L.some(l => String(l.itemCode) === String(code) && l.date === o.date && Number(l.colD) === Number(o.colD))) { remove.push({ o, why: '옛 프로그램과 중복' }); return; }
      if (code && o.date === '2026-01-01' && Number(o.colD) === 1) { remove.push({ o, why: '단가 자리표시(2026-01-01, 수량 1)' }); return; }
      keep.push({ o, code: code ? String(code) : null, why: 'PRE' });
    });
    // 10~11월 대조: 같은 품목번호, 날짜 차 7일 이내, 수량 같은 것 우선 → 가까운 날짜
    const Lon = L.map((l, i) => ({ l, i })).filter(x => x.l.date >= '2026-10-01');
    const pairs = [];
    octNov.forEach(a => Lon.forEach(b => {
      if (String(b.l.itemCode) !== a.code) return;
      const dd = Math.abs(day(b.l.date) - day(a.o.date)); if (dd > 7) return;
      pairs.push([Number(b.l.colD) !== Number(a.o.colD) ? 1 : 0, dd, a, b]);
    }));
    pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const usedA = new Set(), usedB = new Set();
    pairs.forEach(([qm, dd, a, b]) => { if (usedA.has(a.idx) || usedB.has(b.i)) return; usedA.add(a.idx); usedB.add(b.i); matchedPairs.push({ site: a.o, legacy: b.l, qtyDiff: !!qm, days: dd }); remove.push({ o: a.o, why: '옛 프로그램 기록으로 교체' }); });
    octNov.forEach(a => { if (!usedA.has(a.idx)) keep.push({ o: a.o, code: a.code, why: 'B' }); });

    // 남기는 사이트 기록: 품목번호가 있으면 옛 프로그램 이름·규격으로, 거래처도 옛 프로그램 표기로
    const kept = keep.map(k => {
      const o = { ...k.o }; const before = `${o.colB} | ${o.colC} | ${o.colD} | ${o.amount}`;
      if (k.code && master[k.code]) {
        const m = master[k.code];
        if (k.code === '500176' && String(o.colC).replace(/\s/g, '') === '3kg*6') { o.colD = Number(o.colD) * 6; o.amount = Math.round(Number(o.amount) / 6); o.remainQty = o.colD; }
        o.colB = m.name; o.colC = m.spec; o.itemCode = k.code;
      }
      if (VENDOR[o.colA]) o.colA = VENDOR[o.colA];
      if (k.why === 'A' || k.why === 'B') { const note = (o.pureNote || '').trim(); o.pureNote = note ? `${note} / ${SITE_ONLY_NOTE}` : SITE_ONLY_NOTE; }
      return { o, before, why: k.why, code: k.code };
    });

    // 레시피 연결: 이전 키(이름||규격) → 새 키
    const keyMap = {};
    Object.entries(DB_NAME_TO_CODE).forEach(([name, code]) => {
      const m = master[String(code)]; if (!m) return;
      keyMap[name] = { name: m.name, spec: m.spec, code: String(code) };
    });
    const recipeChanges = [];
    (recipes || []).forEach(r => {
      (r.ingredients || []).forEach((ig, gi) => {
        if (ig.rowType === 'SUB_RECIPE') return;
        const oldName = String((ig.rawKey || '').split('||')[0] || ig.item || '').trim();
        const t = keyMap[oldName] || keyMap[String(ig.item || '').trim()]; if (!t) return;
        const newKey = `${t.name}||${t.spec}`; if (ig.rawKey === newKey && ig.item === t.name) return;
        recipeChanges.push({ recipe: r.productName || r.name || r.id, kind: '원재료', from: `${ig.item} [${ig.rawKey || ''}] ${ig.spec || ''}`, to: `${t.name} [${newKey}]`, manual: ig.priceSource === 'MANUAL', apply: () => {
          ig.item = t.name; ig.rawKey = newKey;
          if (ig.priceSource !== 'MANUAL') { ig.spec = t.spec; ig.specGrams = parseSpec(t.spec); ig.priceSource = 'RAW_DB'; }
          delete ig.itemCode;
        } });
      });
      (r.packaging || []).forEach(pk => {
        const oldName = String((pk.rawKey || '').split('||')[0] || pk.name || '').trim();
        const t = keyMap[oldName] || keyMap[String(pk.name || '').trim()]; if (!t) return;
        const newKey = `${t.name}||${t.spec}`; if (pk.rawKey === newKey && pk.name === t.name) return;
        recipeChanges.push({ recipe: r.productName || r.name || r.id, kind: '포장재', from: `${pk.name} [${pk.rawKey || ''}]`, to: `${t.name} [${newKey}]`, manual: pk.priceSource === 'MANUAL', apply: () => {
          pk.name = t.name; pk.rawKey = newKey; if (pk.priceSource !== 'MANUAL') pk.spec = t.spec; delete pk.code;
        } });
      });
    });

    const total = (arr) => arr.reduce((a, o) => { const s = Number(o.colD) * Number(o.amount); a.supply += s; a.vat += o.taxType === '과세' ? Math.round(s * 0.1) : 0; a.n++; return a; }, { n: 0, supply: 0, vat: 0 });
    return {
      legacy: L, kept, remove, matchedPairs, recipeChanges,
      summary: { before: total(orders), legacy: total(L), kept: total(kept.map(k => k.o)), removed: total(remove.map(r => r.o)), after: total(L.concat(kept.map(k => k.o))),
        keptA: kept.filter(k => k.why === 'A').length, keptB: kept.filter(k => k.why === 'B').length, keptPre: kept.filter(k => k.why === 'PRE').length,
        removedMatched: remove.filter(r => r.why === '옛 프로그램 기록으로 교체').length, removedOther: remove.filter(r => r.why !== '옛 프로그램 기록으로 교체').length,
        recipeIngredientChanges: recipeChanges.filter(c => c.kind === '원재료').length, recipePackagingChanges: recipeChanges.filter(c => c.kind === '포장재').length }
    };
  }
  const api = { buildPlan, DB_NAME_TO_CODE };
  if (typeof module !== 'undefined') module.exports = api; else window.__legacyMigration = api;
})();
