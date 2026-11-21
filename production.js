// [VERSION: production.js v2.2 - 2026-11-21 주말 칸 60px 고정(금액 만원 표기), 남는 폭은 평일 품목명으로 / v2.1 - 2026-11-21 달력 칸 품목을 파트별로 묶고 왼쪽 색 띠로 구분 / v2.0 - 2026-11-21 생산 재고를 대항목으로 분리, 달력 칸 12종까지 표시 / v1.9 - 2026-11-21 달력 품목 줄 간격 좁힘(품목명 더 보이게), 주말 열 더 좁게 / v1.8 - 2026-11-21 달력: 토·일 한 칸으로 합침, 평일 넓게, 품목 줄 표처럼 열 고정, 앞으로 올 날은 '예정' / v1.7 - 2026-11-21 제품단가 중복 행은 매입가 있는 행 하나만 사용 / v1.6 - 2026-11-21 반제품(라미네이팅 카트) 재고: 만든·사용·폐기, 원재료비 평가, 파이 손실은 사용 카트 기준 / v1.5 - 2026-11-21 달력: 주말 열 좁게, 단위 뱃지(PK·배합) 앞으로, 글씨 굵게, 주 합계 카드 밝게 / v1.4 - 2026-11-21 일자 입력창 개편(화면 중앙·품목 고르기 판·큰 글씨), 달력 칸 하루 10종까지 표시 / v1.3 - 2026-11-21 원재료 손실(수율) 분석: 생지 투입 배합 대비 실제 생산, 파이 라미네이팅 카트 반죽 대비 사용 반죽, 주·월 비교 / v1.2 - 2026-11-21 기본 DB 주소, 7일 달력(주말 근무), 1~12월 버튼, 반제품 달력 표시, 품목 늦게 불러와도 자동 갱신 / v1.1 - 2026-11-21 단가 0원 품목은 제품단가 현재 값 자동 반영, 쇼숑오뽐므 BOX 재고(4PK=1BOX) / v1.0 - 2026-11-21 신규: 생산일지(주 5일 달력 · 목표/실행 · 달성률) + 생지 재고(PK, 엠즈 입고 차감, 원가·매입가 평가)]
//  - 품목 목록·단가: 제품단가 탭(barogaProductPriceBridge.getProductionProducts)
//      파이 = PK로 입력 / 알생지·파베이크·제과 = 배합으로 입력 → '1배합 PK수'로 PK 환산 (실제 포장 PK를 직접 고칠 수 있음)
//      금액 = PK × 엠즈 매입가(PK). 줄을 만들 때의 단가를 줄에 저장 → 나중에 단가가 바뀌어도 지난 기록 금액은 그대로
//  - 반제품(반죽 믹싱·라미네이팅): 수량만 기록, 금액·재고 합계 제외
//  - 생지 재고(PK) = 재고 실사 수량 + 실사일 이후 실행 PK − 실사일 이후 엠즈 입고 PK(상품코드→품목코드 연결) ± 조정
//  - 저장: 이 기기(localStorage) + 생산일지 DB(GAS 5_production.gs, 주소 설정 시) 리비전 확인 저장
(function () {
  'use strict';

  const LS_KEY = 'baroga_production_v1';
  const URL_KEY = 'baroga_production_gas_url_v1';
  const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbwTnkYkH8fiz4s-BOoHfI05Fhmo4Hm6CaoWH1tNSRluS_mrH1rRR6HkhEeRcGKHdjDH/exec';
  const CAT_LABEL = { PIE: '파이', DOUGH: '알생지', PARBAKE: '파베이크', BAKERY: '제과' };
  const CAT_ORDER = ['PIE', 'DOUGH', 'PARBAKE', 'BAKERY'];
  // 재고·엠즈 거래 단위가 PK가 아닌 품목 (생산 입력은 PK/배합 그대로, 재고·금액은 이 단위)
  //  쇼숑오뽐므: 파손 방지로 엠즈 입고·가맹점 판매가 BOX 단위 → 1BOX = 4PK, 엠즈 매입가도 BOX당
  const STOCK_UNIT_RULES = { '1006': { stockUnit: 'BOX', pkPerStock: 4 } };
  const DEFAULT_SEMI_ITEMS = [
    ['패스츄리 반죽 믹싱', '배합'], ['쇼숑 반죽 믹싱', '배합'], ['몽마르트 반죽 믹싱', '배합'], ['셰브런 토스트 반죽 믹싱', '배합'], ['정사각퍼프도우 반죽 믹싱', '배합'],
    ['패스츄리 반죽 라미네이팅', '카트'], ['쇼숑 반죽 라미네이팅', '카트'], ['몽마르트 반죽 라미네이팅', '카트'], ['셰브런 토스트 반죽 라미네이팅', '카트'], ['정사각퍼프도우 반죽 라미네이팅', '카트'],
  ].map(([name, unit], i) => ({ id: 'semi-' + (i + 1), name, unit }));

  // ---------- 공용 도우미 (index.html 것을 쓰고, 없으면 대체) ----------
  const esc = (s) => (typeof window.escapeHtml === 'function' ? window.escapeHtml(s) : String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const won = (n) => Math.round(Number(n) || 0).toLocaleString('ko-KR') + '원';
  const num = (n, d = 1) => (Number(n) || 0).toLocaleString('ko-KR', { maximumFractionDigits: d });
  const toast = (m, t) => (typeof window.showToast === 'function' ? window.showToast(m, t) : alert(m));
  const nowHm = () => (typeof window.barogaNowHm === 'function' ? window.barogaNowHm() : new Date().toTimeString().slice(0, 5));
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  const parseYmd = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
  const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];

  // ---------- 상태 ----------
  let db = blankDb();
  let dbRevision = null;
  let cloudLoaded = false;     // 클라우드에서 정상적으로 불러온 뒤에만 클라우드 저장
  let cloudBlocked = '';       // 저장 중지 사유 (충돌 등)
  let saveTimer = null, saving = false, unsaved = false, lastSavedHm = '', statusText = '';
  let view = 'CAL';
  let cursorMonth = today().slice(0, 7);
  let draft = null;            // 일자 편집 중인 사본 { date, lines, semi, memo }
  let mounted = false;

  function blankDb() {
    return { version: 1, days: {}, semiItems: DEFAULT_SEMI_ITEMS.map((x) => ({ ...x })), stockBase: null, stockAdjusts: [], loss: { cartKg: {}, pie: {} }, updatedAt: '' };
  }
  function normalizeDb(p) {
    const d = blankDb();
    if (!p || typeof p !== 'object') return d;
    d.days = p.days && typeof p.days === 'object' ? p.days : {};
    d.semiItems = Array.isArray(p.semiItems) && p.semiItems.length ? p.semiItems : d.semiItems;
    d.stockBase = p.stockBase && p.stockBase.date ? p.stockBase : null;
    d.stockAdjusts = Array.isArray(p.stockAdjusts) ? p.stockAdjusts : [];
    d.loss = p.loss && typeof p.loss === 'object' ? p.loss : { cartKg: {}, pie: {} };
    d.updatedAt = p.updatedAt || '';
    return d;
  }

  // ---------- 품목 (제품단가 탭) ----------
  function getProducts() {
    const b = window.barogaProductPriceBridge;
    let list = [];
    try { if (b && typeof b.getProductionProducts === 'function') list = b.getProductionProducts() || []; } catch (e) { list = []; }
    // 같은 품목코드 행이 여러 개면(제품단가 탭 중복 행) 매입가가 있는 행 하나만 사용
    const byCode = new Map();
    list.filter((p) => p && p.productName).forEach((p) => {
      const k = String(p.productCode || p.productName);
      const prev = byCode.get(k);
      if (!prev || (!(Number(prev.msBuyPricePk) > 0) && Number(p.msBuyPricePk) > 0)) byCode.set(k, p);
    });
    return [...byCode.values()]
      .map((p) => {
        const cat = CAT_LABEL[p.catKey] ? p.catKey : (/파이/.test(p.section) ? 'PIE' : /파베/.test(p.section) ? 'PARBAKE' : /제과/.test(p.section) ? 'BAKERY' : 'DOUGH');
        const rule = STOCK_UNIT_RULES[String(p.productCode)] || { stockUnit: 'PK', pkPerStock: 1 };
        return { ...p, cat, unit: cat === 'PIE' ? 'PK' : '배합', stockUnit: rule.stockUnit, pkPerStock: rule.pkPerStock };
      })
      .sort((a, b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat) || String(a.productCode).localeCompare(String(b.productCode)));
  }
  function productByCode(code, products) { return (products || getProducts()).find((p) => String(p.productCode) === String(code)) || null; }

  // ---------- 줄 계산 ----------
  // 줄 단가·1배합 PK수: 줄에 저장된 값(>0)을 쓰고, 0이면(단종·미출시로 아직 0원) 제품단가 탭의 현재 값을 따라감 → 나중에 금액을 넣으면 자동 반영
  let _liveCache = null, _liveAt = 0;
  function liveProduct(code) { if (!_liveCache || Date.now() - _liveAt > 2000) { _liveCache = getProducts(); _liveAt = Date.now(); } return productByCode(code, _liveCache); }
  function linePrice(l) { if (Number(l.pricePk) > 0) return Number(l.pricePk); const p = liveProduct(l.code); return p ? Number(p.msBuyPricePk) || 0 : 0; }
  function linePkPerBatch(l) { if (Number(l.pkPerBatch) > 0) return Number(l.pkPerBatch); const p = liveProduct(l.code); return p ? Number(p.batchOutputPk) || 0 : 0; }
  function linePerStock(l) { return Number(l.pkPerStock) > 0 ? Number(l.pkPerStock) : 1; }
  function lineStockUnit(l) { return l.stockUnit || 'PK'; }
  // 입력(PK 또는 배합) → 재고 단위(PK, 쇼숑은 BOX)
  function toStock(l, q) { const pk = l.unit === 'PK' ? (Number(q) || 0) : (Number(q) || 0) * linePkPerBatch(l); return r1(pk / linePerStock(l)); }
  function lineTargetPk(l) { return toStock(l, l.target); }
  function lineAutoActualPk(l) { return toStock(l, l.actual); }
  function lineActualPk(l) { return l.pkManual ? (Number(l.actualPk) || 0) : lineAutoActualPk(l); }
  function dayTotals(day) {
    const t = { target: 0, actual: 0, byCat: {} };
    ((day && day.lines) || []).forEach((l) => {
      const pr = linePrice(l);
      const ta = lineTargetPk(l) * pr, aa = lineActualPk(l) * pr;
      t.target += ta; t.actual += aa;
      const c = t.byCat[l.cat] || (t.byCat[l.cat] = { target: 0, actual: 0 });
      c.target += ta; c.actual += aa;
    });
    return t;
  }
  function rateOf(actual, target) { return target > 0 ? (actual / target) * 100 : null; }
  function rateBadge(rate, hasActual) {
    if (rate === null) return hasActual ? '<span class="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-xs font-bold">목표 없음</span>' : '';
    const cls = rate >= 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : rate >= 80 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';
    return `<span class="px-1.5 py-0.5 rounded border text-xs font-extrabold tabular-nums ${cls}">${rate.toFixed(1)}%</span>`;
  }

  // ---------- 저장 ----------
  function getUrl() { try { return localStorage.getItem(URL_KEY) || DEFAULT_URL; } catch (e) { return DEFAULT_URL; } }
  function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (e) {} }
  function loadLocal() { try { const v = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); if (v) db = normalizeDb(v); } catch (e) {} }
  function setStatus(t) { statusText = t; const el = document.getElementById('prodStatus'); if (el) el.textContent = t; }
  function markChanged() {
    db.updatedAt = new Date().toISOString();
    saveLocal();
    unsaved = true;
    if (!getUrl()) { setStatus('이 기기에만 저장됨 (DB 미연결)'); return; }
    if (!cloudLoaded) { setStatus(cloudBlocked ? '저장 중지: ' + cloudBlocked : 'DB를 불러온 뒤 저장됩니다'); return; }
    setStatus('저장 대기...');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = null; pushCloud(); }, 1500);
  }
  async function api(body) {
    if (typeof window.barogaApi !== 'function') throw new Error('접속 도구를 찾을 수 없습니다');
    return window.barogaApi(getUrl(), body, 30000);
  }
  async function pullCloud(showMsg) {
    const url = getUrl();
    if (!url) { setStatus('이 기기에만 저장됨 (DB 미연결)'); return; }
    if (saving || saveTimer) { if (showMsg) toast('저장이 끝난 뒤 다시 불러와 주세요.', 'error'); return; }
    setStatus('불러오는 중...');
    try {
      const json = await api({ action: 'getAll' });
      if (!json || json.ok === false) throw new Error((json && (json.message || json.error)) || '불러오기 실패');
      const localHasData = Object.keys(db.days).length > 0 || db.stockBase;
      if (json.status === 'empty') {
        dbRevision = Number(json.revision) || 0;
        cloudLoaded = true; cloudBlocked = '';
        if (localHasData) { setStatus('DB 비어 있음 → 이 기기 기록을 DB에 올립니다'); unsaved = true; pushCloud(); }
        else { setStatus('불러옴 ' + nowHm() + ' · 기록 없음'); unsaved = false; }
      } else {
        db = normalizeDb(json.payload);
        dbRevision = Number(json.revision) || 0;
        cloudLoaded = true; cloudBlocked = ''; unsaved = false;
        saveLocal();
        setStatus('불러옴 ' + nowHm() + ' · ' + Object.keys(db.days).length + '일');
        if (showMsg) toast('생산일지 DB를 불러왔습니다.', 'success');
      }
      render();
    } catch (e) {
      cloudLoaded = false;
      if (!e.unauthorized) cloudBlocked = '불러오기 실패';
      setStatus('불러오기 실패 — 저장 중지 (새로고침 필요)');
      if (showMsg) toast('생산일지 DB 불러오기 실패: ' + e.message, 'error');
    }
  }
  async function pushCloud() {
    if (!getUrl() || !cloudLoaded || saving) return;
    saving = true; setStatus('저장 중...');
    const snapshot = JSON.stringify(db);
    try {
      const json = await api({ action: 'replaceAll', baseRevision: dbRevision, payload: JSON.parse(snapshot) });
      if (!json || json.ok === false) {
        if (json && json.conflict) { cloudLoaded = false; cloudBlocked = '다른 기기에서 먼저 저장함'; setStatus('저장 중지: 다른 기기에서 먼저 저장됨 — [불러오기] 후 다시 입력'); toast('다른 기기에서 생산일지를 먼저 저장했습니다. [불러오기]로 최신 내용을 받은 뒤 다시 입력해 주세요. (이 기기 입력분은 이 기기에 남아 있습니다)', 'error'); }
        else { setStatus('저장 실패 — 다시 시도하려면 내용을 한 번 더 저장'); toast('생산일지 저장 실패: ' + ((json && (json.message || json.error)) || ''), 'error'); }
        return;
      }
      dbRevision = Number(json.revision) || dbRevision;
      lastSavedHm = nowHm();
      if (JSON.stringify(db) === snapshot) unsaved = false;
      setStatus('저장됨 ' + lastSavedHm + ' · ' + Object.keys(db.days).length + '일');
    } catch (e) {
      setStatus('저장 실패 (' + e.message + ')');
    } finally {
      saving = false;
      if (unsaved && cloudLoaded && !saveTimer) { saveTimer = setTimeout(() => { saveTimer = null; pushCloud(); }, 1500); }
    }
  }
  window.barogaUnsavedCheckers = window.barogaUnsavedCheckers || {};
  window.barogaUnsavedCheckers.production = () => Boolean(getUrl() && (saveTimer || saving || unsaved));
  window.saveProductionDb = () => { if (!getUrl()) { toast('생산일지 DB 주소가 없어 이 기기에만 저장돼 있습니다. [DB 연결]에서 주소를 넣어 주세요.', 'info'); return; } clearTimeout(saveTimer); saveTimer = null; pushCloud(); };

  // ---------- 화면 ----------
  // 생산일지(달력·원재료 손실)와 생산 재고는 서로 다른 대항목 화면 → 지금 보이는 쪽 컨테이너에만 그림
  let activeRootId = 'productionRoot';
  function root() { return document.getElementById(activeRootId); }
  function render() {
    const el = root(); if (!el || !mounted) return;
    const other = document.getElementById(activeRootId === 'productionRoot' ? 'productionStockRoot' : 'productionRoot');
    if (other) other.innerHTML = ''; // 같은 id(prodStatus·prodModal)가 두 곳에 생기지 않게
    const isStock = activeRootId === 'productionStockRoot';
    const tabBtn = (k, label) => `<button type="button" onclick="Prod.setView('${k}')" class="px-3.5 py-1.5 rounded-xl text-sm font-bold cursor-pointer ${view === k ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'}">${label}</button>`;
    const url = getUrl();
    el.innerHTML = `
      <div class="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">${isStock ? '<h2 class="text-base font-extrabold text-stone-900">생산 재고 <span class="text-xs font-bold text-stone-500">냉동창고 생지 · 반제품</span></h2>' : `${tabBtn('CAL', '생산 달력')}${tabBtn('LOSS', '원재료 손실')}`}</div>
          <div class="flex items-center gap-2 text-xs">
            <span id="prodStatus" class="px-2.5 py-1 rounded-lg bg-white border border-stone-200 font-bold text-stone-600">${esc(statusText || (url ? '' : '이 기기에만 저장됨 (DB 미연결)'))}</span>
            ${url ? `<button type="button" onclick="Prod.pull()" class="px-2.5 py-1 rounded-lg bg-white border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">불러오기</button>` : ''}
            <button type="button" onclick="Prod.openDbModal()" class="px-2.5 py-1 rounded-lg ${url ? 'bg-white border border-stone-200 text-stone-700' : 'bg-amber-600 text-white'} font-bold cursor-pointer">DB 연결</button>
          </div>
        </div>
        ${isStock ? renderStock() : view === 'LOSS' ? renderLoss() : renderCalendar()}
      </div>
      <div id="prodModal"></div>`;
    if (draft) renderEditor();
  }

  // ----- 생산 달력 -----
  function monthWeeks(ym) {
    const [y, m] = ym.split('-').map(Number);
    const first = new Date(y, m - 1, 1), last = new Date(y, m, 0);
    const start = new Date(first); start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // 그 주 월요일
    const weeks = [];
    for (let d = new Date(start); d <= last; d.setDate(d.getDate() + 7)) {
      const w = [];
      for (let i = 0; i < 7; i++) { const x = new Date(d); x.setDate(d.getDate() + i); w.push({ date: ymd(x), inMonth: x.getMonth() === m - 1, day: x.getDate(), dow: x.getDay() }); }
      weeks.push(w);
    }
    return weeks;
  }
  function renderCalendar() {
    const ym = cursorMonth, [y, m] = ym.split('-').map(Number);
    const weeks = monthWeeks(ym);
    const tdy = today();
    let mT = 0, mA = 0, toDateT = 0, workDays = 0;
    const catSum = {};
    Object.keys(db.days).forEach((d) => {
      if (d.slice(0, 7) !== ym) return;
      const t = dayTotals(db.days[d]);
      mT += t.target; mA += t.actual;
      if (d <= tdy) toDateT += t.target;
      if (t.actual > 0) workDays++;
      Object.entries(t.byCat).forEach(([c, v]) => { const s = catSum[c] || (catSum[c] = { target: 0, actual: 0 }); s.target += v.target; s.actual += v.actual; });
    });
    const rate = rateOf(mA, mT), rateToDate = rateOf(mA, toDateT);
    const kpi = (label, value, sub, cls = 'text-stone-900') => `<div class="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs"><div class="text-xs font-bold text-stone-500">${label}</div><div class="mt-1 text-xl font-extrabold tabular-nums ${cls}">${value}</div>${sub ? `<div class="text-xs text-stone-500 mt-0.5">${sub}</div>` : ''}</div>`;
    const prevYm = ymd(new Date(y, m - 2, 1)).slice(0, 7), nextYm = ymd(new Date(y, m, 1)).slice(0, 7);
    const catRows = CAT_ORDER.filter((c) => catSum[c]).map((c) => { const s = catSum[c]; return `<tr class="border-b border-stone-100 whitespace-nowrap"><td class="py-1.5 px-2 font-bold">${CAT_LABEL[c]}</td><td class="py-1.5 px-2 text-right tabular-nums">${won(s.target)}</td><td class="py-1.5 px-2 text-right tabular-nums font-extrabold">${won(s.actual)}</td><td class="py-1.5 px-2 text-right">${rateBadge(rateOf(s.actual, s.target), s.actual > 0)}</td></tr>`; }).join('');
    // 월~금은 넓게, 토·일은 한 칸(주말)으로 합쳐 좁게
    const GRID_STYLE = 'grid-template-columns: repeat(5, minmax(0, 1fr)) 60px 132px'; // 주말은 60px 고정, 남는 폭은 평일 칸(품목명)으로
    // 품목 줄: 이름 | 단위 | 목표 | → | 실행 — 칸 폭을 고정해 표처럼 세로로 줄이 맞도록
    const ROW_STYLE = 'display:grid;grid-template-columns:minmax(0,1fr) 26px 24px 8px 24px;column-gap:2px;align-items:center';
    const unitBadge = (u) => `<span class="block w-full text-center rounded text-[10px] leading-4 font-extrabold tracking-tighter ${u === 'PK' ? 'bg-blue-50 text-blue-700' : u === '배합' ? 'bg-emerald-50 text-emerald-700' : u === 'BOX' ? 'bg-violet-50 text-violet-700' : 'bg-stone-100 text-stone-500'}">${esc(u)}</span>`;
    const itemRow = (name, title, cls, unit, tq, aq, actCls) => `<div class="text-xs leading-tight" style="${ROW_STYLE}"><span class="truncate font-semibold ${cls}" title="${esc(title)}">${name}</span>${unitBadge(unit)}<span class="text-right font-semibold text-stone-500 tabular-nums">${num(tq)}</span><span class="text-center text-stone-300 text-[10px]">→</span><b class="text-right font-extrabold tabular-nums ${actCls}">${num(aq)}</b></div>`;
    const dayBadge = (c, t) => (c.date > tdy && !(t.actual > 0)) ? (t.target > 0 ? '<span class="text-[11px] font-bold text-stone-400">예정</span>' : '') : rateBadge(rateOf(t.actual, t.target), t.actual > 0);
    const PART_STYLE = {
      PIE: { bar: 'border-amber-400', text: 'text-amber-700' },
      DOUGH: { bar: 'border-emerald-500', text: 'text-emerald-700' },
      PARBAKE: { bar: 'border-orange-500', text: 'text-orange-700' },
      BAKERY: { bar: 'border-violet-400', text: 'text-violet-700' },
      SEMI: { bar: 'border-stone-300', text: 'text-stone-500' },
    };
    const dayCls = (c) => c.dow === 0 ? 'text-rose-600' : c.dow === 6 ? 'text-blue-600' : 'text-stone-900';

    const weekRows = weeks.map((w, wi) => {
      let wT = 0, wA = 0;
      w.forEach((c) => { if (c.inMonth) { const t = dayTotals(db.days[c.date]); wT += t.target; wA += t.actual; } });
      const cells = w.slice(0, 5).map((c) => {
        const day = db.days[c.date];
        const t = dayTotals(day);
        if (!c.inMonth) return `<div class="min-h-[168px] rounded-xl bg-stone-50/60 border border-dashed border-stone-200 p-2 text-xs text-stone-300 font-bold">${c.day}</div>`;
        const lines = (day && day.lines) || [], semi = (day && day.semi) || [];
        const MAX = 12; // 하루 품목(반제품 포함) 최대 12종까지 칸이 늘어남(그 뒤는 '외 n개'), 기본 높이는 5종
        // 파트별로 묶고 왼쪽 색 띠로 구분 (파이 · 알생지 · 파베이크 · 제과 · 반제품). 품목은 최대 MAX줄(묶음 제목 제외), 넘치면 '외 n개'
        const groups = [...CAT_ORDER.map((cat) => ({ key: cat, label: CAT_LABEL[cat], rows: lines.filter((l) => l.cat === cat).map((l) => { const tq = Number(l.target) || 0, aq = Number(l.actual) || 0, added = tq === 0 && aq > 0; return itemRow(`${added ? '＋' : ''}${esc(l.name)}`, l.name, added ? 'text-blue-700' : 'text-stone-800', l.unit, tq, aq, 'text-stone-900'); }) })),
          { key: 'SEMI', label: '반제품', rows: semi.map((l) => itemRow(esc(l.name), '반제품 · ' + l.name, 'text-stone-500', l.unit || '', Number(l.target) || 0, Number(l.actual) || 0, 'text-stone-700')) }];
        const total = groups.reduce((n, g) => n + g.rows.length, 0);
        let left = MAX;
        const shown = groups.filter((g) => g.rows.length).map((g) => {
          if (left <= 0) return '';
          const rows = g.rows.slice(0, left); left -= rows.length;
          const st = PART_STYLE[g.key];
          return `<div class="border-l-[3px] ${st.bar} pl-1.5 flex flex-col gap-0.5"><div class="text-[10px] leading-3 font-extrabold ${st.text}">${g.label}</div>${rows.join('')}</div>`;
        }).join('') + (total > MAX ? `<div class="text-xs text-stone-400 font-semibold">외 ${total - MAX}개</div>` : '');
        const items = { length: total };
        const isToday = c.date === tdy;
        return `<button type="button" onclick="Prod.openDay('${c.date}')" class="text-left min-h-[168px] rounded-xl border ${isToday ? 'border-amber-500 ring-1 ring-amber-300' : 'border-stone-200'} bg-white hover:border-amber-400 hover:shadow-xs p-2 flex flex-col gap-1 cursor-pointer min-w-0">
          <div class="flex items-center justify-between gap-1"><span class="text-sm font-extrabold ${isToday ? 'text-amber-700' : dayCls(c)}">${c.day}</span>${dayBadge(c, t)}</div>
          ${lines.length ? `<div class="grid grid-cols-[auto_1fr] gap-x-1 text-xs tabular-nums"><span class="font-semibold text-stone-500">목표</span><span class="text-right font-bold">${won(t.target)}</span><span class="font-semibold text-stone-500">실행</span><span class="text-right font-extrabold text-amber-900">${won(t.actual)}</span></div>` : ''}
          ${items.length ? `<div class="${lines.length ? 'border-t border-stone-100 pt-1 ' : ''}flex flex-col gap-1">${shown}</div>` : '<div class="text-xs text-stone-300 mt-1">클릭해서 목표 입력</div>'}
        </button>`;
      }).join('');
      // 주말(토·일) 한 칸: 날짜별 작은 칸 2개(요약만), 눌러서 입력
      const wk = w.slice(5).map((c) => {
        if (!c.inMonth) return `<div class="flex-1 rounded-lg border border-dashed border-stone-200 bg-stone-50/60 p-1.5 text-xs text-stone-300 font-bold">${c.day}</div>`;
        const day = db.days[c.date], t = dayTotals(day);
        const n = (((day && day.lines) || []).length) + (((day && day.semi) || []).length);
        const isToday = c.date === tdy;
        return `<button type="button" onclick="Prod.openDay('${c.date}')" class="flex-1 text-left rounded-lg border ${isToday ? 'border-amber-500 ring-1 ring-amber-300' : 'border-stone-200'} ${n ? 'bg-white' : 'bg-stone-50'} hover:border-amber-400 p-1.5 flex flex-col gap-0.5 cursor-pointer min-w-0">
          <div class="flex items-center justify-between gap-1"><span class="text-xs font-extrabold ${isToday ? 'text-amber-700' : dayCls(c)}">${c.day}<span class="text-[10px] ml-0.5">${DOW[c.dow]}</span></span></div>${n ? `<div class="-mt-0.5">${dayBadge(c, t)}</div>` : ''}
          ${n ? `<div class="text-[11px] font-extrabold text-amber-900 tabular-nums truncate" title="실행 ${won(t.actual)} / 목표 ${won(t.target)}">${Math.round((t.actual || 0) / 10000).toLocaleString('ko-KR')}만</div><div class="text-[11px] text-stone-500 font-semibold">${n}품목</div>` : '<div class="text-[11px] text-stone-300">휴무</div>'}
        </button>`;
      }).join('');
      const weekendCell = `<div class="min-h-[168px] flex flex-col gap-1.5 min-w-0">${wk}</div>`;
      const wr = rateOf(wA, wT);
      return `<div class="grid gap-1.5" style="${GRID_STYLE}">${cells}${weekendCell}
        <div class="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 flex flex-col justify-center gap-1.5 text-xs tabular-nums">
          <div class="flex items-center justify-between"><span class="px-1.5 py-0.5 rounded-md bg-white border border-amber-200 text-amber-800 font-extrabold">${wi + 1}주</span>${wr === null ? '' : (!(wA > 0) && w.filter((c) => c.inMonth).every((c) => c.date > tdy) ? '<span class="text-[11px] font-bold text-stone-400">예정</span>' : rateBadge(wr, wA > 0))}</div>
          <div><div class="font-semibold text-stone-500">목표</div><div class="font-bold text-stone-800 text-sm">${won(wT)}</div></div>
          <div><div class="font-semibold text-stone-500">실행</div><div class="font-extrabold text-amber-900 text-sm">${won(wA)}</div></div>
          <div class="h-1.5 rounded-full bg-white border border-amber-100 overflow-hidden"><div class="h-full rounded-full ${wr !== null && wr >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}" style="width:${wr === null ? 0 : Math.min(100, wr)}%"></div></div>
        </div></div>`;
    }).join('');

    const products = getProducts();
    const noProducts = products.length === 0 ? `<div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex flex-wrap items-center gap-2"><span>제품단가 탭의 품목 목록을 아직 불러오지 못했습니다. 제품단가 DB를 불러오는 중이면 잠시 뒤 자동으로 나타납니다.</span><button type="button" onclick="Prod.retryProducts()" class="px-2.5 py-1 rounded-lg bg-rose-700 text-white cursor-pointer">다시 확인</button><span class="font-semibold">계속 안 되면 Ctrl+Shift+R(강력 새로고침)을 눌러 주세요.</span></div>` : '';
    const years = [y - 1, y, y + 1];
    const monthBtns = Array.from({ length: 12 }, (_, i) => {
      const mm = `${y}-${pad(i + 1)}`, on = mm === ym;
      const has = Object.keys(db.days).some((d) => d.slice(0, 7) === mm);
      return `<button type="button" onclick="Prod.setMonth('${mm}')" class="relative px-2.5 py-1 rounded-xl text-xs cursor-pointer ${on ? 'bg-amber-600 text-white font-extrabold shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200 font-bold'}">${i + 1}월${has && !on ? '<span class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500"></span>' : ''}</button>`;
    }).join('');
    return `${noProducts}
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
        ${kpi(`${m}월 목표 금액`, won(mT), '엠즈 매입가 기준')}
        ${kpi(`${m}월 실행 금액`, won(mA), '반제품 제외', 'text-amber-900')}
        ${kpi('달성률 (월 목표 대비)', rate === null ? '-' : rate.toFixed(1) + '%', mT > mA ? '부족 ' + won(mT - mA) : (mT > 0 ? '목표 달성' : ''), rate !== null && rate >= 100 ? 'text-emerald-700' : 'text-stone-900')}
        ${kpi('오늘까지 목표 대비', rateToDate === null ? '-' : rateToDate.toFixed(1) + '%', '오늘까지 목표 ' + won(toDateT))}
        ${kpi('실행일 평균', workDays ? won(mA / workDays) : '-', `실행 입력된 날 ${workDays}일`)}
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" onclick="Prod.setMonth('${prevYm}')" title="이전 달" class="w-8 h-8 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">‹</button>
            <h3 class="text-base font-extrabold text-stone-900 px-1">${y}년 ${m}월 생산일지</h3>
            <button type="button" onclick="Prod.setMonth('${nextYm}')" title="다음 달" class="w-8 h-8 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">›</button>
            <select onchange="Prod.setMonth(this.value + '-${pad(m)}')" class="ml-2 h-8 border border-stone-200 rounded-lg px-2 text-xs font-bold bg-white">${years.map((yy) => `<option value="${yy}" ${yy === y ? 'selected' : ''}>${yy}년</option>`).join('')}</select>
            <div class="flex flex-wrap items-center gap-1">${monthBtns}</div>
            <button type="button" onclick="Prod.setMonth('${today().slice(0, 7)}')" class="px-2.5 py-1 rounded-xl border border-stone-200 text-xs font-bold cursor-pointer hover:bg-stone-50">이번 달</button>
          </div>
          <span class="text-xs text-stone-500">칸을 눌러 입력 · <span class="text-blue-700 font-bold">＋</span> 계획에 없던 품목 · 목표→실행 · <span class="px-1 rounded bg-stone-100 text-stone-500 font-bold">반</span> 반제품(금액 제외)</span>
        </div>
        <div class="grid gap-1.5 text-xs font-extrabold text-center" style="${GRID_STYLE}"><div class="text-stone-500">월</div><div class="text-stone-500">화</div><div class="text-stone-500">수</div><div class="text-stone-500">목</div><div class="text-stone-500">금</div><div><span class="text-blue-600">토</span>·<span class="text-rose-600">일</span></div><div class="text-stone-500">주 합계</div></div>
        ${weekRows}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
          <h3 class="text-sm font-extrabold text-stone-900 mb-2">${m}월 파트별</h3>
          ${catRows ? `<table class="w-full text-xs"><thead><tr class="text-stone-500 border-b border-stone-200"><th class="py-1 px-2 text-left">파트</th><th class="py-1 px-2 text-right">목표</th><th class="py-1 px-2 text-right">실행</th><th class="py-1 px-2 text-right">달성률</th></tr></thead><tbody>${catRows}</tbody></table>` : '<div class="text-xs text-stone-400 py-4 text-center">이번 달 기록이 없습니다.</div>'}
        </div>
        <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 text-xs text-stone-600 leading-relaxed">
          <h3 class="text-sm font-extrabold text-stone-900 mb-1">입력 기준</h3>
          <div>· 파이는 <b>PK</b>, 알생지·파베이크·제과는 <b>배합</b>으로 입력합니다.</div>
          <div>· 배합은 제품단가 탭의 '1배합 PK수'로 PK를 계산합니다. 실제 포장 수량이 다르면 <b>실행 재고수량</b> 칸을 고쳐 주세요. 재고는 이 수량으로 잡힙니다.</div>
          <div>· 금액 = 재고수량 × 엠즈 매입가. 줄을 만든 날의 단가로 고정됩니다. 단가가 0원인 품목은 제품단가 탭에 금액이 들어가면 자동으로 따라갑니다.</div>
          <div>· 쇼숑오뽐므는 PK로 입력하면 4PK = 1BOX로 바꿔 재고·금액을 BOX로 잡습니다.</div>
          <div>· 반제품은 수량만 기록하고 금액·재고에는 넣지 않습니다. 주말 근무도 같은 방식으로 입력합니다.</div>
        </div>
      </div>`;
  }

  // ----- 일자 편집 -----
  function openDay(date) {
    const day = db.days[date] || { lines: [], semi: [], memo: '' };
    draft = { date, lines: JSON.parse(JSON.stringify(day.lines || [])), semi: JSON.parse(JSON.stringify(day.semi || [])), memo: day.memo || '' };
    pickerQuery = ''; pickerCat = 'PIE';
    renderEditor();
  }
  function closeDay() { draft = null; const m = document.getElementById('prodModal'); if (m) m.innerHTML = ''; }
  function newLineFor(p) {
    return { id: uid(), code: String(p.productCode || ''), name: p.productName, cat: p.cat, unit: p.unit, stockUnit: p.stockUnit || 'PK', pkPerStock: p.pkPerStock || 1, pkPerBatch: Number(p.batchOutputPk) || 0, pricePk: Number(p.msBuyPricePk) || 0, target: 0, actual: 0, actualPk: 0, pkManual: false, note: '' };
  }
  function addLine() {
    if (!draft) return;
    const products = getProducts();
    if (!products.length) { toast('제품단가 탭의 품목 목록이 없습니다.', 'error'); return; }
    const used = new Set(draft.lines.map((l) => l.code));
    const p = products.find((x) => !used.has(String(x.productCode))) || products[0];
    draft.lines.push(newLineFor(p));
    renderEditor();
  }
  function setLineProduct(id, code) {
    const l = draft && draft.lines.find((x) => x.id === id); if (!l) return;
    const p = productByCode(code); if (!p) return;
    const keep = { id: l.id, target: l.target, actual: l.actual, note: l.note };
    Object.assign(l, newLineFor(p), keep);
    renderEditor();
  }
  function setLineField(id, field, value) {
    const l = draft && draft.lines.find((x) => x.id === id); if (!l) return;
    if (field === 'note') l.note = value;
    else if (field === 'actualPk') {
      if (String(value).trim() === '') { l.pkManual = false; l.actualPk = 0; }
      else { l.pkManual = true; l.actualPk = Math.max(0, parseFloat(value) || 0); }
    } else l[field] = Math.max(0, parseFloat(value) || 0);
    renderEditorTotals();
  }
  function removeLine(id) { if (!draft) return; draft.lines = draft.lines.filter((x) => x.id !== id); renderEditor(); }
  function refreshPrices() {
    if (!draft) return;
    const products = getProducts(); let n = 0;
    draft.lines.forEach((l) => { const p = productByCode(l.code, products); if (p) { if (l.pricePk !== p.msBuyPricePk || l.pkPerBatch !== p.batchOutputPk) n++; l.pricePk = Number(p.msBuyPricePk) || 0; l.pkPerBatch = Number(p.batchOutputPk) || 0; l.stockUnit = p.stockUnit; l.pkPerStock = p.pkPerStock; } });
    toast(n ? `${n}개 줄을 현재 제품단가로 다시 계산했습니다.` : '모든 줄이 이미 현재 단가입니다.', 'info');
    renderEditor();
  }
  function copyTargetsFrom(srcDate) {
    if (!draft) return;
    const src = db.days[srcDate];
    if (!src || !(src.lines || []).length) { toast(`${srcDate}에 기록된 품목이 없습니다.`, 'info'); return; }
    const products = getProducts(); let added = 0;
    src.lines.forEach((sl) => {
      if (draft.lines.some((l) => l.code === sl.code)) return;
      const p = productByCode(sl.code, products);
      const l = p ? newLineFor(p) : { ...sl, id: uid(), actual: 0, actualPk: 0, pkManual: false };
      l.target = Number(sl.target) || 0; draft.lines.push(l); added++;
    });
    toast(added ? `${srcDate}의 품목 ${added}개를 목표로 불러왔습니다 (실행은 비움).` : '이미 같은 품목이 모두 있습니다.', 'info');
    renderEditor();
  }
  function prevWorkday(date) { const d = parseYmd(date); do { d.setDate(d.getDate() - 1); } while (d.getDay() === 0 || d.getDay() === 6); return ymd(d); }
  function addSemi() { if (!draft) return; const s = db.semiItems[0] || { name: '', unit: '배합' }; draft.semi.push({ id: uid(), name: s.name, unit: s.unit, target: 0, actual: 0, note: '' }); renderEditor(); }
  function setSemiField(id, field, value) {
    const l = draft && draft.semi.find((x) => x.id === id); if (!l) return;
    if (field === 'name') { const s = db.semiItems.find((x) => x.name === value); l.name = value; if (s) l.unit = s.unit; renderEditor(); return; }
    if (field === 'note') l.note = value; else l[field] = Math.max(0, parseFloat(value) || 0);
  }
  function removeSemi(id) { if (!draft) return; draft.semi = draft.semi.filter((x) => x.id !== id); renderEditor(); }
  function saveDay() {
    if (!draft) return;
    const dup = {}; let dupName = '';
    draft.lines.forEach((l) => { if (dup[l.code]) dupName = l.name; dup[l.code] = true; });
    if (dupName) { toast(`'${dupName}'이(가) 두 줄 있습니다. 한 줄로 합쳐 주세요.`, 'error'); return; }
    const lines = draft.lines.filter((l) => (Number(l.target) || 0) > 0 || (Number(l.actual) || 0) > 0 || (l.pkManual && Number(l.actualPk) > 0));
    lines.forEach((l) => { if (!l.pkManual) l.actualPk = lineAutoActualPk(l); l.targetPk = lineTargetPk(l); });  // 단가 0이면 0 그대로 저장 → 계속 현재 단가를 따라감
    const semi = draft.semi.filter((l) => l.name && ((Number(l.target) || 0) > 0 || (Number(l.actual) || 0) > 0 || (Number(l.used) || 0) > 0 || (Number(l.waste) || 0) > 0));
    if (!lines.length && !semi.length && !draft.memo) delete db.days[draft.date];
    else db.days[draft.date] = { lines, semi, memo: draft.memo, updatedAt: new Date().toISOString() };
    const d = draft.date;
    draft = null;
    markChanged();
    render();
    toast(`${d} 생산일지를 적용했습니다.`, 'success');
  }
  function renderEditorTotals() {
    if (!draft) return;
    const t = dayTotals(draft);
    draft.lines.forEach((l) => {
      const row = document.querySelector(`[data-line="${l.id}"]`); if (!row) return;
      const tp = lineTargetPk(l), ap = lineActualPk(l), su = lineStockUnit(l);
      const conv = row.querySelector('[data-k="conv"]');
      if (conv) conv.textContent = l.unit === '배합' || su !== 'PK' ? `목표 ${num(tp)}${su} · 실행 ${num(lineAutoActualPk(l))}${su}` : '';
      const pkIn = row.querySelector('[data-k="apk"]'); if (pkIn && !l.pkManual) pkIn.placeholder = num(lineAutoActualPk(l));
      row.querySelector('[data-k="tamt"]').textContent = won(tp * linePrice(l));
      row.querySelector('[data-k="aamt"]').textContent = won(ap * linePrice(l));
    });
    const box = document.getElementById('prodEditTotals');
    if (box) box.innerHTML = `<span class="text-stone-500">목표</span> <b class="tabular-nums text-stone-900">${won(t.target)}</b><span class="mx-2 text-stone-300">|</span><span class="text-stone-500">실행</span> <b class="tabular-nums text-amber-900">${won(t.actual)}</b><span class="ml-2">${rateBadge(rateOf(t.actual, t.target), t.actual > 0)}</span>`;
    const cnt = document.getElementById('prodEditCount');
    if (cnt) cnt.textContent = `완제품 ${draft.lines.length} · 반제품 ${draft.semi.length}`;
  }
  // 품목 고르기: 분류 탭 + 검색 → 눌러서 추가 (이미 있는 품목은 그 줄로 이동)
  let pickerCat = 'PIE', pickerQuery = '';
  function addProduct(code) {
    if (!draft) return;
    const ex = draft.lines.find((l) => String(l.code) === String(code));
    if (ex) { focusRow(ex.id); return; }
    const p = productByCode(code); if (!p) return;
    const l = newLineFor(p); draft.lines.push(l);
    renderEditor(); focusRow(l.id);
  }
  function addSemiByName(name) {
    if (!draft) return;
    const ex = draft.semi.find((l) => l.name === name);
    if (ex) { focusRow(ex.id); return; }
    const s = db.semiItems.find((x) => x.name === name) || { name, unit: '배합' };
    const l = { id: uid(), name: s.name, unit: s.unit, target: 0, actual: 0, note: '' }; draft.semi.push(l);
    renderEditor(); focusRow(l.id);
  }
  function focusRow(id) {
    setTimeout(() => {
      const row = document.querySelector(`[data-line="${id}"],[data-semi="${id}"]`); if (!row) return;
      row.scrollIntoView({ block: 'nearest' });
      row.classList.add('ring-2', 'ring-amber-400'); setTimeout(() => row.classList.remove('ring-2', 'ring-amber-400'), 900);
      const inp = row.querySelector('input[type="number"]'); if (inp) { inp.focus(); inp.select(); }
    }, 30);
  }
  function setPicker(cat, q) {
    if (cat !== null && cat !== undefined) pickerCat = cat;
    if (q !== null && q !== undefined) pickerQuery = q;
    const box = document.getElementById('prodPicker'); if (box) box.innerHTML = renderPickerBody();
  }
  function renderPickerBody() {
    const products = getProducts();
    const q = pickerQuery.trim().toLowerCase();
    const used = new Set(draft.lines.map((l) => String(l.code))), usedSemi = new Set(draft.semi.map((l) => l.name));
    const tabs = [...CAT_ORDER.filter((c) => products.some((p) => p.cat === c)), 'SEMI'].map((c) => {
      const label = c === 'SEMI' ? '반제품' : CAT_LABEL[c];
      const on = !q && pickerCat === c;
      return `<button type="button" onclick="Prod.setPicker('${c}', '')" class="px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer ${on ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}">${label}</button>`;
    }).join('');
    const chip = (key, label, sub, isUsed, onclick) => `<button type="button" onclick="${onclick}" class="text-left px-3 py-2 rounded-xl border text-sm cursor-pointer transition ${isUsed ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-stone-200 bg-white hover:border-amber-400 hover:bg-amber-50/40'}"><div class="font-bold leading-tight">${isUsed ? '✓ ' : ''}${esc(label)}</div><div class="text-xs text-stone-500 mt-0.5">${sub}</div></button>`;
    let items = [];
    if (q || pickerCat !== 'SEMI') {
      items = products.filter((p) => (q ? (String(p.productName).toLowerCase().includes(q) || String(p.productCode).includes(q)) : p.cat === pickerCat))
        .map((p) => chip(p.productCode, p.productName, `${esc(p.productCode)} · ${CAT_LABEL[p.cat]} · ${p.unit}${p.stockUnit !== 'PK' ? ` (재고 ${p.stockUnit})` : ''}`, used.has(String(p.productCode)), `Prod.addProduct('${esc(p.productCode)}')`));
    }
    if (q || pickerCat === 'SEMI') {
      items = items.concat(db.semiItems.filter((s) => !q || s.name.toLowerCase().includes(q)).map((s) => chip(s.name, s.name, `반제품 · ${esc(s.unit)}`, usedSemi.has(s.name), `Prod.addSemiByName(${esc(JSON.stringify(s.name))})`)));
    }
    return `<div class="flex flex-wrap items-center gap-1 mb-2">${tabs}</div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">${items.join('') || '<div class="col-span-full py-4 text-center text-sm text-stone-400">찾는 품목이 없습니다.</div>'}</div>`;
  }
  function renderEditor() {
    const host = document.getElementById('prodModal'); if (!host || !draft) return;
    const products = getProducts();
    const inCls = 'no-spinner w-full text-right border rounded-lg pl-2 pr-9 py-1.5 text-base font-bold tabular-nums focus:border-amber-500';
    const bd = 'border-stone-300';
    const unitIn = (html, unit) => `<div class="relative">${html}<span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">${unit}</span></div>`;
    const lineRows = draft.lines.map((l) => {
      const known = productByCode(l.code, products);
      const su = lineStockUnit(l), pr = linePrice(l), following = !(Number(l.pricePk) > 0);
      const cur = known && ((Number(l.pricePk) > 0 && known.msBuyPricePk !== l.pricePk) || (Number(l.pkPerBatch) > 0 && known.batchOutputPk !== l.pkPerBatch));
      const added = !(Number(l.target) > 0) && Number(l.actual) > 0;
      return `<div data-line="${l.id}" class="grid grid-cols-[minmax(0,1.6fr)_110px_110px_130px_minmax(0,1fr)_36px] gap-2 items-center px-3 py-2 rounded-xl border border-stone-200 bg-white transition">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5"><span class="text-[11px] font-bold px-1.5 py-0.5 rounded ${l.unit === 'PK' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}">${CAT_LABEL[l.cat] || ''}</span><span class="font-bold text-stone-900 truncate" title="${esc(l.name)}">${esc(l.name)}</span>${added ? '<span class="text-[11px] font-bold text-blue-700">계획 외</span>' : ''}</div>
          <div class="text-xs text-stone-500 mt-0.5 truncate">${l.unit === '배합' ? `1배합 = ${num(linePkPerBatch(l))}PK · ` : ''}${su !== 'PK' ? `재고 ${su} (${linePerStock(l)}PK) · ` : ''}<span class="${cur ? 'text-rose-600' : ''}" title="${cur ? '현재 제품단가와 다름 — [현재 단가로 다시 계산]' : ''}">${won(pr)}/${su}${following ? ' (현재 단가 따름)' : ''}</span></div>
          <div class="text-xs text-stone-400" data-k="conv"></div>
        </div>
        ${unitIn(`<input type="number" min="0" step="any" value="${l.target || ''}" placeholder="0" oninput="Prod.setLineField('${l.id}','target',this.value)" class="${inCls} ${bd}">`, l.unit)}
        ${unitIn(`<input type="number" min="0" step="any" value="${l.actual || ''}" placeholder="0" oninput="Prod.setLineField('${l.id}','actual',this.value)" class="${inCls} ${bd} bg-amber-50/70">`, l.unit)}
        ${unitIn(`<input type="number" min="0" step="any" data-k="apk" value="${l.pkManual ? l.actualPk : ''}" placeholder="${num(lineAutoActualPk(l))}" oninput="Prod.setLineField('${l.id}','actualPk',this.value)" title="실제 포장한 수량. 비워 두면 회색 자동값 사용(원재료 손실 분석에서는 '미확인')" class="${inCls} ${l.unit === '배합' && Number(l.actual) > 0 && !l.pkManual ? 'border-amber-500 border-2' : bd}">`, su)}
        <div class="text-right text-sm tabular-nums leading-tight"><div class="text-stone-500" data-k="tamt"></div><div class="font-extrabold text-amber-900" data-k="aamt"></div></div>
        <button type="button" onclick="Prod.removeLine('${l.id}')" title="삭제" class="w-8 h-8 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer text-lg leading-none">×</button>
      </div>`;
    }).join('');
    const semiRows = draft.semi.map((l) => { const lam = isLaminating(l.name); return `<div data-semi="${l.id}" class="grid grid-cols-[minmax(0,1.6fr)_110px_110px_130px_minmax(0,1fr)_36px] gap-2 items-center px-3 py-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 transition">
        <div class="min-w-0"><div class="flex items-center gap-1.5"><span class="text-[11px] font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-600">반제품</span><span class="font-bold text-stone-800 truncate">${esc(l.name)}</span></div>${lam ? '<div class="text-xs text-stone-500 mt-0.5">재고 관리 · 목표 / 만든 카트 / 사용 카트 / 폐기</div>' : '<div class="text-xs text-stone-400 mt-0.5">기록만 (재고·금액 제외)</div>'}</div>
        ${unitIn(`<input type="number" min="0" step="any" value="${l.target || ''}" placeholder="0" oninput="Prod.setSemiField('${l.id}','target',this.value)" title="목표" class="${inCls} ${bd}">`, esc(l.unit))}
        ${unitIn(`<input type="number" min="0" step="any" value="${l.actual || ''}" placeholder="0" oninput="Prod.setSemiField('${l.id}','actual',this.value)" title="${lam ? '만든 카트' : '실행'}" class="${inCls} ${bd} bg-amber-50/70">`, esc(l.unit))}
        ${lam ? `${unitIn(`<input type="number" min="0" step="any" value="${l.used || ''}" placeholder="0" oninput="Prod.setSemiField('${l.id}','used',this.value)" title="사용 카트 (파이 성형에 쓴 카트)" class="${inCls} ${bd} bg-blue-50/60">`, '사용')}
        <div class="flex items-center gap-1.5">${unitIn(`<input type="number" min="0" step="any" value="${l.waste || ''}" placeholder="0" oninput="Prod.setSemiField('${l.id}','waste',this.value)" title="폐기 카트" class="${inCls} ${bd} w-24 bg-rose-50/50">`, '폐기')}<input type="text" value="${esc(l.note || '')}" oninput="Prod.setSemiField('${l.id}','note',this.value)" placeholder="메모" class="min-w-0 flex-1 border border-stone-300 rounded-lg px-2 py-1.5 text-sm"></div>` : `<input type="text" value="${esc(l.note || '')}" oninput="Prod.setSemiField('${l.id}','note',this.value)" placeholder="메모" class="col-span-2 w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm">`}
        <button type="button" onclick="Prod.removeSemi('${l.id}')" title="삭제" class="w-8 h-8 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer text-lg leading-none">×</button>
      </div>`; }).join('');
    const d = parseYmd(draft.date);
    const pw = prevWorkday(draft.date);
    const lastWeek = (() => { const x = parseYmd(draft.date); x.setDate(x.getDate() - 7); return ymd(x); })();
    const keepScroll = (document.getElementById('prodEditBody') || {}).scrollTop || 0;
    host.innerHTML = `<div class="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-3 sm:p-6" onclick="if(event.target===this)Prod.closeDay()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[1100px] max-h-[92vh] flex flex-col overflow-hidden">
        <div class="px-6 py-4 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-lg font-extrabold text-stone-900">${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]}) 생산일지</h3>
            <div class="text-xs text-stone-500 mt-0.5" id="prodEditCount"></div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 text-xs">
            <button type="button" onclick="Prod.copyTargetsFrom('${pw}')" class="px-3 py-1.5 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">전 근무일(${pw.slice(5).replace('-', '/')}) 품목 불러오기</button>
            <button type="button" onclick="Prod.copyTargetsFrom('${lastWeek}')" class="px-3 py-1.5 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">지난주 같은 요일</button>
            <button type="button" onclick="Prod.refreshPrices()" class="px-3 py-1.5 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">현재 단가로 다시 계산</button>
            <button type="button" onclick="Prod.closeDay()" title="닫기" class="ml-1 w-8 h-8 rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer text-xl leading-none">×</button>
          </div>
        </div>
        <div id="prodEditBody" class="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
          <section>
            <div class="flex items-center justify-between gap-2 mb-2">
              <h4 class="text-sm font-extrabold text-stone-800">품목 추가</h4>
              <input type="search" value="${esc(pickerQuery)}" oninput="Prod.setPicker(null, this.value)" placeholder="품목명·코드 검색" class="w-56 border border-stone-300 rounded-lg px-3 py-1.5 text-sm">
            </div>
            <div id="prodPicker" class="rounded-2xl bg-stone-50 border border-stone-200 p-3">${renderPickerBody()}</div>
          </section>
          <section>
            <div class="grid grid-cols-[minmax(0,1.6fr)_110px_110px_130px_minmax(0,1fr)_36px] gap-2 px-3 pb-1 text-xs font-extrabold text-stone-500">
              <div>오늘 품목</div><div class="text-right">목표</div><div class="text-right">실행</div><div class="text-right" title="실제 포장한 수량 (재고에 들어가는 수량)">실제 포장 수량</div><div class="text-right">목표 / 실행 금액</div><div></div>
            </div>
            <div class="flex flex-col gap-1.5">
              ${lineRows || '<div class="py-6 text-center text-sm text-stone-400 rounded-xl border border-dashed border-stone-200">위에서 품목을 눌러 추가하세요.</div>'}
              ${semiRows}
            </div>
            <div class="text-xs text-stone-500 mt-2 leading-relaxed">· 계획에 없던 품목은 목표를 비우고 실행만 적으면 됩니다. · 생지는 <b class="text-amber-800">실제 포장 수량</b>을 적어야 원재료 손실 분석에 들어갑니다(주황 테두리 = 아직 안 적음). · 반제품은 금액에 들어가지 않습니다.</div>
          </section>
          <section>
            <label class="text-sm font-extrabold text-stone-800">그날 메모</label>
            <textarea oninput="Prod.setMemo(this.value)" rows="2" placeholder="사정·변경 사유 등" class="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm">${esc(draft.memo || '')}</textarea>
          </section>
        </div>
        <div class="px-6 py-3 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-3">
          <div id="prodEditTotals" class="text-sm"></div>
          <div class="flex gap-2">
            <button type="button" onclick="Prod.closeDay()" class="px-5 py-2 rounded-xl border border-stone-300 bg-white text-sm font-bold cursor-pointer">취소</button>
            <button type="button" onclick="Prod.saveDay()" class="px-6 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-extrabold cursor-pointer">적용</button>
          </div>
        </div>
      </div></div>`;
    const body = document.getElementById('prodEditBody'); if (body) body.scrollTop = keepScroll;
    renderEditorTotals();
  }

  // ----- 원재료 손실 (수율) 분석 -----
  //  생지(배합 입력): 투입 배합 × 1배합 PK수(표준) vs 실제 생산 수량(실행 재고수량을 직접 입력한 줄만) → 수율·손실 원재료비
  //  파이: 반제품 라미네이팅 카트 투입 반죽(kg) vs 생산한 파이가 쓴 반죽(개수 × 1개당 반죽 g) → 반죽 손실률
  function lossCfg() { db.loss = db.loss && typeof db.loss === 'object' ? db.loss : {}; db.loss.cartKg = db.loss.cartKg || {}; db.loss.pie = db.loss.pie || {}; return db.loss; }
  function isLaminating(name) { return /라미네이팅/.test(String(name || '')); }
  function laminatingItems() { return db.semiItems.filter((s) => isLaminating(s.name)); }
  function pieDoughDefaults(products) {
    const recipes = Array.isArray(window.recipesData) ? window.recipesData : [];
    const byId = {}; recipes.forEach((r) => { byId[r.id] = r; });
    const out = {};
    products.filter((p) => p.cat === 'PIE').forEach((p) => {
      const r = recipes.find((x) => String(x.productCode) === String(p.productCode) && x.recipeType !== 'SUB');
      let grams = 0, names = [], subIds = [];
      ((r && r.ingredients) || []).forEach((i) => {
        if (i.rowType !== 'SUB_RECIPE' || !/반죽/.test(i.item || '')) return;
        const sub = byId[i.subRecipeId];
        const unit = String(i.unit || '').toUpperCase();
        grams += (Number(i.qty) || 0) * (unit === 'EA' ? Number(sub && sub.divisionWeight) || 0 : 1);
        names.push(i.item); if (i.subRecipeId) subIds.push(i.subRecipeId);
      });
      const nm = names.join(' ');
      const group = /패스츄리/.test(nm) ? '패스츄리 반죽 라미네이팅' : /파트푀이테|쇼숑/.test(nm) ? '쇼숑 반죽 라미네이팅' : /몽마르트/.test(nm) ? '몽마르트 반죽 라미네이팅' : '';
      out[p.productCode] = { group, gPerEa: grams > 0 && p.batchOutputEa > 0 ? Math.round((grams / p.batchOutputEa) * 10) / 10 : 0, recipeDiv: r ? Number(r.divisionWeight) || 0 : 0, doughNames: nm, subIds, hasRecipe: !!r };
    });
    return out;
  }
  // 라미네이팅 반죽 1kg 원재료비: 그 그룹 파이 레시피가 쓰는 반죽 반제품 레시피(가장 많이 쓰인 것)의 원재료비 ÷ 총중량
  function laminatingDoughInfo(name, products, defs) {
    const recipes = Array.isArray(window.recipesData) ? window.recipesData : [];
    const cnt = {};
    products.filter((p) => p.cat === 'PIE' && pieSetting(p.productCode, defs).group === name).forEach((p) => ((defs[p.productCode] || {}).subIds || []).forEach((id) => { cnt[id] = (cnt[id] || 0) + 1; }));
    const subId = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    const rc = subId && recipes.find((r) => r.id === subId);
    if (!rc || typeof window.calculateRecipeMetrics !== 'function') return { recipeName: rc ? rc.productName : '', costPerKg: null, batchKg: null };
    try {
      const m = window.calculateRecipeMetrics(JSON.parse(JSON.stringify(rc)));
      return { recipeName: rc.productName, costPerKg: m.weightTotalG > 0 ? (m.rawMaterialCost / m.weightTotalG) * 1000 : null, batchKg: m.weightTotalG / 1000 };
    } catch (e) { return { recipeName: rc.productName, costPerKg: null, batchKg: null }; }
  }
  function pieSetting(code, defs) {
    const c = lossCfg().pie[code] || {}, d = defs[code] || {};
    return { group: c.group !== undefined ? c.group : d.group || '', gPerEa: Number(c.gPerEa) > 0 ? Number(c.gPerEa) : Number(d.gPerEa) || 0, custom: c.gPerEa !== undefined || c.group !== undefined, def: d };
  }
  function lossPeriods(ym) {
    const weeks = monthWeeks(ym).map((w, i) => {
      const inM = w.filter((c) => c.inMonth);
      return { key: 'W' + (i + 1), label: `${i + 1}주`, sub: `${inM[0].date.slice(5).replace('-', '/')}~${inM[inM.length - 1].date.slice(5).replace('-', '/')}`, from: inM[0].date, to: inM[inM.length - 1].date };
    });
    const [y, m] = ym.split('-').map(Number);
    return [{ key: 'M', label: `${m}월 전체`, sub: '', from: `${ym}-01`, to: ymd(new Date(y, m, 0)) }, ...weeks];
  }
  function computeLoss(from, to, products, defs) {
    const doughRows = {}, pieGroups = {};
    laminatingItems().forEach((s) => { pieGroups[s.name] = { name: s.name, made: 0, usedCarts: 0, usedRecorded: false, carts: 0, cartKg: Number(lossCfg().cartKg[s.name]) || 0, usedKg: 0, pies: {}, missingG: [] }; });
    Object.entries(db.days).forEach(([d, day]) => {
      if (d < from || d > to) return;
      (day.semi || []).forEach((s) => { const g = pieGroups[s.name]; if (!g) return; g.made += Number(s.actual) || 0; if (s.used !== undefined && s.used !== '' && Number(s.used) >= 0 && (Number(s.used) > 0 || Number(s.actual) > 0)) { if (Number(s.used) > 0) g.usedRecorded = true; g.usedCarts += Number(s.used) || 0; } });
      (day.lines || []).forEach((l) => {
        const p = productByCode(l.code, products);
        if (l.unit === '배합') {
          if (!(Number(l.actual) > 0)) return;
          const r = doughRows[l.code] || (doughRows[l.code] = { code: l.code, name: l.name, cat: l.cat, su: lineStockUnit(l), batches: 0, expAll: 0, bC: 0, expC: 0, actC: 0, unconfirmed: 0, matPerBatch: p ? Number(p.batchMaterialCost) || 0 : 0 });
          const exp = lineAutoActualPk(l);
          r.batches += Number(l.actual); r.expAll += exp;
          if (l.pkManual) { r.bC += Number(l.actual); r.expC += exp; r.actC += Number(l.actualPk) || 0; } else r.unconfirmed++;
        } else if (l.cat === 'PIE') {
          const ps = pieSetting(l.code, defs);
          const g = pieGroups[ps.group]; if (!g) return;
          const ea = lineActualPk(l) * linePerStock(l) * (p ? Number(p.pkQuantityEa) || 0 : 0);
          if (!(ea > 0)) return;
          const pe = g.pies[l.code] || (g.pies[l.code] = { name: l.name, ea: 0, gPerEa: ps.gPerEa });
          pe.ea += ea;
          if (ps.gPerEa > 0) g.usedKg += (ea * ps.gPerEa) / 1000; else if (!g.missingG.includes(l.name)) g.missingG.push(l.name);
        }
      });
    });
    const dough = Object.values(doughRows).map((r) => {
      const yieldPct = r.expC > 0 ? (r.actC / r.expC) * 100 : null;
      const lossMoney = r.expC > 0 ? (1 - r.actC / r.expC) * r.bC * r.matPerBatch : null;
      return { ...r, yieldPct, diff: r.actC - r.expC, lossMoney };
    }).sort((a, b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat) || a.code.localeCompare(b.code));
    const pies = Object.values(pieGroups).map((g) => {
      g.basis = g.usedRecorded ? '사용 카트' : '만든 카트(사용 미입력)';
      g.carts = g.usedRecorded ? g.usedCarts : g.made;
      const inputKg = g.carts * g.cartKg;
      return { ...g, inputKg, diffKg: inputKg - g.usedKg, lossPct: inputKg > 0 ? (1 - g.usedKg / inputKg) * 100 : null };
    });
    const sumExp = dough.reduce((s, r) => s + r.expC, 0), sumAct = dough.reduce((s, r) => s + r.actC, 0);
    return { dough, pies, doughYield: sumExp > 0 ? (sumAct / sumExp) * 100 : null, doughLossMoney: dough.reduce((s, r) => s + (r.lossMoney || 0), 0), unconfirmed: dough.reduce((s, r) => s + r.unconfirmed, 0) };
  }
  let lossPeriodKey = 'M';
  function yieldCell(v) {
    if (v === null || v === undefined) return '<span class="text-stone-400">-</span>';
    const cls = v >= 100 ? 'text-emerald-700' : v >= 97 ? 'text-amber-700' : 'text-rose-700';
    return `<span class="font-extrabold tabular-nums ${cls}">${v.toFixed(1)}%</span>`;
  }
  function lossCell(v) {
    if (v === null || v === undefined) return '<span class="text-stone-400">-</span>';
    const cls = v <= 0 ? 'text-emerald-700' : v <= 3 ? 'text-amber-700' : 'text-rose-700';
    return `<span class="font-extrabold tabular-nums ${cls}">${v.toFixed(1)}%</span>`;
  }
  function renderLoss() {
    const products = getProducts(), defs = pieDoughDefaults(products);
    const periods = lossPeriods(cursorMonth);
    const per = periods.find((p) => p.key === lossPeriodKey) || periods[0];
    const L = computeLoss(per.from, per.to, products, defs);
    const [y, m] = cursorMonth.split('-').map(Number);
    const prevYm = ymd(new Date(y, m - 2, 1)).slice(0, 7), nextYm = ymd(new Date(y, m, 1)).slice(0, 7);
    const pBtns = periods.map((p) => `<button type="button" onclick="Prod.setLossPeriod('${p.key}')" class="px-2.5 py-1 rounded-xl text-xs cursor-pointer ${p.key === per.key ? 'bg-amber-600 text-white font-extrabold' : 'bg-white border border-stone-200 text-stone-600 font-bold hover:bg-stone-100'}">${p.label}${p.sub ? ` <span class="${p.key === per.key ? 'text-amber-100' : 'text-stone-400'} font-semibold">${p.sub}</span>` : ''}</button>`).join('');
    const doughTrs = L.dough.map((r) => `<tr class="border-b border-stone-100 whitespace-nowrap">
        <td class="py-1.5 px-2 text-xs text-stone-500">${CAT_LABEL[r.cat] || ''}</td><td class="py-1.5 px-2 font-bold">${esc(r.name)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums">${num(r.batches)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums text-stone-500">${num(r.bC)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums">${r.bC ? num(r.expC) + ' ' + r.su : '-'}</td>
        <td class="py-1.5 px-2 text-right tabular-nums font-bold">${r.bC ? num(r.actC) + ' ' + r.su : '-'}</td>
        <td class="py-1.5 px-2 text-right tabular-nums ${r.diff < 0 ? 'text-rose-700' : 'text-emerald-700'}">${r.expC > 0 ? (r.diff > 0 ? '+' : '') + num(r.diff) : '-'}</td>
        <td class="py-1.5 px-2 text-right">${yieldCell(r.yieldPct)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums ${r.lossMoney > 0 ? 'text-rose-700 font-bold' : 'text-emerald-700'}">${r.lossMoney === null ? '-' : (r.matPerBatch ? won(r.lossMoney) : '<span class="text-stone-400" title="제품단가 탭 원재료비 없음">원재료비 없음</span>')}</td>
        <td class="py-1.5 px-2 text-right text-xs ${r.unconfirmed ? 'text-amber-700 font-bold' : 'text-stone-400'}">${r.unconfirmed ? r.unconfirmed + '건' : '-'}</td>
      </tr>`).join('');
    const pieCards = L.pies.map((g) => {
      const pieRows = Object.values(g.pies).map((pe) => `<div class="flex justify-between text-xs"><span>${esc(pe.name)} ${num(pe.ea, 0)}개 × ${pe.gPerEa ? num(pe.gPerEa) + 'g' : '<b class="text-rose-700">g 미설정</b>'}</span><span class="tabular-nums">${num((pe.ea * pe.gPerEa) / 1000)}kg</span></div>`).join('');
      return `<div class="rounded-xl border border-stone-200 p-3 flex flex-col gap-1.5">
        <div class="flex items-center justify-between"><b class="text-sm">${esc(g.name.replace(' 라미네이팅', ''))}</b>${g.cartKg ? lossCell(g.lossPct) : '<span class="text-xs font-bold text-rose-700">1카트 kg 미설정</span>'}</div>
        <div class="grid grid-cols-2 gap-x-2 text-xs tabular-nums"><span class="text-stone-500">투입 카트 <span class="text-[11px] ${g.usedRecorded ? 'text-blue-700' : 'text-amber-700'}">(${g.basis})</span></span><span class="text-right font-bold">${num(g.carts)}카트${g.cartKg ? ` × ${num(g.cartKg)}kg` : ''}</span>
          <span class="text-stone-500">투입 반죽</span><span class="text-right font-bold">${g.cartKg ? num(g.inputKg) + 'kg' : '-'}</span>
          <span class="text-stone-500">생산에 쓴 반죽</span><span class="text-right font-bold">${num(g.usedKg)}kg</span>
          <span class="text-stone-500">차이(손실)</span><span class="text-right font-extrabold ${g.diffKg > 0 ? 'text-rose-700' : 'text-emerald-700'}">${g.cartKg ? num(g.diffKg) + 'kg' : '-'}</span></div>
        ${pieRows ? `<div class="border-t border-stone-100 pt-1 flex flex-col gap-0.5">${pieRows}</div>` : '<div class="text-xs text-stone-400">이 기간 생산 기록 없음</div>'}
      </div>`;
    }).join('');
    // 주별 비교
    const trend = periods.filter((p) => p.key !== 'M').map((p) => ({ p, r: computeLoss(p.from, p.to, products, defs) }));
    const trendTrs = trend.map(({ p, r }) => `<tr class="border-b border-stone-100 whitespace-nowrap ${p.key === per.key ? 'bg-amber-50' : ''}"><td class="py-1.5 px-2 font-bold">${p.label} <span class="text-xs text-stone-400">${p.sub}</span></td><td class="py-1.5 px-2 text-right">${yieldCell(r.doughYield)}</td><td class="py-1.5 px-2 text-right tabular-nums ${r.doughLossMoney > 0 ? 'text-rose-700' : 'text-emerald-700'}">${r.doughYield === null ? '-' : won(r.doughLossMoney)}</td>${r.pies.map((g) => `<td class="py-1.5 px-2 text-right">${g.cartKg && g.carts ? lossCell(g.lossPct) : '<span class="text-stone-400">-</span>'}</td>`).join('')}</tr>`).join('');
    return `
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5">
          <button type="button" onclick="Prod.setMonth('${prevYm}')" class="w-8 h-8 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">‹</button>
          <h3 class="text-base font-extrabold px-1">${y}년 ${m}월 원재료 손실</h3>
          <button type="button" onclick="Prod.setMonth('${nextYm}')" class="w-8 h-8 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">›</button>
          <div class="flex flex-wrap gap-1 ml-2">${pBtns}</div>
        </div>
        <button type="button" onclick="Prod.openLossSettings()" class="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold cursor-pointer hover:bg-stone-50">손실 기준 설정 (카트 kg · 파이 반죽 g)</button>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs"><div class="text-xs font-bold text-stone-500">생지 수율 (${esc(per.label)})</div><div class="mt-1 text-xl">${yieldCell(L.doughYield)}</div><div class="text-xs text-stone-500">실제 생산 ÷ 표준(투입 배합 × 1배합 PK수)</div></div>
        <div class="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs"><div class="text-xs font-bold text-stone-500">생지 손실 원재료비</div><div class="mt-1 text-xl font-extrabold tabular-nums ${L.doughLossMoney > 0 ? 'text-rose-700' : 'text-emerald-700'}">${L.doughYield === null ? '-' : won(L.doughLossMoney)}</div><div class="text-xs text-stone-500">−면 표준보다 더 생산</div></div>
        <div class="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs"><div class="text-xs font-bold text-stone-500">파이 반죽 손실 (그룹별)</div><div class="mt-1 text-sm flex flex-col gap-0.5">${L.pies.filter((g) => g.carts || g.usedKg).map((g) => `<div class="flex justify-between"><span>${esc(g.name.replace(' 반죽 라미네이팅', ''))}</span>${g.cartKg ? lossCell(g.lossPct) : '<span class="text-xs text-rose-700 font-bold">kg 미설정</span>'}</div>`).join('') || '<span class="text-stone-400 text-xs">기록 없음</span>'}</div></div>
        <div class="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs"><div class="text-xs font-bold text-stone-500">확인 안 된 생지 줄</div><div class="mt-1 text-xl font-extrabold ${L.unconfirmed ? 'text-amber-700' : 'text-emerald-700'}">${L.unconfirmed}건</div><div class="text-xs text-stone-500">실제 생산 수량 미입력 → 수율 계산 제외</div></div>
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <h3 class="text-sm font-extrabold mb-1">생지 (알생지·파베이크·제과) — 투입 배합 대비 실제 생산</h3>
        <div class="text-xs text-stone-500 mb-2">수율은 일자 입력창에서 <b>실행 재고수량</b>(실제 포장 PK)을 직접 적은 줄만 계산합니다. 비워 둔 줄은 표준값과 같다고 볼 수 없어 '확인 안 됨'으로 뺍니다.</div>
        <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm">
          <thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600 whitespace-nowrap"><th class="py-2 px-2">파트</th><th class="py-2 px-2">품목</th><th class="py-2 px-2 text-right">투입 배합</th><th class="py-2 px-2 text-right">그중 확인</th><th class="py-2 px-2 text-right">표준 생산</th><th class="py-2 px-2 text-right">실제 생산</th><th class="py-2 px-2 text-right">차이</th><th class="py-2 px-2 text-right">수율</th><th class="py-2 px-2 text-right">손실 원재료비</th><th class="py-2 px-2 text-right">미확인</th></tr></thead>
          <tbody>${doughTrs || '<tr><td colspan="10" class="py-6 text-center text-xs text-stone-400">이 기간 생지 실행 기록이 없습니다.</td></tr>'}</tbody></table></div>
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <h3 class="text-sm font-extrabold mb-1">파이 — 라미네이팅 카트 투입 반죽 대비 생산에 쓴 반죽</h3>
        <div class="text-xs text-stone-500 mb-2">투입 = 라미네이팅 <b>사용 카트</b>(없으면 만든 카트) × 1카트 반죽 kg · 사용 = 파이 생산 개수 × 1개당 반죽 g. 카트를 만든 날과 성형한 날이 다를 수 있어 하루보다 주·월로 보세요.</div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-${Math.max(1, Math.min(5, L.pies.length))} gap-3">${pieCards}</div>
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <h3 class="text-sm font-extrabold mb-2">${m}월 주별 비교</h3>
        <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm"><thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600 whitespace-nowrap"><th class="py-2 px-2">주</th><th class="py-2 px-2 text-right">생지 수율</th><th class="py-2 px-2 text-right">생지 손실 원재료비</th>${laminatingItems().map((s) => `<th class="py-2 px-2 text-right">${esc(s.name.replace(' 반죽 라미네이팅', ''))} 반죽 손실</th>`).join('')}</tr></thead><tbody>${trendTrs}</tbody></table></div>
      </div>`;
  }
  function openLossSettings() {
    const products = getProducts(), defs = pieDoughDefaults(products), cfg = lossCfg();
    const lam = laminatingItems();
    const cartRows = lam.map((s) => { const di = laminatingDoughInfo(s.name, products, defs); return `<tr class="border-b border-stone-100"><td class="py-1.5 px-2"><div class="font-bold">${esc(s.name)}</div><div class="text-xs text-stone-500">${di.recipeName ? `반죽 레시피 ${esc(di.recipeName)} · 1배합 ${num(di.batchKg)}kg · 원재료비 ${di.costPerKg == null ? '-' : won(di.costPerKg) + '/kg'}` : '연결된 파이 반죽 레시피 없음'}</div></td><td class="py-1.5 px-2 text-right"><input type="number" min="0" step="any" data-cart="${esc(s.name)}" value="${cfg.cartKg[s.name] || ''}" placeholder="kg" class="no-spinner w-24 text-right border border-stone-300 rounded-lg px-2 py-1 font-bold tabular-nums"> kg</td></tr>`; }).join('');
    const pieRows = products.filter((p) => p.cat === 'PIE').map((p) => {
      const st = pieSetting(p.productCode, defs), d = defs[p.productCode] || {};
      const warn = !d.hasRecipe ? '레시피 없음' : !d.gPerEa ? '레시피에 반죽 없음' : (d.recipeDiv && Math.abs(d.gPerEa - d.recipeDiv) / d.recipeDiv > 0.3 ? `레시피 분할중량 ${num(d.recipeDiv)}g과 차이 큼` : '');
      return `<tr class="border-b border-stone-100"><td class="py-1.5 px-2 font-bold whitespace-nowrap">${esc(p.productCode)} ${esc(p.productName)}</td>
        <td class="py-1.5 px-2"><select data-pie-group="${esc(p.productCode)}" class="border border-stone-300 rounded-lg px-2 py-1 text-xs"><option value="">(손실 분석 안 함)</option>${lam.map((s) => `<option ${s.name === st.group ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></td>
        <td class="py-1.5 px-2 text-right whitespace-nowrap"><input type="number" min="0" step="any" data-pie-g="${esc(p.productCode)}" value="${cfg.pie[p.productCode] && cfg.pie[p.productCode].gPerEa ? cfg.pie[p.productCode].gPerEa : ''}" placeholder="${d.gPerEa ? num(d.gPerEa) : 'g'}" class="no-spinner w-20 text-right border border-stone-300 rounded-lg px-2 py-1 font-bold tabular-nums"> g</td>
        <td class="py-1.5 px-2 text-xs ${warn ? 'text-rose-700 font-bold' : 'text-stone-500'}">${d.gPerEa ? `레시피 계산 ${num(d.gPerEa)}g` : ''}${warn ? (d.gPerEa ? ' · ' : '') + warn : ''}</td></tr>`;
    }).join('');
    modal(`<div class="px-5 py-3 border-b border-stone-200"><h3 class="text-base font-extrabold">손실 기준 설정</h3><div class="text-xs text-stone-500 mt-0.5">파이 반죽 손실 계산에 쓰는 기준입니다. 1개당 반죽 g을 비워 두면 레시피에서 계산한 값(회색)을 씁니다.</div></div>
      <div class="p-4 max-h-[65vh] overflow-y-auto flex flex-col gap-4">
        <div><h4 class="text-sm font-extrabold mb-1">라미네이팅 1카트 반죽 중량</h4><table class="w-full text-sm">${cartRows}</table></div>
        <div><h4 class="text-sm font-extrabold mb-1">파이별 반죽 그룹 · 1개당 반죽 사용량</h4><div class="text-xs text-stone-500 mb-1">레시피 계산 = 레시피의 반죽 반제품 총량 ÷ 제품단가 '1배합 실생산(ea)'</div><table class="w-full text-sm">${pieRows}</table></div>
      </div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2"><button type="button" onclick="Prod.closeModal()" class="px-4 py-2 rounded-xl border border-stone-300 text-sm font-bold cursor-pointer">취소</button><button type="button" onclick="Prod.saveLossSettings()" class="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">저장</button></div>`);
  }
  function saveLossSettings() {
    const cfg = lossCfg(), defs = pieDoughDefaults(getProducts());
    document.querySelectorAll('[data-cart]').forEach((el) => { const v = parseFloat(el.value); if (v > 0) cfg.cartKg[el.dataset.cart] = v; else delete cfg.cartKg[el.dataset.cart]; });
    document.querySelectorAll('[data-pie-group]').forEach((el) => {
      const code = el.dataset.pieGroup, gEl = document.querySelector(`[data-pie-g="${CSS.escape(code)}"]`), g = parseFloat(gEl && gEl.value);
      const d = defs[code] || {}, entry = {};
      if (el.value !== (d.group || '')) entry.group = el.value;
      if (g > 0) entry.gPerEa = g;
      if (Object.keys(entry).length) cfg.pie[code] = entry; else delete cfg.pie[code];
    });
    closeModal(); markChanged(); render();
    toast('손실 기준을 저장했습니다.', 'success');
  }

  // ----- 생지 재고 -----
  function computeStock() {
    const products = getProducts();
    const base = db.stockBase;
    const feed = typeof window.barogaMsStockFeed === 'function' ? window.barogaMsStockFeed() : { loaded: false, records: [], links: {} };
    const map = {};
    const ensure = (code, name) => map[code] || (map[code] = { code, name, base: 0, produced: 0, shipped: 0, adjust: 0 });
    products.forEach((p) => ensure(String(p.productCode), p.productName));
    const after = (d) => !base || String(d || '') > base.date;
    if (base) Object.entries(base.counts || {}).forEach(([code, pk]) => { if (code.startsWith('SEMI:')) return; ensure(code, (productByCode(code, products) || {}).productName || code).base = Number(pk) || 0; });
    Object.entries(db.days).forEach(([d, day]) => { if (!after(d)) return; (day.lines || []).forEach((l) => { ensure(String(l.code), l.name).produced += lineActualPk(l); }); });
    const unmapped = {};
    feed.records.forEach((r) => {
      if (!after(r.date)) return;
      (r.items || []).forEach((it) => {
        const code = String((it.code && feed.links[it.code]) || (it.name && feed.links[it.name]) || '').trim();
        const prod = code ? productByCode(code, products) : null;
        const pk = prod && prod.stockUnit === 'BOX' ? (Number(it.box) || 0) : (Number(it.pk) || 0); // BOX 운영 품목은 엠즈 BOX 수량
        if (code && map[code]) map[code].shipped += pk;
        else { const k = it.code + ' ' + it.name; unmapped[k] = (unmapped[k] || 0) + pk; }
      });
    });
    db.stockAdjusts.forEach((a) => { if (after(a.date) && !String(a.code).startsWith('SEMI:')) ensure(String(a.code), a.name).adjust += Number(a.deltaPk) || 0; });
    // 라미네이팅 반제품 재고(카트) = 실사 + 만든 − 사용 − 폐기 ± 조정, 평가 = 카트 × 1카트 kg × 반죽 원재료비/kg (판매 품목 아님)
    const defs = pieDoughDefaults(products);
    const semiRows = laminatingItems().map((s) => {
      const key = 'SEMI:' + s.name;
      const x = { key, name: s.name, unit: s.unit || '카트', base: base ? Number((base.counts || {})[key]) || 0 : 0, made: 0, used: 0, waste: 0, adjust: 0 };
      Object.entries(db.days).forEach(([d, day]) => { if (!after(d)) return; (day.semi || []).forEach((l) => { if (l.name !== s.name) return; x.made += Number(l.actual) || 0; x.used += Number(l.used) || 0; x.waste += Number(l.waste) || 0; }); });
      db.stockAdjusts.forEach((a) => { if (after(a.date) && a.code === key) x.adjust += Number(a.deltaPk) || 0; });
      x.cur = r1(x.base + x.made - x.used - x.waste + x.adjust);
      x.cartKg = Number(lossCfg().cartKg[s.name]) || 0;
      const di = laminatingDoughInfo(s.name, products, defs);
      x.costPerKg = di.costPerKg; x.recipeName = di.recipeName;
      x.cartCost = x.cartKg && di.costPerKg != null ? x.cartKg * di.costPerKg : null;
      x.amt = x.cartCost == null ? null : x.cur * x.cartCost;
      return x;
    });
    const rows = Object.values(map).map((x) => {
      const p = productByCode(x.code, products);
      const cur = r1(x.base + x.produced - x.shipped + x.adjust);
      const per = p ? p.pkPerStock || 1 : 1;
      const cost = p && p.pkTotalCost != null ? p.pkTotalCost * per : null, buy = p ? p.msBuyPricePk : 0; // 원가는 PK당 → 재고 단위(BOX)로 환산
      return { ...x, cat: p ? p.cat : '', unit: p ? p.stockUnit : 'PK', cur, cost, buy, costAmt: cost == null ? null : cur * cost, buyAmt: cur * buy };
    }).sort((a, b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat) || a.code.localeCompare(b.code));
    return { rows, unmapped, feed, base, semiRows };
  }
  function renderStock() {
    const { rows, unmapped, feed, base, semiRows } = computeStock();
    const semiActive = semiRows.filter((r) => r.base || r.made || r.used || r.waste || r.adjust || r.cur);
    const semiTot = semiActive.reduce((s2, r) => s2 + (r.amt > 0 ? r.amt : 0), 0);
    const semiNoCost = semiActive.filter((r) => r.cur > 0 && r.cartCost == null).length;
    const semiTrs = semiRows.map((r) => `<tr class="border-b border-stone-100 ${r.cur < 0 ? 'bg-rose-50' : ''}">
        <td class="py-1.5 px-2 font-bold">${esc(r.name)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums">${num(r.base)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums text-emerald-700">${r.made ? '+' + num(r.made) : '-'}</td>
        <td class="py-1.5 px-2 text-right tabular-nums text-blue-700">${r.used ? '-' + num(r.used) : '-'}</td>
        <td class="py-1.5 px-2 text-right tabular-nums text-rose-700">${r.waste ? '-' + num(r.waste) : '-'}</td>
        <td class="py-1.5 px-2 text-right tabular-nums">${r.adjust ? (r.adjust > 0 ? '+' : '') + num(r.adjust) : '-'}</td>
        <td class="py-1.5 px-2 text-right tabular-nums font-extrabold ${r.cur < 0 ? 'text-rose-700' : 'text-stone-900'}">${num(r.cur)} <span class="text-xs font-bold text-stone-500">${esc(r.unit)}</span></td>
        <td class="py-1.5 px-2 text-right tabular-nums text-stone-600">${r.cartKg ? num(r.cartKg) + 'kg' : '<span class="text-rose-600">미설정</span>'}</td>
        <td class="py-1.5 px-2 text-right tabular-nums text-stone-600" title="${esc(r.recipeName || '')}">${r.costPerKg == null ? '<span class="text-rose-600">레시피 없음</span>' : won(r.costPerKg)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums font-bold">${r.amt == null ? '-' : won(r.amt)}</td>
      </tr>`).join('');
    const active = rows.filter((r) => r.base || r.produced || r.shipped || r.adjust || r.cur);
    const totCost = active.reduce((s, r) => s + (r.costAmt > 0 ? r.costAmt : 0), 0), totBuy = active.reduce((s, r) => s + (r.buyAmt > 0 ? r.buyAmt : 0), 0);
    const noCost = active.filter((r) => r.cur > 0 && r.cost == null).length;
    const negative = active.filter((r) => r.cur < 0);
    const unmappedList = Object.entries(unmapped);
    const trs = rows.map((r) => `<tr class="border-b border-stone-100 ${r.cur < 0 ? 'bg-rose-50' : ''}">
        <td class="py-1.5 px-2 text-xs text-stone-500">${CAT_LABEL[r.cat] || '-'}</td>
        <td class="py-1.5 px-2 font-mono text-xs">${esc(r.code)}</td>
        <td class="py-1.5 px-2 font-bold">${esc(r.name)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums">${num(r.base)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums text-emerald-700">${r.produced ? '+' + num(r.produced) : '-'}</td>
        <td class="py-1.5 px-2 text-right tabular-nums text-rose-700">${r.shipped ? '-' + num(r.shipped) : '-'}</td>
        <td class="py-1.5 px-2 text-right tabular-nums">${r.adjust ? (r.adjust > 0 ? '+' : '') + num(r.adjust) : '-'}</td>
        <td class="py-1.5 px-2 text-right tabular-nums font-extrabold ${r.cur < 0 ? 'text-rose-700' : 'text-stone-900'}">${num(r.cur)}${r.unit !== 'PK' ? ` <span class="text-xs font-bold text-stone-500">${r.unit}</span>` : ''}</td>
        <td class="py-1.5 px-2 text-right tabular-nums text-stone-600">${r.cost == null ? '<span class="text-rose-600" title="제품단가 탭에서 PK 총생산원가가 계산되지 않음">미산출</span>' : won(r.cost)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums font-bold">${r.costAmt == null ? '-' : won(r.costAmt)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums text-stone-600">${won(r.buy)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums font-bold text-amber-900">${won(r.buyAmt)}</td>
      </tr>`).join('');
    const adjRows = db.stockAdjusts.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map((a) => `<tr class="border-b border-stone-100"><td class="py-1 px-2">${esc(a.date)}</td><td class="py-1 px-2">${esc(a.name)}</td><td class="py-1 px-2 text-right tabular-nums font-bold ${a.deltaPk < 0 ? 'text-rose-700' : 'text-emerald-700'}">${a.deltaPk > 0 ? '+' : ''}${num(a.deltaPk)} ${String(a.code).startsWith('SEMI:') ? '카트' : esc((productByCode(a.code) || {}).stockUnit || 'PK')}</td><td class="py-1 px-2">${esc(a.reason)}</td><td class="py-1 px-2 text-center"><button type="button" onclick="Prod.removeAdjust('${a.id}')" class="text-xs text-rose-700 font-bold cursor-pointer">삭제</button></td></tr>`).join('');
    return `
      ${!base ? `<div class="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm"><b>재고 실사 수량이 아직 없습니다.</b> 냉동창고 재고를 세어 [재고 실사 입력]에 넣으면, 그 날 이후의 생산(실행 PK)과 엠즈 입고(출고)로 재고가 자동 계산됩니다.</div>` : ''}
      ${!feed.loaded ? `<div class="p-3 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 text-xs flex flex-wrap items-center gap-2"><span>엠즈 입고 기록을 이 기기에 저장된 사본으로 계산 중입니다. 최신 출고를 반영하려면</span><button type="button" onclick="Prod.loadMs()" class="px-2.5 py-1 rounded-lg bg-stone-900 text-white font-bold cursor-pointer">엠즈 입고 불러오기</button></div>` : ''}
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div class="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs"><div class="text-xs font-bold text-stone-500">재고 실사 기준일</div><div class="mt-1 text-xl font-extrabold">${base ? esc(base.date) : '-'}</div><div class="text-xs text-stone-500">이 날 이후 생산·출고 반영</div></div>
        <div class="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs"><div class="text-xs font-bold text-stone-500">재고 자산 (생산원가 기준)</div><div class="mt-1 text-xl font-extrabold tabular-nums">${won(totCost)}</div><div class="text-xs text-stone-500">PK 총생산원가 × 현재고 (음수 재고 제외)${noCost ? ` · 원가 미산출 ${noCost}개 품목 제외` : ''}</div></div>
        <div class="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs"><div class="text-xs font-bold text-stone-500">재고 자산 (엠즈 매입가 기준)</div><div class="mt-1 text-xl font-extrabold tabular-nums text-amber-900">${won(totBuy)}</div><div class="text-xs text-stone-500">엠즈 매입가(PK) × 현재고 (음수 재고 제외)</div></div>
        <div class="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs"><div class="text-xs font-bold text-stone-500">반제품(라미네이팅) 재고</div><div class="mt-1 text-xl font-extrabold tabular-nums">${won(semiTot)}</div><div class="text-xs text-stone-500">원재료비 기준 (판매 품목 아님)${semiNoCost ? ` · 기준 미설정 ${semiNoCost}개 제외` : ''}</div></div>
        <div class="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs"><div class="text-xs font-bold text-stone-500">확인 필요</div><div class="mt-1 text-xl font-extrabold ${negative.length || unmappedList.length ? 'text-rose-700' : 'text-emerald-700'}">${negative.length + unmappedList.length}건</div><div class="text-xs text-stone-500">재고 음수 ${negative.length} · 연결 안 된 엠즈 상품 ${unmappedList.length}</div></div>
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 class="text-sm font-extrabold text-stone-900">냉동창고 생지 재고 <span class="text-xs font-bold text-stone-500">(PK · 쇼숑오뽐므는 BOX=4PK)</span></h3>
          <div class="flex gap-1.5 text-xs">
            <button type="button" onclick="Prod.openCountModal()" class="px-3 py-1.5 rounded-lg bg-stone-900 text-white font-extrabold cursor-pointer">재고 실사 입력</button>
            <button type="button" onclick="Prod.openAdjustModal()" class="px-3 py-1.5 rounded-lg border border-stone-300 font-bold cursor-pointer hover:bg-stone-50">재고 조정 (폐기·회송 등)</button>
          </div>
        </div>
        <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm min-w-[1100px]">
          <thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600"><th class="py-2 px-2">파트</th><th class="py-2 px-2">코드</th><th class="py-2 px-2">품목</th><th class="py-2 px-2 text-right">실사</th><th class="py-2 px-2 text-right">+생산</th><th class="py-2 px-2 text-right">−엠즈 출고</th><th class="py-2 px-2 text-right">±조정</th><th class="py-2 px-2 text-right">현재고</th><th class="py-2 px-2 text-right">원가/단위</th><th class="py-2 px-2 text-right">원가 금액</th><th class="py-2 px-2 text-right">매입가/단위</th><th class="py-2 px-2 text-right">매입가 금액</th></tr></thead>
          <tbody>${trs || '<tr><td colspan="12" class="py-6 text-center text-xs text-stone-400">제품단가 탭 품목이 없습니다.</td></tr>'}</tbody>
        </table></div>
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1"><h3 class="text-sm font-extrabold text-stone-900">반제품 재고 — 라미네이팅 카트</h3><button type="button" onclick="Prod.openLossSettings()" class="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold cursor-pointer hover:bg-stone-50">1카트 kg 설정</button></div>
        <div class="text-xs text-stone-500 mb-2">현재고 = 실사 + 만든 카트 − 사용 카트 − 폐기 ± 조정. 금액 = 카트 × 1카트 반죽 kg × 반죽 원재료비/kg (레시피 기준).</div>
        <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm min-w-[900px]">
          <thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600"><th class="py-2 px-2">반제품</th><th class="py-2 px-2 text-right">실사</th><th class="py-2 px-2 text-right">+만듦</th><th class="py-2 px-2 text-right">−사용</th><th class="py-2 px-2 text-right">−폐기</th><th class="py-2 px-2 text-right">±조정</th><th class="py-2 px-2 text-right">현재고</th><th class="py-2 px-2 text-right">1카트</th><th class="py-2 px-2 text-right">원재료비/kg</th><th class="py-2 px-2 text-right">원재료비 금액</th></tr></thead>
          <tbody>${semiTrs}</tbody></table></div>
      </div>
      ${unmappedList.length ? `<div class="bg-white rounded-2xl border border-rose-200 p-4 text-xs"><h4 class="font-extrabold text-rose-800 mb-1">재고에서 빼지 못한 엠즈 출고 (품목코드 연결 없음)</h4><div class="text-stone-600 mb-2">엠즈 입고 → 매입가 DB 관리에서 '레시피 품목코드'를 연결하면 재고에서 빠집니다. 생산일지 품목(제품단가 탭)에 없는 상품일 수도 있습니다.</div>${unmappedList.map(([k, pk]) => `<div class="flex justify-between border-b border-stone-100 py-1"><span>${esc(k)}</span><b class="tabular-nums">${num(pk)} PK</b></div>`).join('')}</div>` : ''}
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 text-xs">
        <h4 class="text-sm font-extrabold text-stone-900 mb-2">재고 조정 기록</h4>
        ${adjRows ? `<table class="w-full"><thead><tr class="text-stone-500 border-b"><th class="py-1 px-2 text-left">날짜</th><th class="py-1 px-2 text-left">품목</th><th class="py-1 px-2 text-right">증감</th><th class="py-1 px-2 text-left">사유</th><th></th></tr></thead><tbody>${adjRows}</tbody></table>` : '<div class="text-stone-400">조정 기록이 없습니다.</div>'}
      </div>`;
  }
  function modal(html) { const h = document.getElementById('prodModal'); if (h) h.innerHTML = `<div class="fixed inset-0 z-50 bg-stone-900/40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto" onclick="if(event.target===this)Prod.closeModal()"><div class="bg-white rounded-2xl shadow-xl w-full max-w-[720px]">${html}</div></div>`; }
  function closeModal() { const h = document.getElementById('prodModal'); if (h) h.innerHTML = ''; }
  function openCountModal() {
    const { rows, semiRows } = computeStock();
    modal(`<div class="px-5 py-3 border-b border-stone-200"><h3 class="text-base font-extrabold">재고 실사 입력</h3><div class="text-xs text-stone-500 mt-0.5">기준일 <b>마감 후</b> 냉동창고에 있는 PK 수량입니다. 칸에는 지금 계산된 재고가 미리 들어 있으니, 센 수량으로 고쳐 주세요.</div></div>
      <div class="p-4 max-h-[60vh] overflow-y-auto"><div class="mb-3"><label class="text-xs font-bold">기준일</label> <input id="prodCountDate" type="date" value="${today()}" class="ml-2 border border-stone-300 rounded-lg px-2 py-1 text-sm"></div>
      <table class="w-full text-sm">${semiRows.map((r) => `<tr class="border-b border-stone-100 bg-stone-50"><td class="py-1 px-2 text-xs text-stone-500">반제품</td><td class="py-1 px-2 font-bold">${esc(r.name)}</td><td class="py-1 px-2 text-right"><input type="number" min="0" step="any" data-count-code="${esc(r.key)}" value="${r.cur > 0 ? r.cur : 0}" class="no-spinner w-24 text-right border border-stone-300 rounded-lg px-2 py-1 font-bold tabular-nums"> ${esc(r.unit)}</td></tr>`).join('')}${rows.map((r) => `<tr class="border-b border-stone-100"><td class="py-1 px-2 text-xs text-stone-500">${CAT_LABEL[r.cat] || ''}</td><td class="py-1 px-2 font-bold">${esc(r.name)}</td><td class="py-1 px-2 text-right"><input type="number" min="0" step="any" data-count-code="${esc(r.code)}" value="${r.cur > 0 ? r.cur : 0}" class="no-spinner w-24 text-right border border-stone-300 rounded-lg px-2 py-1 font-bold tabular-nums"> ${esc(r.unit || 'PK')}</td></tr>`).join('')}</table></div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2"><button type="button" onclick="Prod.closeModal()" class="px-4 py-2 rounded-xl border border-stone-300 text-sm font-bold cursor-pointer">취소</button><button type="button" onclick="Prod.saveCount()" class="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">실사 수량 확정</button></div>`);
  }
  function saveCount() {
    const date = (document.getElementById('prodCountDate') || {}).value;
    if (!date) { toast('기준일을 넣어 주세요.', 'error'); return; }
    const counts = {};
    document.querySelectorAll('[data-count-code]').forEach((el) => { const v = parseFloat(el.value); if (v > 0) counts[el.dataset.countCode] = v; });
    const prev = db.stockBase;
    db.stockBase = { date, counts, savedAt: new Date().toISOString(), prevBaseDate: prev ? prev.date : '' };
    closeModal(); markChanged(); render();
    toast(`${date} 기준 재고 실사 ${Object.keys(counts).length}개 품목을 확정했습니다.`, 'success');
  }
  function openAdjustModal() {
    const products = getProducts();
    modal(`<div class="px-5 py-3 border-b border-stone-200"><h3 class="text-base font-extrabold">재고 조정</h3><div class="text-xs text-stone-500 mt-0.5">폐기·샘플·회송 입고 등 생산/엠즈 출고 말고 재고가 바뀐 경우. 빠지면 −, 들어오면 +.</div></div>
      <div class="p-4 grid grid-cols-2 gap-3 text-sm">
        <label class="flex flex-col gap-1 text-xs font-bold">날짜<input id="prodAdjDate" type="date" value="${today()}" class="border border-stone-300 rounded-lg px-2 py-1 text-sm font-normal"></label>
        <label class="flex flex-col gap-1 text-xs font-bold">품목<select id="prodAdjCode" class="border border-stone-300 rounded-lg px-2 py-1 text-sm font-normal"><optgroup label="생지 (PK)">${products.map((p) => `<option value="${esc(p.productCode)}">${esc(p.productCode)} ${esc(p.productName)}</option>`).join('')}</optgroup><optgroup label="반제품 (카트)">${laminatingItems().map((s) => `<option value="${esc('SEMI:' + s.name)}">${esc(s.name)}</option>`).join('')}</optgroup></select></label>
        <label class="flex flex-col gap-1 text-xs font-bold">증감 (PK · 쇼숑 BOX · 반제품 카트)<input id="prodAdjPk" type="number" step="any" placeholder="예: -12" class="border border-stone-300 rounded-lg px-2 py-1 text-sm font-normal"></label>
        <label class="flex flex-col gap-1 text-xs font-bold">사유<input id="prodAdjReason" type="text" placeholder="예: 유통기한 폐기" class="border border-stone-300 rounded-lg px-2 py-1 text-sm font-normal"></label>
      </div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2"><button type="button" onclick="Prod.closeModal()" class="px-4 py-2 rounded-xl border border-stone-300 text-sm font-bold cursor-pointer">취소</button><button type="button" onclick="Prod.saveAdjust()" class="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">조정 기록</button></div>`);
  }
  function saveAdjust() {
    const date = document.getElementById('prodAdjDate').value, code = document.getElementById('prodAdjCode').value;
    const delta = parseFloat(document.getElementById('prodAdjPk').value), reason = document.getElementById('prodAdjReason').value.trim();
    if (!date || !code || !delta) { toast('날짜·품목·증감 PK를 넣어 주세요.', 'error'); return; }
    if (!reason) { toast('사유를 적어 주세요.', 'error'); return; }
    const p = productByCode(code);
    db.stockAdjusts.push({ id: uid(), date, code, name: code.startsWith('SEMI:') ? code.slice(5) : (p ? p.productName : code), deltaPk: delta, reason, at: new Date().toISOString() });
    closeModal(); markChanged(); render();
  }
  function removeAdjust(id) {
    const a = db.stockAdjusts.find((x) => x.id === id); if (!a) return;
    const go = () => { db.stockAdjusts = db.stockAdjusts.filter((x) => x.id !== id); markChanged(); render(); };
    if (typeof window.openConfirmModal === 'function') window.openConfirmModal('재고 조정 삭제', `${a.date} ${a.name} ${a.deltaPk}PK 조정 기록을 삭제할까요?`, go); else go();
  }
  function loadMs() { if (typeof window.mountMsInboundApp === 'function') { window.mountMsInboundApp(); toast('엠즈 입고 기록을 불러오는 중입니다. 잠시 뒤 화면이 갱신됩니다.', 'info'); setTimeout(render, 2500); setTimeout(render, 6000); } }

  // ----- DB 연결 -----
  function openDbModal() {
    modal(`<div class="px-5 py-3 border-b border-stone-200"><h3 class="text-base font-extrabold">생산일지 DB 연결</h3><div class="text-xs text-stone-500 mt-0.5">기본 주소(바로가 생산일지 DB)가 들어 있습니다. 다른 DB를 쓸 때만 바꾸세요. 접속 코드는 다른 탭과 같습니다.</div></div>
      <div class="p-4"><input id="prodUrlInput" type="text" value="${esc(getUrl())}" placeholder="비워 두면 기본 주소를 씁니다" class="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono"></div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2"><button type="button" onclick="Prod.closeModal()" class="px-4 py-2 rounded-xl border border-stone-300 text-sm font-bold cursor-pointer">취소</button><button type="button" onclick="Prod.saveDbUrl()" class="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">저장 후 불러오기</button></div>`);
  }
  function saveDbUrl() {
    const v = (document.getElementById('prodUrlInput').value || '').trim();
    if (v && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(v)) { toast('주소 형식이 맞지 않습니다 (https://script.google.com/macros/s/.../exec).', 'error'); return; }
    try { if (v && v !== DEFAULT_URL) localStorage.setItem(URL_KEY, v); else localStorage.removeItem(URL_KEY); } catch (e) {}
    cloudLoaded = false; dbRevision = null; closeModal(); render();
    pullCloud(true);
  }

  // ---------- 진입 ----------
  // 제품단가 DB가 늦게 불러와지면 품목 목록이 빈 채로 그려지므로, 목록이 생길 때까지 1초마다 확인해 다시 그림 (최대 60초)
  let productWaitTimer = null;
  function waitForProducts() {
    if (productWaitTimer || getProducts().length) return;
    let tries = 0;
    productWaitTimer = setInterval(() => {
      tries++;
      if (getProducts().length || tries >= 60) { clearInterval(productWaitTimer); productWaitTimer = null; _liveCache = null; render(); }
    }, 1000);
  }
  function mountProductionApp() {
    activeRootId = 'productionRoot';
    if (view === 'STOCK') view = 'CAL';
    mountCommon();
  }
  function mountProductionStockApp() {
    activeRootId = 'productionStockRoot';
    mountCommon();
  }
  function mountCommon() {
    if (!mounted) {
      mounted = true;
      loadLocal();
      render();
      if (getUrl()) pullCloud(false);
    } else render();
    waitForProducts();
  }
  window.mountProductionApp = mountProductionApp;
  window.mountProductionStockApp = mountProductionStockApp;
  window.Prod = {
    retryProducts: () => { _liveCache = null; if (typeof window.reloadProductPriceDb === 'function' && !getProducts().length) { try { window.reloadProductPriceDb(); } catch (e) {} } render(); waitForProducts(); },
    setView: (v) => { view = v; render(); }, setMonth: (m) => { cursorMonth = m; lossPeriodKey = 'M'; render(); }, pull: () => pullCloud(true),
    openDay, closeDay, addLine, setLineProduct, setLineField, removeLine, refreshPrices, copyTargetsFrom,
    addSemi, setSemiField, removeSemi, addProduct, addSemiByName, setPicker, setMemo: (v) => { if (draft) draft.memo = v; }, saveDay,
    setLossPeriod: (k) => { lossPeriodKey = k; render(); }, openLossSettings, saveLossSettings,
    openCountModal, saveCount, openAdjustModal, saveAdjust, removeAdjust, closeModal, loadMs, openDbModal, saveDbUrl,
    _debug: () => ({ db, dbRevision, cloudLoaded, products: getProducts() }),
  };
})();
