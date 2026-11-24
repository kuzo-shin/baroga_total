// [VERSION: ms_stock.js v1.1 - 2026-11-24 바로가 품목만 보기(위탁상품 보관일의 바로가 매입처 상품 기준, 전체 보기 전환 가능) / v1.0 - 2026-11-24 신규: 엠즈 재고 대시보드(발주 우선순위 · 유통기한 임박 · 반품 현황 · 발주 추이). 자료는 엠즈 e플랫폼에서 읽어 전용 DB(구글 시트)에 저장한 것을 불러옴]
// ============================================================================
// 바로가 공장 통합 관리 시스템 - 엠즈 재고 (ms_stock.js)
//  - 엠즈 e플랫폼(재고관리·주문관리) 화면에서 읽은 자료를 통째로 DB에 넣고, 여기서 계산해 보여 줌
//  - 자료 형식(payload):
//      asOf 'YYYY-MM-DD HH:mm' · period { from, to }
//      names  { 상품코드: [상품명, 규격, 단위] }
//      stock  [[상품코드, 상품명, 규격, 단위, 현재고, 용인, 성은, 파주, 부산, 기타]]          ← 현재고 조회 (위탁·정상창고)
//      expiry [[상품코드, 유통기한 'YYYY-MM-DD', 수량]]                                        ← 현재고 조회(유통기한별)
//      ledger { 'YYYY-MM': [[상품코드, 기초재고, 구매입고, 기말재고]] }                         ← 위탁상품 수불부 (순출고 = 기초 + 구매입고 − 기말)
//      daily  [[상품코드, 일자, 기초, 당일증감, 기말]]                                          ← 일자별 수불현황 (전체 센터)
//      orders [[매장코드, 매장명, 일자, 매출구분, 상품코드, 상품명, 규격, 입고수량, 공급가, 합계, 비고]] ← 주문대비 입고현황 (판매처)
//      own    { supplier: 매입처코드, items: { 상품코드: 상품명 } }                              ← 위탁상품 보관일 (매입처코드가 바로가인 상품 = 바로가 품목)
//  - '바로가 품목만' 보기: 재고·유통기한은 상품코드가 own에 있는 것, 주문·반품은 상품명에서 맨 앞 S/M과 괄호 안 글자를 뗀 이름이 own의 상품명과 같은 것
//  - 수량 단위는 엠즈 화면 그대로(PK·EA·BOX). 단위가 EA이고 규격에 'N ea'가 있으면 화면에는 PK로 환산해 보여 줌
// ============================================================================
(function () {
  'use strict';
  const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbwspl12U2V776l9lT2gDbvdb84FndSETHy20MR5-1vNsq6_Tvgd725xx3FSMWvFf6h_jQ/exec'; // 엠즈 재고 DB (다른 DB를 쓸 때만 [DB 연결]에서 바꿈)
  const URL_KEY = 'baroga_ms_stock_gas_url';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, t) => (typeof window.showToast === 'function' ? window.showToast(m, t) : alert(m));
  const nowHm = () => (typeof window.barogaNowHm === 'function' ? window.barogaNowHm() : new Date().toTimeString().slice(0, 5));
  const num = (v, d) => (v === null || v === undefined || !isFinite(v) ? '-' : Number(v).toLocaleString('ko-KR', { maximumFractionDigits: d === undefined ? 1 : d }));
  const won = (v) => (isFinite(v) ? Math.round(Number(v)).toLocaleString('ko-KR') + '원' : '-');
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayMs = 86400000;
  const dateOf = (s) => new Date(String(s).slice(0, 10) + 'T00:00:00');
  const th = 'py-2 px-2 text-xs font-extrabold text-stone-600 bg-stone-100 whitespace-nowrap';
  const td = 'py-1.5 px-2 border-b border-stone-100';
  const tdr = td + ' text-right tabular-nums';
  const card = 'bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4';

  let data = null, dbRevision = null, loaded = false, loading = false, saving = false, statusText = 'DB 미연결', view = 'DASH', previewOnly = false, ownOnly = true;
  const root = () => document.getElementById('msStockRoot');
  function getUrl() { let v = ''; try { v = localStorage.getItem(URL_KEY) || ''; } catch (e) {} return v || DEFAULT_URL; }
  function setStatus(t) { statusText = t; const el = document.getElementById('mssStatus'); if (el) el.textContent = t; }
  async function api(body, ms) {
    if (typeof window.barogaApi !== 'function') throw new Error('접속 도구를 찾을 수 없습니다');
    return window.barogaApi(getUrl(), body, ms || 60000);
  }
  function normalize(p) {
    const arr = (v) => (Array.isArray(v) ? v : []);
    return { v: p.v || 1, asOf: String(p.asOf || ''), period: p.period || {}, names: p.names || {}, stock: arr(p.stock), expiry: arr(p.expiry), ledger: p.ledger && typeof p.ledger === 'object' ? p.ledger : {}, daily: arr(p.daily), orders: arr(p.orders), own: p.own && p.own.items && typeof p.own.items === 'object' ? { supplier: String(p.own.supplier || ''), items: p.own.items } : null, importedAt: p.importedAt || '' };
  }
  async function pull(showMsg) {
    if (!getUrl()) { setStatus('DB 미연결'); render(); return; }
    if (loading || saving) return;
    loading = true; setStatus('불러오는 중...');
    try {
      const json = await api({ action: 'getAll' });
      if (!json || json.ok === false) throw new Error((json && (json.message || json.error)) || '불러오기 실패');
      dbRevision = Number(json.revision) || 0; loaded = true;
      if (json.status === 'empty') { data = null; setStatus('불러옴 ' + nowHm() + ' · 저장된 자료 없음'); }
      else { data = normalize(json.payload); previewOnly = false; setStatus('불러옴 ' + nowHm() + ' · 엠즈 기준 ' + data.asOf); if (showMsg) toast('엠즈 재고 자료를 불러왔습니다.', 'success'); }
    } catch (e) {
      loaded = false; setStatus('불러오기 실패');
      if (showMsg || !e.unauthorized) toast('엠즈 재고 DB 불러오기 실패: ' + e.message, 'error');
    } finally { loading = false; render(); }
  }
  // 엠즈에서 읽은 자료를 DB에 저장 (자동 갱신 작업 또는 JSON 파일 가져오기에서 호출). 결과를 돌려줌
  async function importSnapshot(p) {
    if (!getUrl()) return { ok: false, message: 'DB 미연결' };
    if (saving) return { ok: false, message: '저장 중' };
    const d = normalize(p || {});
    if (!d.asOf || !d.stock.length) return { ok: false, message: 'asOf와 stock이 필요합니다' };
    if (!loaded) { await pull(false); if (!loaded) return { ok: false, message: 'DB를 불러오지 못했습니다' }; }
    d.importedAt = new Date().toISOString();
    saving = true; setStatus('저장 중...');
    try {
      const json = await api({ action: 'replaceAll', baseRevision: dbRevision, payload: d }, 180000);
      if (!json || json.ok === false) throw new Error((json && json.conflict ? '다른 기기에서 먼저 저장했습니다. 불러온 뒤 다시 시도해 주세요.' : (json && (json.message || json.error))) || '저장 실패');
      dbRevision = Number(json.revision) || dbRevision; data = d; previewOnly = false;
      setStatus('저장됨 ' + nowHm() + ' · 엠즈 기준 ' + d.asOf);
      toast('엠즈 재고 자료를 DB에 저장했습니다.', 'success');
      return { ok: true, revision: dbRevision, counts: { stock: d.stock.length, expiry: d.expiry.length, ledger: Object.keys(d.ledger), daily: d.daily.length, orders: d.orders.length }, warning: json.warning || '' };
    } catch (e) {
      setStatus('저장 실패'); toast('엠즈 재고 저장 실패: ' + e.message, 'error');
      return { ok: false, message: e.message };
    } finally { saving = false; render(); }
  }
  // 저장하지 않고 화면만 미리 보기 (자료를 읽은 직후 확인용). DB에는 아무것도 쓰지 않음
  function preview(p) { const d = normalize(p || {}); if (!d.asOf || !d.stock.length) return { ok: false, message: 'asOf와 stock이 필요합니다' }; data = d; previewOnly = true; setStatus('미리보기 · 저장 안 됨 · 엠즈 기준 ' + d.asOf); render(); return { ok: true }; }
  function pickFile() {
    if (!getUrl()) { toast('먼저 [DB 연결]에서 엠즈 재고 DB 주소를 넣어 주세요.', 'error'); openDbModal(); return; }
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = async () => { try { const p = JSON.parse(String(rd.result || '')); if (!confirm(`엠즈 기준 ${p.asOf || '?'} 자료로 DB 전체를 바꿉니다. 계속할까요?`)) return; await importSnapshot(p); } catch (e) { toast('파일을 읽지 못했습니다: ' + e.message, 'error'); } }; rd.readAsText(f, 'utf-8'); };
    inp.click();
  }
  function openDbModal() {
    modal(`<div class="px-5 py-3 border-b border-stone-200"><h3 class="text-base font-extrabold">엠즈 재고 DB 연결</h3><div class="text-xs text-stone-500 mt-0.5">기본 주소(바로가 엠즈 재고 DB)가 들어 있습니다. 다른 DB를 쓸 때만 바꾸세요. 접속 코드는 다른 DB와 같습니다.</div></div>
      <div class="p-4"><input id="mssUrlInput" type="text" value="${esc(getUrl())}" placeholder="https://script.google.com/macros/s/.../exec" class="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono"></div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2"><button type="button" onclick="MsStock.closeModal()" class="px-4 py-2 rounded-xl border border-stone-300 text-sm font-bold cursor-pointer">취소</button><button type="button" onclick="MsStock.saveDbUrl()" class="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">저장 후 불러오기</button></div>`);
  }
  function saveDbUrl() {
    const v = (document.getElementById('mssUrlInput').value || '').trim();
    if (v && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(v)) { toast('주소 형식이 맞지 않습니다 (https://script.google.com/macros/s/.../exec).', 'error'); return; }
    try { if (v && v !== DEFAULT_URL) localStorage.setItem(URL_KEY, v); else localStorage.removeItem(URL_KEY); } catch (e) {}
    loaded = false; dbRevision = null; data = null; closeModal(); render(); pull(true);
  }
  function modal(html) { const h = document.getElementById('mssModal'); if (h) h.innerHTML = `<div class="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onclick="if(event.target===this)MsStock.closeModal()"><div class="bg-white rounded-2xl shadow-xl w-full max-w-[640px]">${html}</div></div>`; }
  function closeModal() { const h = document.getElementById('mssModal'); if (h) h.innerHTML = ''; }

  // ---------- 계산 ----------
  // 단위가 EA이고 규격에 'N ea'가 있으면 1PK = N개로 보고 PK로 환산해 보여 줌 (엠즈 화면 수량은 그대로 보관)
  function unitInfo(spec, unit) {
    const m = String(spec || '').toLowerCase().match(/(\d+)\s*ea/);
    const per = String(unit || '').toUpperCase() === 'EA' && m && Number(m[1]) > 1 ? Number(m[1]) : 1;
    return { per, label: per > 1 ? 'PK' : String(unit || '') };
  }
  // 공장 재고(PK): ERP 생산 재고의 현재고. 엠즈 입고의 '레시피 품목코드' 연결로 찾음. 재고 실사가 없으면 반영하지 않음
  function factoryStockMap() {
    const out = { ready: false, why: '', map: {} };
    try {
      if (!window.Prod || typeof window.Prod.stockForMs !== 'function') { out.why = '생산 재고를 불러오지 못했습니다'; return out; }
      const s = window.Prod.stockForMs();
      if (!s.loaded) { out.why = '생산 재고를 아직 불러오지 않았습니다 (생산 재고 탭을 한 번 열어 주세요)'; return out; }
      if (!s.baseDate) { out.why = '생산 재고의 재고 실사가 없어 공장 재고를 반영하지 않았습니다'; return out; }
      const feed = typeof window.barogaMsStockFeed === 'function' ? window.barogaMsStockFeed() : { links: {} };
      const byErp = {}; s.rows.forEach((r) => { if (r.unit === 'PK') byErp[String(r.code)] = r.cur; });
      Object.entries(feed.links || {}).forEach(([msKey, erp]) => { const v = byErp[String(erp)]; if (v !== undefined) out.map[String(msKey)] = v; });
      out.ready = true; out.baseDate = s.baseDate;
    } catch (e) { out.why = '공장 재고 계산 오류: ' + e.message; }
    return out;
  }
  function compute() {
    const d0 = data, asOfDate = dateOf(d0.asOf), asOfYm = d0.asOf.slice(0, 7);
    // 바로가 품목만 보기: 위탁상품 보관일에서 읽은 바로가 매입처 상품 기준 (자료에 없으면 전체)
    const hasOwn = !!(d0.own && Object.keys(d0.own.items).length), useOwn = hasOwn && ownOnly;
    const normName = (s) => String(s || '').replace(/^[SM]\s*/, '').replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/\s+/g, '').toLowerCase();
    const ownCodes = hasOwn ? new Set(Object.keys(d0.own.items).map(String)) : null, ownNames = hasOwn ? new Set(Object.values(d0.own.items).map(normName)) : null;
    const d = useOwn ? Object.assign({}, d0, { stock: d0.stock.filter((r) => ownCodes.has(String(r[0]))), expiry: d0.expiry.filter((r) => ownCodes.has(String(r[0]))), orders: d0.orders.filter((r) => ownNames.has(normName(r[5]))) }) : d0;
    const nameOf = (code) => { const s = d.stock.find((r) => String(r[0]) === String(code)); return s ? [s[1], s[2], s[3]] : (d.names[code] || [code, '', '']); };
    // 일평균 출고: 위탁상품 수불부의 순출고(기초 + 구매입고 − 기말) 합계 ÷ 일수 (이번 달은 1일~기준일, 지난달은 한 달 전체)
    const months = Object.keys(d.ledger).sort(), outBy = {}, outThis = {};
    let days = 0, daysThis = 0;
    months.forEach((ym) => {
      const [y, m] = ym.split('-').map(Number), n = ym === asOfYm ? asOfDate.getDate() : new Date(y, m, 0).getDate();
      days += n; if (ym === asOfYm) daysThis = n;
      (d.ledger[ym] || []).forEach((r) => { const o = Math.max(0, (Number(r[1]) || 0) + (Number(r[2]) || 0) - (Number(r[3]) || 0)); outBy[r[0]] = (outBy[r[0]] || 0) + o; if (ym === asOfYm) outThis[r[0]] = (outThis[r[0]] || 0) + o; });
    });
    const fac = factoryStockMap();
    const items = d.stock.map((r) => {
      const code = String(r[0]), u = unitInfo(r[2], r[3]), qty = (Number(r[4]) || 0) / u.per;
      const avg = days > 0 ? (outBy[code] || 0) / days / u.per : 0, avgThis = daysThis > 0 ? (outThis[code] || 0) / daysThis / u.per : 0;
      const factory = fac.ready && u.label === 'PK' ? Number(fac.map[code]) || 0 : 0, total = qty + factory;
      const rot = avg > 0 ? total / avg : null;
      const grade = rot == null ? '출고 없음' : rot <= 7 ? '긴급 발주' : rot <= 14 ? '우선 발주' : rot <= 30 ? '발주 권장' : '모니터링';
      return { code, name: r[1], spec: r[2], unit: u.label, per: u.per, qty, factory, total, avg, avgThis, rot, grade, runout: rot == null ? '' : ymd(new Date(asOfDate.getTime() + Math.floor(rot) * dayMs)), short30: avg > 0 ? Math.max(0, avg * 30 - total) : 0 };
    });
    const itemBy = {}; items.forEach((it) => { itemBy[it.code] = it; });
    // 유통기한: 로트(유통기한)별로 빠른 순 누적 수량 − 일평균 출고 × 잔여일 > 0 이면 그만큼 유통기한 전에 못 팔 것으로 봄
    const lotsBy = {};
    d.expiry.forEach((r) => { const code = String(r[0]), ex = String(r[1]).slice(0, 10); if (!/^\d{4}-/.test(ex) || ex.startsWith('9999') || !(Number(r[2]) > 0)) return; (lotsBy[code] = lotsBy[code] || []).push({ ex, qty: Number(r[2]) }); });
    const lots = [];
    Object.entries(lotsBy).forEach(([code, arr]) => {
      const it = itemBy[code] || (() => { const n = nameOf(code), u = unitInfo(n[1], n[2]); return { code, name: n[0], spec: n[1], unit: u.label, per: u.per, avg: 0, rot: null }; })();
      let cum = 0, prevUnsold = 0;
      arr.sort((a, b) => a.ex.localeCompare(b.ex)).forEach((l) => {
        const q = l.qty / it.per, left = Math.round((dateOf(l.ex) - asOfDate) / dayMs); cum += q;
        const unsoldCum = Math.max(0, cum - it.avg * Math.max(0, left)), unsold = Math.min(q, Math.max(0, unsoldCum - prevUnsold)); prevUnsold = Math.max(prevUnsold, unsoldCum);
        lots.push({ code, name: it.name, unit: it.unit, ex: l.ex, left, qty: q, cum, avg: it.avg, canSell: it.avg * Math.max(0, left), unsold, grade: left < 0 ? '기한 지남' : left <= 30 ? '30일 이하 긴급' : left <= 60 ? '60일 이하 주의' : left <= 100 ? '100일 이하 확인' : '' });
      });
    });
    lots.sort((a, b) => a.ex.localeCompare(b.ex) || a.name.localeCompare(b.name, 'ko'));
    // 주문대비 입고현황: 반품 = 입고수량 음수 + 비고에 '매입처' / 발주 = 매출구분이 판매·추가판매이고 수량 양수
    const O = { store: 1, date: 2, gubn: 3, code: 4, name: 5, spec: 6, qty: 7, supply: 8, total: 9, memo: 10 };
    const returns = d.orders.filter((r) => Number(r[O.qty]) < 0 && /매입처/.test(String(r[O.memo] || '')));
    const sales = d.orders.filter((r) => Number(r[O.qty]) > 0 && /^(판매|추가판매)$/.test(String(r[O.gubn] || '').trim()));
    const weekOf = (s) => { const dt = dateOf(s), dow = (dt.getDay() + 6) % 7; return ymd(new Date(dt.getTime() - dow * dayMs)); }; // 그 주 월요일
    const weeks = [...new Set(sales.map((r) => weekOf(r[O.date])))].sort();
    const trend = (keyIdx, labelIdx) => { const m = {}; sales.forEach((r) => { const k = String(r[keyIdx]), x = m[k] || (m[k] = { key: k, label: String(r[labelIdx]), w: {}, qty: 0, amt: 0 }); const wk = weekOf(r[O.date]), c = x.w[wk] || (x.w[wk] = { qty: 0, amt: 0 }); c.qty += Number(r[O.qty]) || 0; c.amt += Number(r[O.supply]) || 0; x.qty += Number(r[O.qty]) || 0; x.amt += Number(r[O.supply]) || 0; }); return Object.values(m).sort((a, b) => b.amt - a.amt); };
    return { items, lots, returns, sales, weeks, byItem: trend(O.code, O.name), byStore: trend(O.store, O.store), O, days, daysThis, months, fac, asOfDate, hasOwn, useOwn, stockAll: d0.stock.length, stockShown: d.stock.length, ordersAll: d0.orders.length, ordersShown: d.orders.length };
  }

  // ---------- 화면 ----------
  const GRADE_CLS = { '긴급 발주': 'bg-rose-100 text-rose-800 border-rose-200', '우선 발주': 'bg-orange-100 text-orange-800 border-orange-200', '발주 권장': 'bg-amber-100 text-amber-900 border-amber-200', '모니터링': 'bg-stone-100 text-stone-600 border-stone-200', '출고 없음': 'bg-white text-stone-400 border-stone-200', '30일 이하 긴급': 'bg-rose-100 text-rose-800 border-rose-200', '기한 지남': 'bg-rose-600 text-white border-rose-600', '60일 이하 주의': 'bg-orange-100 text-orange-800 border-orange-200', '100일 이하 확인': 'bg-amber-100 text-amber-900 border-amber-200' };
  const chip = (g) => (g ? `<span class="px-1.5 py-0.5 rounded border text-[11px] font-bold whitespace-nowrap ${GRADE_CLS[g] || 'bg-stone-100 text-stone-600 border-stone-200'}">${esc(g)}</span>` : '');
  const tabBtn = (k, label) => `<button type="button" onclick="MsStock.setView('${k}')" class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${view === k ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}">${label}</button>`;
  const kpi = (label, val, sub, cls) => `<div class="${card}"><div class="text-xs font-bold text-stone-500">${label}</div><div class="mt-1 text-xl font-extrabold tabular-nums ${cls || 'text-stone-900'}">${val}</div><div class="text-xs text-stone-500 mt-0.5">${sub || ''}</div></div>`;
  const tableWrap = (head, rows, empty, cols) => `<div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm"><thead><tr>${head}</tr></thead><tbody>${rows || `<tr><td colspan="${cols}" class="py-6 text-center text-xs text-stone-400">${empty}</td></tr>`}</tbody></table></div>`;

  function orderTable(C, limit) {
    const list = C.items.filter((it) => it.rot != null).sort((a, b) => a.rot - b.rot || b.short30 - a.short30);
    const rows = (limit ? list.slice(0, limit) : list).map((it, i) => `<tr class="${it.rot <= 7 ? 'bg-rose-50/60' : ''}"><td class="${td} text-xs text-stone-400">${i + 1}</td><td class="${td} font-mono text-xs">${esc(it.code)}</td><td class="${td} font-bold">${esc(it.name)}</td><td class="${tdr}">${num(it.qty)} <span class="text-[11px] text-stone-400">${esc(it.unit)}</span></td><td class="${tdr}">${C.fac.ready ? num(it.factory) : '-'}</td><td class="${tdr} font-bold">${num(it.total)}</td><td class="${tdr}">${num(it.avg)}</td><td class="${tdr} text-stone-500">${num(it.avgThis)}</td><td class="${tdr} font-extrabold">${num(it.rot)}일</td><td class="${tdr}">${it.runout.slice(5).replace('-', '/')}</td><td class="${tdr}">${it.short30 > 0 ? num(it.short30) : '-'}</td><td class="${td}">${chip(it.grade)}</td></tr>`).join('');
    return tableWrap(`<th class="${th}">순위</th><th class="${th}">코드</th><th class="${th}">상품명</th><th class="${th} text-right">엠즈 재고</th><th class="${th} text-right">공장 재고</th><th class="${th} text-right">가용 합계</th><th class="${th} text-right">일평균 출고</th><th class="${th} text-right">이번 달 일평균</th><th class="${th} text-right">회전일</th><th class="${th} text-right">예상 소진일</th><th class="${th} text-right">30일치 부족</th><th class="${th}">조치</th>`, rows, '회전일을 계산할 품목이 없습니다.', 12);
  }
  function expiryTable(C, limit) {
    const list = C.lots.filter((l) => l.left <= 100 || l.unsold > 0.01);
    const rows = (limit ? list.slice(0, limit) : list).map((l, i) => `<tr class="${l.unsold > 0.01 ? 'bg-violet-50/60' : ''}"><td class="${td} text-xs text-stone-400">${i + 1}</td><td class="${td} font-mono text-xs">${esc(l.code)}</td><td class="${td} font-bold">${esc(l.name)}</td><td class="${tdr}">${esc(l.ex)}</td><td class="${tdr} font-extrabold">${num(l.left, 0)}일</td><td class="${td}">${chip(l.grade)}</td><td class="${tdr}">${num(l.qty)} <span class="text-[11px] text-stone-400">${esc(l.unit)}</span></td><td class="${tdr}">${num(l.avg)}</td><td class="${tdr}">${num(l.canSell)}</td><td class="${tdr} font-extrabold ${l.unsold > 0.01 ? 'text-violet-800' : 'text-stone-400'}">${l.unsold > 0.01 ? num(l.unsold) : '-'}</td></tr>`).join('');
    return tableWrap(`<th class="${th}">순위</th><th class="${th}">코드</th><th class="${th}">상품명</th><th class="${th} text-right">유통기한</th><th class="${th} text-right">잔여일</th><th class="${th}">등급</th><th class="${th} text-right">이 기한 재고</th><th class="${th} text-right">일평균 출고</th><th class="${th} text-right">기한 전 예상 출고</th><th class="${th} text-right">소진 불가 예상</th>`, rows, '유통기한 100일 이내이거나 소진이 어려운 재고가 없습니다.', 10);
  }
  function returnBlock(C, limit) {
    const O = C.O, sum = (arr, i) => arr.reduce((a, r) => a + (Number(r[i]) || 0), 0);
    const group = (keyIdx) => { const m = {}; C.returns.forEach((r) => { const k = String(r[keyIdx]), x = m[k] || (m[k] = { k, n: 0, qty: 0, amt: 0 }); x.n++; x.qty += Number(r[O.qty]) || 0; x.amt += Number(r[O.total]) || 0; }); return Object.values(m).sort((a, b) => a.amt - b.amt); };
    const gTable = (title, rows) => `<div><div class="text-xs font-extrabold text-stone-700 mb-1">${title}</div>${tableWrap(`<th class="${th}">${title.replace('별', '')}</th><th class="${th} text-right">건수</th><th class="${th} text-right">수량</th><th class="${th} text-right">금액(합계)</th>`, rows.map((x) => `<tr><td class="${td} font-bold">${esc(x.k)}</td><td class="${tdr}">${num(x.n, 0)}</td><td class="${tdr}">${num(x.qty)}</td><td class="${tdr} font-bold text-rose-700">${won(x.amt)}</td></tr>`).join(''), '반품이 없습니다.', 4)}</div>`;
    const detail = C.returns.slice().sort((a, b) => Number(a[O.total]) - Number(b[O.total]));
    const dRows = (limit ? detail.slice(0, limit) : detail).map((r) => `<tr><td class="${td} whitespace-nowrap">${esc(String(r[O.date]).slice(5))}</td><td class="${td}">${esc(r[O.store])}</td><td class="${td} font-bold">${esc(r[O.name])}</td><td class="${td} text-xs">${esc(r[O.gubn])}</td><td class="${tdr}">${num(r[O.qty])}</td><td class="${tdr} font-bold text-rose-700">${won(r[O.total])}</td><td class="${td} text-xs text-stone-500">${esc(r[O.memo])}</td></tr>`).join('');
    return `<div class="text-sm mb-2">반품 <b>${num(C.returns.length, 0)}건</b> · 수량 <b>${num(sum(C.returns, O.qty))}</b> · 금액 <b class="text-rose-700">${won(sum(C.returns, O.total))}</b> <span class="text-xs text-stone-400">(입고수량이 음수이고 비고에 '매입처'가 있는 줄)</span></div>
      ${limit ? '' : `<div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">${gTable('상품별', group(O.name))}${gTable('매장별', group(O.store))}</div>`}
      ${tableWrap(`<th class="${th}">일자</th><th class="${th}">매장</th><th class="${th}">상품명</th><th class="${th}">매출구분</th><th class="${th} text-right">수량</th><th class="${th} text-right">금액(합계)</th><th class="${th}">비고</th>`, dRows, '반품이 없습니다.', 7)}`;
  }
  function trendTable(C, list, firstLabel, limit) {
    const wk = C.weeks, lab = (w) => `${Number(w.slice(5, 7))}/${Number(w.slice(8))}주`;
    const rows = (limit ? list.slice(0, limit) : list).map((x) => {
      const cells = wk.map((w, i) => { const c = x.w[w] || { qty: 0, amt: 0 }, p = i > 0 ? (x.w[wk[i - 1]] || { qty: 0 }).qty : null; const diff = p == null || !p ? null : ((c.qty - p) / p) * 100; return `<td class="${tdr}">${num(c.qty, 0)}${diff == null ? '' : `<div class="text-[10px] font-bold ${diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-stone-400'}">${diff > 0 ? '+' : ''}${num(diff, 0)}%</div>`}</td>`; }).join('');
      return `<tr><td class="${td} font-bold">${esc(x.label)}</td>${cells}<td class="${tdr} font-extrabold">${num(x.qty, 0)}</td><td class="${tdr} font-bold">${won(x.amt)}</td></tr>`;
    }).join('');
    return tableWrap(`<th class="${th}">${firstLabel}</th>${wk.map((w) => `<th class="${th} text-right">${lab(w)}</th>`).join('')}<th class="${th} text-right">수량 합계</th><th class="${th} text-right">공급가 합계</th>`, rows, '발주 자료가 없습니다.', wk.length + 3);
  }

  function render() {
    const el = root(); if (!el) return;
    const head = `<div class="flex flex-wrap items-center justify-between gap-2"><div class="flex items-center gap-2"><h2 class="text-base font-extrabold text-stone-900">엠즈 재고 <span class="text-xs font-bold text-stone-500">엠즈 물류센터 위탁 재고 · 가맹점 발주</span></h2></div>
        <div class="flex flex-wrap items-center gap-1.5"><span id="mssStatus" class="px-2.5 py-1 rounded-lg bg-stone-100 text-xs font-bold text-stone-700">${esc(statusText)}</span>
        <button type="button" onclick="MsStock.pull(true)" class="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold cursor-pointer hover:bg-stone-50">불러오기</button>
        <button type="button" onclick="MsStock.pickFile()" title="엠즈에서 읽어 만든 JSON 파일로 DB를 바꿉니다 (보통은 Claude가 자동으로 저장)" class="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold cursor-pointer hover:bg-stone-50">자료 가져오기</button>
        <button type="button" onclick="MsStock.openDbModal()" class="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold cursor-pointer hover:bg-stone-50">DB 연결</button></div></div>`;
    if (!getUrl() && !(previewOnly && data)) { el.innerHTML = `<div class="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">${head}<div class="${card} text-sm text-stone-600"><b>엠즈 재고 DB가 아직 연결되지 않았습니다.</b> 구글 시트에 <span class="font-mono">7_ms_stock.gs</span>를 배포한 뒤 [DB 연결]에 웹 앱 주소를 넣어 주세요.</div></div><div id="mssModal"></div>`; return; }
    if (!data) { el.innerHTML = `<div class="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">${head}<div class="${card} text-sm text-stone-600">${loading ? '불러오는 중입니다...' : loaded ? '<b>저장된 엠즈 재고 자료가 없습니다.</b> 엠즈 e플랫폼에 로그인한 뒤 Claude에게 "엠즈 재고 갱신해줘"라고 요청하면 자료를 읽어 저장합니다.' : 'DB를 불러오지 못했습니다. [불러오기]를 눌러 주세요.'}</div></div><div id="mssModal"></div>`; return; }
    const C = compute(), d = data;
    const urgent = C.items.filter((it) => it.grade === '긴급 발주').length, prio = C.items.filter((it) => it.grade === '우선 발주').length, rec = C.items.filter((it) => it.grade === '발주 권장').length;
    const exp30 = new Set(C.lots.filter((l) => l.left <= 30).map((l) => l.code)).size, unsold = new Set(C.lots.filter((l) => l.unsold > 0.01).map((l) => l.code)).size;
    const retAmt = C.returns.reduce((a, r) => a + (Number(r[C.O.total]) || 0), 0);
    const ageDays = Math.round((dateOf(ymd(new Date())) - C.asOfDate) / dayMs);
    const basis = `<div class="text-xs text-stone-500 leading-relaxed">엠즈 자료 기준 <b class="text-stone-800">${esc(d.asOf)}</b>${ageDays > 0 ? ` <span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">${ageDays}일 전 자료</span>` : ''} · 주문 조회 기간 ${esc((d.period || {}).from || '')} ~ ${esc((d.period || {}).to || '')} · 일평균 출고 = 위탁상품 수불부(${C.months.map((m) => Number(m.slice(5)) + '월').join('·')}, ${C.days}일)의 순출고 ÷ 일수 · 회전일 = 가용 합계 ÷ 일평균 출고 (7일 이하 긴급 / 14일 이하 우선 / 30일 이하 권장)${C.fac.ready ? ` · 공장 재고 = 생산 재고 현재고(${esc(C.fac.baseDate)} 실사 기준)` : ` · <span class="text-amber-800 font-bold">공장 재고 미반영: ${esc(C.fac.why)}</span>`}</div>`;
    const sec = (title, body, more) => `<div class="${card}"><div class="flex items-center justify-between gap-2 mb-2"><h3 class="text-sm font-extrabold text-stone-900">${title}</h3>${more ? `<button type="button" onclick="MsStock.setView('${more}')" class="text-xs font-bold text-amber-800 hover:underline cursor-pointer">전체 보기 →</button>` : ''}</div>${body}</div>`;
    let body = '';
    if (view === 'DASH') body = `<div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
          ${kpi('긴급 발주 (7일 이하)', urgent + '개', `우선 ${prio}개 · 권장 ${rec}개`, urgent ? 'text-rose-700' : '')}
          ${kpi('유통기한 30일 이내', exp30 + '개 품목', '기한 지난 재고 포함', exp30 ? 'text-rose-700' : '')}
          ${kpi('기한 전 소진 어려움', unsold + '개 품목', '지금 출고 속도 기준', unsold ? 'text-violet-800' : '')}
          ${kpi('반품 금액', won(retAmt), `${C.returns.length}건 · 조회 기간 내`, retAmt < 0 ? 'text-rose-700' : '')}
          ${kpi(C.useOwn ? '바로가 재고 품목' : '엠즈 재고 품목', C.stockShown + '개', `${C.useOwn ? `전체 ${C.stockAll}개 중 · ` : ''}가맹점 발주 ${num(C.sales.length, 0)}줄 · 매장 ${C.byStore.length}곳`)}
        </div>
        ${sec('발주 우선순위 — 회전일 짧은 순 10개', orderTable(C, 10), 'ORDER')}
        ${sec('유통기한 임박 — 빠른 순 10개', expiryTable(C, 10), 'EXPIRY')}
        ${sec('반품 현황 — 금액 큰 순 10건', returnBlock(C, 10), 'RETURN')}`;
    else if (view === 'ORDER') body = sec('발주 우선순위 — 회전일 짧은 순 (출고가 없는 품목 제외)', orderTable(C)) + sec('출고가 없는 품목 (조회한 달 기준)', tableWrap(`<th class="${th}">코드</th><th class="${th}">상품명</th><th class="${th} text-right">엠즈 재고</th>`, C.items.filter((it) => it.rot == null && it.qty > 0).map((it) => `<tr><td class="${td} font-mono text-xs">${esc(it.code)}</td><td class="${td} font-bold">${esc(it.name)}</td><td class="${tdr}">${num(it.qty)} <span class="text-[11px] text-stone-400">${esc(it.unit)}</span></td></tr>`).join(''), '해당 품목이 없습니다.', 3));
    else if (view === 'EXPIRY') body = sec('유통기한 임박 — 100일 이내 또는 기한 전 소진이 어려운 재고 (보라색 = 소진 불가 예상)', expiryTable(C));
    else if (view === 'RETURN') body = sec('반품 현황', returnBlock(C));
    else if (view === 'TREND') body = sec('품목별 발주 추이 — 주(월요일 시작)별 입고수량, 공급가 큰 순', trendTable(C, C.byItem, '상품명')) + sec('가맹점별 발주 추이 — 주별 입고수량, 공급가 큰 순', trendTable(C, C.byStore, '매장'));
    el.innerHTML = `<div class="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">${head}${basis}
        <div class="flex flex-wrap items-center justify-between gap-2"><div class="flex flex-wrap gap-1.5">${tabBtn('DASH', '대시보드')}${tabBtn('ORDER', '발주 우선순위')}${tabBtn('EXPIRY', '유통기한 임박')}${tabBtn('RETURN', '반품 현황')}${tabBtn('TREND', '발주 추이')}</div>
          ${C.hasOwn ? `<div class="flex items-center gap-1.5 text-xs"><span class="text-stone-500">${C.useOwn ? `바로가 품목만 표시 중 (재고 ${C.stockShown}/${C.stockAll}품목 · 주문 ${num(C.ordersShown, 0)}/${num(C.ordersAll, 0)}줄)` : '엠즈 위탁 전체 품목 표시 중'}</span><button type="button" onclick="MsStock.toggleOwn()" class="px-3 py-1.5 rounded-lg border border-stone-300 font-bold cursor-pointer hover:bg-stone-50">${C.useOwn ? '전체 품목 보기' : '바로가 품목만 보기'}</button></div>` : '<span class="text-xs text-amber-800 font-bold">바로가 품목 구분 자료가 없어 전체 품목을 표시합니다 (다음 갱신부터 구분)</span>'}</div>
        ${body}</div><div id="mssModal"></div>`;
  }
  let mounted = false;
  function mount() { render(); if (!mounted) { mounted = true; pull(false); } }
  window.mountMsStockApp = mount;
  window.MsStock = { mount, pull, pickFile, importSnapshot, preview, openDbModal, saveDbUrl, closeModal, setView: (v) => { view = v; render(); }, toggleOwn: () => { ownOnly = !ownOnly; render(); }, _debug: () => ({ data, dbRevision, loaded, computed: data ? compute() : null }) };
})();
