// [VERSION: price_compare.js v1.2 - 2026-11-23 품목명 줄바꿈 없이 넓게, 1·2순위 업체명 한 줄로 자름, '더 듦'→'더 비쌈' / v1.1 - 2026-11-23 기본 DB 주소 등록 / v1.0 - 2026-11-23 신규: 원재료 > 5. 원재료 단가 비교 (Claude 조사 HTML 8개 탭 이관, 시스템 디자인)]
//  - 자료(후보 가격·업체 연락처·견적 메일·재확인 기록)는 공개 저장소에 두지 않고 '원재료 단가 비교 DB'(GAS 6_price_compare.gs)에만 저장
//  - [자료 가져오기]: Claude가 만든 단가 비교 HTML(baroga_price_compare.html) 또는 JSON 파일을 골라 → 내용 확인 → DB에 통째로 저장
//  - 화면은 읽기 전용 (전화·메일·구매는 이 화면에서 하지 않음)
(function () {
  'use strict';

  const URL_KEY = 'baroga_price_compare_gas_url_v1';
  const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbzgx_coielgbXWvLuw3I3ymUv1kh3oPXD3eHBtB_hSsRDzq4yZz5SmETpOGsioYPabp0A/exec'; // 원재료 단가 비교 DB (다른 DB를 쓸 때만 [DB 연결]에서 변경)

  // ---------- 공용 도우미 ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, t) => (typeof window.showToast === 'function' ? window.showToast(m, t) : alert(m));
  const nowHm = () => (typeof window.barogaNowHm === 'function' ? window.barogaNowHm() : new Date().toTimeString().slice(0, 5));
  const isNum = (v) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v));
  const won = (v) => (isNum(v) ? Math.round(Number(v)).toLocaleString('ko-KR') : '—');
  const sgn = (v) => (isNum(v) ? (Number(v) > 0 ? '+' : '') + won(v) : '—');
  const tone = (v) => (!isNum(v) ? 'text-stone-400' : Number(v) < 0 ? 'text-emerald-700' : Number(v) > 0 ? 'text-rose-600' : 'text-stone-500');
  const kgf = (v) => (isNum(v) ? (Math.round(v * 10) / 10).toLocaleString('ko-KR') : '—');
  const absUrl = (u, base) => { if (!u) return ''; if (/^https?:\/\//i.test(u)) return u; if (base) { try { return new URL(u, base).href; } catch (e) {} } return ''; };
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '');
  const ext = (u, t, cls) => (safeUrl(u) ? `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener" class="${cls || 'text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-900'}">${t}</a>` : t);
  const pill = (txt, cls) => `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap ${cls}">${txt}</span>`;
  const P = {
    save: 'bg-emerald-50 text-emerald-800 border-emerald-200', cost: 'bg-rose-50 text-rose-700 border-rose-200', warn: 'bg-amber-50 text-amber-800 border-amber-200',
    mute: 'bg-stone-100 text-stone-600 border-stone-200', accent: 'bg-sky-50 text-sky-800 border-sky-200', dark: 'bg-stone-900 text-white border-stone-900',
  };
  // 등급 → [글자, 쉬운 말, 색]
  const G = {
    'A': ['A', '꼭 전화', 'bg-emerald-600 text-white border-emerald-600'], 'B': ['B', '검토', 'bg-sky-100 text-sky-800 border-sky-200'],
    'Q★': ['Q★', '최우선 견적', 'bg-amber-500 text-stone-950 border-amber-500'], 'Q': ['Q', '견적 필요', 'bg-amber-50 text-amber-800 border-amber-200'],
    'C': ['C', '참고', P.mute], '-': ['', '참고', P.mute], 'N': ['', '가격 미공개', P.mute], 'X': ['X', '품절·미열람', 'bg-rose-50 text-rose-700 border-rose-200'],
  };
  const gp = (g, n) => { const m = G[g] || ['', g || '', P.mute]; return pill(`${m[0] ? `<b>${esc(m[0])}</b>` : ''}${n != null ? esc(n) : esc(m[1])}`, m[2]); };
  const copyBtn = (t, label) => `<button type="button" data-copy="${esc(t)}" class="pc-copy ml-1 px-1.5 py-0.5 rounded-md border border-stone-200 bg-white text-[11px] font-bold text-stone-600 hover:bg-stone-50 cursor-pointer">${label || '복사'}</button>`;
  const telTxt = (p) => (p ? `<span class="select-all">전화 ${esc(p)}</span>` : '');
  const mailTxt = (e) => (e ? `<span><a class="select-all text-amber-800 underline decoration-amber-300" href="mailto:${esc(e)}">${esc(e)}</a>${copyBtn(e)}</span>` : '');
  const card = 'bg-white border border-stone-200 rounded-2xl shadow-xs';
  const input = 'border border-stone-300 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300';
  const chipCls = (on) => `px-3 py-1 rounded-full text-xs font-bold cursor-pointer border ${on ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'}`;
  const th = 'px-2.5 py-2 text-[11px] font-extrabold text-stone-500 bg-stone-50 border-b border-stone-200 whitespace-nowrap';
  const td = 'px-2.5 py-2 border-b border-stone-100 align-top';

  // ---------- 상태 ----------
  let data = null; // DB에 저장된 자료 { items, calls, quotes, summary, diffs, vendors, recheck, sum, hand, notes, source, importedAt }
  let dbRevision = null, loaded = false, loading = false, saving = false, statusText = '', pending = null;
  let view = 'rank', filt = 'pri30', q = '', cq = '', qf = 'sheet', qq = '', rcq = '', rcf = '', dq = '', vq = '';
  const open = new Set();
  const root = () => document.getElementById('priceCompareRoot');
  function getUrl() { let v = ''; try { v = localStorage.getItem(URL_KEY) || ''; } catch (e) {} return v || DEFAULT_URL; }
  function setStatus(t) { statusText = t; const el = document.getElementById('pcStatus'); if (el) el.textContent = t; }
  async function api(body, ms) {
    if (typeof window.barogaApi !== 'function') throw new Error('접속 도구를 찾을 수 없습니다');
    return window.barogaApi(getUrl(), body, ms || 60000);
  }

  async function pull(showMsg) {
    if (!getUrl()) { setStatus('DB 미연결'); render(); return; }
    if (loading || saving) return;
    loading = true; setStatus('불러오는 중...');
    try {
      const json = await api({ action: 'getAll' });
      if (!json || json.ok === false) throw new Error((json && (json.message || json.error)) || '불러오기 실패');
      dbRevision = Number(json.revision) || 0;
      loaded = true;
      if (json.status === 'empty') { data = null; setStatus('불러옴 ' + nowHm() + ' · 저장된 자료 없음'); }
      else { data = normalize(json.payload); setStatus('불러옴 ' + nowHm() + ' · ' + data.items.length + '품목'); if (showMsg) toast('원재료 단가 비교 자료를 불러왔습니다.', 'success'); }
    } catch (e) {
      loaded = false;
      setStatus('불러오기 실패');
      if (showMsg || !e.unauthorized) toast('원재료 단가 비교 DB 불러오기 실패: ' + e.message, 'error');
    } finally { loading = false; render(); }
  }
  function normalize(p) {
    const arr = (v) => (Array.isArray(v) ? v : []);
    return {
      items: arr(p.items), calls: arr(p.calls), quotes: arr(p.quotes), summary: arr(p.summary), diffs: arr(p.diffs), vendors: arr(p.vendors), recheck: arr(p.recheck),
      sum: p.sum || {}, hand: String(p.hand || ''), notes: arr(p.notes), source: p.source || {}, importedAt: p.importedAt || '',
    };
  }

  // ---------- 자료 가져오기 (Claude 단가 비교 HTML 또는 JSON) ----------
  function pickFile() {
    if (!getUrl()) { toast('먼저 [DB 연결]에서 원재료 단가 비교 DB 주소를 넣어 주세요.', 'error'); openDbModal(); return; }
    if (!loaded) { toast('DB를 불러온 뒤에 가져올 수 있습니다. [불러오기]를 눌러 주세요.', 'error'); return; }
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.html,.htm,.json,text/html,application/json';
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (f) readFile(f); };
    inp.click();
  }
  function readFile(f) {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const text = String(rd.result || '');
        const p = /^\s*\{/.test(text) ? JSON.parse(text) : parseArtifactHtml(text);
        const d = normalize(p);
        if (!d.items.length) throw new Error('품목(items) 자료를 찾지 못했습니다');
        d.items.forEach((it) => { delete it.curPhoto; (it.rows || []).forEach((v) => { delete v.img; }); });
        d.importedAt = new Date().toISOString();
        d.source = Object.assign({}, d.source, { file: f.name });
        pending = d;
        openImportModal();
      } catch (e) { toast('파일을 읽지 못했습니다: ' + e.message, 'error'); }
    };
    rd.onerror = () => toast('파일을 읽지 못했습니다.', 'error');
    rd.readAsText(f, 'utf-8');
  }
  // 단가 비교 HTML 안의 "const ITEMS=[...];" 줄들을 그대로 읽는다 (코드는 실행하지 않음)
  function parseArtifactHtml(text) {
    const get = (name) => {
      const re = new RegExp('const ' + name + '=');
      const m = re.exec(text); if (!m) return undefined;
      const st = m.index + m[0].length;
      let en = text.indexOf('\n', st); if (en < 0) en = text.length;
      let s = text.slice(st, en).trim(); if (s.endsWith(';')) s = s.slice(0, -1);
      return JSON.parse(s);
    };
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const tx = (sel) => { const el = doc.querySelector(sel); return el ? el.textContent.trim() : ''; };
    const notes = [];
    doc.querySelectorAll('details.fold').forEach((d) => {
      const lis = Array.from(d.querySelectorAll('li')).map((li) => li.textContent.trim()).filter(Boolean);
      const sm = d.querySelector('summary');
      if (lis.length && sm) notes.push({ title: sm.textContent.trim(), items: lis });
    });
    return {
      items: get('ITEMS'), calls: get('CALLS'), quotes: get('QUOTES'), summary: get('SUMMARY'), diffs: get('DIFFS'), vendors: get('VENDORS'), recheck: get('RECHECK'),
      sum: get('SUM'), hand: tx('#handmd'), notes, source: { title: tx('.mast h1') || tx('title'), sub: tx('.mast .sub') },
    };
  }
  function openImportModal() {
    const d = pending; if (!d) return;
    const cur = data;
    const row = (l, a, b) => `<tr class="border-b border-stone-100"><td class="py-1.5 px-2 font-bold text-stone-600">${l}</td><td class="py-1.5 px-2 text-right tabular-nums">${b == null ? '—' : esc(b)}</td><td class="py-1.5 px-2 text-right tabular-nums font-extrabold">${esc(a)}</td></tr>`;
    modal(`<div class="px-5 py-3 border-b border-stone-200"><h3 class="text-base font-extrabold">단가 비교 자료 가져오기</h3><div class="text-xs text-stone-500 mt-0.5">파일 <b>${esc(d.source.file || '')}</b> · ${esc(d.source.sub || '')}</div></div>
      <div class="p-4"><table class="w-full text-sm"><tr class="text-[11px] text-stone-500"><th class="text-left px-2">구분</th><th class="text-right px-2">지금 DB</th><th class="text-right px-2">가져올 파일</th></tr>
      ${row('품목', d.items.length, cur && cur.items.length)}${row('업체별 연락처', d.calls.length, cur && cur.calls.length)}${row('견적 메일 초안', d.quotes.length, cur && cur.quotes.length)}
      ${row('최근 재확인 줄', d.recheck.length, cur && cur.recheck.length)}${row('1순위 요약', d.summary.length, cur && cur.summary.length)}${row('125품목 차액', d.diffs.length, cur && cur.diffs.length)}
      ${row('거래처 전체', d.vendors.length, cur && cur.vendors.length)}${row('인계서 글자 수', d.hand.length.toLocaleString('ko-KR'), cur && cur.hand.length.toLocaleString('ko-KR'))}${row('업데이트 메모', d.notes.length, cur && cur.notes.length)}</table>
      <p class="mt-3 text-xs text-stone-500">저장하면 DB의 단가 비교 자료 전체가 이 파일 내용으로 바뀝니다. 제품 사진은 용량 때문에 저장하지 않습니다(업체 이름을 누르면 상품 페이지가 열립니다).</p></div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2"><button type="button" onclick="PriceCmp.closeModal()" class="px-4 py-2 rounded-xl border border-stone-300 text-sm font-bold cursor-pointer">취소</button><button type="button" onclick="PriceCmp.saveImport()" class="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">DB에 저장</button></div>`);
  }
  async function saveImport() {
    if (!pending || saving) return;
    saving = true; setStatus('저장 중...'); closeModal();
    try {
      const json = await api({ action: 'replaceAll', baseRevision: dbRevision, payload: pending }, 120000);
      if (!json || json.ok === false) {
        if (json && json.conflict) throw new Error('다른 기기에서 먼저 저장했습니다. [불러오기] 후 다시 가져와 주세요.');
        throw new Error((json && (json.message || json.error)) || '저장 실패');
      }
      dbRevision = Number(json.revision) || dbRevision;
      data = pending; pending = null;
      setStatus('저장됨 ' + nowHm() + ' · ' + data.items.length + '품목');
      toast('단가 비교 자료를 DB에 저장했습니다.' + (json.warning ? ' (' + json.warning + ')' : ''), 'success');
    } catch (e) {
      setStatus('저장 실패');
      toast('저장 실패: ' + e.message, 'error');
    } finally { saving = false; render(); }
  }

  // ---------- DB 연결 ----------
  function openDbModal() {
    modal(`<div class="px-5 py-3 border-b border-stone-200"><h3 class="text-base font-extrabold">원재료 단가 비교 DB 연결</h3><div class="text-xs text-stone-500 mt-0.5">기본 주소(바로가 원재료 단가 비교 DB)가 들어 있습니다. 다른 DB를 쓸 때만 바꾸세요. 접속 코드는 다른 탭과 같습니다.</div></div>
      <div class="p-4"><input id="pcUrlInput" type="text" value="${esc(getUrl())}" placeholder="https://script.google.com/macros/s/.../exec" class="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono"></div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2"><button type="button" onclick="PriceCmp.closeModal()" class="px-4 py-2 rounded-xl border border-stone-300 text-sm font-bold cursor-pointer">취소</button><button type="button" onclick="PriceCmp.saveDbUrl()" class="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">저장 후 불러오기</button></div>`);
  }
  function saveDbUrl() {
    const v = (document.getElementById('pcUrlInput').value || '').trim();
    if (v && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(v)) { toast('주소 형식이 맞지 않습니다 (https://script.google.com/macros/s/.../exec).', 'error'); return; }
    try { if (v && v !== DEFAULT_URL) localStorage.setItem(URL_KEY, v); else localStorage.removeItem(URL_KEY); } catch (e) {}
    loaded = false; dbRevision = null; data = null; closeModal(); render();
    pull(true);
  }
  function modal(html) { const h = document.getElementById('pcModal'); if (h) h.innerHTML = `<div class="fixed inset-0 z-50 bg-stone-900/40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto" onclick="if(event.target===this)PriceCmp.closeModal()"><div class="bg-white rounded-2xl shadow-xl w-full max-w-[640px]">${html}</div></div>`; }
  function closeModal() { const h = document.getElementById('pcModal'); if (h) h.innerHTML = ''; }

  // ---------- 화면 ----------
  const TABS = [
    ['rank', '품목별 비교', 'scale'], ['call', '업체별 연락처', 'phone'], ['quote', '견적 메일 초안', 'mail'], ['recheck', '최근 재확인', 'refresh-cw'],
    ['sum1', '1순위 요약', 'list-ordered', 1], ['diff125', '전품목 차액', 'table', 1], ['vend', '거래처 전체', 'building-2', 1], ['hand', '인계서', 'file-text', 1],
  ];
  function render() {
    const el = root(); if (!el) return;
    const url = getUrl();
    const tabBtn = ([k, label, icon, raw]) => `<button type="button" onclick="PriceCmp.setView('${k}')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap ${view === k ? 'bg-stone-900 text-white' : raw ? 'bg-stone-50 text-stone-600 border border-dashed border-stone-300 hover:bg-white' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'}"><i data-lucide="${icon}" class="w-4 h-4"></i><span>${label}</span></button>`;
    let body;
    if (!url) body = emptyBox('DB가 아직 연결되지 않았습니다', '단가 비교 자료는 매입 단가·업체 연락처가 있어 공개 저장소가 아닌 전용 DB(구글 시트)에만 저장합니다. 오른쪽 위 [DB 연결]에 Apps Script 주소를 넣어 주세요.');
    else if (!loaded) body = emptyBox(loading ? '불러오는 중...' : '불러오지 못했습니다', loading ? '' : '오른쪽 위 [불러오기]를 다시 눌러 주세요.');
    else if (!data) body = emptyBox('저장된 단가 비교 자료가 없습니다', 'Claude가 만든 단가 비교 HTML(또는 JSON) 파일을 [자료 가져오기]로 올려 주세요.');
    else body = sourceLine() + (view === 'call' ? paneCall() : view === 'quote' ? paneQuote() : view === 'recheck' ? paneRecheck() : view === 'sum1' ? paneSum1() : view === 'diff125' ? paneDiff() : view === 'vend' ? paneVend() : view === 'hand' ? paneHand() : paneRank());
    el.innerHTML = `
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="m-scroll-row flex flex-wrap items-center gap-1.5">${TABS.slice(0, 4).map(tabBtn).join('')}<span class="hidden sm:block w-px h-6 bg-stone-300 mx-1"></span>${TABS.slice(4).map(tabBtn).join('')}</div>
          <div class="flex items-center gap-2 text-xs ml-auto">
            <span id="pcStatus" class="px-2.5 py-1 rounded-lg bg-white border border-stone-200 font-bold text-stone-600">${esc(statusText || (url ? '' : 'DB 미연결'))}</span>
            ${url ? `<button type="button" onclick="PriceCmp.pull(true)" class="px-2.5 py-1 rounded-lg bg-white border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">불러오기</button>
            <button type="button" onclick="PriceCmp.pickFile()" class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold cursor-pointer"><i data-lucide="file-up" class="w-3.5 h-3.5"></i>자료 가져오기</button>` : ''}
            <button type="button" onclick="PriceCmp.openDbModal()" class="px-2.5 py-1 rounded-lg ${url ? 'bg-white border border-stone-200 text-stone-700' : 'bg-amber-600 text-white'} font-bold cursor-pointer">DB 연결</button>
          </div>
        </div>
        ${body}
      </div>
      <div id="pcModal"></div>`;
    if (data && loaded) afterRender();
    if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }
  }
  function afterRender() {
    if (view === 'rank') renderList();
    else if (view === 'call') renderCalls();
    else if (view === 'quote') renderQuotes();
    else if (view === 'recheck') renderRecheck();
    else if (view === 'diff125') renderDiffs();
    else if (view === 'vend') renderVendors();
  }
  const emptyBox = (t, s) => `<div class="${card} p-10 text-center"><div class="text-base font-extrabold text-stone-800">${esc(t)}</div>${s ? `<div class="mt-2 text-sm text-stone-500 max-w-xl mx-auto">${esc(s)}</div>` : ''}</div>`;
  function sourceLine() {
    const s = data.source || {};
    const at = data.importedAt ? String(data.importedAt).slice(0, 16).replace('T', ' ') : '';
    return `<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 px-1"><span class="font-extrabold text-stone-800">${esc(s.title || '원재료 단가 비교')}</span><span>${esc(s.sub || '')}</span>${at ? `<span>· DB 저장 ${esc(at)} (UTC)</span>` : ''}</div>`;
  }
  const searchBox = (id, val, ph) => `<input type="search" id="${id}" value="${esc(val)}" placeholder="${esc(ph)}" class="${input} w-full sm:w-64">`;
  const hint = (h) => `<p class="text-xs text-stone-500 leading-relaxed px-1">${h}</p>`;

  // ===== 1. 품목별 비교 =====
  function paneRank() {
    const S = data.sum || {}, rc = S.recheck || {}, slip = S.slip;
    const items = data.items;
    const mer = items.filter((i) => i.meritRank).sort((a, b) => a.meritRank - b.meritRank);
    const mx = Math.max(1, ...mer.map((i) => Number(i.realSave) || 0));
    const eyebrow = (rc.date ? rc.date + ' 후보 가격 재확인 · ' : '') + (slip ? '현재 단가 = 입고 전표(' + slip.last + ' 까지) · ' : '') + '부가세 포함 기준 비교';
    const facts = [
      ['대상 품목', (S.n ?? items.length) + '개', '조사 업체 ' + (S.vendors ?? '—') + '건'],
      ['A 꼭 전화', (S.A ?? '—') + '건', 'B 검토 ' + (S.B ?? '—') + '건'],
      ['Q★ 최우선 견적', (S.Qs ?? '—') + '건', 'Q 견적 필요 ' + (S.Q ?? '—') + '건(Q★ 포함)'],
      ['견적 잠재(3% 가정)', '연 ' + won(S.quotePot) + '원', '연 사용 ' + won(S.yearAmt) + '원'],
      ['현재가가 최저', (S.current ?? '—') + '개', '공개가 없음 ' + (S.noPrice ?? '—') + '개'],
      ['견적 초안', (S.quotes ?? data.quotes.length) + '통', '시트 ' + (S.quotesSheet ?? '—') + ' + 자동 ' + (S.quotesAuto ?? '—')],
    ];
    const bars = mer.map((i) => `<button type="button" onclick="PriceCmp.openItem('${esc(i.code)}')" class="w-full text-left group grid grid-cols-[24px_1fr_auto] items-center gap-x-2 gap-y-1 px-2 py-1.5 rounded-lg hover:bg-amber-50 cursor-pointer">
        <span class="text-xs font-extrabold text-stone-400 tabular-nums">${i.meritRank}</span>
        <span class="text-sm truncate"><b class="text-stone-900">${esc(i.name)}</b> <span class="text-xs text-stone-500">${esc(i.bestVendor)} · kg당 ${won(-i.bestDiff)}원 쌈</span></span>
        <span class="text-sm font-extrabold text-emerald-700 tabular-nums">${won(i.realSave)}원</span>
        <span class="col-start-2 col-span-2 h-1.5 rounded-full bg-stone-100 overflow-hidden"><span class="block h-full rounded-full bg-emerald-500" style="width:${((Number(i.realSave) || 0) / mx * 100).toFixed(2)}%"></span></span>
      </button>`).join('') || '<div class="text-sm text-stone-500 p-3">표시가로 더 싼 후보가 있는 품목이 없습니다.</div>';
    return `
      <section class="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div class="${card} p-5 xl:col-span-7 flex flex-col gap-4">
          <div>
            <p class="text-xs font-bold text-amber-700">${esc(eyebrow)}</p>
            <h2 class="mt-1 text-lg sm:text-xl font-extrabold text-stone-900 leading-snug">표시가로 더 싼 후보가 있는 품목 <span class="text-amber-700">${esc(S.merit ?? mer.length)}개</span>. 1순위 후보로 다 바꾸면
              <span class="block mt-1 text-2xl sm:text-3xl text-emerald-700 tabular-nums">연 ${won(S.sumM12)}원 <span class="text-base">절감</span> <span class="text-sm font-bold text-stone-500">월 ${won(S.sumM1)}원</span></span></h2>
            <p class="mt-2 text-xs text-stone-500 leading-relaxed">현재 단가와 후보 단가를 모두 부가세 포함 기준으로 맞춰 비교했습니다. 후보 단가는 쇼핑몰 표시가라 배송비·최소 주문량은 확인 전입니다. 절감은 견적을 받아야 확정됩니다. 전화·메일·구매는 이 화면에서 하지 않습니다.</p>
          </div>
          <dl class="grid grid-cols-2 sm:grid-cols-3 gap-2">${facts.map(([l, v, s]) => `<div class="rounded-xl bg-stone-50 border border-stone-200 px-3 py-2"><dt class="text-[11px] font-bold text-stone-500">${esc(l)}</dt><dd class="text-base font-extrabold text-stone-900 tabular-nums">${esc(v)}<span class="block text-[11px] font-bold text-stone-500">${esc(s)}</span></dd></div>`).join('')}</dl>
          ${rcBox()}
        </div>
        <div class="${card} p-4 xl:col-span-5">
          <h3 class="text-sm font-extrabold text-stone-900 flex items-center gap-1.5"><i data-lucide="trending-down" class="w-4 h-4 text-emerald-600"></i>절감 순위</h3>
          <p class="text-xs text-stone-500 mt-0.5 mb-2">표시가 기준 1순위 후보로 바꿨을 때 1년 절감액. 줄을 누르면 그 품목이 열립니다.</p>
          <div class="flex flex-col gap-0.5 max-h-[460px] overflow-y-auto">${bars}</div>
        </div>
      </section>
      ${data.notes.map((n) => `<details class="${card} px-4 py-2.5"><summary class="text-sm font-bold text-stone-800 cursor-pointer">${esc(n.title)}</summary><ul class="mt-2 mb-1 list-disc pl-5 text-sm text-stone-700 space-y-1">${(n.items || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`).join('')}
      <details class="${card} px-4 py-2.5"><summary class="text-sm font-bold text-stone-800 cursor-pointer">표시와 숫자 읽는 법</summary>
        <div class="mt-2 text-sm text-stone-700 leading-relaxed"><b>부가세</b>: 현재 단가는 입고 전표의 구분(포함·별도·면세)을 그대로 읽어 포함 기준으로 맞췄고, 줄마다 「전표 확인」 날짜가 붙습니다. 후보 단가의 「포함 추정」은 쇼핑몰 페이지에 부가세 표기가 없어 포함으로 본 것입니다.<br>
          차액 = 후보단가 − 바로가 현재 매입가. <b class="text-emerald-700">−는 후보가 더 쌈</b> / <b class="text-rose-600">+는 후보가 더 비쌈</b>. 우선순위 = 실측 절감(연) + 견적 잠재(연 사용액×3%).
          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            <span>${gp('A')} 연 50만원↑ 절감 + 동일/유사 제품</span><span>${gp('B')} 연 10만원↑ 절감</span><span>${gp('Q★')} 연 사용 1천만원↑ 공식 경로</span>
            <span>${gp('Q')} 공식 경로, 가격 비공개</span><span>${gp('C')} 절감액이 작거나 차액 미산정</span><span>${gp('-')} 현재가보다 비싼 후보</span>
            <span>${gp('N')} 일반 판매처, 표시가 없음</span><span>${gp('X')} 순위에서 뒤로</span><span>${pill('기준', P.dark)} 현재 거래처 줄</span>
          </div></div></details>
      <div class="${card}">
        <div class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-stone-200 bg-amber-50/40 rounded-t-2xl">
          ${searchBox('pcQ', q, '품목명·코드·업체 검색')}
          <div class="flex flex-wrap gap-1.5">${[['pri30', '우선순위 상위 30'], ['pri20', '상위 20'], ['pri40', '상위 40'], ['merit', '실측 절감 품목'], ['quote', '견적 필수만'], ['current', '현재가가 최저'], ['all', '전체 ' + items.length + '품목']].map(([k, l]) => `<button type="button" onclick="PriceCmp.setFilter('${k}')" class="${chipCls(filt === k)}">${l}</button>`).join('')}</div>
          <span id="pcCnt" class="text-xs font-bold text-stone-500"></span>
          <span class="flex-1"></span>
          <button type="button" onclick="PriceCmp.expandAll()" class="text-xs font-bold text-amber-800 hover:underline cursor-pointer">모두 펼치기</button>
          <button type="button" onclick="PriceCmp.collapseAll()" class="text-xs font-bold text-amber-800 hover:underline cursor-pointer">모두 접기</button>
        </div>
        <p class="px-4 py-2 text-xs text-stone-500 leading-relaxed border-b border-stone-100"><b class="text-stone-700">모든 단가는 부가세 포함 기준으로 맞춰 비교합니다.</b> 현재 = 바로가가 지금 받는 값으로, 가장 최근 입고 전표의 거래처·단가·부가세 구분입니다(${slip ? `전표 ${esc(slip.last)} 까지 · 전표 있는 품목 ${esc(slip.items)}개, 없는 품목 ${esc(slip.none)}개` : '전표 대조 전'}). 전표가 부가세 별도면 1.1을 곱해 포함으로 바꿨고, 면세 품목은 그대로입니다. 후보 단가는 쇼핑몰 표시가로, 페이지에 따로 적혀 있지 않으면 부가세 포함으로 봅니다(「포함 추정」). 단가는 kg당입니다. 한 달 금액 = 현재 단가 × 한 달 사용량, 월 차액·1년 절감 = (후보 단가 − 현재 단가) × 사용량입니다. 후보 단가는 배송비·최소 주문량 확인 전 참고값입니다. 줄을 누르면 그 품목의 후보 전체가 펼쳐집니다.</p>
        <div class="overflow-x-auto"><table class="w-full text-sm min-w-[1180px]" id="pcList"></table></div>
      </div>`;
  }
  const RC_L = { apply: '자동 반영', review: '확인 필요', confirm: '가격 같음', none: '확인 불가' };
  const RC_P = { apply: P.save, review: P.warn, confirm: P.mute, none: P.mute };
  function rcBox() {
    const rc = (data.sum || {}).recheck, R = data.recheck;
    if (!rc || !R.length) return '';
    const c = { apply: 0, review: 0, confirm: 0, none: 0 }; R.forEach((x) => { c[x.act] = (c[x.act] || 0) + 1; });
    const big = R.filter((x) => x.act === 'apply').slice().sort((a, b) => Math.abs(b.pct || 0) - Math.abs(a.pct || 0)).slice(0, 6);
    return `<section class="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
      <div class="flex items-center justify-between gap-2"><h3 class="text-sm font-extrabold text-stone-900 flex items-center gap-1.5"><i data-lucide="refresh-cw" class="w-4 h-4 text-amber-700"></i>${esc(rc.stamp || '')} 가격 재확인</h3><button type="button" onclick="PriceCmp.setView('recheck')" class="text-xs font-bold text-amber-800 hover:underline cursor-pointer">재확인 전체 보기</button></div>
      <div class="mt-2 flex flex-wrap gap-1.5">${Object.keys(RC_L).map((k) => pill(`${RC_L[k]} <b class="ml-1">${c[k]}</b>`, RC_P[k])).join('')}</div>
      <div class="mt-1.5 text-xs text-stone-500">후보 상품 링크 ${R.length}줄을 다시 열어 표시가·품절을 확인 · 재고 칸 갱신 ${esc(rc.stock)}줄 · 순위 다시 매긴 품목 ${esc(rc.touched)}개(1순위 바뀐 품목 ${esc(rc.vchg)}개)</div>
      ${big.length ? `<ul class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs">${big.map((x) => `<li class="flex justify-between gap-2"><span class="truncate text-stone-600">${esc(x.name)} · ${esc(x.vendor)}</span><span class="tabular-nums whitespace-nowrap">${won(x.old)} → <b>${won(x.new)}원</b> <span class="${x.pct > 0 ? 'text-rose-600' : 'text-emerald-700'} font-bold">${x.pct > 0 ? '+' : ''}${Number(x.pct).toFixed(1)}%</span></span></li>`).join('')}</ul>` : ''}
      <p class="mt-2 text-[11px] text-stone-500 leading-relaxed">자동 반영은 페이지 표시가가 기록과 ±${esc(rc.autoPct)}% 안쪽으로 다를 때만 합니다. 그보다 크게 다르면 옵션·용량이 다른 경우가 많아 값은 그대로 두고 '확인 필요'로만 남겼습니다.</p>
    </section>`;
  }
  function pick() {
    let rows = data.items.slice();
    const byPri = (n) => rows.filter((i) => i.priRank <= n).sort((a, b) => a.priRank - b.priRank);
    if (filt === 'pri30') rows = byPri(30);
    else if (filt === 'pri20') rows = byPri(20);
    else if (filt === 'pri40') rows = byPri(40);
    else if (filt === 'merit') rows = rows.filter((i) => i.meritRank).sort((a, b) => a.meritRank - b.meritRank);
    else if (filt === 'quote') rows = rows.filter((i) => i.nQ > 0).sort((a, b) => a.rank - b.rank);
    else if (filt === 'current') rows = rows.filter((i) => i.bestDiff != null && i.bestDiff >= 0).sort((a, b) => a.rank - b.rank);
    else rows = rows.sort((a, b) => a.rank - b.rank);
    if (q) rows = rows.filter((i) => (i.name + i.code + i.supplier + (i.rows || []).map((v) => v.vendor).join(' ')).toLowerCase().includes(q));
    return rows;
  }
  const unitOf = (it) => String(it.spec || '').split('/')[1] || '개';
  const curMonth = (it) => (it.curKg && it.monthlyKg ? Math.round(it.curKg * it.monthlyKg) : null);
  const gap = (x) => (!isNum(x) ? '—' : x < 0 ? `<span class="text-emerald-700 font-bold">${won(-x)}원 절감</span>` : x > 0 ? `<span class="text-rose-600 font-bold">${won(x)}원 <span class="whitespace-nowrap">더 비쌈</span></span>` : '같음');
  const curVatWord = (s) => { s = String(s || ''); return s.startsWith('별도') ? '부가세 별도 → 포함으로 환산' : s.startsWith('포함') ? '부가세 포함' : s.startsWith('면세') ? '면세(부가세 없음)' : '부가세 구분 미확인'; };
  const candVat = (v) => { const s = String(v.vat || ''); return s.startsWith('포함') ? '부가세 포함' : s.startsWith('별도') ? '별도 → 포함 환산' : (s === '면세' || s.startsWith('면세(')) ? '면세' : s.includes('면세') ? '면세 추정' : '포함 추정'; };
  const vatPill = (s) => pill(esc(s), s === '별도' ? P.warn : s === '면세' ? P.mute : P.accent);
  const sub = (h, cls) => `<span class="block text-[11px] ${cls || 'text-stone-500'} mt-0.5">${h}</span>`;
  function curBadge(it) {
    const c = it.curCheck; if (!c) return '';
    if (c.src !== '전표') return sub(pill('입고 전표 없음', P.mute));
    return sub(`${pill(c.flag ? esc(c.flag) : '전표 확인', c.flag ? P.warn : P.save)} ${esc(c.date)}`);
  }
  function candCells(it, v, label) {
    if (!v) return `<td colspan="4" class="${td} text-xs text-stone-400 border-l border-stone-100">${label === '1순위' ? '공개가 후보 없음' + (it.nQ ? ' · 견적 필요' : '') : '2순위 후보 없음'}</td>`;
    return `<td class="${td} border-l border-stone-100 max-w-[130px]" title="${esc(v.vendor)}"><span class="block truncate">${safeUrl(v.url) ? ext(v.url, esc(v.vendor)) : esc(v.vendor)}</span>${sub(esc(v.same) + (String(v.stock || '').startsWith('판매중') ? ' · 판매중' : ''))}</td>
      <td class="${td} text-right tabular-nums"><b>${won(v.wkg)}</b>${v.diff == null ? '' : sub(sgn(v.diff) + '원/kg', tone(v.diff))}${sub(candVat(v))}</td>
      <td class="${td} text-right tabular-nums">${gap(v.m1)}</td>
      <td class="${td} text-right tabular-nums">${gap(v.m12)}</td>`;
  }
  function itemRow(it) {
    const isOpen = open.has(it.code);
    const rows = it.rows || [];
    const r1 = rows.find((v) => v.rank === 1), r2 = rows.find((v) => v.rank === 2);
    const cm = curMonth(it);
    const badges = [it.meritRank ? pill('절감 ' + it.meritRank + '위', P.save) : '', it.nA ? gp('A', ' ' + it.nA) : '', it.nB ? gp('B', ' ' + it.nB) : '', it.nQ ? gp('Q', ' ' + it.nQ) : '', it.trust === '불일치' ? pill('규격 불일치', P.warn) : ''].filter(Boolean).join(' ');
    return `<tr data-code="${esc(it.code)}" onclick="PriceCmp.toggle(this.dataset.code, event)" class="cursor-pointer ${isOpen ? 'bg-amber-50/70' : 'hover:bg-stone-50'}">
      <td class="${td} text-center font-extrabold text-stone-500 tabular-nums"><i data-lucide="${isOpen ? 'chevron-down' : 'chevron-right'}" class="w-3.5 h-3.5 inline -mt-0.5 text-stone-400"></i> ${esc(it.priRank)}</td>
      <td class="${td} min-w-[210px]"><b class="text-stone-900 whitespace-nowrap">${esc(it.name)}</b>${sub(`<span class="whitespace-nowrap">${esc(it.code)} · ${esc(it.spec)}</span>`)}${badges ? `<span class="flex flex-wrap gap-1 mt-1">${badges}</span>` : ''}</td>
      <td class="${td} border-l border-stone-100 bg-stone-50/60 max-w-[170px]" title="${esc(it.supplier)}"><span class="block truncate">${esc(it.supplier)}</span>${sub(`<b class="text-sm text-stone-900">${it.curKg ? won(it.curKg) + '원/kg' : '원/kg 미산정'}</b>`)}${it.curPrice ? sub('전표 단가 ' + won(it.curPrice) + '원 · ' + curVatWord(it.curVat)) : ''}${curBadge(it)}</td>
      <td class="${td} text-right tabular-nums bg-stone-50/60">${it.monthlyKg ? kgf(it.monthlyKg) + 'kg' : '—'}${sub(it.qtyAvg ? kgf(it.qtyAvg) + esc(unitOf(it)) : '출고 기록 없음')}</td>
      <td class="${td} text-right tabular-nums bg-stone-50/60">${it.monthlyKg ? won(it.monthlyKg * 12) + 'kg' : '—'}</td>
      <td class="${td} text-right tabular-nums bg-stone-50/60"><b>${cm == null ? '—' : won(cm) + '원'}</b>${cm == null ? '' : sub('1년 ' + won(cm * 12) + '원')}</td>
      ${candCells(it, r1, '1순위')}${candCells(it, r2, '2순위')}
    </tr>${isOpen ? detailRow(it) : ''}`;
  }
  function contactCell(v) {
    const a = [];
    if (v.phone) a.push(telTxt(v.phone));
    if (v.email) a.push(`<a class="select-all text-amber-800 underline decoration-amber-300" href="mailto:${esc(v.email)}">${esc(v.email)}</a>`);
    const f = absUrl(v.form, v.home || v.url); if (f) a.push(ext(f, '문의폼'));
    return sub(a.length ? a.join(' · ') : '연락처 미확인');
  }
  function noteCell(n) {
    if (!n) return ''; const s = String(n);
    return s.length <= 90 ? sub(esc(s)) : `<details class="text-[11px] text-stone-500 mt-0.5"><summary class="cursor-pointer">${esc(s.slice(0, 90))}… 더 보기</summary><div>${esc(s)}</div></details>`;
  }
  function vrow(v) {
    const bg = v.grade === 'A' ? 'bg-emerald-50/60' : v.grade === 'X' ? 'opacity-60' : '';
    const rk = v.rank ? `<span class="inline-flex w-5 h-5 items-center justify-center rounded-full text-[11px] font-extrabold ${v.rank === 1 ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 text-stone-700'}">${v.rank}</span>` : '<span class="inline-block w-5 text-center text-stone-400">·</span>';
    const st = String(v.stock || '');
    return `<tr class="${bg}">
      <td class="${td} whitespace-nowrap">${rk} ${gp(v.grade)}</td>
      <td class="${td} min-w-[220px]">${safeUrl(v.url) ? ext(v.url, `<b>${esc(v.vendor)}</b>`) : `<b>${esc(v.vendor)}</b>`}${sub(esc(v.role || '') + (v.operator ? ' · ' + esc(v.operator) : '') + (v.home ? ' · ' + ext(v.home, '홈페이지') : ''))}${contactCell(v)}${noteCell(v.note)}</td>
      <td class="${td}">${pill(esc(v.same), String(v.same).startsWith('동일') ? P.save : v.same === '유사' ? P.warn : P.mute)}</td>
      <td class="${td} text-right tabular-nums">${v.price != null ? won(v.price) : pill('견적', P.warn)}${sub(esc(v.pack || v.unit || '—') + ' · VAT ' + esc(v.vat))}</td>
      <td class="${td} text-right tabular-nums"><b>${v.wkg != null ? won(v.wkg) : '—'}</b></td>
      <td class="${td} text-right tabular-nums ${tone(v.diff)}"><b>${sgn(v.diff)}</b>${v.pct != null ? sub((v.pct > 0 ? '+' : '') + esc(v.pct) + '%') : ''}</td>
      <td class="${td} text-right tabular-nums text-xs ${tone(v.m1)}">${sgn(v.m1)}</td>
      <td class="${td} text-right tabular-nums text-xs ${tone(v.m3)}">${sgn(v.m3)}</td>
      <td class="${td} text-right tabular-nums text-xs ${tone(v.m6)}">${sgn(v.m6)}</td>
      <td class="${td} text-right tabular-nums ${tone(v.m12)}"><b>${sgn(v.m12)}</b></td>
      <td class="${td}">${pill(esc(v.stock || '—'), st.startsWith('판매중') ? P.save : st.startsWith('품절') ? P.cost : P.mute)}${sub((v.opened ? '실열람' : '미열람') + (v.at ? ' · ' + esc(String(v.at).slice(0, 16)) : ''))}</td>
    </tr>`;
  }
  function baseRow(it) {
    const z = `<td class="${td} text-right tabular-nums text-xs text-stone-500">0</td>`;
    return `<tr class="bg-stone-100/70">
      <td class="${td}">${pill('기준', P.dark)}</td>
      <td class="${td}"><b>${esc(it.supplier)}</b>${sub('현 거래처 · ' + esc(it.curSrc || ''))}${sub('내부 연락처')}</td>
      <td class="${td}">${pill('현재', P.mute)}</td>
      <td class="${td} text-right tabular-nums">${won(it.curPrice)}${sub(esc(it.spec) + ' · VAT ' + esc(it.curVat || '미확인'))}</td>
      <td class="${td} text-right tabular-nums"><b>${won(it.curKg)}</b></td>
      <td class="${td} text-right tabular-nums text-stone-500">0${sub('0.0%')}</td>${z}${z}${z}${z}
      <td class="${td} text-xs text-stone-500">내부 자료</td>
    </tr>`;
  }
  function detailRow(it) {
    const rows = it.rows || [];
    const homeOf = (n) => { const r = rows.find((v) => v.vendor === n); return r ? (r.home || r.url) : ''; };
    const cl = it.callList || [];
    const rec = cl.slice(0, 6).map((c) => { const f = absUrl(c.form, homeOf(c.vendor)); return `<li class="flex flex-wrap items-center gap-x-2 gap-y-0.5">${gp(c.grade)}<b>${c.rank ? c.rank + '위 ' : ''}${esc(c.vendor)}</b>${c.wkg ? `<span class="text-stone-500 tabular-nums">${won(c.wkg)}원/kg</span>` : ''}${c.m12 < 0 ? `<span class="text-emerald-700 font-bold tabular-nums">연 ${sgn(c.m12)}원</span>` : c.m12 > 0 ? `<span class="text-rose-600 font-bold tabular-nums">연 ${sgn(c.m12)}원</span>` : ''}${c.phone ? `<span class="text-stone-500 select-all">전화 ${esc(c.phone)}</span>` : ''}${c.email ? `<a class="text-amber-800 underline decoration-amber-300" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}${f ? ext(f, '문의폼') : ''}</li>`; }).join('');
    const meta = [
      ['현 거래처', esc(it.supplier)], ['현재 단가(부가세 포함 기준)', `${won(it.curKg)}원/kg <span class="text-stone-500 font-normal">(전표 ${won(it.curPrice)}원 · ${curVatWord(it.curVat)})</span>`],
      ['월평균 사용', `${esc(it.qtyAvg)}${it.monthlyKg ? ` <span class="text-stone-500 font-normal">≈ ${esc(it.monthlyKg)}kg</span>` : ''}`], ['3개월 사용액(PD 출고)', won(it.amt3m) + '원'],
      ['연 사용액(PD 출고 기준)', won(it.yearAmt) + '원'], ['견적 3% 가정', '연 ' + won(it.quotePot) + '원'],
      ['규격', `${esc(it.spec)}${it.trust === '불일치' ? ` <span class="text-rose-600">⚠ 규격 불일치(명세 ${esc(it.invoiceSpec)})</span>` : ''}`],
    ];
    const slips = it.slips && it.slips.length ? `<div class="rounded-xl border border-stone-200 bg-white p-3"><h4 class="text-xs font-extrabold text-stone-700 mb-1.5">최근 입고 전표 — 현재 단가·부가세 구분의 근거</h4><ul class="text-xs space-y-0.5 tabular-nums">${it.slips.map((s) => `<li>${esc(s.d)} · ${esc(s.v)} · <b>${won(s.p)}원</b>/${esc(s.u)} × ${esc(s.q)} ${vatPill(s.t)}</li>`).join('')}</ul>${it.curPrev && it.curPrev.price != null && (it.curPrev.price !== it.curPrice || (it.curPrev.vat || '') !== it.curVat) ? `<div class="mt-1.5 text-[11px] text-stone-500">전표 반영 전 화면 값: ${won(it.curPrev.price)}원 ${esc(it.curPrev.vat || '구분 없음')} · ${esc(it.curPrev.supplier || '')} · ${won(it.curPrev.kg)}원/kg (${esc(it.curPrev.src || '')})</div>` : ''}</div>` : '';
    const recBox = rec ? `<div class="rounded-xl border border-stone-200 bg-white p-3"><h4 class="text-xs font-extrabold text-stone-700 mb-1.5">전화·견적 추천 ${cl.length}곳</h4><ul class="text-xs space-y-1">${rec}</ul>${cl.length > 6 ? `<div class="mt-1.5 text-[11px] text-stone-500">외 ${cl.length - 6}곳 (아래 표에서 확인)</div>` : ''}</div>` : '';
    return `<tr class="bg-amber-50/40"><td colspan="14" class="px-3 sm:px-5 py-4 border-b border-amber-200">
      <div class="flex flex-col gap-3">
        <p class="text-sm text-stone-800"><b class="mr-1 px-1.5 py-0.5 rounded bg-stone-900 text-white text-xs">판단</b>${esc(it.verdict)}${it.note ? `<span class="block mt-1 text-xs text-amber-800">내부 대조 주의: ${esc(it.note)}</span>` : ''}</p>
        <dl class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">${meta.map(([l, v]) => `<div class="rounded-lg bg-white border border-stone-200 px-2.5 py-1.5"><dt class="text-[11px] font-bold text-stone-500">${l}</dt><dd class="text-xs font-bold text-stone-900 tabular-nums">${v}</dd></div>`).join('')}</dl>
        ${slips || recBox ? `<div class="grid grid-cols-1 lg:grid-cols-2 gap-3">${slips}${recBox}</div>` : ''}
        <div class="overflow-x-auto rounded-xl border border-stone-200 bg-white"><table class="w-full text-sm min-w-[1100px]"><thead><tr>
          <th class="${th} text-left">순위</th><th class="${th} text-left">업체</th><th class="${th} text-left">동일제품</th><th class="${th} text-right">표시가격 · 규격</th><th class="${th} text-right">원/kg</th><th class="${th} text-right">현재 대비<br>차액 원/kg</th><th class="${th} text-right">차액 1개월</th><th class="${th} text-right">3개월</th><th class="${th} text-right">6개월</th><th class="${th} text-right">12개월</th><th class="${th} text-left">확인·출처</th>
        </tr></thead><tbody>${baseRow(it)}${rows.map(vrow).join('')}</tbody></table></div>
      </div></td></tr>`;
  }
  function renderList() {
    const t = document.getElementById('pcList'); if (!t) return;
    const rows = pick();
    const c = document.getElementById('pcCnt'); if (c) c.textContent = rows.length + ' / ' + data.items.length + '품목';
    const head = `<thead><tr>
      <th rowspan="2" class="${th} text-center w-16">우선</th><th rowspan="2" class="${th} text-left">품목</th>
      <th colspan="4" class="${th} text-left bg-stone-100 text-stone-700 border-l border-stone-200">현재 — 바로가가 지금 받는 값</th>
      <th colspan="4" class="${th} text-left bg-amber-100 text-amber-900 border-l border-stone-200">1순위 후보</th>
      <th colspan="4" class="${th} text-left border-l border-stone-200">2순위 후보</th></tr><tr>
      <th class="${th} text-left border-l border-stone-200">거래처 · 단가</th><th class="${th} text-right">한 달 사용량</th><th class="${th} text-right">1년 사용량</th><th class="${th} text-right">한 달 금액</th>
      <th class="${th} text-left border-l border-stone-200">업체</th><th class="${th} text-right">단가 원/kg</th><th class="${th} text-right">월 차액</th><th class="${th} text-right">1년 절감</th>
      <th class="${th} text-left border-l border-stone-200">업체</th><th class="${th} text-right">단가 원/kg</th><th class="${th} text-right">월 차액</th><th class="${th} text-right">1년 절감</th></tr></thead>`;
    t.innerHTML = rows.length ? head + '<tbody>' + rows.map(itemRow).join('') + '</tbody>' : `<tbody><tr><td class="p-8 text-center text-sm text-stone-500">조건에 맞는 품목이 없습니다. 검색어를 지우거나 「전체」를 눌러 보세요.</td></tr></tbody>`;
    if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }
  }

  // ===== 2. 업체별 연락처 =====
  function paneCall() {
    return `<div class="${card}"><div class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-stone-200 bg-amber-50/40 rounded-t-2xl">${searchBox('pcCq', cq, '업체·품목 검색')}<span id="pcCcnt" class="text-xs font-bold text-stone-500"></span></div>
      ${hint('<span class="block px-4 pt-2">한 업체에 여러 품목을 묶어 한 번에 견적을 받습니다. 절감이 큰 업체가 위에 옵니다. 전화번호·메일 주소는 글자로 적혀 있어 길게 눌러 복사할 수 있습니다.</span>')}
      <div id="pcClist" class="p-3 grid grid-cols-1 lg:grid-cols-2 gap-3"></div></div>`;
  }
  function renderCalls() {
    const el = document.getElementById('pcClist'); if (!el) return;
    const rows = data.calls.filter((c) => !cq || (c.vendor + (c.items || []).map((i) => i.name).join(' ')).toLowerCase().includes(cq));
    document.getElementById('pcCcnt').textContent = rows.length + ' / ' + data.calls.length + '업체';
    el.innerHTML = rows.map((c) => { const f = absUrl(c.form, c.home); return `<div class="rounded-xl border border-stone-200 p-3 bg-white">
      <div class="flex flex-wrap items-start justify-between gap-2"><span class="flex flex-wrap items-center gap-1.5 font-extrabold text-stone-900">${c.home ? ext(c.home, esc(c.vendor)) : esc(c.vendor)} ${c.official ? pill('공식 경로', P.accent) : ''} ${Object.entries(c.grades || {}).map(([g, n]) => gp(g, ' ' + n)).join(' ')}</span>
        <span class="text-xs tabular-nums">${c.m12 < 0 ? `<b class="text-emerald-700">연 ${won(c.m12)}원</b> · ` : c.m12 > 0 ? `<b class="text-rose-600">연 ${won(c.m12)}원</b> · ` : ''}<span class="text-stone-500">품목 ${(c.items || []).length}개</span></span></div>
      <div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-700">${[c.phone && c.phone !== '—' && telTxt(c.phone), mailTxt(c.email), f && ext(f, '문의폼')].filter(Boolean).join('') || '<span class="text-stone-400">연락처 미확보</span>'}</div>
      <div class="mt-2 flex flex-wrap gap-1.5">${(c.items || []).slice().sort((a, b) => (b.m12 || 0) - (a.m12 || 0)).map((i) => `<span class="inline-flex flex-wrap items-center gap-1 px-2 py-1 rounded-lg bg-stone-50 border border-stone-200 text-xs">${gp(i.grade)} <b>${esc(i.name)}</b> <span class="text-stone-500 tabular-nums">${esc(i.spec)}${i.wkg ? ' · ' + won(i.wkg) + '원/kg' : ''}${i.m12 ? ' · 연 ' + sgn(i.m12) + '원' : ''}</span></span>`).join('')}</div>
    </div>`; }).join('') || '<div class="p-6 text-center text-sm text-stone-500">조건에 맞는 업체가 없습니다.</div>';
  }

  // ===== 3. 견적 메일 초안 =====
  function paneQuote() {
    const ns = data.quotes.filter((x) => x.source === 'sheet').length;
    return `<div class="${card}"><div class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-stone-200 bg-amber-50/40 rounded-t-2xl">${searchBox('pcQq', qq, '업체·품목·메일제목 검색')}
      <div class="flex flex-wrap gap-1.5">${[['sheet', '시트 ' + ns + '곳 원본'], ['auto', '자동초안'], ['all', '전체']].map(([k, l]) => `<button type="button" onclick="PriceCmp.setQf('${k}')" class="${chipCls(qf === k)}">${l}</button>`).join('')}</div><span id="pcQcnt" class="text-xs font-bold text-stone-500"></span></div>
      ${hint('<span class="block px-4 pt-2">본문 수량은 6~8월 평균×130%. 빈칸(연락처·상세주소)만 채우고 복사. 「타AI 기재」「자동초안」은 발송 전 전화 확인. 발송·회신은 이 화면이 아니라 시트/메일함에 기록.</span>')}
      <div id="pcQlist" class="p-3 flex flex-col gap-2"></div></div>`;
  }
  function renderQuotes() {
    const el = document.getElementById('pcQlist'); if (!el) return;
    let rows = data.quotes.map((c, i) => [c, i]);
    if (qf === 'sheet') rows = rows.filter(([x]) => x.source === 'sheet'); else if (qf === 'auto') rows = rows.filter(([x]) => x.source === 'auto');
    if (qq) rows = rows.filter(([x]) => (x.vendor + x.items + x.subject + (x.email || '')).toLowerCase().includes(qq));
    document.getElementById('pcQcnt').textContent = rows.length + '통';
    el.innerHTML = rows.map(([c, i]) => `<details class="rounded-xl border border-stone-200 bg-white">
      <summary class="px-3 py-2.5 cursor-pointer"><span class="inline-flex items-center gap-1.5 font-extrabold text-stone-900">${pill(c.source === 'sheet' ? '시트 원본' : '자동초안', c.source === 'sheet' ? P.save : P.accent)}${esc(c.vendor)}</span>
        <span class="block text-xs text-stone-600 mt-0.5">${esc(c.subject)}</span><span class="block text-[11px] text-stone-500">${esc(c.emailStatus)}</span></summary>
      <div class="px-3 pb-3 flex flex-col gap-2 border-t border-stone-100 pt-2">
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">${[c.home && ext(c.home, '홈페이지'), c.phone ? telTxt(c.phone) : '<span class="text-stone-400">전화 미확인</span>', c.email ? `<span class="select-all">${esc(c.email)}</span>` : '<span class="text-stone-400">메일 미확인</span>'].filter(Boolean).join('')}</div>
        <div class="text-xs text-stone-600">${esc(c.items)}</div>
        <div class="flex flex-wrap gap-1.5"><button type="button" data-q="${i}" data-k="subject" class="pc-copy px-2.5 py-1 rounded-lg border border-stone-200 text-xs font-bold hover:bg-stone-50 cursor-pointer">제목 복사</button><button type="button" data-q="${i}" data-k="body" class="pc-copy px-2.5 py-1 rounded-lg bg-stone-900 text-white text-xs font-bold cursor-pointer">본문 복사</button>${c.email ? `<button type="button" data-q="${i}" data-k="email" class="pc-copy px-2.5 py-1 rounded-lg border border-stone-200 text-xs font-bold hover:bg-stone-50 cursor-pointer">받는 주소 복사</button>` : ''}</div>
        <pre class="whitespace-pre-wrap text-xs leading-relaxed bg-stone-50 border border-stone-200 rounded-lg p-3 font-sans text-stone-800">${esc(c.body)}</pre>
      </div></details>`).join('') || '<div class="p-6 text-center text-sm text-stone-500">조건에 맞는 초안이 없습니다.</div>';
  }

  // ===== 4. 최근 재확인 =====
  function paneRecheck() {
    const rc = (data.sum || {}).recheck || {};
    return `<div class="${card}"><div class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-stone-200 bg-amber-50/40 rounded-t-2xl">${searchBox('pcRcq', rcq, '품목·업체 검색')}
      <select id="pcRcf" class="${input}"><option value="">전체</option>${Object.keys(RC_L).map((k) => `<option value="${k}" ${rcf === k ? 'selected' : ''}>${RC_L[k]}</option>`).join('')}</select><span id="pcRccnt" class="text-xs font-bold text-stone-500"></span></div>
      ${hint(`<span class="block px-4 pt-2">${esc(rc.date || '')} 재확인 · 원천 = 각 상품 페이지 표시가(메타태그·JSON-LD). 엑셀 「${esc(rc.sheet || '')}」 시트와 같은 대조표.</span>`)}
      <div class="overflow-x-auto p-1"><table id="pcRctable" class="w-full text-sm min-w-[1000px]"></table></div></div>`;
  }
  function renderRecheck() {
    const t = document.getElementById('pcRctable'); if (!t) return;
    const n = (v) => (v == null ? '' : Math.round(v).toLocaleString('ko-KR'));
    const ord = { apply: 0, review: 1, confirm: 2, none: 3 };
    const rows = data.recheck.filter((x) => (!rcf || x.act === rcf) && (!rcq || (x.name + ' ' + x.vendor + ' ' + x.code).toLowerCase().includes(rcq)))
      .sort((a, b) => (ord[a.act] ?? 9) - (ord[b.act] ?? 9) || Math.abs(b.pct || 0) - Math.abs(a.pct || 0));
    document.getElementById('pcRccnt').textContent = rows.length + ' / ' + data.recheck.length + '줄';
    const h = ['반영', '코드', '품목', '업체', '기록가', '읽은 가격', '변동', '원/kg 전→후', '순위 전→후', '재고', '판정', '링크'];
    const right = new Set([4, 5, 6, 7]);
    t.innerHTML = '<thead><tr>' + h.map((x, i) => `<th class="${th} ${right.has(i) ? 'text-right' : 'text-left'}">${x}</th>`).join('') + '</tr></thead><tbody>' + rows.map((x) => `<tr class="hover:bg-stone-50">
      <td class="${td}">${pill(RC_L[x.act] || esc(x.act), RC_P[x.act] || P.mute)}</td><td class="${td} tabular-nums text-xs">${esc(x.code)}</td><td class="${td} font-bold">${esc(x.name)}</td><td class="${td}">${esc(x.vendor)}</td>
      <td class="${td} text-right tabular-nums">${n(x.old)}</td><td class="${td} text-right tabular-nums">${n(x.new)}</td><td class="${td} text-right tabular-nums ${tone(x.pct)}">${x.pct == null ? '' : (x.pct > 0 ? '+' : '') + esc(x.pct) + '%'}</td>
      <td class="${td} text-right tabular-nums">${x.wkg1 != null ? n(x.wkg0) + '→' + n(x.wkg1) : ''}</td><td class="${td} tabular-nums">${x.r0 !== x.r1 ? esc(x.r0 || '-') + '→' + esc(x.r1 || '-') : ''}</td>
      <td class="${td} text-xs">${esc(x.stock || x.avail || '')}</td><td class="${td} text-xs">${esc(x.judge)}</td><td class="${td}">${safeUrl(x.url) ? ext(x.url, '열기') : ''}</td></tr>`).join('') + '</tbody>';
  }

  // ===== 5~6. 원본 표 (1순위 요약 · 전품목 차액) =====
  function sheetTable(cols, rows, isN, isS) {
    const head = '<thead><tr>' + cols.map(([k, l]) => `<th class="${th} ${isN(k) ? 'text-right' : 'text-left'}">${esc(l)}</th>`).join('') + '</tr></thead>';
    const body = rows.map((r) => '<tr class="hover:bg-stone-50">' + cols.map(([k]) => {
      const v = r[k];
      if (isN(k)) return `<td class="${td} text-right tabular-nums">${isS(k) ? `<span class="${tone(v)}">${sgn(v)}</span>` : won(v)}</td>`;
      const wide = k === '판단' || k === '다음 행동' || k.startsWith('전체 순위');
      return `<td class="${td} ${k === '품목명' ? 'font-bold' : ''} ${wide ? 'min-w-[260px] text-xs' : ''} whitespace-pre-line">${esc(v)}</td>`;
    }).join('') + '</tr>').join('');
    return head + '<tbody>' + body + '</tbody>';
  }
  function paneSum1() {
    const cols = [['사용금액 순위', '순위'], ['품목코드', '코드'], ['품목명', '품목'], ['현재 거래처', '현재 거래처'], ['현재 원/kg', '현재 원/kg'], ['1순위 업체(클릭)', '1순위 업체'], ['1순위 원/kg(표시가)', '1순위 원/kg'], ['차액 원/kg (후보−현재, +비쌈/−쌈)', '차액/kg'], ['월 차액 (+추가비용/−절감)', '월 차액'], ['12개월 차액', '12개월'], ['판단', '판단']];
    return `<div class="${card}">${hint('<span class="block px-4 pt-3">시트 「품목별_1순위요약」 원문. 차액 부호 +비쌈 / −쌈. 월 사용금액은 130% 책정. 이 표의 현재 단가는 시트 작성 당시 값입니다 — 입고 전표로 바로잡은 값은 「품목별 비교」 탭을 보십시오.</span>')}
      <div class="overflow-x-auto p-1 mt-2"><table class="w-full text-sm min-w-[1100px]">${sheetTable(cols, data.summary, (k) => k.includes('차액') || k.includes('원/kg') || k.includes('월 사용'), (k) => k.includes('차액'))}</table></div></div>`;
  }
  function paneDiff() {
    return `<div class="${card}"><div class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-stone-200 bg-amber-50/40 rounded-t-2xl">${searchBox('pcDq', dq, '품목·코드 검색')}<span id="pcDcnt" class="text-xs font-bold text-stone-500"></span></div>
      ${hint('<span class="block px-4 pt-2">시트 「전품목_125_차액추정」 원문. 가정 5% 협상액은 견적 전 참고값. 이 표의 현재 단가는 시트 작성 당시 값입니다 — 입고 전표로 바로잡은 값은 「품목별 비교」 탭을 보십시오.</span>')}
      <div class="overflow-x-auto p-1 mt-1"><table id="pcDifftable" class="w-full text-sm min-w-[1400px]"></table></div></div>`;
  }
  function renderDiffs() {
    const t = document.getElementById('pcDifftable'); if (!t) return;
    const rows = data.diffs.filter((r) => !dq || (String(r['품목명'] || '') + String(r['품목코드'] || '')).toLowerCase().includes(dq));
    document.getElementById('pcDcnt').textContent = rows.length + ' / ' + data.diffs.length;
    const cols = [['순위(월 사용금액 기준)', '순위'], ['품목코드', '코드'], ['품목명', '품목'], ['입고처', '입고처'], ['현재 원/kg', '현재 원/kg'], ['현재 매입기준 월 사용금액(130% 책정)', '월 사용(130%)'], ['조사 상태', '상태'], ['조사 1순위 후보', '1순위'], ['1순위 원/kg(표시가)', '1순위 원/kg'], ['차액 원/kg (후보−현재, +비쌈/−쌈)', '차액/kg'], ['조사기준 월 차액 (+추가비용/−절감)', '월 차액'], ['12개월 차액', '12개월'], ['가정 5% 협상 절감: 1개월', '가정5% 월'], ['다음 행동', '다음 행동']];
    t.innerHTML = sheetTable(cols, rows, (k) => k.includes('차액') || k.includes('원/kg') || k.includes('사용금액') || k.includes('절감'), (k) => k.includes('차액') || k.includes('절감'));
  }

  // ===== 7. 거래처 전체 =====
  function paneVend() {
    return `<div class="${card}"><div class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-stone-200 bg-amber-50/40 rounded-t-2xl">${searchBox('pcVq', vq, '업체·품목 검색')}<span id="pcVcnt" class="text-xs font-bold text-stone-500"></span></div>
      <div id="pcVlist" class="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"></div></div>`;
  }
  function renderVendors() {
    const el = document.getElementById('pcVlist'); if (!el) return;
    const rows = data.vendors.filter((v) => !vq || (String(v['업체'] || '') + String(v['취급(조사) 품목'] || '')).toLowerCase().includes(vq));
    document.getElementById('pcVcnt').textContent = rows.length + ' / ' + data.vendors.length + '곳';
    el.innerHTML = rows.map((v) => { const ok = v['연락처 확보']; return `<div class="rounded-xl border border-stone-200 p-3 bg-white">
      <div class="flex flex-wrap items-center gap-1.5 font-extrabold text-stone-900">${v['홈페이지/출처(클릭)'] ? ext(v['홈페이지/출처(클릭)'], esc(v['업체'])) : esc(v['업체'])} ${pill(esc(v['구분']), P.accent)} ${pill(esc(ok), ok === '내부' ? P.mute : ok === '미확인' ? P.warn : P.save)}</div>
      <div class="mt-1 flex flex-wrap gap-x-3 text-xs text-stone-700">${[v['전화'] && telTxt(v['전화']), v['이메일·문의'] && `<span class="select-all">${esc(v['이메일·문의'])}</span>`].filter(Boolean).join('') || '<span class="text-stone-400">연락처 미확보</span>'}</div>
      <div class="mt-1 text-xs text-stone-500">${esc(v['역할·근거'])}</div>
      <div class="mt-2 text-xs text-stone-700 whitespace-pre-line bg-stone-50 rounded-lg p-2 border border-stone-100">${esc(v['취급(조사) 품목'])}</div>
    </div>`; }).join('') || '<div class="p-6 text-center text-sm text-stone-500">조건에 맞는 거래처가 없습니다.</div>';
  }

  // ===== 8. 인계서 (마크다운 → 화면) =====
  function inlineMd(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code class="px-1 rounded bg-stone-100 text-[12px]">$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(https?:\/\/[^\s<)]+)/g, (u) => `<a href="${u}" target="_blank" rel="noopener" class="text-amber-800 underline break-all">${u}</a>`);
  }
  function mdToHtml(md) {
    const L = String(md || '').split('\n'); const out = []; let i = 0;
    while (i < L.length) {
      const l = L[i];
      if (/^\s*$/.test(l)) { i++; continue; }
      if (/^---+\s*$/.test(l)) { out.push('<hr class="my-4 border-stone-200">'); i++; continue; }
      let m = /^(#{1,4})\s+(.*)$/.exec(l);
      if (m) { const lv = m[1].length; out.push(`<h${lv + 1} class="${lv === 1 ? 'text-lg' : lv === 2 ? 'text-base mt-2' : 'text-sm'} font-extrabold text-stone-900 mb-1">${inlineMd(m[2])}</h${lv + 1}>`); i++; continue; }
      if (/^\|/.test(l)) {
        const rows = []; while (i < L.length && /^\|/.test(L[i])) { rows.push(L[i]); i++; }
        const cells = (r) => r.replace(/^\||\|\s*$/g, '').split('|').map((c) => c.trim());
        const body = rows.filter((r) => !/^\|[\s:|-]+\|?\s*$/.test(r));
        out.push(`<div class="overflow-x-auto my-2"><table class="text-xs border border-stone-200">${body.map((r, k) => `<tr>${cells(r).map((c) => k === 0 ? `<th class="${th} text-left">${inlineMd(c)}</th>` : `<td class="px-2 py-1.5 border-b border-stone-100 align-top">${inlineMd(c)}</td>`).join('')}</tr>`).join('')}</table></div>`);
        continue;
      }
      if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
        const ordered = /^\s*\d+\./.test(l); const items = [];
        while (i < L.length && /^\s*([-*]|\d+\.)\s+/.test(L[i])) {
          let t = L[i].replace(/^\s*([-*]|\d+\.)\s+/, ''); i++;
          while (i < L.length && /^\s{2,}\S/.test(L[i]) && !/^\s*([-*]|\d+\.)\s+/.test(L[i])) { t += ' ' + L[i].trim(); i++; }
          items.push(t);
        }
        out.push(`<${ordered ? 'ol' : 'ul'} class="${ordered ? 'list-decimal' : 'list-disc'} pl-5 my-1.5 space-y-0.5">${items.map((t) => `<li>${inlineMd(t)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);
        continue;
      }
      const para = []; while (i < L.length && L[i].trim() && !/^(#{1,4}\s|---|\||\s*([-*]|\d+\.)\s)/.test(L[i])) { para.push(L[i]); i++; }
      out.push(`<p class="my-1.5">${para.map(inlineMd).join('<br>')}</p>`);
    }
    return out.join('');
  }
  function paneHand() {
    return `<div class="${card} p-5 sm:p-7"><div class="max-w-4xl text-sm text-stone-800 leading-relaxed">${data.hand ? mdToHtml(data.hand) : '<p class="text-stone-500">인계서 내용이 없습니다.</p>'}</div></div>`;
  }

  // ---------- 이벤트 (검색칸은 표만 다시 그려 입력이 끊기지 않게) ----------
  function copyTo(btn, text) {
    const label = btn.dataset.label || btn.textContent; btn.dataset.label = label;
    const done = () => { btn.textContent = '복사됨'; setTimeout(() => { btn.textContent = label; }, 1400); };
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove(); if (ok) done(); else toast('복사하지 못했습니다. 길게 눌러 직접 복사해 주세요.', 'error'); };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('#priceCompareRoot .pc-copy'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.dataset.q != null) { const c = data.quotes[Number(b.dataset.q)] || {}; copyTo(b, c[b.dataset.k] || ''); } else copyTo(b, b.dataset.copy || '');
  });
  document.addEventListener('input', (e) => {
    const id = e.target && e.target.id; const v = String(e.target.value || '').trim().toLowerCase();
    if (id === 'pcQ') { q = v; renderList(); } else if (id === 'pcCq') { cq = v; renderCalls(); } else if (id === 'pcQq') { qq = v; renderQuotes(); }
    else if (id === 'pcRcq') { rcq = v; renderRecheck(); } else if (id === 'pcDq') { dq = v; renderDiffs(); } else if (id === 'pcVq') { vq = v; renderVendors(); }
  });
  document.addEventListener('change', (e) => { if (e.target && e.target.id === 'pcRcf') { rcf = e.target.value; renderRecheck(); } });

  function setView(v) { view = v; render(); window.scrollTo(0, 0); }
  function setFilter(f) { filt = f; render(); }
  function setQf(f) { qf = f; render(); }
  function toggle(code, ev) { if (ev && ev.target.closest('a,button,summary,details')) return; open.has(code) ? open.delete(code) : open.add(code); renderList(); }
  function openItem(code) {
    q = ''; filt = 'merit'; open.add(code); render();
    const el = document.querySelector(`#pcList tr[data-code="${CSS.escape(code)}"]`); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function expandAll() { pick().forEach((i) => open.add(i.code)); renderList(); }
  function collapseAll() { open.clear(); renderList(); }

  let first = true;
  function mount() {
    render();
    if (first && getUrl() && !loaded && !loading) { first = false; pull(false); }
  }

  window.PriceCmp = { mount, pull, pickFile, saveImport, openDbModal, saveDbUrl, closeModal, setView, setFilter, setQf, toggle, openItem, expandAll, collapseAll };
})();
