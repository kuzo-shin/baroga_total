// [VERSION: ms_stock.js v1.10 - 2026-11-24 운영 보고서: 표마다 상위 10줄 + [펼치기] · 칸 줄바꿈 없게 열 폭 조정 · 3(반품·폐기)과 4(요일 패턴) 순서 바꿈 / v1.9 - 2026-11-24 운영 보고서를 공장 관점으로(금액 대신 순출고 수량 · 생산 필요량 · 품목별 출고 추이와 수량 등급 · 요일 패턴 · 매입처 반품 · 폐기 위험), 가맹점 분석은 뺌 / v1.8 - 2026-11-24 5. 운영 보고서 신설(주간·월간: 생산 필요량 · 요일별 패턴 · 품목 등급 · 가맹점 이상 신호 · 폐기·반품 손실), 월별 발주 이력(hist) 누적 저장 · 5. 발주 추이와 6. 그래프 삭제 / v1.7 - 2026-11-24 그래프를 점선에서 실선(점을 선으로 이음)으로 / v1.6 - 2026-11-24 6. 그래프 탭 신설(품목 발주금액 TOP10의 일자별 발주 수량 · 가맹점 발주 총액의 일자별 변화) · 발주 추이 표 숫자 줄 맞춤 / v1.5 - 2026-11-24 [전체 품목 보기] 버튼에 색 · 발주 추이 위 합계에 (n품목)/(n점) 표기, 표 첫 줄은 '주차별 합계' · 가맹점 단위 곳→점 / v1.4 - 2026-11-24 발주 추이: 추이 그래프·칸 아래 막대 삭제(숫자 + ▲▼만) / v1.3 - 2026-11-24 발주 추이: 품목별·가맹점별 좌우 카드 · 맨 위 합계 줄 · N주차(실제 날짜 범위, 7일 미만 주 표시) · 줄마다 막대 그래프와 칸 아래 막대 / v1.2 - 2026-11-24 화면을 다른 메뉴와 같은 모양으로(상단 탭 바 + 오른쪽 DB 상태·새로고침, 버튼 모양 통일) · 기준 안내를 한 줄 요약 + [계산 기준] 펼침으로 묶음 · 구역 제목 키우고 설명은 괄호로 / v1.1 - 2026-11-24 바로가 품목만 보기([바로가 품목 설정]에서 고른 상품, 정하지 않은 상품은 추정 · 전체 보기 전환 가능) / v1.0 - 2026-11-24 신규: 엠즈 재고 대시보드(발주 우선순위 · 유통기한 임박 · 반품 현황 · 발주 추이). 자료는 엠즈 e플랫폼에서 읽어 전용 DB(구글 시트)에 저장한 것을 불러옴]
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
//      hist   { 'YYYY-MM': 한 달 치 주문대비 입고현황(판매처) 압축본 }                          ← 월별 발주 이력 (갱신해도 유지, 읽은 달만 교체). 형식은 '5. 운영 보고서' 주석 참고
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
    return { v: p.v || 1, asOf: String(p.asOf || ''), period: p.period || {}, names: p.names || {}, stock: arr(p.stock), expiry: arr(p.expiry), ledger: p.ledger && typeof p.ledger === 'object' ? p.ledger : {}, daily: arr(p.daily), orders: arr(p.orders), cfg: p.cfg && typeof p.cfg === 'object' ? { own: p.cfg.own && typeof p.cfg.own === 'object' ? p.cfg.own : {} } : { own: {} }, hist: p.hist && typeof p.hist === 'object' ? p.hist : {}, importedAt: p.importedAt || '' };
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
    // 월별 발주 이력은 갱신해도 유지하고, 이번에 읽은 달(주문 조회 기간의 달)만 새 자료로 바꿈
    d.hist = Object.assign({}, (data && data.hist) || {});
    const hym = String((d.period || {}).from || '').slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(hym) && d.orders.length && d.orders.every((r) => String(r[2]).slice(0, 7) === hym)) d.hist[hym] = packMonth(d.orders, d.period.from, d.period.to);
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
  function modal(html) { const h = document.getElementById('mssModal'); if (h) h.innerHTML = `<div class="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onclick="if(event.target===this)MsStock.closeModal()"><div class="bg-white rounded-2xl shadow-xl w-full max-w-[640px]">${html}</div></div>`; }
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
    d.stock.forEach((r) => { const c = String(r[0]), set = typeof cfg[c] === 'boolean'; const why = linked.has(c) ? '엠즈 출고 기록 있음' : /생지/.test(String(r[1])) ? "이름에 '생지'" : ''; out[c] = { on: set ? cfg[c] : !!why, set, why }; });
    return out;
  }
  function openOwnModal() {
    if (!data) return; const own = ownMap(data);
    const rows = data.stock.slice().sort((a, b) => Number(own[String(b[0])].on) - Number(own[String(a[0])].on) || String(a[1]).localeCompare(String(b[1]), 'ko')).map((r) => { const c = String(r[0]), o = own[c]; return `<label class="flex items-center gap-2 px-2 py-1.5 border-b border-stone-100 cursor-pointer hover:bg-stone-50"><input type="checkbox" data-own-code="${esc(c)}" ${o.on ? 'checked' : ''} class="w-4 h-4"><span class="font-mono text-xs text-stone-500">${esc(c)}</span><span class="text-sm font-bold flex-1 min-w-0 truncate">${esc(r[1])}</span><span class="text-xs text-stone-400 whitespace-nowrap">${o.set ? '직접 정함' : o.why ? '추정: ' + esc(o.why) : '추정: 해당 없음'}</span></label>`; }).join('');
    modal(`<div class="px-5 py-3 border-b border-stone-200"><h3 class="text-base font-extrabold">바로가 품목 설정</h3><div class="text-xs text-stone-500 mt-0.5 leading-relaxed">엠즈 위탁 재고 ${data.stock.length}품목 중 바로가 공장 제품을 체크해 주세요. 처음에는 제품 출고(엠즈 출고) 기록이 있거나 이름에 '생지'가 있는 상품을 추정해 체크해 두었습니다. 저장하면 다음 갱신 때도 유지되고, 새로 생긴 상품은 다시 추정합니다.</div></div>
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
    return { items, lots, returns, sales, weeks, byItem: trend(O.code, O.name), byStore: trend(O.store, O.store), ownNames, allNames: new Set(d0.stock.map((r) => normName(r[1]))), O, days, daysThis, months, fac, asOfDate, hasOwn, useOwn, ownGuess: Object.values(own).filter((o) => o.on && !o.set).length, stockAll: d0.stock.length, stockShown: d.stock.length, ordersAll: d0.orders.length, ordersShown: d.orders.length };
  }

  // ---------- 화면 ----------
  const GRADE_CLS = { '긴급 발주': 'bg-rose-100 text-rose-800 border-rose-200', '우선 발주': 'bg-orange-100 text-orange-800 border-orange-200', '발주 권장': 'bg-amber-100 text-amber-900 border-amber-200', '모니터링': 'bg-stone-100 text-stone-600 border-stone-200', '출고 없음': 'bg-white text-stone-400 border-stone-200', '30일 이하 긴급': 'bg-rose-100 text-rose-800 border-rose-200', '기한 지남': 'bg-rose-600 text-white border-rose-600', '60일 이하 주의': 'bg-orange-100 text-orange-800 border-orange-200', '100일 이하 확인': 'bg-amber-100 text-amber-900 border-amber-200' };
  const chip = (g) => (g ? `<span class="px-1.5 py-0.5 rounded border text-xs font-bold whitespace-nowrap ${GRADE_CLS[g] || 'bg-stone-100 text-stone-600 border-stone-200'}">${esc(g)}</span>` : '');
  const tabBtn = (k, icon, label) => `<button type="button" onclick="MsStock.setView('${k}')" class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition cursor-pointer ${view === k ? 'bg-stone-900 text-white border border-stone-900 shadow-xs' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'}"><i data-lucide="${icon}" class="w-4 h-4"></i><span>${label}</span></button>`;
  const BTN = 'flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition cursor-pointer whitespace-nowrap';
  const infoChip = (label, val, warn) => `<span class="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg border text-xs whitespace-nowrap ${warn ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-stone-50 border-stone-200 text-stone-600'}"><span class="font-semibold ${warn ? '' : 'text-stone-400'}">${label}</span><b class="${warn ? '' : 'text-stone-800'} tabular-nums">${val}</b></span>`;
  const kpi = (label, val, sub, cls) => `<div class="${card}"><div class="text-xs font-bold text-stone-500">${label}</div><div class="mt-1 text-xl font-extrabold tabular-nums ${cls || 'text-stone-900'}">${val}</div><div class="text-xs text-stone-500 mt-0.5">${sub || ''}</div></div>`;
  const tableWrap = (head, rows, empty, cols) => `<div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm"><thead><tr>${head}</tr></thead><tbody>${rows || `<tr><td colspan="${cols}" class="py-6 text-center text-xs text-stone-400">${empty}</td></tr>`}</tbody></table></div>`;

  function orderTable(C, limit) {
    const list = C.items.filter((it) => it.rot != null).sort((a, b) => a.rot - b.rot || b.short30 - a.short30);
    const rows = (limit ? list.slice(0, limit) : list).map((it, i) => `<tr class="${it.rot <= 7 ? 'bg-rose-50/60' : ''}"><td class="${td} text-xs text-stone-400">${i + 1}</td><td class="${td} font-mono text-xs">${esc(it.code)}</td><td class="${td} font-bold">${esc(it.name)}</td><td class="${tdr}">${num(it.qty)} <span class="text-xs text-stone-400">${esc(it.unit)}</span></td><td class="${tdr}">${C.fac.ready ? num(it.factory) : '-'}</td><td class="${tdr} font-bold">${num(it.total)}</td><td class="${tdr}">${num(it.avg)}</td><td class="${tdr} text-stone-500">${num(it.avgThis)}</td><td class="${tdr} font-extrabold">${num(it.rot)}일</td><td class="${tdr}">${it.runout.slice(5).replace('-', '/')}</td><td class="${tdr}">${it.short30 > 0 ? num(it.short30) : '-'}</td><td class="${td}">${chip(it.grade)}</td></tr>`).join('');
    return tableWrap(`<th class="${th}">순위</th><th class="${th}">코드</th><th class="${th}">상품명</th><th class="${th} text-right">엠즈 재고</th><th class="${th} text-right">공장 재고</th><th class="${th} text-right">가용 합계</th><th class="${th} text-right">일평균 출고</th><th class="${th} text-right">이번 달 일평균</th><th class="${th} text-right">회전일</th><th class="${th} text-right">예상 소진일</th><th class="${th} text-right">30일치 부족</th><th class="${th}">조치</th>`, rows, '회전일을 계산할 품목이 없습니다.', 12);
  }
  function expiryTable(C, limit) {
    const list = C.lots.filter((l) => l.left <= 100 || l.unsold > 0.01);
    const rows = (limit ? list.slice(0, limit) : list).map((l, i) => `<tr class="${l.unsold > 0.01 ? 'bg-violet-50/60' : ''}"><td class="${td} text-xs text-stone-400">${i + 1}</td><td class="${td} font-mono text-xs">${esc(l.code)}</td><td class="${td} font-bold">${esc(l.name)}</td><td class="${tdr}">${esc(l.ex)}</td><td class="${tdr} font-extrabold">${num(l.left, 0)}일</td><td class="${td}">${chip(l.grade)}</td><td class="${tdr}">${num(l.qty)} <span class="text-xs text-stone-400">${esc(l.unit)}</span></td><td class="${tdr}">${num(l.avg)}</td><td class="${tdr}">${num(l.canSell)}</td><td class="${tdr} font-extrabold ${l.unsold > 0.01 ? 'text-violet-800' : 'text-stone-400'}">${l.unsold > 0.01 ? num(l.unsold) : '-'}</td></tr>`).join('');
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
  // ---------- 5. 운영 보고서 (월별 발주 이력 hist 기반) ----------
  // hist['YYYY-MM'] = { from, to, stores:[[매장코드, 매장명]], items:[[상품코드, 상품명, 규격, 단가]], kinds:[매출구분...],
  //                     rows:[[일, 매장번호, 상품번호, 수량, 구분번호(, 공급가)]], memo:[[줄번호, 비고]], zero: 수량·금액이 모두 0이라 뺀 줄 수 }
  //   공급가는 '수량 × 단가'와 다를 때만 적음(용량 절약). 엠즈 주문대비 입고현황(판매처) 한 달 치를 그대로 담은 것
  // 순발주 = 판매·추가판매·판매조정·판매취소·미출고(조정·취소 포함)를 부호 그대로 더한 값 (취소·미출고는 음수라 빠짐)
  // 반품   = 매출구분에 '반품'이 들어간 줄. 비고에 '매입처'가 있으면 매입처(공장) 반품으로 따로 셈
  // 제외   = 샘플출고·매출할인 등 그 밖의 구분
  const SALE_KIND = /^(판매|추가판매|판매조정|판매취소|미출고|미출고조정|미출고취소)$/, RET_KIND = /반품/;
  const normName = (s) => String(s || '').replace(/^[SM]\s*/, '').replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/\s+/g, '').toLowerCase();
  function packMonth(rows, from, to) {
    const sIdx = {}, iIdx = {}, kIdx = {}, pc = {}, out = { v: 2, from, to, stores: [], items: [], kinds: [], rows: [], memo: [], zero: 0 };
    const live = rows.filter((r) => (Number(r[7]) || 0) !== 0 || (Number(r[8]) || 0) !== 0); out.zero = rows.length - live.length;
    live.forEach((r) => { const q = Number(r[7]) || 0; if (!q) return; const u = Math.round((Number(r[8]) || 0) / q * 100) / 100, m = pc[r[4]] || (pc[r[4]] = {}); m[u] = (m[u] || 0) + 1; });
    const price = (c) => (pc[c] ? Number(Object.entries(pc[c]).sort((a, b) => b[1] - a[1])[0][0]) : 0);
    live.forEach((r) => {
      const sc = String(r[0]), ic = String(r[4]), kd = String(r[3] || '').trim(), q = Number(r[7]) || 0, amt = Number(r[8]) || 0;
      if (!(sc in sIdx)) { sIdx[sc] = out.stores.length; out.stores.push([sc, r[1]]); }
      if (!(ic in iIdx)) { iIdx[ic] = out.items.length; out.items.push([ic, r[5], r[6], price(ic)]); }
      if (!(kd in kIdx)) { kIdx[kd] = out.kinds.length; out.kinds.push(kd); }
      const row = [Number(String(r[2]).slice(8, 10)), sIdx[sc], iIdx[ic], q, kIdx[kd]];
      if (Math.abs(q * out.items[iIdx[ic]][3] - amt) >= 1) row.push(amt);
      const mm = String(r[10] || '').trim(); if (mm) out.memo.push([out.rows.length, mm]);
      out.rows.push(row);
    });
    return out;
  }
  let histCache = { key: null, recs: [] };
  function histRecs() {
    const H = (data && data.hist) || {}, key = dbRevision + '|' + Object.keys(H).sort().map((k) => k + ':' + ((H[k].rows || []).length) + ':' + H[k].to).join(',');
    if (histCache.key === key) return histCache.recs;
    const recs = [];
    Object.keys(H).sort().forEach((ym) => {
      const h = H[ym]; if (!h || !Array.isArray(h.rows)) return; const memo = {}; (h.memo || []).forEach((m) => { memo[m[0]] = m[1]; });
      const nn = (h.items || []).map((it) => normName(it[1]));
      h.rows.forEach((r, idx) => {
        const it = h.items[r[2]], st = h.stores[r[1]], kind = h.kinds[r[4]] || '', date = ym + '-' + pad(r[0]), dt = dateOf(date);
        recs.push({ date, t: dt.getTime(), dow: (dt.getDay() + 6) % 7, sc: st[0], sn: st[1], ic: it[0], name: it[1], spec: it[2], nn: nn[r[2]], qty: r[3], amt: r.length > 5 ? r[5] : r[3] * it[3], kind, sale: SALE_KIND.test(kind), ret: RET_KIND.test(kind), memo: memo[idx] || '' });
      });
    });
    recs.sort((a, b) => a.t - b.t);
    histCache = { key, recs }; return recs;
  }
  // 엠즈에서 읽은 달별 원자료({ 'YYYY-MM': { from, to, rows:[주문 11칸] } })를 이력에 합쳐 DB에 저장
  async function importHistory(map) {
    if (!getUrl()) return { ok: false, message: 'DB 미연결' };
    if (saving) return { ok: false, message: '저장 중' };
    if (!loaded) { await pull(false); if (!loaded) return { ok: false, message: 'DB를 불러오지 못했습니다' }; }
    if (!data || previewOnly) return { ok: false, message: '엠즈 재고 자료가 먼저 저장돼 있어야 합니다' };
    const hist = Object.assign({}, data.hist || {}), counts = {};
    Object.keys(map || {}).forEach((ym) => { const m = map[ym]; if (!/^\d{4}-\d{2}$/.test(ym) || !m || !Array.isArray(m.rows)) return; if (m.rows.some((r) => String(r[2]).slice(0, 7) !== ym)) throw new Error(ym + ' 자료에 다른 달 날짜가 섞여 있습니다'); const p = packMonth(m.rows, m.from, m.to); hist[ym] = p; counts[ym] = p.rows.length; });
    if (!Object.keys(counts).length) return { ok: false, message: '넣을 달이 없습니다' };
    const next = Object.assign({}, data, { hist });
    saving = true; setStatus('저장 중...');
    try {
      const json = await api({ action: 'replaceAll', baseRevision: dbRevision, payload: next }, 180000);
      if (!json || json.ok === false) throw new Error((json && json.conflict ? '다른 기기에서 먼저 저장했습니다. 불러온 뒤 다시 시도해 주세요.' : (json && (json.message || json.error))) || '저장 실패');
      dbRevision = Number(json.revision) || dbRevision; data = next; setStatus('DB 연동됨 · ' + nowHm() + ' 저장');
      return { ok: true, revision: dbRevision, months: Object.keys(hist).sort(), counts, bytes: JSON.stringify(hist).length, warning: json.warning || '' };
    } catch (e) { setStatus('저장 실패'); return { ok: false, message: e.message }; } finally { saving = false; render(); }
  }

  let repMode = 'W', repKey = { W: '', M: '' }, repChart = null, pendingReport = null;
  const REP_TOP = 10, repOpen = {}; // 표마다 상위 10줄만 보이고 [펼치기]로 나머지를 엶
  const repCut = (key, list, min) => { const lim = Math.max(REP_TOP, min || 0); return { rows: repOpen[key] ? list : list.slice(0, lim), more: list.length > lim ? `<div class="mt-2 flex justify-center no-print"><button type="button" onclick="MsStock.toggleRep('${key}')" class="${BTN}">${repOpen[key] ? '접기' : `펼치기 (나머지 ${list.length - lim}개)`}</button></div>` : '' }; };
  const repNowrap = (html) => html.replace(/py-1\.5 px-2 border-b/g, 'py-1.5 px-2.5 whitespace-nowrap border-b').replace(/py-2 px-2 text-xs/g, 'py-2 px-2.5 text-xs'); // 칸 안에서 줄이 바뀌지 않게
  const R_UP = '#059669', R_DOWN = '#e11d48', R_INK = '#57534e', R_GRID = '#e7e5e4', R_BAR = '#86b6ef', R_BAR_ON = '#2a78d6';
  const mdOf = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
  const mondayOf = (t) => { const d = new Date(t), dow = (d.getDay() + 6) % 7; return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow).getTime(); };
  const addDays = (t, n) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime(); };
  const delta = (cur, prev, invert) => { if (!prev) return cur ? '<span class="text-xs font-bold text-stone-400">신규</span>' : ''; const p = (cur - prev) / Math.abs(prev) * 100, up = p > 0, col = Math.abs(p) < 0.5 ? '#a8a29e' : (up !== !!invert ? R_UP : R_DOWN); return `<span class="text-xs font-bold whitespace-nowrap" style="color:${col}">${Math.abs(p) < 0.5 ? '' : up ? '▲' : '▼'}${num(Math.abs(p), 0)}%</span>`; };
  // 보고서는 공장 관점: 금액(엠즈→가맹점 공급가)이 아니라 출고 수량으로 보고, 생산·재고·반품 관리에 필요한 것만 담음
  // (가맹점별 분석·금액 기준 등급은 수퍼바이저용 화면을 만들 때 쓰기로 하고 여기서는 뺌 — v1.8 코드 참고)
  function reportCalc(C) {
    const all = histRecs(); if (!all.length) return null;
    const isOwn = (r) => C.ownNames.has(r.nn) || (!C.allNames.has(r.nn) && /생지/.test(r.name));
    const recs = C.useOwn ? all.filter(isOwn) : all;
    const A = dateOf(data.asOf).getTime(), first = all[0].t, last = Math.max(...Object.values(data.hist).map((h) => dateOf(h.to).getTime())); // last = 이력이 들어 있는 마지막 날
    const weeks = []; for (let w = mondayOf(last); w >= mondayOf(first); w = addDays(w, -7)) weeks.push(w);
    const months = Object.keys(data.hist).sort().reverse();
    const lastFullWeek = weeks.find((w) => addDays(w, 6) < last) || weeks[0];
    if (!repKey.W || !weeks.includes(Number(repKey.W))) repKey.W = String(lastFullWeek);
    if (!repKey.M || !months.includes(repKey.M)) repKey.M = months[0];
    const W = repMode === 'W'; let P, prev, yoy = null; const cols = []; // cols = 품목별 추이 표의 기간 칸(오래된 것 → 선택 기간)
    const monthSpan = (yy, mm) => { const d = new Date(yy, mm - 1, 1); return { a: d.getTime(), e: new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime(), y: d.getFullYear(), m: d.getMonth() + 1 }; };
    if (W) {
      const a = Number(repKey.W), b = Math.min(addDays(a, 6), last); P = { a, b, full: addDays(a, 6) <= last }; prev = { a: addDays(a, -7), b: addDays(b, -7) };
      P.label = `${ymd(new Date(a))} ~ ${mdOf(b)}`; P.prevLabel = '전주 같은 요일';
      for (let i = 5; i >= 0; i--) { const s = addDays(a, -7 * i); if (s < mondayOf(first)) continue; const e = Math.min(addDays(s, 6), last); cols.push({ a: s, b: e, label: `${mdOf(s)}~${mdOf(e)}`, part: addDays(s, 6) > last, on: i === 0 }); }
    } else {
      const [y, m] = repKey.M.split('-').map(Number), cur = monthSpan(y, m), b = Math.min(cur.e, last), full = b === cur.e;
      const cut = (sp) => ({ a: sp.a, b: full ? sp.e : Math.min(sp.e, addDays(sp.a, new Date(b).getDate() - 1)) });
      P = { a: cur.a, b, full }; prev = cut(monthSpan(y, m - 1)); yoy = cut(monthSpan(y - 1, m));
      P.label = `${y}년 ${m}월 (${mdOf(cur.a)} ~ ${mdOf(b)})`; P.prevLabel = full ? '전월' : '전월 같은 날짜';
      for (let i = 5; i >= 0; i--) { const sp = monthSpan(y, m - i), ym = `${sp.y}-${pad(sp.m)}`; if (!data.hist[ym]) continue; cols.push({ a: sp.a, b: Math.min(sp.e, last), label: `${String(sp.y).slice(2)}.${sp.m}월`, part: sp.e > last, on: i === 0 }); }
    }
    P.days = Math.round((P.b - P.a) / dayMs) + 1;
    const inP = (p) => recs.filter((r) => r.t >= p.a && r.t <= p.b);
    const cur = inP(P), prv = inP(prev), yy = yoy ? inP(yoy) : [];
    const facRet = (r) => r.ret && /매입처/.test(r.memo);
    const tot = (list) => { const s = list.filter((r) => r.sale); return { qty: s.reduce((x, r) => x + r.qty, 0), items: new Set(s.filter((r) => r.qty > 0).map((r) => r.nn)).size, days: new Set(s.map((r) => r.date)).size, retFac: list.filter(facRet).reduce((x, r) => x + r.qty, 0), retEtc: list.filter((r) => r.ret && !facRet(r)).reduce((x, r) => x + r.qty, 0) }; };
    const T = tot(cur), Tp = tot(prv), Ty = tot(yy);
    // 품목별: 선택 기간 수량·요일 분포, 추이 칸별 수량, 수량 기준 등급
    const gi = {}, slot = (k, label) => gi[k] || (gi[k] = { key: k, label, qty: 0, dow: [0, 0, 0, 0, 0, 0, 0], col: cols.map(() => 0), prev: 0, yoy: 0 });
    const c0 = cols.length ? cols[0].a : P.a;
    recs.forEach((r) => { if (!r.sale) return; const inCur = r.t >= P.a && r.t <= P.b, inPrev = r.t >= prev.a && r.t <= prev.b, inYoy = yoy && r.t >= yoy.a && r.t <= yoy.b; if (r.t < c0 && !inPrev && !inYoy) return; const x = slot(r.nn, r.name); x.label = r.name; if (inCur) { x.qty += r.qty; x.dow[r.dow] += r.qty; } if (inPrev) x.prev += r.qty; if (inYoy) x.yoy += r.qty; for (let i = 0; i < cols.length; i++) if (r.t >= cols[i].a && r.t <= cols[i].b) { x.col[i] += r.qty; break; } });
    let cum = 0; const items = Object.values(gi).filter((x) => x.qty > 0 || x.col.some((v) => v > 0)).sort((a, b) => b.qty - a.qty || b.col.reduce((s, v) => s + v, 0) - a.col.reduce((s, v) => s + v, 0)).map((x) => { const before = cum; cum += Math.max(0, x.qty); const share = T.qty > 0 ? x.qty / T.qty * 100 : 0, bs = T.qty > 0 ? before / T.qty * 100 : 100; return Object.assign(x, { share, grade: x.qty <= 0 ? '-' : bs < 80 ? 'A' : bs < 95 ? 'B' : 'C' }); });
    const dowCnt = [0, 0, 0, 0, 0, 0, 0]; for (let t = P.a; t <= P.b; t = addDays(t, 1)) dowCnt[(new Date(t).getDay() + 6) % 7]++;
    const dowTot = [0, 0, 0, 0, 0, 0, 0]; items.forEach((x) => x.dow.forEach((v, i) => { dowTot[i] += v; }));
    const colTot = cols.map((c, i) => items.reduce((s, x) => s + x.col[i], 0));
    // 반품: 매입처(공장) 반품과 그 밖의 반품을 나눠 품목별로
    const rm = {}; cur.filter((r) => r.ret).forEach((r) => { const x = rm[r.nn] || (rm[r.nn] = { key: r.nn, label: r.name, fac: 0, etc: 0, why: {} }); if (facRet(r)) x.fac += r.qty; else x.etc += r.qty; const w = r.memo || '(비고 없음)'; x.why[w] = (x.why[w] || 0) + 1; });
    const rets = Object.values(rm).map((x) => Object.assign(x, { saleQty: gi[x.key] ? gi[x.key].qty : 0 })).sort((a, b) => a.fac - b.fac || a.etc - b.etc);
    // 생산 필요량: 지금 재고(엠즈 + 공장) vs 앞으로 H일 예상 출고(직전 4주의 요일별 평균)
    const wk0 = mondayOf(A), H = W ? 7 : 30, byNn = {};
    recs.forEach((r) => { if (!r.sale || r.t < addDays(wk0, -28) || r.t >= wk0) return; const x = byNn[r.nn] || (byNn[r.nn] = { dow: [0, 0, 0, 0, 0, 0, 0], qty: 0 }); x.dow[r.dow] += r.qty; x.qty += r.qty; });
    const need = C.items.map((it) => { const b = byNn[normName(it.name)], wkAvg = b ? b.qty / 4 : 0; let fc = 0; if (b) for (let i = 1; i <= H; i++) fc += b.dow[(new Date(addDays(A, i)).getDay() + 6) % 7] / 4; const req = Math.max(0, fc + wkAvg - it.total); return { it, wkAvg, fc, req, cover: wkAvg > 0 ? it.total / (wkAvg / 7) : null, ledgerWk: it.avg * 7, matched: !!b }; }).filter((x) => x.matched || x.it.total > 0).sort((a, b) => b.req - a.req || (a.cover == null ? 1e9 : a.cover) - (b.cover == null ? 1e9 : b.cover));
    // 폐기 위험(지금 재고 기준)
    const wm = {}; C.lots.filter((l) => l.unsold > 0.01).forEach((l) => { const x = wm[l.code] || (wm[l.code] = { name: l.name, unit: l.unit, qty: 0, ex: l.ex, left: l.left }); x.qty += l.unsold; if (l.ex < x.ex) { x.ex = l.ex; x.left = l.left; } });
    const waste = Object.values(wm).sort((a, b) => a.ex.localeCompare(b.ex));
    // 추이 막대: 순출고 수량 (선택 기간까지 12주 / 13개월)
    const series = [], sumQ = (a, b) => recs.reduce((x, r) => (r.sale && r.t >= a && r.t <= b ? x + r.qty : x), 0);
    if (W) { for (let i = 11; i >= 0; i--) { const a = addDays(P.a, -7 * i); if (a < mondayOf(first)) continue; series.push({ label: `${mdOf(a)}~`, v: sumQ(a, Math.min(addDays(a, 6), last)), on: i === 0, part: addDays(a, 6) > last }); } }
    else { const [y, m] = repKey.M.split('-').map(Number); for (let i = 12; i >= 0; i--) { const sp = monthSpan(y, m - i); if (!data.hist[`${sp.y}-${pad(sp.m)}`]) continue; series.push({ label: `${String(sp.y).slice(2)}.${sp.m}`, v: sumQ(sp.a, sp.e), on: i === 0, part: sp.e > last }); } }
    const guessNames = C.useOwn ? new Set(cur.filter((r) => !C.ownNames.has(r.nn)).map((r) => r.nn)).size : 0;
    return { P, T, Tp, Ty, yoy, cols, colTot, items, dowCnt, dowTot, rets, need, waste, H, weeks, months, last, series, guessNames, histMonths: Object.keys(data.hist).sort() };
  }
  function reportBody(C, sec) {
    const R = reportCalc(C);
    if (!R) return `<div class="${card} text-sm text-stone-600"><b>월별 발주 이력이 아직 없습니다.</b> 엠즈 e플랫폼에 로그인한 뒤 Claude에게 "엠즈 월별 발주 이력 가져와 줘"라고 요청하면 주문대비 입고현황(판매처)을 달별로 읽어 저장합니다.</div>`;
    pendingReport = R;
    const { P, T, Tp, Ty } = R, W = repMode === 'W', wd = ['월', '화', '수', '목', '금', '토', '일'];
    const modeBtn = (k, label) => `<button type="button" onclick="MsStock.setReport('${k}')" class="px-4 h-9 rounded-xl text-sm font-extrabold transition cursor-pointer ${repMode === k ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'}">${label}</button>`;
    const opts = W ? R.weeks.map((w) => `<option value="${w}" ${String(w) === repKey.W ? 'selected' : ''}>${ymd(new Date(w))} ~ ${mdOf(Math.min(addDays(w, 6), R.last))}${addDays(w, 6) > R.last ? ' (진행 중)' : ''}</option>`).join('') : R.months.map((m) => `<option value="${m}" ${m === repKey.M ? 'selected' : ''}>${m.slice(0, 4)}년 ${Number(m.slice(5))}월${m === data.asOf.slice(0, 7) ? ' (진행 중)' : ''}</option>`).join('');
    const head = `<div class="${card} !py-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5">${modeBtn('W', '주간 보고')}${modeBtn('M', '월간 보고')}<select onchange="MsStock.setReportKey(this.value)" class="h-9 px-3 rounded-xl border border-stone-300 bg-white text-sm font-bold text-stone-800 cursor-pointer">${opts}</select>${P.full ? '' : `<span class="inline-flex items-center px-2.5 h-7 rounded-lg border bg-amber-50 border-amber-200 text-amber-900 text-xs font-bold">진행 중 · ${P.days}일치</span>`}</div>
        <div class="flex items-center gap-2 text-xs text-stone-500"><span>비교: <b class="text-stone-700">${P.prevLabel}</b> · 이력 ${R.histMonths[0]} ~ ${R.histMonths[R.histMonths.length - 1]}</span><button type="button" onclick="window.print()" class="${BTN} no-print"><i data-lucide="printer" class="w-3.5 h-3.5"></i><span>인쇄</span></button></div>
      </div>`;
    const k = (label, val, extra, sub, cls) => `<div class="${card}"><div class="text-xs font-bold text-stone-500">${label}</div><div class="mt-1 flex items-baseline gap-2"><span class="text-xl font-extrabold tabular-nums ${cls || 'text-stone-900'}">${val}</span>${extra || ''}</div><div class="text-xs text-stone-500 mt-0.5">${sub}</div></div>`;
    const needN = R.need.filter((x) => x.req > 0).length, retRate = T.qty > 0 ? Math.abs(T.retFac) / T.qty * 100 : 0;
    const kpis = `<div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
        ${k('순출고 수량', num(T.qty, 0), delta(T.qty, Tp.qty), `${P.prevLabel} ${num(Tp.qty, 0)}${!W && Ty.qty ? ` · 전년 같은 달 ${num(Ty.qty, 0)} ${delta(T.qty, Ty.qty)}` : ''}`)}
        ${k('출고 품목', T.items + '개', delta(T.items, Tp.items), `${P.prevLabel} ${Tp.items}개 · 출고일 ${T.days}일`)}
        ${k('생산 필요 품목', needN + '개', '', `앞으로 ${R.H}일 · 지금 재고 기준`, needN ? 'text-rose-700' : '')}
        ${k('매입처 반품', num(Math.abs(T.retFac), 0), delta(Math.abs(T.retFac), Math.abs(Tp.retFac), true), `반품률 ${num(retRate, 2)}% · 그 밖의 반품 ${num(Math.abs(T.retEtc), 0)}`, T.retFac ? 'text-rose-700' : '')}
        ${k('폐기 위험 품목', R.waste.length + '개', '', '지금 재고 · 기한 전 소진 불가 예상', R.waste.length ? 'text-violet-800' : '')}
      </div>`;
    const chart = sec(W ? '주별 순출고 수량' : '월별 순출고 수량', W ? '선택한 주까지 12주 · 진한 막대가 선택한 주' : '선택한 달까지 13개월 · 진한 막대가 선택한 달', `<div style="position:relative;height:220px"><canvas id="mssRepChart"></canvas></div>`);
    // 1. 생산 필요량
    const unitWarn = (x) => (x.ledgerWk > 0 && x.wkAvg > 0 && (x.wkAvg / x.ledgerWk > 1.5 || x.wkAvg / x.ledgerWk < 0.67));
    const cNeed = repCut('need', R.need, needN), needRows = cNeed.rows.map((x) => `<tr class="${x.req > 0 ? 'bg-rose-50/50' : ''}"><td class="${td} font-bold">${esc(x.it.name)}${unitWarn(x) ? ` <span class="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-extrabold" title="가맹점 발주 수량(주 ${num(x.wkAvg, 1)})과 엠즈 수불부 출고(주 ${num(x.ledgerWk, 1)})가 크게 달라 단위가 다를 수 있습니다">단위 확인</span>` : ''}</td><td class="${tdr}">${num(x.wkAvg, 1)}</td><td class="${tdr}">${num(x.fc, 1)}</td><td class="${tdr}">${num(x.it.qty, 1)} <span class="text-xs text-stone-400">${esc(x.it.unit)}</span></td><td class="${tdr}">${C.fac.ready ? num(x.it.factory, 1) : '-'}</td><td class="${tdr}">${x.cover == null ? '-' : num(x.cover, 1) + '일'}</td><td class="${tdr} font-extrabold ${x.req > 0 ? 'text-rose-700' : 'text-stone-400'}">${x.req > 0 ? num(Math.ceil(x.req), 0) : '충분'}</td></tr>`).join('');
    const s1 = sec(`1. 생산 필요량`, `앞으로 ${R.H}일 · 지금 재고 기준 · 필요 ${needN}개 품목`, `<div class="text-xs text-stone-500 mb-2 leading-relaxed">예상 출고 = 직전 4주(월~일)의 순출고를 요일별로 평균해 앞으로 ${R.H}일에 맞춰 더한 값 · 생산 필요 = 예상 출고 + 안전재고(1주분) − 가용 재고(엠즈 + 공장). ${C.fac.ready ? '' : '<b class="text-amber-800">공장 재고는 아직 반영되지 않았습니다(생산 재고 실사 필요).</b> '}이 표는 보고 기간과 관계없이 엠즈 자료 기준 시각(${esc(data.asOf)})의 재고로 계산합니다.</div>` + repNowrap(tableWrap(`<th class="${th}">상품명</th><th class="${th} text-right">최근 4주 주평균</th><th class="${th} text-right">예상 출고(${R.H}일)</th><th class="${th} text-right">엠즈 재고</th><th class="${th} text-right">공장 재고</th><th class="${th} text-right">재고일수</th><th class="${th} text-right">생산 필요</th>`, needRows, '재고 자료가 없습니다.', 7)) + cNeed.more);
    // 4. 요일별 출고 패턴 (전 품목)
    const heat = (v, max) => { const a = max > 0 && v > 0 ? 0.08 + 0.55 * (v / max) : 0; return `background:rgba(42,120,214,${a.toFixed(2)})`; };
    const act = R.items.filter((x) => x.qty > 0);
    const dowLine = (label, arr, bold) => { const vals = arr.map((v, i) => (W ? v : (R.dowCnt[i] ? v / R.dowCnt[i] : 0))), max = Math.max(...vals, 0), sum = arr.reduce((a, v) => a + v, 0); return `<tr class="${bold ? 'bg-amber-50/70' : ''}"><td class="${td} ${bold ? 'font-extrabold' : 'font-bold'} w-full max-w-0"><div class="truncate" title="${esc(label)}">${esc(label)}</div></td>${vals.map((v) => `<td class="${tdr} ${bold ? 'font-extrabold' : ''}" style="${bold ? '' : heat(v, max)}">${v ? num(v, W ? 0 : 1) : '<span class="text-stone-300">·</span>'}</td>`).join('')}<td class="${tdr} font-extrabold">${num(sum, 0)}</td></tr>`; };
    const cDow = repCut('dow', act), s2 = sec('4. 요일별 출고 패턴', W ? '품목별 요일 수량 · 수량 많은 순' : '품목별 요일 하루 평균 수량 · 수량 많은 순', repNowrap(tableWrap(`<th class="${th}">상품명</th>${wd.map((d, i) => `<th class="${th} text-right">${d}${W ? '' : `<div class="text-xs font-bold text-stone-400">${R.dowCnt[i]}일</div>`}</th>`).join('')}<th class="${th} text-right">기간 합계</th>`, act.length ? dowLine('전체 합계', R.dowTot, true) + cDow.rows.map((x) => dowLine(x.label, x.dow)).join('') : '', '출고 자료가 없습니다.', 9)) + cDow.more + `<div class="text-xs text-stone-500 mt-2">색이 진할수록 그 품목 안에서 많이 나간 요일입니다. 엠즈 입고·생산 일정을 요일에 맞출 때 참고합니다.</div>`);
    // 2. 품목별 출고 추이와 등급 (수량 기준)
    const gCls = { A: 'bg-blue-100 text-blue-900', B: 'bg-stone-200 text-stone-800', C: 'bg-stone-100 text-stone-500', '-': 'bg-white text-stone-400 border border-stone-200' };
    const cntG = (g) => R.items.filter((x) => x.grade === g).length, stopped = cntG('-');
    const colHead = R.cols.map((c) => `<th class="${th} text-right ${c.on ? 'text-stone-900' : ''}">${c.label}${c.part ? '<div class="text-xs font-bold text-amber-700">진행 중</div>' : ''}</th>`).join('');
    const trendRow = (x, i) => `<tr><td class="${tdr} text-stone-400">${i + 1}</td><td class="${td} font-bold w-full max-w-0"><div class="truncate" title="${esc(x.label)}">${esc(x.label)}</div></td><td class="${td} text-center"><span class="inline-block px-2 py-0.5 rounded-md text-xs font-extrabold whitespace-nowrap ${gCls[x.grade]}">${x.grade === '-' ? '출고 없음' : x.grade}</span></td>${x.col.map((v, j) => `<td class="${tdr} ${R.cols[j].on ? 'font-extrabold bg-stone-50' : 'text-stone-600'}">${v ? num(v, 0) : '<span class="text-stone-300">·</span>'}</td>`).join('')}<td class="${tdr}">${num(x.share, 1)}%</td><td class="${tdr}">${delta(x.qty, x.prev)}</td>${W ? '' : `<td class="${tdr}">${x.yoy ? delta(x.qty, x.yoy) : '<span class="text-stone-300">·</span>'}</td>`}</tr>`;
    const cTr = repCut('trend', R.items), s3 = sec('2. 품목별 출고 추이와 등급', `수량 기준 · 누적 80%까지 A · 95%까지 B · 나머지 C — A ${cntG('A')}개 · B ${cntG('B')}개 · C ${cntG('C')}개${stopped ? ` · 이번 기간 출고 없음 ${stopped}개` : ''}`, repNowrap(tableWrap(`<th class="${th} text-right">순위</th><th class="${th}">상품명</th><th class="${th} text-center">등급</th>${colHead}<th class="${th} text-right">비중</th><th class="${th} text-right">${P.prevLabel} 대비</th>${W ? '' : `<th class="${th} text-right">전년 같은 달 대비</th>`}`, R.items.length ? `<tr class="bg-amber-50/70"><td class="${td}"></td><td class="${td} font-extrabold">전체 합계</td><td class="${td}"></td>${R.colTot.map((v) => `<td class="${tdr} font-extrabold">${num(v, 0)}</td>`).join('')}<td class="${tdr} font-extrabold">100%</td><td class="${tdr}">${delta(T.qty, Tp.qty)}</td>${W ? '' : `<td class="${tdr}">${Ty.qty ? delta(T.qty, Ty.qty) : ''}</td>`}</tr>` + cTr.rows.map(trendRow).join('') : '', '출고 자료가 없습니다.', R.cols.length + 6)) + cTr.more + `<div class="text-xs text-stone-500 mt-2">A는 물량의 대부분을 차지해 결품이 없어야 하는 품목, C는 소량 품목입니다. "출고 없음"은 앞 기간에는 나갔는데 선택한 기간에는 나가지 않은 품목입니다.</div>`);
    // 3. 반품·폐기 위험
    const whyTop = (x) => Object.entries(x.why).sort((a, b) => b[1] - a[1]).slice(0, 2).map((w) => `${esc(w[0])} ${w[1]}줄`).join(' · ');
    const cRet = repCut('ret', R.rets), cWs = repCut('waste', R.waste), s4 = sec('3. 반품과 폐기 위험', `매입처 반품 ${num(Math.abs(T.retFac), 0)} (반품률 ${num(retRate, 2)}%) · 기한 전 소진 불가 예상 ${R.waste.length}개 품목`,
      `<div class="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start"><div><div class="text-sm font-extrabold text-stone-800 mb-1.5">반품 <span class="text-xs font-bold text-stone-500">(보고 기간 · 품목별 수량)</span></div>${repNowrap(tableWrap(`<th class="${th}">상품명</th><th class="${th} text-right">매입처 반품</th><th class="${th} text-right">반품률</th><th class="${th} text-right">그 밖의 반품</th><th class="${th}">비고</th>`, cRet.rows.map((x) => `<tr><td class="${td} font-bold">${esc(x.label)}</td><td class="${tdr} font-bold ${x.fac ? 'text-rose-700' : 'text-stone-300'}">${x.fac ? num(Math.abs(x.fac), 0) : '·'}</td><td class="${tdr}">${x.fac && x.saleQty > 0 ? num(Math.abs(x.fac) / x.saleQty * 100, 1) + '%' : '-'}</td><td class="${tdr} text-stone-500">${x.etc ? num(Math.abs(x.etc), 0) : '·'}</td><td class="${td} text-xs text-stone-500" style="white-space:normal;min-width:140px">${whyTop(x)}</td></tr>`).join(''), '이 기간에 반품이 없습니다.', 5))}${cRet.more}<div class="text-xs text-stone-500 mt-2">매입처 반품 = 비고에 "매입처"가 적힌 반품(공장으로 돌아오는 것) · 반품률 = 매입처 반품 수량 ÷ 같은 기간 순출고 수량</div></div>
       <div><div class="text-sm font-extrabold text-stone-800 mb-1.5">폐기 위험 <span class="text-xs font-bold text-stone-500">(지금 재고 기준 · 유통기한 전 소진 불가 예상)</span></div>${repNowrap(tableWrap(`<th class="${th}">상품명</th><th class="${th} text-right">가장 빠른 기한</th><th class="${th} text-right">남은 날</th><th class="${th} text-right">소진 불가 수량</th>`, cWs.rows.map((x) => `<tr><td class="${td} font-bold">${esc(x.name)}</td><td class="${tdr}">${esc(x.ex)}</td><td class="${tdr} ${x.left <= 30 ? 'text-rose-700 font-bold' : ''}">${x.left < 0 ? '기한 지남' : x.left + '일'}</td><td class="${tdr} font-bold text-violet-800">${num(x.qty, 1)} <span class="text-xs text-stone-400">${esc(x.unit)}</span></td></tr>`).join(''), '소진이 어려운 재고가 없습니다.', 4))}${cWs.more}<div class="text-xs text-stone-500 mt-2">지금 출고 속도로는 유통기한 안에 다 나가지 못할 것으로 보이는 수량입니다. 해당 품목은 생산을 줄이거나 미루는 것을 검토합니다.</div></div></div>`);
    const note = `<div class="text-xs text-stone-500 leading-relaxed">자료: 엠즈 주문대비 입고현황(판매처) · 상품구분 판매처로고 · 전체 물류센터. <b>순출고</b>는 가맹점으로 나간 수량으로, 판매·추가판매에서 판매취소·미출고를 뺀 값(판매조정 포함)이고 샘플출고는 넣지 않습니다. 수량 단위는 엠즈 화면 그대로입니다.${C.useOwn ? ` 바로가 품목만 보는 중이며, 지금 엠즈 재고에 없는 예전 품목은 이름에 '생지'가 있으면 바로가 품목으로 추정했습니다${R.guessNames ? `(이 기간 ${R.guessNames}개)` : ''}.` : ''}</div>`;
    return head + kpis + chart + s1 + s3 + s4 + s2 + note;
  }
  function drawReport(R) {
    const el = document.getElementById('mssRepChart'); if (!el || typeof window.Chart !== 'function' || !R.series.length) return;
    const font = { family: "'Pretendard', 'Noto Sans KR', sans-serif", size: 11 };
    repChart = new Chart(el, { type: 'bar', data: { labels: R.series.map((s) => s.label + (s.part ? '*' : '')), datasets: [{ label: '순출고 수량', data: R.series.map((s) => Math.round(s.v)), backgroundColor: R.series.map((s) => (s.on ? R_BAR_ON : R_BAR)), borderRadius: 4, maxBarThickness: 44 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { color: R_INK, font }, border: { color: R_GRID } }, y: { beginAtZero: true, grid: { color: R_GRID }, border: { display: false }, ticks: { color: R_INK, font, callback: (v) => num(v, 0) } } },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1c1917', titleFont: font, bodyFont: font, padding: 10, callbacks: { label: (it) => ` 순출고 수량: ${num(it.parsed.y, 0)}${R.series[it.dataIndex].part ? ' (진행 중)' : ''}` } } } } });
  }

  function render() {
    const el = root(); if (!el) return;
    if (repChart) { try { repChart.destroy(); } catch (e) {} repChart = null; } pendingReport = null;
    const dbOk = !!getUrl() && loaded, dbCls = !getUrl() ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100' : dbOk ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100';
    const bar = `<div class="w-full bg-stone-100/90 border-b border-stone-200 no-print"><div class="max-w-[1600px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5">${tabBtn('DASH', 'layout-dashboard', '1. 대시보드')}${tabBtn('ORDER', 'clipboard-list', '2. 발주 우선순위')}${tabBtn('EXPIRY', 'calendar-days', '3. 유통기한 임박')}${tabBtn('RETURN', 'rotate-ccw', '4. 반품 현황')}${tabBtn('REPORT', 'bar-chart-3', '5. 운영 보고서')}</div>
        <div class="flex items-center gap-1.5 ml-auto">
          <button type="button" onclick="MsStock.openDbModal()" title="DB 주소 설정" class="flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl text-xs font-bold border transition cursor-pointer ${dbCls}"><span class="w-2 h-2 rounded-full ${!getUrl() ? 'bg-amber-500' : dbOk ? 'bg-emerald-500' : 'bg-stone-400'}"></span><span id="mssStatusText">${esc(statusText)}</span><i data-lucide="settings" class="w-3.5 h-3.5 ml-0.5 opacity-75"></i></button>
          <button type="button" onclick="MsStock.pickFile()" title="엠즈에서 읽어 만든 JSON 파일로 DB를 바꿉니다 (보통은 Claude가 자동으로 저장)" class="${BTN}"><i data-lucide="file-up" class="w-3.5 h-3.5"></i><span>자료 가져오기</span></button>
          <button type="button" onclick="MsStock.pull(true)" title="DB에서 다시 불러오기" class="flex items-center justify-center w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition cursor-pointer"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button>
        </div></div></div>`;
    const shell = (inner) => { el.innerHTML = `<div class="w-full">${bar}<div class="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">${inner}</div></div><div id="mssModal"></div>`; if (window.lucide) lucide.createIcons(); if (pendingReport) { const g = pendingReport; pendingReport = null; drawReport(g); } };
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
          <div class="flex flex-wrap items-center gap-1.5"><button type="button" onclick="MsStock.toggleOwn()" title="바로가 품목만 / 엠즈 위탁 전체 품목 전환" class="flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer whitespace-nowrap"><i data-lucide="layers" class="w-3.5 h-3.5"></i>${C.useOwn ? '전체 품목 보기' : '바로가 품목만 보기'}</button><button type="button" onclick="MsStock.openOwnModal()" class="${BTN}"><i data-lucide="settings" class="w-3.5 h-3.5"></i><span>바로가 품목 설정</span></button></div>
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
    else if (view === 'ORDER') body = sec('발주 우선순위', '회전일 짧은 순 · 출고가 없는 품목 제외', orderTable(C)) + sec('출고가 없는 품목', '조회한 달 기준', tableWrap(`<th class="${th}">코드</th><th class="${th}">상품명</th><th class="${th} text-right">엠즈 재고</th>`, C.items.filter((it) => it.rot == null && it.qty > 0).map((it) => `<tr><td class="${td} font-mono text-xs">${esc(it.code)}</td><td class="${td} font-bold">${esc(it.name)}</td><td class="${tdr}">${num(it.qty)} <span class="text-xs text-stone-400">${esc(it.unit)}</span></td></tr>`).join(''), '해당 품목이 없습니다.', 3));
    else if (view === 'EXPIRY') body = sec('유통기한 임박', '100일 이내 또는 기한 전 소진이 어려운 재고 · 보라색 = 소진 불가 예상', expiryTable(C));
    else if (view === 'RETURN') body = sec('반품 현황', '', returnBlock(C));
    else if (view === 'REPORT') body = reportBody(C, sec);
    shell(basis + body);
  }
  let mounted = false;
  function mount() { render(); if (!mounted) { mounted = true; pull(false); } }
  window.mountMsStockApp = mount;
  window.MsStock = { mount, pull, pickFile, importSnapshot, preview, openDbModal, saveDbUrl, closeModal, setView: (v) => { view = v; render(); }, setReport: (m) => { repMode = m === 'M' ? 'M' : 'W'; render(); }, setReportKey: (v) => { repKey[repMode] = String(v); render(); }, toggleRep: (k) => { repOpen[k] = !repOpen[k]; render(); }, importHistory, packMonth, toggleOwn: () => { ownOnly = !ownOnly; render(); }, openOwnModal, saveOwn, _debug: () => ({ data, dbRevision, loaded, computed: data ? compute() : null }) };
})();
