// [VERSION: ms_stock.js v1.6 - 2026-11-24 6. 그래프 탭 신설(품목 발주금액 TOP10의 일자별 발주 수량 · 가맹점 발주 총액의 일자별 변화) · 발주 추이 표 숫자 줄 맞춤 / v1.5 - 2026-11-24 [전체 품목 보기] 버튼에 색 · 발주 추이 위 합계에 (n품목)/(n점) 표기, 표 첫 줄은 '주차별 합계' · 가맹점 단위 곳→점 / v1.4 - 2026-11-24 발주 추이: 추이 그래프·칸 아래 막대 삭제(숫자 + ▲▼만) / v1.3 - 2026-11-24 발주 추이: 품목별·가맹점별 좌우 카드 · 맨 위 합계 줄 · N주차(실제 날짜 범위, 7일 미만 주 표시) · 줄마다 막대 그래프와 칸 아래 막대 / v1.2 - 2026-11-24 화면을 다른 메뉴와 같은 모양으로(상단 탭 바 + 오른쪽 DB 상태·새로고침, 버튼 모양 통일) · 기준 안내를 한 줄 요약 + [계산 기준] 펼침으로 묶음 · 구역 제목 키우고 설명은 괄호로 / v1.1 - 2026-11-24 바로가 품목만 보기([바로가 품목 설정]에서 고른 상품, 정하지 않은 상품은 추정 · 전체 보기 전환 가능) / v1.0 - 2026-11-24 신규: 엠즈 재고 대시보드(발주 우선순위 · 유통기한 임박 · 반품 현황 · 발주 추이). 자료는 엠즈 e플랫폼에서 읽어 전용 DB(구글 시트)에 저장한 것을 불러옴]
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
//      cfg    { own: { 상품코드: true|false } }                                                  ← 화면에서 정한 '바로가 품목' (갱신해도 유지)
//  - '바로가 품목만' 보기: [바로가 품목 설정]에서 고른 상품만. 정하지 않은 상품은 '엠즈 입고에 연결돼 있거나 이름에 생지가 있으면 바로가 품목'으로 추정
//    재고·유통기한은 상품코드로, 주문·반품은 상품명에서 맨 앞 S/M과 괄호 안 글자를 뗀 이름이 바로가 품목 이름과 같은 것으로 거름
//    (엠즈의 매입처코드는 봉투·원두·케이크까지 같은 코드라 구분에 쓸 수 없음)
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
  function setStatus(t) { statusText = String(t).replace(/ · 엠즈 기준 .*$/, ''); const el = document.getElementById('mssStatusText'); if (el) el.textContent = statusText; } // 엠즈 기준 시각은 본문 '자료 기준'에 따로 표시
  async function api(body, ms) {
    if (typeof window.barogaApi !== 'function') throw new Error('접속 도구를 찾을 수 없습니다');
    return window.barogaApi(getUrl(), body, ms || 60000);
  }
  function normalize(p) {
    const arr = (v) => (Array.isArray(v) ? v : []);
    return { v: p.v || 1, asOf: String(p.asOf || ''), period: p.period || {}, names: p.names || {}, stock: arr(p.stock), expiry: arr(p.expiry), ledger: p.ledger && typeof p.ledger === 'object' ? p.ledger : {}, daily: arr(p.daily), orders: arr(p.orders), cfg: p.cfg && typeof p.cfg === 'object' ? { own: p.cfg.own && typeof p.cfg.own === 'object' ? p.cfg.own : {} } : { own: {} }, importedAt: p.importedAt || '' };
  }
  async function pull(showMsg) {
    if (!getUrl()) { setStatus('DB 미연결'); render(); return; }
    if (loading || saving) return;
    loading = true; setStatus('불러오는 중...');
    try {
      const json = await api({ action: 'getAll' });
      if (!json || json.ok === false) throw new Error((json && (json.message || json.error)) || '불러오기 실패');
      dbRevision = Number(json.revision) || 0; loaded = true;
      if (json.status === 'empty') { data = null; setStatus('DB 연동됨 · ' + nowHm() + ' 불러옴' + ' · 저장된 자료 없음'); }
      else { data = normalize(json.payload); previewOnly = false; setStatus('DB 연동됨 · ' + nowHm() + ' 불러옴' + ' · 엠즈 기준 ' + data.asOf); if (showMsg) toast('엠즈 재고 자료를 불러왔습니다.', 'success'); }
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
    if (data && data.cfg && Object.keys(data.cfg.own || {}).length && !Object.keys(d.cfg.own).length) d.cfg = data.cfg; // 화면에서 정한 바로가 품목 설정은 갱신해도 유지
    d.importedAt = new Date().toISOString();
    saving = true; setStatus('저장 중...');
    try {
      const json = await api({ action: 'replaceAll', baseRevision: dbRevision, payload: d }, 180000);
      if (!json || json.ok === false) throw new Error((json && json.conflict ? '다른 기기에서 먼저 저장했습니다. 불러온 뒤 다시 시도해 주세요.' : (json && (json.message || json.error))) || '저장 실패');
      dbRevision = Number(json.revision) || dbRevision; data = d; previewOnly = false;
      setStatus('DB 연동됨 · ' + nowHm() + ' 저장' + ' · 엠즈 기준 ' + d.asOf);
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
    modal(`<div class="px-5 py-3 border-b border-stone-200"><h3 class="text-base font-extrabold text-stone-900">엠즈 재고 구글 스프레드시트 DB 설정</h3><div class="text-xs text-stone-500 mt-0.5">기본 주소(바로가 엠즈 재고 DB)가 들어 있습니다. 다른 DB를 쓸 때만 바꾸세요. 접속 코드는 다른 DB와 같습니다.</div></div>
      <div class="p-4"><label class="text-xs font-bold text-stone-700 block mb-1">Google Apps Script 웹 앱 URL</label><input id="mssUrlInput" type="url" value="${esc(getUrl())}" placeholder="https://script.google.com/macros/s/.../exec" class="w-full border border-stone-300 focus:border-emerald-600 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono bg-stone-50 focus:bg-white text-stone-900"></div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2"><button type="button" onclick="MsStock.closeModal()" class="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer">취소</button><button type="button" onclick="MsStock.saveDbUrl()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">URL 저장 및 불러오기</button></div>`);
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
  // 상품코드별 바로가 품목 여부: 설정값이 있으면 그대로, 없으면 추정(엠즈 입고의 레시피 품목코드 연결이 있거나 이름에 '생지')
  function ownMap(d) {
    const feed = typeof window.barogaMsStockFeed === 'function' ? window.barogaMsStockFeed() : { links: {}, records: [] };
    const linked = new Set(Object.keys(feed.links || {}).map(String)); (feed.records || []).forEach((r) => (r.items || []).forEach((i) => { if (i.code) linked.add(String(i.code)); }));
    const cfg = (d.cfg && d.cfg.own) || {}, out = {};
    d.stock.forEach((r) => { const c = String(r[0]), set = typeof cfg[c] === 'boolean'; const why = linked.has(c) ? '엠즈 입고 기록 있음' : /생지/.test(String(r[1])) ? "이름에 '생지'" : ''; out[c] = { on: set ? cfg[c] : !!why, set, why }; });
    return out;
  }
  function openOwnModal() {
    if (!data) return; const own = ownMap(data);
    const rows = data.stock.slice().sort((a, b) => Number(own[String(b[0])].on) - Number(own[String(a[0])].on) || String(a[1]).localeCompare(String(b[1]), 'ko')).map((r) => { const c = String(r[0]), o = own[c]; return `<label class="flex items-center gap-2 px-2 py-1.5 border-b border-stone-100 cursor-pointer hover:bg-stone-50"><input type="checkbox" data-own-code="${esc(c)}" ${o.on ? 'checked' : ''} class="w-4 h-4"><span class="font-mono text-xs text-stone-500">${esc(c)}</span><span class="text-sm font-bold flex-1 min-w-0 truncate">${esc(r[1])}</span><span class="text-[11px] text-stone-400 whitespace-nowrap">${o.set ? '직접 정함' : o.why ? '추정: ' + esc(o.why) : '추정: 해당 없음'}</span></label>`; }).join('');
    modal(`<div class="px-5 py-3 border-b border-stone-200"><h3 class="text-base font-extrabold">바로가 품목 설정</h3><div class="text-xs text-stone-500 mt-0.5 leading-relaxed">엠즈 위탁 재고 ${data.stock.length}품목 중 바로가 공장 제품을 체크해 주세요. 처음에는 엠즈 입고 기록이 있거나 이름에 '생지'가 있는 상품을 추정해 체크해 두었습니다. 저장하면 다음 갱신 때도 유지되고, 새로 생긴 상품은 다시 추정합니다.</div></div>
      <div class="max-h-[60vh] overflow-y-auto">${rows}</div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2"><button type="button" onclick="MsStock.closeModal()" class="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer">취소</button><button type="button" onclick="MsStock.saveOwn()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">저장</button></div>`);
  }
  async function saveOwn() {
    if (!data || saving) return; if (previewOnly || !loaded) { toast('DB를 불러온 뒤에 저장할 수 있습니다.', 'error'); return; }
    const own = {}; document.querySelectorAll('[data-own-code]').forEach((el) => { own[el.dataset.ownCode] = !!el.checked; });
    const next = Object.assign({}, data, { cfg: { own: Object.assign({}, (data.cfg && data.cfg.own) || {}, own) } });
    closeModal(); saving = true; setStatus('저장 중...');
    try {
      const json = await api({ action: 'replaceAll', baseRevision: dbRevision, payload: next }, 180000);
      if (!json || json.ok === false) throw new Error((json && json.conflict ? '다른 기기에서 먼저 저장했습니다. [불러오기] 후 다시 설정해 주세요.' : (json && (json.message || json.error))) || '저장 실패');
      dbRevision = Number(json.revision) || dbRevision; data = next; setStatus('DB 연동됨 · ' + nowHm() + ' 저장' + ' · 엠즈 기준 ' + data.asOf); toast('바로가 품목 설정을 저장했습니다.', 'success');
    } catch (e) { setStatus('저장 실패'); toast('바로가 품목 설정 저장 실패: ' + e.message, 'error'); } finally { saving = false; render(); }
  }
  function compute() {
    const d0 = data, asOfDate = dateOf(d0.asOf), asOfYm = d0.asOf.slice(0, 7);
    // 바로가 품목만 보기: [바로가 품목 설정]에서 정한 상품 (정하지 않은 상품은 추정)
    const own = ownMap(d0), hasOwn = true, useOwn = ownOnly;
    const normName = (s) => String(s || '').replace(/^[SM]\s*/, '').replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/\s+/g, '').toLowerCase();
    const ownCodes = new Set(Object.keys(own).filter((c) => own[c].on)), ownNames = new Set(d0.stock.filter((r) => ownCodes.has(String(r[0]))).map((r) => normName(r[1])));
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
    return { items, lots, returns, sales, weeks, byItem: trend(O.code, O.name), byStore: trend(O.store, O.store), O, days, daysThis, months, fac, asOfDate, hasOwn, useOwn, ownGuess: Object.values(own).filter((o) => o.on && !o.set).length, stockAll: d0.stock.length, stockShown: d.stock.length, ordersAll: d0.orders.length, ordersShown: d.orders.length };
  }

  // ---------- 화면 ----------
  const GRADE_CLS = { '긴급 발주': 'bg-rose-100 text-rose-800 border-rose-200', '우선 발주': 'bg-orange-100 text-orange-800 border-orange-200', '발주 권장': 'bg-amber-100 text-amber-900 border-amber-200', '모니터링': 'bg-stone-100 text-stone-600 border-stone-200', '출고 없음': 'bg-white text-stone-400 border-stone-200', '30일 이하 긴급': 'bg-rose-100 text-rose-800 border-rose-200', '기한 지남': 'bg-rose-600 text-white border-rose-600', '60일 이하 주의': 'bg-orange-100 text-orange-800 border-orange-200', '100일 이하 확인': 'bg-amber-100 text-amber-900 border-amber-200' };
  const chip = (g) => (g ? `<span class="px-1.5 py-0.5 rounded border text-[11px] font-bold whitespace-nowrap ${GRADE_CLS[g] || 'bg-stone-100 text-stone-600 border-stone-200'}">${esc(g)}</span>` : '');
  const tabBtn = (k, icon, label) => `<button type="button" onclick="MsStock.setView('${k}')" class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition cursor-pointer ${view === k ? 'bg-stone-900 text-white shadow-xs' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'}"><i data-lucide="${icon}" class="w-4 h-4"></i><span>${label}</span></button>`;
  const BTN = 'flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition cursor-pointer whitespace-nowrap';
  const infoChip = (label, val, warn) => `<span class="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg border text-xs whitespace-nowrap ${warn ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-stone-50 border-stone-200 text-stone-600'}"><span class="font-semibold ${warn ? '' : 'text-stone-400'}">${label}</span><b class="${warn ? '' : 'text-stone-800'} tabular-nums">${val}</b></span>`;
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
  // ---------- 6. 그래프 ----------
  // 색: 8가지(색각 이상 구분 검증된 순서). 9·10번째는 같은 색을 다시 쓰되 긴 점선 + 네모 점으로 구분
  const G_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
  const G_INK = '#57534e', G_GRID = '#e7e5e4';
  let charts = [], pendingGraph = null;
  const shortName = (t) => String(t || '').replace(/^[SM]?\s*[\(\[][^\)\]]*[\)\]]\s*/, '').replace(/^[SM](?=[가-힣])/, '').replace(/_.*$/, '').trim() || String(t || '');
  function graphData(C) {
    const O = C.O, dates = Array.from(new Set(C.sales.map((r) => String(r[O.date]).slice(0, 10)))).sort();
    const top = C.byItem.slice(0, 10), idx = {}; dates.forEach((dt, i) => { idx[dt] = i; });
    const qty = {}; top.forEach((x) => { qty[x.key] = dates.map(() => 0); });
    const amt = dates.map(() => 0);
    C.sales.forEach((r) => { const i = idx[String(r[O.date]).slice(0, 10)]; if (i == null) return; amt[i] += Number(r[O.supply]) || 0; const q = qty[String(r[O.code])]; if (q) q[i] += Number(r[O.qty]) || 0; });
    const wd = ['일', '월', '화', '수', '목', '금', '토'];
    return { dates, labels: dates.map((dt) => { const x = dateOf(dt); return `${x.getMonth() + 1}/${x.getDate()}(${wd[x.getDay()]})`; }), top, qty, amt };
  }
  function graphBody(C, sec) {
    const G = graphData(C);
    if (!G.dates.length) return `<div class="${card} text-sm text-stone-500">발주 자료가 없습니다.</div>`;
    const total = G.amt.reduce((a, v) => a + v, 0), maxI = G.amt.indexOf(Math.max(...G.amt)), minI = G.amt.indexOf(Math.min(...G.amt));
    const stat = (l, v) => `<span class="text-xs text-stone-500">${l} <b class="text-stone-800 tabular-nums">${v}</b></span>`;
    return `<div class="text-xs text-stone-500 -mb-1">가로축은 발주가 있었던 날만 표시합니다(발주가 없는 날은 건너뜀). 선 위에 마우스를 올리면 그날의 값이 나오고, 아래 범례의 이름을 누르면 그 선을 숨기거나 다시 보일 수 있습니다. 마지막 날은 자료를 읽은 시각까지만 들어 있습니다.</div>
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        ${sec('품목별 발주 수량', '발주금액 TOP 10 · 일자별 입고수량', `<div style="position:relative;height:460px"><canvas id="mssChartItem"></canvas></div>`)}
        ${sec('가맹점 발주 총액', '일자별 공급가 합계', `<div class="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2.5 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200"><span class="text-xs font-bold text-stone-500">공급가 합계</span><span class="text-xl font-extrabold text-stone-900 tabular-nums">${won(total)}</span>${stat('하루 평균', won(total / G.dates.length))}${stat('가장 많은 날', `${G.labels[maxI]} ${won(G.amt[maxI])}`)}${stat('가장 적은 날', `${G.labels[minI]} ${won(G.amt[minI])}`)}</div><div style="position:relative;height:392px"><canvas id="mssChartStore"></canvas></div>`)}
      </div>`;
  }
  function drawGraphs(C) {
    if (typeof window.Chart !== 'function') return;
    const G = graphData(C), a = document.getElementById('mssChartItem'), b = document.getElementById('mssChartStore');
    if (!a || !b || !G.dates.length) return;
    const font = { family: "'Pretendard', 'Noto Sans KR', sans-serif", size: 11 };
    const axis = (fmt) => ({ x: { grid: { display: false }, ticks: { color: G_INK, font, maxRotation: 0, autoSkip: true, autoSkipPadding: 8 }, border: { color: G_GRID } }, y: { beginAtZero: true, grid: { color: G_GRID }, border: { display: false }, ticks: { color: G_INK, font, callback: fmt } } });
    const tip = { backgroundColor: '#1c1917', titleFont: font, bodyFont: font, padding: 10, boxPadding: 4, usePointStyle: true };
    charts.push(new Chart(a, { type: 'line',
      data: { labels: G.labels, datasets: G.top.map((x, i) => { const again = i >= G_COLORS.length, col = G_COLORS[i % G_COLORS.length]; return { label: `${i + 1}. ${shortName(x.label)}`, data: G.qty[x.key], borderColor: col, backgroundColor: col, borderWidth: 2, borderDash: again ? [9, 4] : [3, 3], pointStyle: again ? 'rect' : 'circle', pointRadius: 3, pointHoverRadius: 6, pointBorderColor: '#ffffff', pointBorderWidth: 1, tension: 0 }; }) },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: axis((v) => num(v, 0)),
        plugins: { legend: { position: 'bottom', labels: { color: G_INK, font, usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 12 } }, tooltip: Object.assign({ itemSort: (p, q) => q.parsed.y - p.parsed.y, callbacks: { title: (it) => it[0].label, label: (it) => ` ${G.top[it.datasetIndex].label}: ${num(it.parsed.y, 0)}` } }, tip) } } }));
    const col = G_COLORS[0];
    charts.push(new Chart(b, { type: 'line',
      data: { labels: G.labels, datasets: [{ label: '공급가 합계', data: G.amt.map((v) => Math.round(v)), borderColor: col, backgroundColor: col, borderWidth: 2, borderDash: [3, 3], pointRadius: 4, pointHoverRadius: 7, pointBorderColor: '#ffffff', pointBorderWidth: 1, tension: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: axis((v) => (v >= 10000 ? num(v / 10000, 0) + '만' : num(v, 0))),
        plugins: { legend: { display: false }, tooltip: Object.assign({ callbacks: { label: (it) => ` 공급가 합계: ${won(it.parsed.y)}` } }, tip) } } }));
  }

  // 발주 추이 표: 맨 위 합계 줄 · 주차(실제 날짜 범위) · 숫자 아래 ▲▼ 증감
  function trendTable(C, list, firstLabel, limit) {
    const wk = C.weeks, P = (data && data.period) || {}, dates = C.sales.map((r) => String(r[C.O.date]).slice(0, 10)).sort();
    const pFrom = dateOf(P.from || dates[0] || wk[0]), pTo = dateOf(P.to || dates[dates.length - 1] || wk[wk.length - 1]);
    const md = (dt) => `${dt.getMonth() + 1}/${dt.getDate()}`;
    const W = wk.map((w, i) => { const s0 = dateOf(w), e0 = new Date(s0.getTime() + 6 * dayMs), s = s0 < pFrom ? pFrom : s0, e = e0 > pTo ? pTo : e0, days = Math.round((e - s) / dayMs) + 1; return { key: w, no: i + 1, range: `${md(s)}~${md(e)}`, days, part: days < 7 }; });
    const UP = '#059669', DOWN = '#e11d48', FLAT = '#a8a29e';
    const cmpOk = (i) => i > 0 && !W[i].part && !W[i - 1].part; // 7일이 안 되는 주는 앞뒤 주와 비교하지 않음
    const colorOf = (vals, i) => (!cmpOk(i) ? FLAT : vals[i] > vals[i - 1] ? UP : vals[i] < vals[i - 1] ? DOWN : FLAT);
    const line = (label, x, total) => {
      const vals = wk.map((w) => (x.w[w] || { qty: 0 }).qty);
      const cells = vals.map((v, i) => { const p = cmpOk(i) ? vals[i - 1] : null, diff = p == null || !p ? null : ((v - p) / p) * 100, col = colorOf(vals, i);
        return `<td class="${tdr} ${total ? 'font-extrabold' : ''}">${num(v, 0)}${diff == null ? '' : `<div class="text-[10px] font-bold leading-tight" style="color:${col}">${diff > 0 ? '▲' : diff < 0 ? '▼' : ''}${num(Math.abs(diff), 0)}%</div>`}</td>`; }).join('');
      return `<tr class="${total ? 'bg-amber-50/70' : ''}"><td class="${td} w-full max-w-0 ${total ? 'font-extrabold text-stone-900' : 'font-bold'}"><div class="truncate" title="${esc(label)}">${esc(label)}</div></td>${cells}<td class="${tdr} font-extrabold">${num(x.qty, 0)}</td><td class="${tdr} ${total ? 'font-extrabold text-stone-900' : 'font-bold'} whitespace-nowrap">${won(x.amt)}</td></tr>`;
    };
    const tot = { w: {}, qty: 0, amt: 0 }; list.forEach((x) => { tot.qty += x.qty; tot.amt += x.amt; wk.forEach((w) => { const c = x.w[w]; if (c) { const t = tot.w[w] || (tot.w[w] = { qty: 0, amt: 0 }); t.qty += c.qty; t.amt += c.amt; } }); });
    const shown = limit ? list.slice(0, limit) : list;
    const rows = list.length ? line('주차별 합계', tot, true) + shown.map((x) => line(x.label, x)).join('') : '';
    const table = tableWrap(`<th class="${th}">${firstLabel}</th>${W.map((w) => `<th class="${th} text-right">${w.no}주차<div class="text-[10px] font-bold ${w.part ? 'text-amber-700' : 'text-stone-400'}">${w.range}${w.part ? `<br>(${w.days}일)` : ''}</div></th>`).join('')}<th class="${th} text-right">수량 합계</th><th class="${th} text-right">공급가 합계</th>`, rows, '발주 자료가 없습니다.', wk.length + 3).replace(/py-2 px-2 /g, 'py-2 px-2 align-bottom ').replace(/py-1\.5 px-2 /g, 'py-2 px-2 whitespace-nowrap align-top ');
    return `<div class="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2.5 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200"><span class="text-xs font-bold text-stone-500">공급가 합계 <span class="text-stone-800">(${list.length}${firstLabel === '매장' ? '점' : '품목'})</span></span><span class="text-xl font-extrabold text-stone-900 tabular-nums">${won(tot.amt)}</span><span class="text-xs text-stone-500">수량 <b class="text-stone-800 tabular-nums">${num(tot.qty, 0)}</b></span></div>${table}`;
  }

  function render() {
    const el = root(); if (!el) return;
    charts.forEach((c) => { try { c.destroy(); } catch (e) {} }); charts = []; pendingGraph = null;
    const dbOk = !!getUrl() && loaded, dbCls = !getUrl() ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100' : dbOk ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100';
    const bar = `<div class="w-full bg-stone-100/90 border-b border-stone-200 no-print"><div class="max-w-[1600px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5">${tabBtn('DASH', 'layout-dashboard', '1. 대시보드')}${tabBtn('ORDER', 'clipboard-list', '2. 발주 우선순위')}${tabBtn('EXPIRY', 'calendar-days', '3. 유통기한 임박')}${tabBtn('RETURN', 'rotate-ccw', '4. 반품 현황')}${tabBtn('TREND', 'trending-up', '5. 발주 추이')}${tabBtn('GRAPH', 'bar-chart-3', '6. 그래프')}</div>
        <div class="flex items-center gap-1.5 ml-auto">
          <button type="button" onclick="MsStock.openDbModal()" title="DB 주소 설정" class="flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl text-xs font-bold border transition cursor-pointer ${dbCls}"><span class="w-2 h-2 rounded-full ${!getUrl() ? 'bg-amber-500' : dbOk ? 'bg-emerald-500' : 'bg-stone-400'}"></span><span id="mssStatusText">${esc(statusText)}</span><i data-lucide="settings" class="w-3.5 h-3.5 ml-0.5 opacity-75"></i></button>
          <button type="button" onclick="MsStock.pickFile()" title="엠즈에서 읽어 만든 JSON 파일로 DB를 바꿉니다 (보통은 Claude가 자동으로 저장)" class="${BTN}"><i data-lucide="file-up" class="w-3.5 h-3.5"></i><span>자료 가져오기</span></button>
          <button type="button" onclick="MsStock.pull(true)" title="DB에서 다시 불러오기" class="flex items-center justify-center w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition cursor-pointer"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button>
        </div></div></div>`;
    const shell = (inner) => { el.innerHTML = `<div class="w-full">${bar}<div class="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">${inner}</div></div><div id="mssModal"></div>`; if (window.lucide) lucide.createIcons(); if (pendingGraph) { const g = pendingGraph; pendingGraph = null; drawGraphs(g); } };
    if (!getUrl() && !(previewOnly && data)) { shell(`<div class="${card} text-sm text-stone-600"><b>엠즈 재고 DB가 아직 연결되지 않았습니다.</b> 구글 시트에 <span class="font-mono">7_ms_stock.gs</span>를 배포한 뒤 오른쪽 위 DB 버튼에 웹 앱 주소를 넣어 주세요.</div>`); return; }
    if (!data) { shell(`<div class="${card} text-sm text-stone-600">${loading ? '불러오는 중입니다...' : loaded ? '<b>저장된 엠즈 재고 자료가 없습니다.</b> 엠즈 e플랫폼에 로그인한 뒤 Claude에게 "엠즈 재고 갱신해줘"라고 요청하면 자료를 읽어 저장합니다.' : 'DB를 불러오지 못했습니다. 오른쪽 위 새로고침 버튼을 눌러 주세요.'}</div>`); return; }
    const C = compute(), d = data;
    const urgent = C.items.filter((it) => it.grade === '긴급 발주').length, prio = C.items.filter((it) => it.grade === '우선 발주').length, rec = C.items.filter((it) => it.grade === '발주 권장').length;
    const exp30 = new Set(C.lots.filter((l) => l.left <= 30).map((l) => l.code)).size, unsold = new Set(C.lots.filter((l) => l.unsold > 0.01).map((l) => l.code)).size;
    const retAmt = C.returns.reduce((a, r) => a + (Number(r[C.O.total]) || 0), 0);
    const ageDays = Math.round((dateOf(ymd(new Date())) - C.asOfDate) / dayMs);
    const md = (t) => String(t || '').slice(5).replace('-', '/');
    const monthsTxt = C.months.map((m) => Number(m.slice(5)) + '월').join('·');
    const basis = `<div class="${card} !py-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5">${infoChip('자료 기준', esc(d.asOf))}${ageDays > 0 ? infoChip('경과', ageDays + '일 전 자료', true) : ''}${infoChip('주문 조회', `${esc(md((d.period || {}).from))} ~ ${esc(md((d.period || {}).to))}`)}${C.fac.ready ? infoChip('공장 재고', esc(md(C.fac.baseDate)) + ' 실사 반영') : infoChip('공장 재고', '미반영', true)}${infoChip('표시', C.useOwn ? `바로가 품목 ${C.stockShown}/${C.stockAll}` : `전체 ${C.stockAll}품목`)}${C.useOwn && C.ownGuess ? infoChip('추정', C.ownGuess + '개', true) : ''}</div>
          <div class="flex flex-wrap items-center gap-1.5"><button type="button" onclick="MsStock.toggleOwn()" title="바로가 품목만 / 엠즈 위탁 전체 품목 전환" class="flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-xs transition cursor-pointer whitespace-nowrap"><i data-lucide="layers" class="w-3.5 h-3.5"></i>${C.useOwn ? '전체 품목 보기' : '바로가 품목만 보기'}</button><button type="button" onclick="MsStock.openOwnModal()" class="${BTN}"><i data-lucide="settings" class="w-3.5 h-3.5"></i><span>바로가 품목 설정</span></button></div>
        </div>
        <details class="mt-2"><summary class="text-xs font-bold text-stone-500 cursor-pointer hover:text-stone-800 select-none">계산 기준 보기</summary>
          <ul class="mt-1.5 text-xs text-stone-600 leading-relaxed list-disc pl-5 space-y-0.5">
            <li><b>일평균 출고</b> = 위탁상품 수불부(${monthsTxt}, ${C.days}일)의 순출고 ÷ 일수</li>
            <li><b>회전일</b> = 가용 합계(엠즈 재고 + 공장 재고) ÷ 일평균 출고</li>
            <li><b>조치</b> = 회전일 7일 이하 긴급 발주 / 14일 이하 우선 발주 / 30일 이하 발주 권장</li>
            <li><b>공장 재고</b> = ${C.fac.ready ? `생산 재고 현재고 (${esc(C.fac.baseDate)} 실사 기준)` : `<span class="text-amber-800 font-bold">미반영 — ${esc(C.fac.why)}</span>`}</li>
            <li><b>주문 조회 기간</b> = ${esc((d.period || {}).from || '')} ~ ${esc((d.period || {}).to || '')}${C.useOwn ? ` · 바로가 품목만 (주문 ${num(C.ordersShown, 0)}/${num(C.ordersAll, 0)}줄)` : ''}</li>
          </ul></details></div>`;
    const sec = (title, sub, body, more) => `<div class="${card}"><div class="flex items-center justify-between gap-2 mb-2.5"><h3 class="text-base font-extrabold text-stone-900">${title}${sub ? ` <span class="text-xs font-bold text-stone-500">(${sub})</span>` : ''}</h3>${more ? `<button type="button" onclick="MsStock.setView('${more}')" class="${BTN} !h-8">전체 보기 →</button>` : ''}</div>${body}</div>`;
    let body = '';
    if (view === 'DASH') body = `<div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
          ${kpi('긴급 발주 (7일 이하)', urgent + '개', `우선 ${prio}개 · 권장 ${rec}개`, urgent ? 'text-rose-700' : '')}
          ${kpi('유통기한 30일 이내', exp30 + '개 품목', '기한 지난 재고 포함', exp30 ? 'text-rose-700' : '')}
          ${kpi('기한 전 소진 어려움', unsold + '개 품목', '지금 출고 속도 기준', unsold ? 'text-violet-800' : '')}
          ${kpi('반품 금액', won(retAmt), `${C.returns.length}건 · 조회 기간 내`, retAmt < 0 ? 'text-rose-700' : '')}
          ${kpi(C.useOwn ? '바로가 재고 품목' : '엠즈 재고 품목', C.stockShown + '개', `${C.useOwn ? `전체 ${C.stockAll}개 중 · ` : ''}가맹점 발주 ${num(C.sales.length, 0)}줄 · 매장 ${C.byStore.length}점`)}
        </div>
        ${sec('발주 우선순위', '회전일 짧은 순 10개', orderTable(C, 10), 'ORDER')}
        ${sec('유통기한 임박', '빠른 순 10개', expiryTable(C, 10), 'EXPIRY')}
        ${sec('반품 현황', '금액 큰 순 10건', returnBlock(C, 10), 'RETURN')}`;
    else if (view === 'ORDER') body = sec('발주 우선순위', '회전일 짧은 순 · 출고가 없는 품목 제외', orderTable(C)) + sec('출고가 없는 품목', '조회한 달 기준', tableWrap(`<th class="${th}">코드</th><th class="${th}">상품명</th><th class="${th} text-right">엠즈 재고</th>`, C.items.filter((it) => it.rot == null && it.qty > 0).map((it) => `<tr><td class="${td} font-mono text-xs">${esc(it.code)}</td><td class="${td} font-bold">${esc(it.name)}</td><td class="${tdr}">${num(it.qty)} <span class="text-[11px] text-stone-400">${esc(it.unit)}</span></td></tr>`).join(''), '해당 품목이 없습니다.', 3));
    else if (view === 'EXPIRY') body = sec('유통기한 임박', '100일 이내 또는 기한 전 소진이 어려운 재고 · 보라색 = 소진 불가 예상', expiryTable(C));
    else if (view === 'RETURN') body = sec('반품 현황', '', returnBlock(C));
    else if (view === 'TREND') body = `<div class="text-xs text-stone-500 -mb-1">주차는 월요일~일요일 기준이며 조회 기간 안의 날짜만 셉니다. <b class="text-amber-700">(N일)</b> 표시가 있는 주는 7일이 안 되는 주라서 증감을 표시하지 않고 않습니다. ▲▼는 바로 앞 주 대비 <b style="color:#059669">증가</b> · <b style="color:#e11d48">감소</b>입니다.</div><div class="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">${sec('품목별 발주 추이', '주차별 입고수량 · 공급가 큰 순', trendTable(C, C.byItem, '상품명'))}${sec('가맹점별 발주 추이', '주차별 입고수량 · 공급가 큰 순', trendTable(C, C.byStore, '매장'))}</div>`;
    if (view === 'GRAPH') { body = graphBody(C, sec); pendingGraph = C; }
    shell(basis + body);
  }
  let mounted = false;
  function mount() { render(); if (!mounted) { mounted = true; pull(false); } }
  window.mountMsStockApp = mount;
  window.MsStock = { mount, pull, pickFile, importSnapshot, preview, openDbModal, saveDbUrl, closeModal, setView: (v) => { view = v; render(); }, toggleOwn: () => { ownOnly = !ownOnly; render(); }, openOwnModal, saveOwn, _debug: () => ({ data, dbRevision, loaded, computed: data ? compute() : null }) };
})();
