// [VERSION: invoice.js v1.1 - 2026-11-25 납기일 기본값 = 발주일(따로 고르기 전에는 발주일을 따라감) · 글꼴 굵게 · 기본 정보(등록번호·대표자명·주소·업태/종목·연락처·참고사항)는 DB에서 자동 채움 / v1.0 - 2026-11-25 신규: 거래명세서 작성(A4) · PDF 다운로드 · 인쇄 · DB 저장]
// ============================================================================
// 바로가 공장 통합 관리 시스템 - 거래명세서 (invoice.js)
//  - A4 거래명세서를 화면에서 바로 작성하고 PDF로 내려받거나 인쇄
//  - 발주번호: 작성일 기준 YYMMDD-01 (뒤 번호는 수정 가능, 같은 날 다음 번호 자동)
//  - 품명: 제품단가 메뉴의 품목(엠즈 매입/판매가 표)에서 고르면 단위 PK와 엠즈 판매가(PK)를 불러옴. 그 밖의 상품은 직접 입력
//  - 공급가액 = 수량 × 단가 · 합계 · 부가세(합계의 10%, 원 단위 반올림) · 총합계 자동 계산
//  - 자료 형식(payload): { v:1, docs:[ 명세서 ], cfg:{ defaults:{ 참조·지불조건·등록번호·상호·대표자명·주소·업태/종목·연락처·안내문·참고사항 } } }
//  - 저장: [DB 저장](Ctrl+S)을 눌러야 DB에 올라감 (자동 저장 없음)
//  - 등록번호·연락처·계좌 같은 회사 정보는 코드(공개 저장소)에 넣지 않고 DB의 '기본 정보'에만 보관
// ============================================================================
(function () {
  'use strict';
  const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycby9CW0wLQ6GsJR1zCVOqwkJDxOlCeiLZTaCAThpWEXw7Kw0f7MJ1fow7y47mYw2fMzL8g/exec'; // 거래명세서 DB (다른 DB를 쓸 때만 [DB 설정]에서 바꿈)
  const URL_KEY = 'baroga_invoice_gas_url', ROWS = 21;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, t) => (typeof window.showToast === 'function' ? window.showToast(m, t) : alert(m));
  const nowHm = () => (typeof window.barogaNowHm === 'function' ? window.barogaNowHm() : new Date().toTimeString().slice(0, 5));
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const won = (v) => (isFinite(v) ? Math.round(Number(v)).toLocaleString('ko-KR') : '');
  const numOf = (v) => { const n = Number(String(v ?? '').replace(/[,\s원]/g, '')); return isFinite(n) ? n : 0; };
  const BTN = 'flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition cursor-pointer whitespace-nowrap';
  const UNSAVED = '저장 안 됨 · DB 저장 필요';
  // 코드에 두는 기본값은 공개돼도 되는 문구뿐. 등록번호·대표자명·주소·연락처·계좌는 [기본 정보]에서 넣어 DB에 보관
  const BASE_DEFAULTS = { ref: '', pay: '당사 정기 결제일', regNo: '', company: '유한회사 바로가', ceo: '', addr: '', biz: '', tel: '', notice: '아래와 같이 주문하오니 기일내 납기 바랍니다.', memo: '' };
  const DEF_KEYS = Object.keys(BASE_DEFAULTS);

  let db = { v: 1, docs: [], cfg: { defaults: {} } }, dbRevision = null, loaded = false, loading = false, saving = false, statusText = 'DB 미연결';
  let cur = null, curSaved = '', dbDirty = false, search = '';
  const root = () => document.getElementById('invoiceRoot');
  function getUrl() { let v = ''; try { v = localStorage.getItem(URL_KEY) || ''; } catch (e) {} return v || DEFAULT_URL; }
  function setStatus(t) { statusText = t; const el = document.getElementById('invStatusText'); if (el) el.textContent = t; paintBadge(); }
  const curDirty = () => !!cur && JSON.stringify(cur) !== curSaved;
  const isDirty = () => dbDirty || curDirty();
  const defaults = () => Object.assign({}, BASE_DEFAULTS, (db.cfg && db.cfg.defaults) || {});
  function normalize(p) {
    const docs = Array.isArray(p && p.docs) ? p.docs.filter((d) => d && d.id) : [];
    const d = p && p.cfg && p.cfg.defaults && typeof p.cfg.defaults === 'object' ? p.cfg.defaults : {};
    return { v: 1, docs, cfg: { defaults: d } };
  }
  async function api(body, ms) {
    if (typeof window.barogaApi !== 'function') throw new Error('접속 도구를 찾을 수 없습니다');
    return window.barogaApi(getUrl(), body, ms || 60000);
  }

  // ---------- 명세서 ----------
  const noPrefix = (dateStr) => String(dateStr || ymd(new Date())).slice(2).replace(/-/g, '');
  function nextSeq(prefix, exceptId) { let n = 0; db.docs.forEach((d) => { if (d.id !== exceptId && d.noPrefix === prefix) n = Math.max(n, Number(d.noSeq) || 0); }); return pad(n + 1); }
  function blankDoc() {
    const today = ymd(new Date()), D = defaults(), prefix = noPrefix(today);
    return { id: 'inv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), created: today, noPrefix: prefix, noSeq: nextSeq(prefix), to: '', ref: D.ref, orderDate: today, dueDate: today, pay: D.pay, regNo: D.regNo, company: D.company, ceo: D.ceo, addr: D.addr, biz: D.biz, tel: D.tel, notice: D.notice, memo: D.memo, items: Array.from({ length: ROWS }, () => ({ name: '', spec: '', unit: '', qty: '', price: '', note: '' })) };
  }
  function fixDoc(d) { const b = blankDoc(), x = Object.assign({}, b, d); x.items = Array.from({ length: ROWS }, (_, i) => Object.assign({ name: '', spec: '', unit: '', qty: '', price: '', note: '' }, (d.items || [])[i] || {})); return x; }
  const docNo = (d) => `${d.noPrefix}-${d.noSeq}`;
  function totals(d) { let sum = 0; const amt = d.items.map((it) => { const q = numOf(it.qty), p = numOf(it.price); const a = it.qty !== '' && it.price !== '' ? q * p : null; if (a !== null) sum += a; return a; }); const vat = Math.round(sum * 0.1); return { amt, sum, vat, total: sum + vat }; }
  function setCur(d) { cur = fixDoc(JSON.parse(JSON.stringify(d))); curSaved = JSON.stringify(cur); }

  // ---------- 제품단가의 품목과 엠즈 판매가 ----------
  function products() {
    let rows = [];
    try { const b = window.barogaProductPriceBridge; if (b && typeof b.getPkCostRows === 'function') rows = b.getPkCostRows() || []; } catch (e) {}
    if (!rows.length) { try { const c = JSON.parse(localStorage.getItem('baroga_product_price_cache_v1') || 'null'); if (c && Array.isArray(c.pkCostRows)) rows = c.pkCostRows; } catch (e) {} }
    const seen = new Set(), out = [];
    rows.filter(Boolean).forEach((r) => { const name = String(r.productName || '').trim(); if (!name || seen.has(name)) return; seen.add(name); out.push({ name, code: String(r.productCode || ''), price: Number(r.msSellPricePk) || 0 }); });
    return out;
  }
  const findProduct = (name) => { const n = String(name || '').trim(); return n ? products().find((p) => p.name === n) : null; };

  // ---------- DB ----------
  async function pull(showMsg) {
    if (!getUrl()) { loaded = false; setStatus('DB 미연결'); render(); return; }
    if (loading || saving) return;
    if (isDirty() && loaded) { if (!showMsg) return; if (!window.confirm('DB에 저장하지 않은 거래명세서 변경이 있습니다.\n새로고침하면 그 변경은 사라집니다. 계속할까요?')) return; }
    loading = true; setStatus('불러오는 중...');
    try {
      const json = await api({ action: 'getAll' }, 60000);
      if (!json || json.ok === false) throw new Error((json && (json.message || json.error)) || '불러오기 실패');
      db = normalize(json.payload || {}); dbRevision = Number(json.revision) || 0; loaded = true; dbDirty = false;
      const keep = cur && db.docs.find((d) => d.id === cur.id);
      setCur(keep || blankDoc()); // 새 명세서는 방금 불러온 기본 정보(등록번호·주소·연락처·참고사항 등)로 채움
      setStatus(`불러옴 ${nowHm()} · ${db.docs.length}건`);
      if (showMsg) toast('거래명세서 DB를 불러왔습니다.', 'success');
    } catch (e) { setStatus('불러오기 실패'); if (showMsg) toast('거래명세서 DB 불러오기 실패: ' + e.message, 'error'); }
    finally { loading = false; render(); }
  }
  async function saveNow() {
    if (!cur) return;
    if (saving) { toast('저장 중입니다.', 'info'); return; }
    if (!getUrl()) { toast('DB 주소가 없습니다. 오른쪽 위 DB 버튼에서 구글 시트 웹 앱 주소를 넣어 주세요.', 'error'); openDbModal(); return; }
    if (!loaded) { toast('DB를 먼저 불러와 주세요(오른쪽 위 새로고침).', 'error'); return; }
    const hasBody = cur.to.trim() || cur.items.some((it) => it.name.trim());
    if (curDirty() || !db.docs.some((d) => d.id === cur.id)) {
      if (!hasBody && !dbDirty) { toast('수신 또는 품명을 입력한 뒤 저장해 주세요.', 'error'); return; }
      if (hasBody) {
        if (!/^\d{1,3}$/.test(String(cur.noSeq))) { toast('발주번호 뒤 숫자를 확인해 주세요.', 'error'); return; }
        if (db.docs.some((d) => d.id !== cur.id && docNo(d) === docNo(cur))) { toast(`발주번호 ${docNo(cur)}가 이미 있습니다. 뒤 숫자를 바꿔 주세요.`, 'error'); return; }
        const copy = JSON.parse(JSON.stringify(cur)); copy.updatedAt = new Date().toISOString();
        const i = db.docs.findIndex((d) => d.id === cur.id); if (i >= 0) db.docs[i] = copy; else db.docs.push(copy);
        dbDirty = true;
      }
    }
    if (!dbDirty) { toast('바뀐 내용이 없습니다.', 'info'); return; }
    saving = true; setStatus('저장 중...');
    try {
      const json = await api({ action: 'replaceAll', baseRevision: dbRevision, payload: db }, 120000);
      if (!json || json.ok === false) throw new Error((json && json.conflict ? '다른 기기에서 먼저 저장했습니다. 새로고침 후 다시 시도해 주세요.' : (json && (json.message || json.error))) || '저장 실패');
      dbRevision = Number(json.revision) || dbRevision; dbDirty = false; curSaved = JSON.stringify(cur);
      setStatus(`저장됨 ${nowHm()} · ${db.docs.length}건`); toast('거래명세서를 DB에 저장했습니다.', 'success');
    } catch (e) { setStatus('저장 실패 — [DB 저장]을 다시 눌러 주세요'); toast('거래명세서 저장 실패: ' + e.message, 'error'); }
    finally { saving = false; render(); }
  }

  // ---------- 화면 ----------
  function paintBadge() {
    const b = document.getElementById('invDbBadge'); if (!b) return;
    const st = !getUrl() ? 'warn' : /실패|필요/.test(statusText) || isDirty() ? 'err' : /중\.\.\./.test(statusText) ? 'warn' : 'ok';
    b.className = 'flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl text-xs font-bold border transition cursor-pointer ' + { ok: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100', warn: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100', err: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100' }[st];
    const dot = b.querySelector('span'); if (dot) dot.className = 'w-2 h-2 rounded-full ' + { ok: 'bg-emerald-500', warn: 'bg-amber-500', err: 'bg-rose-500' }[st];
  }
  function touch() { const t = document.getElementById('invStatusText'); if (t && getUrl() && loaded && isDirty() && !saving) t.textContent = UNSAVED; paintBadge(); }
  // 명세서 한 장. edit=true면 입력 칸, false면 글자만(인쇄·PDF용)
  function sheetHtml(d, edit) {
    const T = totals(d), B = 'border:1px solid #1c1917', lab = `${B};text-align:center;padding:0 4px;white-space:nowrap`, val = `${B};padding:0 6px;text-align:left`;
    const inp = (f, v, opt) => (edit ? `<input ${opt && opt.type ? `type="${opt.type}"` : 'type="text"'} value="${esc(v)}" ${opt && opt.list ? `list="${opt.list}"` : ''} data-inv-f="${f}" oninput="Invoice.setField('${f}', this.value)" class="inv-in" style="text-align:${(opt && opt.align) || 'left'}">` : `<span>${esc(v)}</span>`);
    const cell = (i, f, v, align, extra) => (edit ? `<input type="text" value="${esc(v)}" ${extra || ''} data-inv="${i}:${f}" ${f === 'name' ? `list="invProducts" onchange="Invoice.pickName(${i}, this.value)"` : ''} oninput="Invoice.setItem(${i}, '${f}', this.value)" ${f === 'qty' || f === 'price' ? 'inputmode="numeric" onblur="Invoice.fmtNum(this)"' : ''} class="inv-in" style="text-align:${align}">` : `<span>${esc(f === 'qty' || f === 'price' ? (v === '' ? '' : won(numOf(v))) : v)}</span>`);
    const rows = d.items.map((it, i) => `<tr style="height:6.9mm">
        <td style="${B};text-align:center;border-top:none;border-bottom:none">${i + 1}</td>
        <td style="${B};text-align:center;border-top:none;border-bottom:none;padding:0 3px">${cell(i, 'name', it.name, 'center')}</td>
        <td style="${B};text-align:center;border-top:none;border-bottom:none;padding:0 3px">${cell(i, 'spec', it.spec, 'center')}</td>
        <td style="${B};text-align:center;border-top:none;border-bottom:none;padding:0 3px">${cell(i, 'unit', it.unit, 'center')}</td>
        <td style="${B};text-align:right;border-top:none;border-bottom:none;padding:0 5px">${cell(i, 'qty', it.qty === '' ? '' : won(numOf(it.qty)), 'right')}</td>
        <td style="${B};text-align:right;border-top:none;border-bottom:none;padding:0 5px">${cell(i, 'price', it.price === '' ? '' : won(numOf(it.price)), 'right')}</td>
        <td style="${B};text-align:right;border-top:none;border-bottom:none;padding:0 6px" data-inv-amt="${i}">${T.amt[i] === null ? '' : won(T.amt[i])}</td>
        <td style="${B};text-align:center;border-top:none;border-bottom:none;padding:0 3px">${cell(i, 'note', it.note, 'center')}</td></tr>`).join('');
    const sumRow = (label, key, v, bold) => `<tr style="height:6.9mm"><td colspan="6" style="${B};text-align:center">${label}</td><td style="${B};text-align:right;padding:0 6px;${bold ? 'font-weight:900' : ''}" data-inv-sum="${key}">${won(v)}</td><td style="${B}"></td></tr>`;
    const memo = edit ? `<textarea oninput="Invoice.setField('memo', this.value)" class="inv-in" style="text-align:center;height:100%;resize:none;line-height:1.7;padding-top:6mm">${esc(d.memo)}</textarea>` : `<div style="white-space:pre-wrap;text-align:center;line-height:1.7">${esc(d.memo)}</div>`;
    return `<div class="inv-sheet" style="width:210mm;height:297mm;box-sizing:border-box;padding:14mm 15mm 12mm;background:#fff;color:#1c1917;font-size:10pt;font-weight:700;line-height:1.35;${edit ? '' : 'letter-spacing:0.01px;'}font-family:'Pretendard',-apple-system,BlinkMacSystemFont,system-ui,sans-serif">
      <div style="position:relative;height:13mm;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;left:1mm;top:1.5mm;display:flex;flex-direction:column;align-items:center;line-height:1"><span class="baroga-serif" style="font-size:17pt;font-weight:700;color:#3B2A1A;letter-spacing:0.14em">BAROGA</span><span style="font-size:5pt;font-weight:700;color:#3B2A1A;letter-spacing:0.16em;margin-top:1mm">BAKERY MANUFACTURING</span></div>
        <div style="font-size:24pt;letter-spacing:0.28em;font-weight:800">거래명세서</div>
      </div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:1.5mm">
        <colgroup><col style="width:16.5%"><col style="width:35%"><col style="width:16%"><col style="width:32.5%"></colgroup>
        <tr style="height:6.4mm"><td style="${lab}">발주번호</td><td style="${val}">${edit ? `<span style="display:flex;align-items:center;gap:1px"><span>${esc(d.noPrefix)}-</span><input type="text" value="${esc(d.noSeq)}" inputmode="numeric" oninput="Invoice.setField('noSeq', this.value)" class="inv-in" style="width:3.2em"></span>` : esc(docNo(d))}</td><td style="${lab}">등록번호</td><td style="${val}">${inp('regNo', d.regNo)}</td></tr>
        <tr style="height:6.4mm"><td style="${lab}">수&emsp;&emsp;신</td><td style="${val}">${inp('to', d.to)}</td><td style="${lab}">상&emsp;&emsp;호</td><td style="${val}">${inp('company', d.company)}</td></tr>
        <tr style="height:6.4mm"><td style="${lab}">참&emsp;&emsp;조</td><td style="${val}">${inp('ref', d.ref)}</td><td style="${lab}">대표자명</td><td style="${val}">${inp('ceo', d.ceo)}</td></tr>
        <tr style="height:6.4mm"><td style="${lab}">발&ensp;주&ensp;일</td><td style="${val}">${inp('orderDate', d.orderDate, { type: 'date' })}</td><td style="${lab}">주&emsp;&emsp;소</td><td style="${val}">${inp('addr', d.addr)}</td></tr>
        <tr style="height:6.4mm"><td style="${lab}">납&ensp;기&ensp;일</td><td style="${val}">${inp('dueDate', d.dueDate, { type: 'date' })}</td><td style="${lab}">업태/종목</td><td style="${val}">${inp('biz', d.biz)}</td></tr>
        <tr style="height:6.4mm"><td style="${lab}">지불조건</td><td style="${val}">${inp('pay', d.pay)}</td><td style="${lab}">연&ensp;락&ensp;처</td><td style="${val}">${inp('tel', d.tel)}</td></tr>
        <tr style="height:6.4mm"><td colspan="4" style="${B};text-align:center;padding:0 6px">${inp('notice', d.notice, { align: 'center' })}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:-1px">
        <colgroup><col style="width:7.5%"><col style="width:25%"><col style="width:13%"><col style="width:9%"><col style="width:9.5%"><col style="width:12.5%"><col style="width:14.5%"><col style="width:9%"></colgroup>
        <tr style="height:6.4mm"><td style="${lab};border-bottom-width:2px">번호</td><td style="${lab};border-bottom-width:2px">품명</td><td style="${lab};border-bottom-width:2px">규격</td><td style="${lab};border-bottom-width:2px">단위</td><td style="${lab};border-bottom-width:2px">수량</td><td style="${lab};border-bottom-width:2px">단가</td><td style="${lab};border-bottom-width:2px">공급가액</td><td style="${lab};border-bottom-width:2px">비고</td></tr>
        ${rows}
        ${sumRow('합&ensp;&ensp;계', 'sum', T.sum)}${sumRow('부가세', 'vat', T.vat)}${sumRow('총합계', 'total', T.total, true)}
        <tr style="height:6.4mm"><td colspan="8" style="${lab};background:#ececec">참고사항</td></tr>
        <tr style="height:21mm"><td colspan="8" style="${B};padding:0 6px;vertical-align:middle">${memo}</td></tr>
      </table>
    </div>`;
  }
  function render() {
    const el = root(); if (!el) return;
    if (!cur) setCur(blankDoc());
    const q = search.trim().toLowerCase();
    const list = db.docs.slice().sort((a, b) => docNo(b).localeCompare(docNo(a))).filter((d) => !q || (docNo(d) + ' ' + d.to + ' ' + d.orderDate).toLowerCase().includes(q));
    const isNew = !db.docs.some((d) => d.id === cur.id);
    const listHtml = list.length ? list.map((d) => { const T = totals(fixDoc(d)), on = d.id === cur.id; return `<div class="group flex items-stretch rounded-xl border ${on ? 'border-stone-900 bg-stone-50' : 'border-stone-200 bg-white hover:bg-stone-50'}"><button type="button" onclick="Invoice.open('${esc(d.id)}')" class="flex-1 min-w-0 text-left px-3 py-2 cursor-pointer"><div class="flex items-center justify-between gap-2"><span class="text-sm font-extrabold text-stone-900 tabular-nums">${esc(docNo(d))}</span><span class="text-xs font-bold text-stone-700 tabular-nums">${won(T.total)}원</span></div><div class="text-xs text-stone-500 truncate">${esc(d.to || '(수신 없음)')} · ${esc(d.orderDate || '')}</div></button><button type="button" title="삭제" onclick="Invoice.remove('${esc(d.id)}')" class="px-2 text-stone-300 hover:text-rose-600 cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>`; }).join('') : `<div class="text-xs text-stone-400 text-center py-6">${db.docs.length ? '검색 결과가 없습니다.' : '저장된 거래명세서가 없습니다.'}</div>`;
    const prods = products();
    el.innerHTML = `<style>
        #invoiceRoot .inv-in { width:100%; background:transparent; border:0; outline:0; font:inherit; color:inherit; padding:1px 2px; border-radius:3px; min-width:0; }
        #invoiceRoot .inv-in:hover { background:#fef3c7; } #invoiceRoot .inv-in:focus { background:#fde68a; }
        #invoiceRoot input[type=date].inv-in { font-variant-numeric: tabular-nums; }
        #invoiceRoot .inv-wrap { transform-origin: top left; }
      </style>
      <div class="w-full bg-stone-100/90 border-b border-stone-200 no-print"><div class="max-w-[1600px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5">
          <button type="button" onclick="Invoice.newDoc()" class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold bg-stone-900 text-white cursor-pointer"><i data-lucide="file-plus" class="w-4 h-4"></i><span>새 명세서</span></button>
          <button type="button" onclick="Invoice.copyDoc()" class="${BTN} !h-10 !text-sm"><i data-lucide="copy" class="w-4 h-4"></i><span>복사해서 새로</span></button>
          <button type="button" onclick="Invoice.pdf()" class="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-extrabold bg-amber-500 hover:bg-amber-600 text-stone-950 cursor-pointer"><i data-lucide="download" class="w-4 h-4"></i><span>PDF 다운로드</span></button>
          <button type="button" onclick="Invoice.print()" class="${BTN} !h-10 !text-sm"><i data-lucide="printer" class="w-4 h-4"></i><span>인쇄</span></button>
        </div>
        <div class="flex items-center gap-1.5 ml-auto">
          <button type="button" id="invDbBadge" onclick="Invoice.openDbModal()" title="DB 주소 설정"><span></span><span id="invStatusText">${esc(statusText)}</span><i data-lucide="settings" class="w-3.5 h-3.5 ml-0.5 opacity-75"></i></button>
          <button type="button" onclick="Invoice.saveNow()" data-save-key="invoice" class="flex items-center gap-1.5 px-3.5 py-1.5 h-9 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white transition cursor-pointer"><i data-lucide="cloud-upload" class="w-3.5 h-3.5"></i><span>DB 저장</span></button>
          <button type="button" onclick="Invoice.pull(true)" title="DB에서 다시 불러오기" class="flex items-center justify-center w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition cursor-pointer"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button>
        </div></div></div>
      <div class="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row gap-4 items-start">
        <div class="w-full lg:w-72 shrink-0 flex flex-col gap-3 no-print">
          <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-3 flex flex-col gap-2">
            <div class="flex items-center justify-between"><h3 class="text-base font-extrabold text-stone-900">저장된 명세서 <span class="text-xs font-bold text-stone-500">(${db.docs.length}건)</span></h3></div>
            <input type="text" value="${esc(search)}" oninput="Invoice.setSearch(this.value)" placeholder="발주번호·수신·날짜 검색" class="w-full h-9 px-3 rounded-xl border border-stone-300 text-sm">
            <div id="invList" class="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto">${listHtml}</div>
          </div>
          <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-3 flex flex-col gap-2 text-xs text-stone-600 leading-relaxed">
            <h3 class="text-sm font-extrabold text-stone-900">작성 방법</h3>
            <div>· 명세서의 글자를 눌러 바로 고칩니다.</div>
            <div>· <b>품명</b> 칸을 누르면 바로가 제품 목록이 나옵니다. 고르면 단위 PK와 <b>엠즈 판매가</b>가 들어갑니다. 목록에 없는 상품은 그냥 적으면 됩니다.</div>
            <div>· 공급가액·합계·부가세(10%)·총합계는 자동 계산됩니다.</div>
            <button type="button" onclick="Invoice.reloadPrices()" class="${BTN} justify-center"><i data-lucide="refresh-ccw" class="w-3.5 h-3.5"></i><span>엠즈 판매가 다시 불러오기</span></button>
            <button type="button" onclick="Invoice.saveDefaults()" class="${BTN} justify-center" title="참조·지불조건·등록번호·상호·대표자명·주소·업태/종목·연락처·안내문·참고사항을 새 명세서의 기본값으로 둡니다"><i data-lucide="bookmark" class="w-3.5 h-3.5"></i><span>지금 내용을 기본 정보로</span></button>
            <div class="text-stone-400">제품 목록 ${prods.length}개${prods.length ? '' : ' — 제품단가 메뉴를 한 번 열어 주세요'}</div>
          </div>
        </div>
        <div class="flex-1 min-w-0 w-full">
          <div class="mb-2 flex flex-wrap items-center gap-2 text-xs no-print"><span class="px-2.5 h-7 inline-flex items-center rounded-lg border ${isNew ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-stone-50 border-stone-200 text-stone-600'} font-bold">${isNew ? '새 명세서 (아직 저장 안 됨)' : '저장된 명세서 수정 중'}</span><span class="text-stone-500">발주번호 <b class="text-stone-800">${esc(docNo(cur))}</b></span></div>
          <div id="invStage" class="overflow-auto rounded-2xl border border-stone-200 bg-stone-200/60 p-3"><div id="invWrap" class="inv-wrap shadow-lg" style="width:210mm;margin-left:auto;margin-right:auto">${sheetHtml(cur, true)}</div></div>
        </div>
      </div>
      <datalist id="invProducts">${prods.map((p) => `<option value="${esc(p.name)}">${p.price ? won(p.price) + '원' : '판매가 없음'}</option>`).join('')}</datalist>
      <div id="invModal"></div>`;
    paintBadge(); touch(); fit();
    if (window.lucide) lucide.createIcons();
  }
  // 화면이 좁으면 A4를 줄여서 보여 줌
  function fit() { const st = document.getElementById('invStage'), w = document.getElementById('invWrap'); if (!st || !w) return; const avail = st.clientWidth - 24, full = w.offsetWidth, s = Math.min(1, avail / full); w.style.transform = s < 1 ? `scale(${s})` : ''; w.style.marginBottom = s < 1 ? `${-(1 - s) * w.offsetHeight}px` : ''; w.style.marginLeft = s < 1 ? '0' : 'auto'; w.style.marginRight = s < 1 ? `${-(1 - s) * full}px` : 'auto'; }
  function refreshCalc() {
    const T = totals(cur);
    T.amt.forEach((a, i) => { const c = document.querySelector(`[data-inv-amt="${i}"]`); if (c) c.textContent = a === null ? '' : won(a); });
    [['sum', T.sum], ['vat', T.vat], ['total', T.total]].forEach(([k, v]) => { const c = document.querySelector(`[data-inv-sum="${k}"]`); if (c) c.textContent = won(v); });
    touch();
  }
  function setField(f, v) {
    if (!cur) return;
    if (f === 'orderDate' && (!cur.dueDate || cur.dueDate === cur.orderDate)) { cur.dueDate = v; const el = document.querySelector('#invoiceRoot input[data-inv-f="dueDate"]'); if (el) el.value = v; } // 납기일을 따로 고르지 않았으면 발주일을 따라감
    cur[f] = f === 'noSeq' ? String(v).replace(/[^0-9]/g, '').slice(0, 3) : v; touch();
  }
  function setItem(i, f, v) { if (!cur || !cur.items[i]) return; cur.items[i][f] = f === 'qty' || f === 'price' ? (String(v).trim() === '' ? '' : numOf(v)) : v; refreshCalc(); }
  function fmtNum(el) { const v = String(el.value).trim(); el.value = v === '' ? '' : won(numOf(v)); }
  function setCell(i, f, v) { const el = document.querySelector(`[data-inv="${i}:${f}"]`); if (el) el.value = v; }
  function pickName(i, name) {
    const p = findProduct(name); if (!p || !cur.items[i]) return;
    const it = cur.items[i]; if (!it.unit) { it.unit = 'PK'; setCell(i, 'unit', 'PK'); }
    if (p.price > 0) { it.price = p.price; setCell(i, 'price', won(p.price)); } else toast(`'${p.name}'의 엠즈 판매가가 제품단가에 없습니다. 단가를 직접 입력해 주세요.`, 'info');
    refreshCalc();
  }
  function reloadPrices() {
    let n = 0, miss = 0; cur.items.forEach((it, i) => { const p = findProduct(it.name); if (!p) return; if (p.price > 0) { if (numOf(it.price) !== p.price) n++; it.price = p.price; setCell(i, 'price', won(p.price)); } else miss++; });
    refreshCalc(); toast(`엠즈 판매가를 다시 불러왔습니다 (바뀐 줄 ${n}개${miss ? ` · 판매가 없는 품목 ${miss}개` : ''}).`, n ? 'success' : 'info');
  }
  function guardLeave() { return !curDirty() || window.confirm('작성 중인 명세서가 아직 저장되지 않았습니다.\n저장하지 않고 넘어가면 그 내용은 사라집니다. 계속할까요?'); }
  function newDoc() { if (!guardLeave()) return; setCur(blankDoc()); render(); }
  function copyDoc() { if (!cur) return; const b = blankDoc(), src = JSON.parse(JSON.stringify(cur)); const d = Object.assign({}, src, { id: b.id, created: b.created, noPrefix: b.noPrefix, noSeq: b.noSeq, orderDate: b.orderDate, dueDate: b.dueDate }); cur = fixDoc(d); curSaved = ''; render(); toast('내용을 복사해 새 명세서를 만들었습니다. 발주일·납기일은 오늘로 바뀌었으니 확인해 주세요.', 'info'); }
  function open(id) { const d = db.docs.find((x) => x.id === id); if (!d) return; if (cur && cur.id !== id && !guardLeave()) return; setCur(d); render(); }
  function remove(id) { const d = db.docs.find((x) => x.id === id); if (!d) return; if (!window.confirm(`거래명세서 ${docNo(d)}${d.to ? ' (' + d.to + ')' : ''}를 삭제할까요?\n[DB 저장]을 눌러야 DB에서도 지워집니다.`)) return; db.docs = db.docs.filter((x) => x.id !== id); dbDirty = true; if (cur && cur.id === id) setCur(blankDoc()); render(); }
  function saveDefaults() { const d = {}; DEF_KEYS.forEach((k) => { d[k] = cur[k] || ''; }); db.cfg = { defaults: d }; dbDirty = true; render(); toast('지금 내용을 새 명세서의 기본 정보로 두었습니다. [DB 저장]을 눌러야 DB에 올라갑니다.', 'success'); }
  function setSearch(v) { search = v; const pos = v.length; render(); const i = document.querySelector('#invoiceRoot input[placeholder^="발주번호"]'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }

  // ---------- PDF · 인쇄 ----------
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('도구를 내려받지 못했습니다: ' + src)); document.head.appendChild(s); });
  const fileName = () => `거래명세서_${docNo(cur)}${cur.to.trim() ? '_' + cur.to.trim().replace(/[\\/:*?"<>|]/g, '') : ''}.pdf`;
  async function pdf() {
    if (!cur) return;
    toast('PDF를 만드는 중입니다...', 'info');
    // 사이트 전체가 아니라 명세서 한 장만 든 빈 창에서 그림으로 바꿈 (빠르고, 글자 위치가 어긋나지 않음)
    const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:230mm;height:320mm;border:0'; document.body.appendChild(fr);
    try {
      if (typeof window.html2canvas !== 'function') await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
      if (!window.jspdf) await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
      const fd = fr.contentDocument;
      fd.open(); fd.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"><style>html,body{margin:0;padding:0;background:#fff}.baroga-serif{font-family:Georgia,'Times New Roman',Batang,serif}</style></head><body>${sheetHtml(cur, false)}</body></html>`); fd.close();
      await new Promise((r) => setTimeout(r, 150));
      try { await Promise.all(['400', '500', '700', '800'].map((wgt) => fd.fonts.load(`${wgt} 10pt Pretendard`, '거래명세서 0123'))); await fd.fonts.ready; } catch (e) {}
      // html2canvas는 글자 기준선을 이 페이지에서 재는데, 사이트 기본 스타일(img가 block)이 있으면 글자가 아래로 밀림 → 변환하는 동안만 되돌림
      const fix = document.createElement('style'); fix.textContent = 'img{display:inline-block!important}'; document.head.appendChild(fix);
      let canvas; try { canvas = await window.html2canvas(fd.body.firstElementChild, { scale: 3, backgroundColor: '#ffffff', useCORS: true }); } finally { fix.remove(); }
      const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
      doc.save(fileName());
      toast('PDF를 내려받았습니다: ' + fileName(), 'success');
    } catch (e) { toast('PDF 만들기 실패: ' + e.message + ' — [인쇄]에서 "PDF로 저장"을 선택해도 됩니다.', 'error'); }
    finally { fr.remove(); }
  }
  function print() {
    if (!cur) return;
    let st = document.getElementById('invPrintStyle');
    if (!st) { st = document.createElement('style'); st.id = 'invPrintStyle'; st.textContent = '#invPrintArea{display:none}@media print{@page{size:A4;margin:0}body.inv-printing>*:not(#invPrintArea){display:none!important}body.inv-printing{background:#fff!important}body.inv-printing #invPrintArea{display:block!important}}'; document.head.appendChild(st); }
    let area = document.getElementById('invPrintArea'); if (!area) { area = document.createElement('div'); area.id = 'invPrintArea'; document.body.appendChild(area); }
    area.innerHTML = sheetHtml(cur, false); document.body.classList.add('inv-printing');
    const done = () => { document.body.classList.remove('inv-printing'); area.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done); window.print(); setTimeout(done, 60000);
  }

  // ---------- DB 설정 ----------
  function modal(html) { const m = document.getElementById('invModal'); if (m) m.innerHTML = `<div class="fixed inset-0 z-[60] bg-stone-950/50 flex items-center justify-center p-4" onclick="if(event.target===this)Invoice.closeModal()"><div class="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">${html}</div></div>`; }
  function closeModal() { const m = document.getElementById('invModal'); if (m) m.innerHTML = ''; }
  function openDbModal() {
    modal(`<div class="px-5 py-3 border-b border-stone-200"><h3 class="text-base font-extrabold text-stone-900">거래명세서 구글 스프레드시트 DB 설정</h3><div class="text-xs text-stone-500 mt-0.5 leading-relaxed">구글 시트에 <span class="font-mono">8_invoice.gs</span>를 배포한 뒤 웹 앱 주소(…/exec)를 넣어 주세요. 접속 코드는 다른 DB와 같은 코드를 씁니다.</div></div>
      <div class="p-5"><label class="text-xs font-bold text-stone-700 block mb-1">Google Apps Script 웹 앱 URL</label><input id="invUrlInput" type="url" value="${esc(getUrl())}" placeholder="https://script.google.com/macros/s/.../exec" class="w-full border border-stone-300 focus:border-emerald-600 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono bg-stone-50 focus:bg-white text-stone-900"></div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2"><button type="button" onclick="Invoice.closeModal()" class="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer">취소</button><button type="button" onclick="Invoice.saveDbUrl()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">URL 저장 및 불러오기</button></div>`);
  }
  function saveDbUrl() {
    const v = String((document.getElementById('invUrlInput') || {}).value || '').trim();
    if (v && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(v)) { toast('웹 앱 주소 형식이 올바르지 않습니다 (…/exec로 끝나야 합니다).', 'error'); return; }
    if (isDirty() && loaded && !window.confirm('저장하지 않은 변경이 있습니다. DB 주소를 바꾸면 그 변경은 사라집니다. 계속할까요?')) return;
    try { if (v) localStorage.setItem(URL_KEY, v); else localStorage.removeItem(URL_KEY); } catch (e) {}
    closeModal(); loaded = false; dbRevision = null; dbDirty = false; curSaved = cur ? JSON.stringify(cur) : ''; pull(true);
  }

  let mounted = false;
  function mount() { render(); if (!mounted) { mounted = true; window.addEventListener('resize', fit); pull(false); } }
  window.mountInvoiceApp = mount;
  window.barogaUnsavedCheckers = window.barogaUnsavedCheckers || {};
  window.barogaUnsavedCheckers.invoice = () => !!getUrl() && loaded && (saving || isDirty());
  window.Invoice = { _sheet: (edit) => sheetHtml(cur, !!edit), mount, pull, saveNow, newDoc, copyDoc, open, remove, setField, setItem, fmtNum, pickName, reloadPrices, saveDefaults, setSearch, pdf, print, openDbModal, saveDbUrl, closeModal, _debug: () => ({ db, cur, dbRevision, loaded, dirty: isDirty(), totals: cur ? totals(cur) : null, products: products() }) };
})();
