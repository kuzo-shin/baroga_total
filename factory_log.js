// [VERSION: factory_log.js v1.7 - 2026-11-27 작성·수정한 사람을 이름으로 표시 / v1.6 - 2026-11-27 위 카드를 반으로: 왼쪽 미완료 일감(노랑), 오른쪽 완료된 일감(초록, 보고 있는 달력 기간) / v1.5 - 2026-11-27 달력 토·일 열을 좁게, 월~금을 넓게 / v1.4 - 2026-11-27 이름 바꿈(미완료 일감·완료된 일감·미완료 일감 체크리스트) · 미완료 일감 체크리스트를 달력 위로 / v1.3 - 2026-11-27 담당자는 직접 입력만, 일지 창 키움(일어난 일·사후 대처 칸 크게), 달력 막대 앞 색 띠 없앰 / v1.2 - 2026-11-27 접속 코드 대신 로그인(Cloudflare Access) · 새 주소에서만 동작 · 작성자/수정자 표시 / v1.1 - 2026-11-27 서버 기본 주소를 실제 만든 Worker(baroga-total)로 / v1.0 - 2026-11-27 신규: 공장 일지(달력 · 일어난 일/사후 대처 · 담당자 · 체크리스트 · 사진), DB는 Cloudflare(D1 + R2)]
// ============================================================================
// 바로가 공장 통합 관리 시스템 - 공장 일지 (factory_log.js)
//  - 생산과 상관없이 공장에서 있었던 일(기계 고장·수리, 누수 등)을 달력에 기록
//  - 달력: 월~일, 일지 한 건 = 시작일~종료일 막대 하나(제목만). 날짜 칸을 누르면 새 일지, 막대를 누르면 내용
//  - 일지 한 건: 제목 · 기간 · 담당자(여러 명) · 일어난 일 · 사후 대처 · 체크리스트 · 사진
//  - 담당자: 직접 입력 (v1.3 — 명단 고르기 없앰)
//  - 저장: 일지 창의 [저장]을 누르면 그 일지 한 건이 바로 DB에 올라감 (자동 저장 없음)
//  - DB: Cloudflare Worker(cloud/src/index.js) — 글은 D1, 사진은 R2. 다른 메뉴의 구글 시트 DB와 따로
//  - 로그인: Cloudflare Access(허용한 구글 계정). 화면과 서버가 같은 주소라 따로 코드를 보내지 않음
//            옛 주소(github.io)에서는 로그인을 확인할 수 없어 이 메뉴가 동작하지 않고, 새 주소 안내만 보임
//  - 사진은 올리기 전에 긴 변 2000px JPG로 줄임(촬영 위치 같은 사진 속 정보도 빠짐)
// ============================================================================
(function () {
  'use strict';
  const CLOUD_SITE = 'https://baroga-total.kuzo0909.workers.dev'; // 새 주소 (로그인 필요)
  // 서버 주소: 새 주소에서 열었으면 같은 주소(''), 옛 주소(github.io)면 쓸 수 없음(null). 시험할 때만 window.BAROGA_CLOUD_API 로 지정
  const API_BASE = typeof window.BAROGA_CLOUD_API === 'string' ? window.BAROGA_CLOUD_API.replace(/\/+$/, '') : (/(^|\.)github\.io$/i.test(location.hostname) || location.protocol === 'file:' ? null : '');
  const PHOTO_MAX = 20, PHOTO_EDGE = 2000, PHOTO_Q = 0.85;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, t) => (typeof window.showToast === 'function' ? window.showToast(m, t) : alert(m));
  const nowHm = () => (typeof window.barogaNowHm === 'function' ? window.barogaNowHm() : new Date().toTimeString().slice(0, 5));
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateOf = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = dateOf(s); d.setDate(d.getDate() + n); return ymd(d); };
  const md = (s) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
  const today = () => ymd(new Date());
  const uid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const BTN = 'flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition cursor-pointer whitespace-nowrap';
  const BTN_DARK = 'flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-extrabold bg-stone-900 hover:bg-stone-800 text-white transition cursor-pointer whitespace-nowrap';
  const INPUT = 'w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:outline-none';
  const LABEL = 'block text-xs font-extrabold text-stone-600 mb-1';

  let ym = today().slice(0, 7), logs = [], openLogs = [], loaded = false, loading = false, mounted = false, statusText = '불러오기 전', lastError = '';
  let cur = null, curSaved = '', newPhotos = [], delPhotos = [], busy = false;
  const photoUrl = new Map(); // 사진 id → 화면에 쓸 주소(내려받은 사진)

  const root = () => document.getElementById('factoryLogRoot');
  let me = '';
  function setStatus(t) { statusText = t; const el = document.getElementById('flStatusText'); if (el) el.textContent = t; }

  // ---------- 서버 ----------
  async function api(method, path, opt) {
    opt = opt || {};
    if (API_BASE === null) throw new Error('공장 일지는 새 주소에서만 쓸 수 있습니다');
    const headers = {};
    let body;
    if (opt.blob) { body = opt.blob; headers['Content-Type'] = opt.type || 'image/jpeg'; }
    else if (opt.json !== undefined) { body = JSON.stringify(opt.json); headers['Content-Type'] = 'application/json'; }
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), opt.timeout || 30000);
    let res;
    try { res = await fetch(API_BASE + path, { method, headers, body, signal: ctl.signal, credentials: 'same-origin' }); }
    catch (e) { throw new Error(e.name === 'AbortError' ? '서버 응답이 너무 늦습니다' : '서버에 연결하지 못했습니다. 로그인이 끝났을 수 있으니 화면을 새로고침해 주세요'); }
    finally { clearTimeout(timer); }
    if (opt.asBlob && res.ok) return await res.blob();
    let j = null; try { j = await res.json(); } catch (e) {}
    if (res.status === 401 || (!j && res.ok)) { const e = new Error('로그인이 필요합니다. 화면을 새로고침해 다시 로그인해 주세요'); e.unauthorized = true; throw e; }
    if (!res.ok || !j || j.ok === false) { const e = new Error((j && j.error) || `서버 응답 오류 (HTTP ${res.status})`); e.status = res.status; e.data = j; throw e; }
    return j;
  }
  function range() { // 달력에 보이는 첫 월요일 ~ 마지막 일요일
    const first = dateOf(ym + '-01'), last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const from = addDays(ymd(first), -((first.getDay() + 6) % 7)), to = addDays(ymd(last), (7 - last.getDay()) % 7);
    return { from, to };
  }
  async function pull(showMsg) {
    if (loading) return;
    if (API_BASE === null) { loaded = false; lastError = ''; setStatus('새 주소에서 사용'); render(); return; }
    loading = true; lastError = ''; setStatus('불러오는 중...');
    try {
      if (!me) { try { me = (await api('GET', '/api/me')).email || ''; } catch (e) { if (e.unauthorized) throw e; } }
      const r = range(), j = await api('GET', `/api/factory-log?from=${r.from}&to=${r.to}`);
      logs = j.logs || []; openLogs = j.open || []; loaded = true;
      setStatus(`불러옴 ${nowHm()} · 이 달 ${logs.length}건`);
      if (showMsg) toast('공장 일지를 불러왔습니다.', 'success');
    } catch (e) {
      loaded = false; lastError = e.message; setStatus('불러오기 실패');
      toast('공장 일지 불러오기 실패: ' + e.message, 'error');
    } finally { loading = false; render(); }
  }

  // ---------- 달력 ----------
  const openCount = (l) => (l.checklist || []).filter((c) => !c.done).length;
  // 달력 열 너비 (v1.5): 월~금 넓게, 토·일(업무 없음)은 좁게. 막대가 주말에 걸쳐도 이어지도록 7열은 그대로 둠
  const COLS = 'repeat(5, minmax(0, 1fr)) minmax(56px, 0.32fr) minmax(56px, 0.32fr)';
  const who = (email) => { try { return window.Perms && window.Perms.nameOf ? window.Perms.nameOf(email) : email; } catch (e) { return email; } }; // 권한 관리에 적은 이름
  function tone(l) { // 막대 색: 체크리스트가 남음 = 노랑, 다 끝남 = 초록, 체크리스트 없음 = 회색
    const n = (l.checklist || []).length, o = openCount(l);
    if (n && o) return { bar: 'bg-amber-100 border-amber-500 text-amber-950 hover:bg-amber-200', dot: 'bg-amber-500' };
    if (n) return { bar: 'bg-emerald-100 border-emerald-600 text-emerald-950 hover:bg-emerald-200', dot: 'bg-emerald-600' };
    return { bar: 'bg-stone-100 border-stone-500 text-stone-900 hover:bg-stone-200', dot: 'bg-stone-500' };
  }
  function weekHtml(ws) {
    const we = addDays(ws, 6), t = today(), monthNo = Number(ym.slice(5, 7));
    const list = logs.filter((l) => l.end >= ws && l.start <= we).sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end) || String(a.createdAt).localeCompare(String(b.createdAt)));
    const lanes = []; // 줄마다 마지막으로 쓴 칸
    const bars = list.map((l) => {
      const s = l.start < ws ? 0 : Math.round((dateOf(l.start) - dateOf(ws)) / 86400000), e = l.end > we ? 6 : Math.round((dateOf(l.end) - dateOf(ws)) / 86400000);
      let lane = lanes.findIndex((end) => end < s); if (lane < 0) { lane = lanes.length; lanes.push(e); } else lanes[lane] = e;
      const T = tone(l), n = (l.checklist || []).length, cl = l.start < ws, cr = l.end > we, ph = (l.photos || []).length;
      return `<button type="button" onclick="FactoryLog.open('${esc(l.id)}')" title="${esc(l.title)}${l.start !== l.end ? ` (${md(l.start)}~${md(l.end)})` : ''}" style="grid-column:${s + 1} / span ${e - s + 1};grid-row:${lane + 2}" class="z-10 h-[22px] flex items-center gap-1.5 px-2 text-xs font-bold cursor-pointer min-w-0 text-left ${T.bar} ${cl ? 'ml-0' : 'ml-1 rounded-l-md'} ${cr ? 'mr-0' : 'mr-1 rounded-r-md'}"><span class="truncate">${esc(l.title)}</span>${n ? `<span class="ml-auto shrink-0 tabular-nums opacity-70">${n - openCount(l)}/${n}</span>` : ''}${ph ? `<i data-lucide="image" class="w-3 h-3 shrink-0 opacity-60 ${n ? '' : 'ml-auto'}"></i>` : ''}</button>`;
    }).join('');
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = addDays(ws, i), out = Number(d.slice(5, 7)) !== monthNo, isT = d === t, col = i === 6 ? 'text-rose-600' : i === 5 ? 'text-blue-600' : 'text-stone-700';
      return `<button type="button" onclick="FactoryLog.newAt('${d}')" title="${md(d)} 일지 쓰기" style="grid-column:${i + 1};grid-row:1 / -1" class="group flex flex-col justify-start items-stretch text-left p-1.5 cursor-pointer ${i < 6 ? 'border-r border-stone-100' : ''} ${out ? 'bg-stone-50/70' : i >= 5 ? 'bg-stone-50/50' : 'bg-white'} hover:bg-amber-50/60"><span class="flex items-start justify-between"><span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-extrabold ${isT ? 'bg-stone-900 text-white' : col} ${out && !isT ? 'opacity-40' : ''}">${Number(d.slice(8, 10))}</span><i data-lucide="plus" class="w-3.5 h-3.5 text-stone-300 opacity-0 group-hover:opacity-100"></i></span></button>`;
    }).join('');
    const L = lanes.length;
    return `<div class="grid border-b border-stone-200 last:border-b-0" style="grid-template-columns:${COLS};grid-template-rows:32px ${L ? `repeat(${L}, 25px) ` : ''}minmax(${Math.max(10, 80 - L * 25)}px, 1fr)">${days}${bars}</div>`;
  }
  function calendarHtml() {
    const r = range(), weeks = []; for (let d = r.from; d <= r.to; d = addDays(d, 7)) weeks.push(d);
    const head = ['월', '화', '수', '목', '금', '토', '일'].map((w, i) => `<div class="py-2 text-center text-xs font-extrabold ${i === 6 ? 'text-rose-600' : i === 5 ? 'text-blue-600' : 'text-stone-600'}">${w}</div>`).join('');
    return `<div class="overflow-x-auto"><div class="min-w-[760px] rounded-2xl border border-stone-200 overflow-hidden bg-white"><div class="grid bg-stone-100 border-b border-stone-200" style="grid-template-columns:${COLS}">${head}</div>${weeks.map(weekHtml).join('')}</div></div>`;
  }
  function openListHtml() {
    if (!openLogs.length) return '<div class="py-5 text-center text-sm text-stone-400">미완료 일감 체크리스트가 없습니다.</div>';
    return `<div class="flex flex-col gap-1.5">${openLogs.map((l) => { const left = (l.checklist || []).filter((c) => !c.done); return `<button type="button" onclick="FactoryLog.open('${esc(l.id)}')" class="w-full text-left rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 px-3 py-2 cursor-pointer"><div class="flex flex-wrap items-center gap-x-2 gap-y-0.5"><span class="text-xs font-bold text-stone-500 tabular-nums whitespace-nowrap">${l.start === l.end ? esc(l.start) : `${esc(l.start)} ~ ${md(l.end)}`}</span><b class="text-sm text-stone-900">${esc(l.title)}</b>${(l.assignees || []).length ? `<span class="text-xs text-stone-500">${esc(l.assignees.join(', '))}</span>` : ''}<span class="ml-auto text-xs font-extrabold text-amber-800 whitespace-nowrap">남은 일 ${left.length}개</span></div><div class="mt-1 text-xs text-stone-700">${left.map((c) => `<span class="inline-block mr-3">☐ ${esc(c.text)}</span>`).join('')}</div></button>`; }).join('')}</div>`;
  }
  // 완료된 일감: 보고 있는 달력 기간에 불러온 일지 중 체크리스트가 있고 모두 끝난 것 (최근 완료 순)
  function doneLogs() {
    return logs.filter((l) => (l.checklist || []).length && !(l.checklist || []).some((c) => !c.done))
      .map((l) => ({ l, at: (l.checklist || []).reduce((m, c) => (c.doneAt && c.doneAt > m ? c.doneAt : m), '') }))
      .sort((a, b) => (b.at || b.l.end).localeCompare(a.at || a.l.end)).map((x) => ({ ...x.l, doneAt: x.at }));
  }
  function doneListHtml(list) {
    if (!list.length) return '<div class="py-5 text-center text-sm text-stone-400">이 달력 기간에 완료된 일감이 없습니다.</div>';
    return `<div class="flex flex-col gap-1.5">${list.map((l) => `<button type="button" onclick="FactoryLog.open('${esc(l.id)}')" class="w-full text-left rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 px-3 py-2 cursor-pointer"><div class="flex flex-wrap items-center gap-x-2 gap-y-0.5"><span class="text-xs font-bold text-stone-500 tabular-nums whitespace-nowrap">${l.start === l.end ? esc(l.start) : `${esc(l.start)} ~ ${md(l.end)}`}</span><b class="text-sm text-stone-900">${esc(l.title)}</b>${(l.assignees || []).length ? `<span class="text-xs text-stone-500">${esc(l.assignees.join(', '))}</span>` : ''}<span class="ml-auto text-xs font-extrabold text-emerald-800 whitespace-nowrap">${(l.checklist || []).length}개 완료${l.doneAt ? ` · ${md(l.doneAt)}` : ''}</span></div><div class="mt-1 text-xs text-stone-500">${(l.checklist || []).map((c) => `<span class="inline-block mr-3">☑ ${esc(c.text)}</span>`).join('')}</div></button>`).join('')}</div>`;
  }
  let pendingRender = false;
  function render() {
    const el = root(); if (!el) return;
    // 일지 창이 열려 있으면 뒤 화면을 다시 그리지 않음(쓰던 칸의 커서가 풀리지 않게). 창을 닫을 때 그림
    const mh = document.getElementById('flModal'); if (cur && mh && mh.firstChild) { pendingRender = true; return; } pendingRender = false;
    const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)), ok = loaded && !lastError;
    const badge = loading || API_BASE === null ? 'bg-amber-50 text-amber-900 border-amber-200' : ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100';
    const guide = API_BASE === null
      ? `<div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><b>공장 일지는 새 주소에서만 쓸 수 있습니다.</b> 허용한 구글 계정으로 로그인해야 열리는 주소입니다.<div class="mt-1.5"><a href="${CLOUD_SITE}" class="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-extrabold bg-stone-900 hover:bg-stone-800 text-white">새 주소로 가기 → <span class="font-mono font-semibold opacity-80">${esc(CLOUD_SITE.replace('https://', ''))}</span></a></div></div>`
      : !loading && lastError ? `<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"><b>공장 일지 DB에 연결하지 못했습니다.</b> ${esc(lastError)}</div>` : '';
    el.innerHTML = `
      <div class="bg-stone-100/90 border-b border-stone-200"><div class="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-baseline gap-x-2"><h2 class="text-base font-extrabold text-stone-900">공장 일지</h2><span class="text-xs text-stone-500">기계 고장·수리, 누수처럼 공장에서 있었던 일 · 일지마다 [저장]을 누르면 DB에 올라갑니다</span></div>
        <div class="flex items-center gap-2">
          <span title="공장 일지 DB: Cloudflare (글 D1 · 사진 R2)${me ? ' · 로그인 ' + esc(me) : ''}" class="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold border whitespace-nowrap ${badge.replace(/hover:\S+/g, '')}"><span class="w-1.5 h-1.5 rounded-full ${loading || API_BASE === null ? 'bg-amber-500' : ok ? 'bg-emerald-500' : 'bg-rose-500'}"></span><span id="flStatusText">${esc(statusText)}</span></span>${me ? `<span class="hidden md:inline text-xs text-stone-500 whitespace-nowrap">${esc(me)}</span>` : ''}
          <button type="button" onclick="FactoryLog.pull(true)" title="새로 불러오기" class="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 cursor-pointer"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button>
        </div>
      </div></div>
      <div class="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3">
        ${guide}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div class="bg-white rounded-2xl border border-amber-200 shadow-xs p-4">
            <div class="flex items-center gap-2 mb-2.5"><h3 class="text-base font-extrabold text-amber-900">미완료 일감 체크리스트 <span class="text-xs font-bold text-stone-500">(${openLogs.length}건 · 날짜와 상관없이 모두)</span></h3></div>
            ${loaded ? openListHtml() : '<div class="py-5 text-center text-sm text-stone-400">불러온 뒤에 보입니다.</div>'}
          </div>
          <div class="bg-white rounded-2xl border border-emerald-200 shadow-xs p-4">
            <div class="flex items-center gap-2 mb-2.5"><h3 class="text-base font-extrabold text-emerald-900">완료된 일감 <span class="text-xs font-bold text-stone-500">(${loaded ? doneLogs().length : 0}건 · 아래 달력 기간)</span></h3></div>
            ${loaded ? doneListHtml(doneLogs()) : '<div class="py-5 text-center text-sm text-stone-400">불러온 뒤에 보입니다.</div>'}
          </div>
        </div>
        <div class="bg-white rounded-2xl border border-stone-200 shadow-xs p-4">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <button type="button" onclick="FactoryLog.move(-1)" title="이전 달" class="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 cursor-pointer"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
            <h3 class="text-lg font-extrabold text-stone-900 min-w-[150px] text-center tabular-nums">${y}년 ${m}월</h3>
            <button type="button" onclick="FactoryLog.move(1)" title="다음 달" class="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 cursor-pointer"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
            <button type="button" onclick="FactoryLog.goToday()" class="${BTN}">이번 달</button>
            <span class="hidden sm:flex items-center gap-3 ml-2 text-xs text-stone-500"><span class="flex items-center gap-1"><i class="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500"></i>미완료 일감</span><span class="flex items-center gap-1"><i class="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-600"></i>완료된 일감</span><span class="flex items-center gap-1"><i class="inline-block w-2.5 h-2.5 rounded-sm bg-stone-500"></i>체크리스트 없음</span></span>
            <button type="button" onclick="FactoryLog.newAt()" class="${BTN_DARK} ml-auto"><i data-lucide="plus" class="w-3.5 h-3.5"></i>새 일지</button>
          </div>
          ${calendarHtml()}
          <div class="mt-2 text-xs text-stone-500">날짜 칸을 누르면 그날 일지를 새로 쓰고, 막대를 누르면 내용을 보고 고칩니다.</div>
        </div>
      </div>
      <div id="flModal"></div><div id="flViewer"></div>`;
    if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }
    if (cur) renderEditor();
  }

  // ---------- 일지 창 ----------
  const snap = () => JSON.stringify([cur, newPhotos.map((p) => p.tmp), delPhotos]);
  const isDirty = () => !!cur && snap() !== curSaved;
  function startEdit(l) {
    cur = { id: l.id || '', rev: l.rev || 0, by: l.id ? [who(l.createdBy || ''), who(l.updatedBy || ''), String(l.createdAt || '').slice(0, 10), String(l.updatedAt || '').slice(0, 10)] : null, start: l.start, end: l.end, title: l.title || '', happened: l.happened || '', action: l.action || '', assignees: (l.assignees || []).slice(), checklist: (l.checklist || []).map((c) => Object.assign({}, c)), photos: (l.photos || []).slice() };
    newPhotos.forEach((p) => { try { URL.revokeObjectURL(p.url); } catch (e) {} }); newPhotos = []; delPhotos = []; curSaved = snap(); busy = false; renderEditor();
  }
  function newAt(d) { if (API_BASE === null) { toast('공장 일지는 새 주소에서만 쓸 수 있습니다.', 'error'); return; } if (cur && isDirty() && !confirm('쓰던 일지가 저장되지 않았습니다. 버리고 새로 쓸까요?')) return; const day = d || (today().slice(0, 7) === ym ? today() : ym + '-01'); startEdit({ start: day, end: day }); setTimeout(() => { const t = document.getElementById('flTitle'); if (t) t.focus(); }, 30); }
  function open(id) { const l = logs.find((x) => x.id === id) || openLogs.find((x) => x.id === id); if (!l) return; if (cur && isDirty() && !confirm('쓰던 일지가 저장되지 않았습니다. 버리고 이 일지를 열까요?')) return; startEdit(l); }
  function close(force) { if (!cur) return; if (busy) return; if (!force && isDirty() && !confirm('저장하지 않은 내용이 있습니다. 닫을까요?')) return; newPhotos.forEach((p) => { try { URL.revokeObjectURL(p.url); } catch (e) {} }); cur = null; newPhotos = []; delPhotos = []; const h = document.getElementById('flModal'); if (h) h.innerHTML = ''; if (pendingRender) render(); }

  function assigneesHtml() {
    const chips = cur.assignees.map((n, i) => `<span class="inline-flex items-center gap-1 pl-2.5 pr-1 h-7 rounded-lg bg-stone-900 text-white text-xs font-bold">${esc(n)}<button type="button" onclick="FactoryLog.removeAssignee(${i})" title="빼기" class="w-5 h-5 inline-flex items-center justify-center rounded hover:bg-white/20 cursor-pointer">×</button></span>`).join('');
    return `<div class="flex flex-wrap items-center gap-1.5">${chips || '<span class="text-xs text-stone-400">지정한 담당자가 없습니다.</span>'}</div>
      <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
        <input id="flAssigneeIn" type="text" maxlength="30" placeholder="담당자 이름 입력 후 Enter" onkeydown="if(event.key==='Enter'){event.preventDefault();FactoryLog.addAssignee(this.value);}" class="border border-stone-300 rounded-lg px-2.5 h-8 text-xs w-52">
        <button type="button" onclick="FactoryLog.addAssignee(document.getElementById('flAssigneeIn').value)" class="${BTN} !h-8">추가</button>
      </div>`;
  }
  function checklistHtml() {
    const rows = cur.checklist.map((c, i) => `<div class="flex items-center gap-2 py-1 border-b border-stone-100"><input type="checkbox" ${c.done ? 'checked' : ''} onchange="FactoryLog.toggleItem(${i}, this.checked)" class="w-4 h-4 accent-emerald-600 cursor-pointer shrink-0"><input type="text" value="${esc(c.text)}" maxlength="200" oninput="FactoryLog.setItem(${i}, this.value)" class="flex-1 min-w-0 bg-transparent border-0 px-1 py-0.5 text-sm focus:outline-none focus:bg-amber-50 rounded ${c.done ? 'line-through text-stone-400' : 'text-stone-900'}"><span class="text-xs text-emerald-700 font-bold whitespace-nowrap">${c.done && c.doneAt ? md(c.doneAt) + ' 완료' : ''}</span><button type="button" onclick="FactoryLog.removeItem(${i})" title="지우기" class="w-6 h-6 inline-flex items-center justify-center rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0">×</button></div>`).join('');
    const done = cur.checklist.filter((c) => c.done).length;
    return `${cur.checklist.length ? `<div class="text-xs text-stone-500 mb-1">${done}/${cur.checklist.length} 완료</div>` : ''}${rows}
      <div class="mt-1.5 flex items-center gap-1.5"><input id="flItemIn" type="text" maxlength="200" placeholder="이 일 때문에 해야 할 일 (예: 예비 벨트 주문)" onkeydown="if(event.key==='Enter'){event.preventDefault();FactoryLog.addItem(this.value);}" class="flex-1 min-w-0 border border-stone-300 rounded-lg px-2.5 h-8 text-xs"><button type="button" onclick="FactoryLog.addItem(document.getElementById('flItemIn').value)" class="${BTN} !h-8">추가</button></div>`;
  }
  function photosHtml() {
    const tile = (src, pid, tmp, name) => `<div class="relative w-24 h-24 rounded-xl overflow-hidden border border-stone-200 bg-stone-100"><button type="button" onclick="FactoryLog.viewPhoto('${pid || ''}','${tmp || ''}')" title="${esc(name || '')} · 크게 보기" class="block w-full h-full cursor-zoom-in">${src ? `<img src="${esc(src)}" alt="" class="w-full h-full object-cover">` : `<span data-fl-ph="${esc(pid)}" class="flex w-full h-full items-center justify-center text-xs text-stone-400">불러오는 중</span>`}</button><button type="button" onclick="FactoryLog.removePhoto('${pid || ''}','${tmp || ''}')" title="사진 빼기" class="absolute top-1 right-1 w-6 h-6 inline-flex items-center justify-center rounded-full bg-stone-900/70 text-white text-sm hover:bg-rose-600 cursor-pointer">×</button>${tmp ? '<span class="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-white text-xs font-bold">새 사진</span>' : ''}</div>`;
    const kept = cur.photos.filter((p) => !delPhotos.includes(p.id));
    const count = kept.length + newPhotos.length;
    return `<div class="flex flex-wrap gap-2">${kept.map((p) => tile(photoUrl.get(p.id) || '', p.id, '', p.name)).join('')}${newPhotos.map((p) => tile(p.url, '', p.tmp, p.name)).join('')}
        ${count < PHOTO_MAX ? `<label class="w-24 h-24 rounded-xl border-2 border-dashed border-stone-300 hover:border-amber-500 hover:bg-amber-50 flex flex-col items-center justify-center gap-1 text-xs font-bold text-stone-500 cursor-pointer"><i data-lucide="camera" class="w-5 h-5"></i>사진 추가<input type="file" accept="image/*" multiple class="hidden" onchange="FactoryLog.pickPhotos(this)"></label>` : ''}</div>
      <div class="mt-1 text-xs text-stone-500">${count}/${PHOTO_MAX}장 · 올릴 때 긴 변 ${PHOTO_EDGE}px JPG로 줄입니다${delPhotos.length ? ` · <span class="text-rose-700 font-bold">${delPhotos.length}장은 [저장]을 누르면 지워집니다</span>` : ''}</div>`;
  }
  const part = (id, html) => { const el = document.getElementById(id); if (el) { el.innerHTML = html; if (window.lucide) { try { lucide.createIcons(); } catch (e) {} } } paintSave(); };
  function paintSave() { const b = document.getElementById('flSaveBtn'); if (!b) return; const d = isDirty(); b.textContent = busy ? '저장 중...' : '저장'; b.disabled = busy; b.className = `flex items-center justify-center px-5 h-10 rounded-xl text-sm font-extrabold text-white transition whitespace-nowrap ${busy ? 'bg-stone-400 cursor-wait' : d ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer baroga-unsaved' : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'}`; const s = document.getElementById('flDirty'); if (s) s.textContent = busy ? '' : d ? '저장 안 됨' : cur && cur.id ? '저장됨' : ''; }
  function loadThumbs() {
    if (!cur) return;
    cur.photos.forEach((p) => {
      if (photoUrl.has(p.id) || delPhotos.includes(p.id)) return;
      photoUrl.set(p.id, ''); // 내려받는 중 표시(중복 요청 방지)
      api('GET', '/api/photos/' + p.id, { asBlob: true, timeout: 60000 }).then((b) => { photoUrl.set(p.id, URL.createObjectURL(b)); if (cur) part('flPhotos', photosHtml()); })
        .catch(() => { photoUrl.delete(p.id); document.querySelectorAll(`[data-fl-ph="${p.id}"]`).forEach((e) => { e.textContent = '불러오기 실패'; }); });
    });
  }
  function renderEditor() {
    const host = document.getElementById('flModal'); if (!host || !cur) return;
    const isNew = !cur.id;
    host.innerHTML = `<div class="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto" onmousedown="if(event.target===this)FactoryLog.close()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[1280px] flex flex-col max-h-[calc(100vh-16px)] sm:max-h-[calc(100vh-32px)]">
        <div class="px-5 py-3 border-b border-stone-200 flex items-center justify-between gap-2"><h3 class="text-base font-extrabold text-stone-900">${isNew ? '새 공장 일지' : '공장 일지'}</h3><button type="button" onclick="FactoryLog.close()" title="닫기" class="w-8 h-8 inline-flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer text-lg">×</button></div>
        <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div><label class="${LABEL}" for="flTitle">제목 <span class="text-rose-600">*</span> <span class="font-semibold text-stone-400">달력 막대에 보이는 글</span></label><input id="flTitle" type="text" maxlength="100" value="${esc(cur.title)}" oninput="FactoryLog.set('title', this.value)" placeholder="예: 론도 벨트 끊어짐" class="${INPUT} font-bold"></div>
          <div class="grid grid-cols-1 sm:grid-cols-[170px_170px_minmax(0,1fr)] gap-3">
            <div><label class="${LABEL}" for="flStart">시작일 <span class="text-rose-600">*</span></label><input id="flStart" type="date" value="${esc(cur.start)}" onchange="FactoryLog.setDate('start', this.value)" class="${INPUT}"></div>
            <div><label class="${LABEL}" for="flEnd">종료일 <span class="font-semibold text-stone-400">하루면 같은 날</span></label><input id="flEnd" type="date" value="${esc(cur.end)}" min="${esc(cur.start)}" onchange="FactoryLog.setDate('end', this.value)" class="${INPUT}"></div>
            <div><span class="${LABEL}">담당자 <span class="font-semibold text-stone-400">여러 명 지정 가능</span></span><div id="flAssignees">${assigneesHtml()}</div></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label class="${LABEL}" for="flHappened">일어난 일</label><textarea id="flHappened" rows="16" maxlength="5000" oninput="FactoryLog.set('happened', this.value)" placeholder="언제, 어디서, 무엇이 어떻게 됐는지" class="${INPUT} resize-y leading-relaxed min-h-[320px]">${esc(cur.happened)}</textarea></div>
            <div><label class="${LABEL}" for="flAction">사후 대처</label><textarea id="flAction" rows="16" maxlength="5000" oninput="FactoryLog.set('action', this.value)" placeholder="어떻게 조치했는지, 비용·업체, 재발 방지" class="${INPUT} resize-y leading-relaxed min-h-[320px]">${esc(cur.action)}</textarea></div>
          </div>
          <div><span class="${LABEL}">체크리스트 <span class="font-semibold text-stone-400">이 일로 생긴 할 일 · 나중에 다 했는지 확인</span></span><div id="flChecklist">${checklistHtml()}</div></div>
          <div><span class="${LABEL}">사진</span><div id="flPhotos">${photosHtml()}</div></div>
        </div>
        <div class="px-5 py-3 border-t border-stone-200 flex flex-wrap items-center gap-2">
          ${isNew ? '' : `<button type="button" onclick="FactoryLog.remove()" class="flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i>이 일지 삭제</button>`}
          ${cur.by && (cur.by[0] || cur.by[1]) ? `<span class="text-xs text-stone-400 leading-tight">작성 ${esc(cur.by[0] || '-')} ${esc(cur.by[2])}${cur.by[1] && (cur.by[1] !== cur.by[0] || cur.by[3] !== cur.by[2]) ? `<br>수정 ${esc(cur.by[1])} ${esc(cur.by[3])}` : ''}</span>` : ''}
          <span id="flDirty" class="ml-auto text-xs font-bold text-amber-700"></span>
          <button type="button" onclick="FactoryLog.close()" class="flex items-center justify-center px-4 h-10 rounded-xl text-sm font-bold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 cursor-pointer">닫기</button>
          <button type="button" id="flSaveBtn" onclick="FactoryLog.save()">저장</button>
        </div>
      </div></div>`;
    if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }
    paintSave(); loadThumbs();
  }

  // 사진 줄이기: 긴 변 2000px JPG (다시 그리면서 사진 속 위치 정보 등도 빠짐)
  async function shrink(file) {
    let src, w, h, cleanup = () => {};
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); w = src.width; h = src.height; cleanup = () => { try { src.close(); } catch (e) {} }; }
    catch (e) {
      const u = URL.createObjectURL(file);
      src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('이 사진 형식은 열 수 없습니다')); im.src = u; });
      w = src.naturalWidth; h = src.naturalHeight; cleanup = () => URL.revokeObjectURL(u);
    }
    if (!w || !h) { cleanup(); throw new Error('사진 크기를 읽을 수 없습니다'); }
    const k = Math.min(1, PHOTO_EDGE / Math.max(w, h)), cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(src, 0, 0, cv.width, cv.height); cleanup();
    const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', PHOTO_Q));
    if (!blob) throw new Error('사진을 줄이지 못했습니다');
    return blob;
  }
  async function pickPhotos(input) {
    const files = Array.from(input.files || []); input.value = ''; if (!cur || !files.length) return;
    let room = PHOTO_MAX - (cur.photos.filter((p) => !delPhotos.includes(p.id)).length + newPhotos.length), failed = 0, skipped = 0;
    for (const f of files) {
      if (room <= 0) { skipped++; continue; }
      try { const blob = await shrink(f); newPhotos.push({ tmp: uid(), blob, url: URL.createObjectURL(blob), name: String(f.name || '').replace(/\.[^.]+$/, '') + '.jpg' }); room--; } catch (e) { failed++; }
    }
    if (failed) toast(`사진 ${failed}장은 열 수 없어 넣지 못했습니다. (아이폰 HEIC 원본은 JPG로 바꿔 주세요)`, 'error');
    if (skipped) toast(`사진은 일지 한 건에 ${PHOTO_MAX}장까지입니다. ${skipped}장은 넣지 않았습니다.`, 'error');
    part('flPhotos', photosHtml());
  }
  function viewPhoto(pid, tmp) {
    const src = tmp ? (newPhotos.find((p) => p.tmp === tmp) || {}).url : photoUrl.get(pid); if (!src) return;
    const v = document.getElementById('flViewer'); if (!v) return;
    v.innerHTML = `<div class="fixed inset-0 bg-stone-950/85 z-[70] flex items-center justify-center p-4 cursor-zoom-out" onclick="document.getElementById('flViewer').innerHTML=''"><img src="${esc(src)}" alt="" class="max-w-full max-h-full rounded-lg shadow-2xl"><button type="button" title="닫기" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white text-2xl hover:bg-white/30 cursor-pointer">×</button></div>`;
  }

  async function save() {
    if (!cur || busy) return;
    cur.title = String(cur.title || '').trim();
    if (!cur.title) { toast('제목을 적어 주세요.', 'error'); const t = document.getElementById('flTitle'); if (t) t.focus(); return; }
    if (!cur.start) { toast('시작일을 넣어 주세요.', 'error'); return; }
    if (!cur.end || cur.end < cur.start) cur.end = cur.start;
    busy = true; paintSave();
    const fails = [];
    try {
      const j = await api('PUT', '/api/factory-log', { json: { id: cur.id || undefined, rev: cur.rev, start: cur.start, end: cur.end, title: cur.title, happened: cur.happened, action: cur.action, assignees: cur.assignees, checklist: cur.checklist.filter((c) => String(c.text || '').trim()) } });
      const L = j.log; cur.id = L.id; cur.rev = L.rev; cur.checklist = L.checklist.map((c) => Object.assign({}, c)); cur.assignees = L.assignees.slice();
      for (const pid of delPhotos.slice()) { try { await api('DELETE', '/api/photos/' + pid); delPhotos = delPhotos.filter((x) => x !== pid); cur.photos = cur.photos.filter((p) => p.id !== pid); } catch (e) { if (e.status === 404) { delPhotos = delPhotos.filter((x) => x !== pid); cur.photos = cur.photos.filter((p) => p.id !== pid); } else fails.push('사진 삭제: ' + e.message); } }
      for (const p of newPhotos.slice()) {
        try { const r = await api('POST', `/api/factory-log/${cur.id}/photos?name=${encodeURIComponent(p.name)}`, { blob: p.blob, type: 'image/jpeg', timeout: 90000 }); photoUrl.set(r.photo.id, p.url); cur.photos.push(r.photo); newPhotos = newPhotos.filter((x) => x.tmp !== p.tmp); }
        catch (e) { fails.push('사진 올리기: ' + e.message); }
      }
    } catch (e) {
      busy = false;
      if (e.status === 409) toast('다른 사람이 먼저 고쳤습니다. 닫고 새로 불러온 뒤 다시 고쳐 주세요.', 'error'); else toast('저장 실패: ' + e.message, 'error');
      paintSave(); return;
    }
    busy = false;
    if (fails.length) { curSaved = ''; toast(`글은 저장했지만 사진 ${fails.length}건이 실패했습니다. [저장]을 다시 눌러 주세요. (${fails[0]})`, 'error'); renderEditor(); pull(false); return; }
    toast('공장 일지를 저장했습니다.', 'success');
    const savedStart = cur.start; close(true);
    if (savedStart.slice(0, 7) !== ym && !logsCover(savedStart)) ym = savedStart.slice(0, 7);
    pull(false);
  }
  const logsCover = (d) => { const r = range(); return d >= r.from && d <= r.to; };
  async function remove() {
    if (!cur || !cur.id || busy) return;
    const n = cur.photos.length;
    if (!confirm(`'${cur.title}' 일지를 지울까요?${n ? `\n사진 ${n}장도 함께 지워집니다.` : ''}\n지우면 되돌릴 수 없습니다.`)) return;
    busy = true; paintSave();
    try { await api('DELETE', '/api/factory-log/' + cur.id); busy = false; toast('일지를 지웠습니다.', 'success'); close(true); pull(false); }
    catch (e) { busy = false; paintSave(); toast('삭제 실패: ' + e.message, 'error'); }
  }

  function move(n) { const d = dateOf(ym + '-01'); d.setMonth(d.getMonth() + n); ym = ymd(d).slice(0, 7); render(); pull(false); }
  function mount() { render(); if (!mounted) { mounted = true; pull(false); } }
  window.mountFactoryLogApp = mount;
  window.FactoryLog = {
    mount, pull, move, goToday: () => { ym = today().slice(0, 7); render(); pull(false); }, newAt, open, close, save, remove,
    set: (k, v) => { if (cur && ['title', 'happened', 'action'].includes(k)) { cur[k] = v; paintSave(); } },
    setDate: (k, v) => { if (!cur || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return; cur[k] = v; if (cur.end < cur.start) { if (k === 'start') cur.end = cur.start; else cur.start = cur.end; } const s = document.getElementById('flStart'), e = document.getElementById('flEnd'); if (s) s.value = cur.start; if (e) { e.value = cur.end; e.min = cur.start; } paintSave(); },
    addAssignee: (v) => { const n = String(v || '').trim().slice(0, 30); if (!cur || !n) return; if (cur.assignees.includes(n)) { toast('이미 지정한 담당자입니다.', 'error'); return; } if (cur.assignees.length >= 20) { toast('담당자는 20명까지 지정할 수 있습니다.', 'error'); return; } cur.assignees.push(n); part('flAssignees', assigneesHtml()); },
    removeAssignee: (i) => { if (!cur) return; cur.assignees.splice(i, 1); part('flAssignees', assigneesHtml()); },
    addItem: (v) => { const t = String(v || '').trim(); if (!cur || !t) return; if (cur.checklist.length >= 50) { toast('체크리스트는 50개까지 넣을 수 있습니다.', 'error'); return; } cur.checklist.push({ id: uid(), text: t, done: false, doneAt: '' }); part('flChecklist', checklistHtml()); const i = document.getElementById('flItemIn'); if (i) i.focus(); },
    setItem: (i, v) => { if (cur && cur.checklist[i]) { cur.checklist[i].text = v; paintSave(); } },
    toggleItem: (i, on) => { if (!cur || !cur.checklist[i]) return; cur.checklist[i].done = !!on; cur.checklist[i].doneAt = on ? today() : ''; part('flChecklist', checklistHtml()); },
    removeItem: (i) => { if (!cur) return; cur.checklist.splice(i, 1); part('flChecklist', checklistHtml()); },
    pickPhotos, viewPhoto,
    removePhoto: (pid, tmp) => { if (!cur) return; if (tmp) { const p = newPhotos.find((x) => x.tmp === tmp); if (p) { try { URL.revokeObjectURL(p.url); } catch (e) {} } newPhotos = newPhotos.filter((x) => x.tmp !== tmp); } else if (pid && !delPhotos.includes(pid)) delPhotos.push(pid); part('flPhotos', photosHtml()); },
    isDirty,
    _debug: () => ({ ym, logs, openLogs, loaded, lastError, cur, newPhotos: newPhotos.length, delPhotos }),
  };
  window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
})();
