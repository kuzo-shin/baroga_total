// [VERSION: perms.js v1.2 - 2026-11-27 문구: 보기 → 조회 / v1.1 - 2026-11-27 계정 이름 칸(권한 관리 창) — 화면의 이메일을 이름으로 표시(Perms.nameOf) / v1.0 - 2026-11-27 신규: 계정별 메뉴 권한 적용(숨김·보기·수정) + 관리자용 권한 관리 창]
// ============================================================================
// 바로가 공장 ERP — 계정별 메뉴 권한 (window.Perms)
//  - 서버 /api/me 가 알려 주는 내 권한을 화면에 적용: 숨김 = 상단 메뉴에서 가림, 보기 = 메뉴는 보이지만 저장 불가(서버가 거부), 수정 = 지금과 같음
//  - 관리자(서버 ADMIN_EMAILS)는 상단 [권한 관리] 버튼으로 이메일별·메뉴별 권한을 정함 (/api/perms)
//  - 서버가 막는 것은 '저장'. 숨김은 화면에서 가리는 것이며 자료 읽기 자체를 막지는 않음(메뉴끼리 자료를 서로 읽어 계산하기 때문)
//  - 접속 허용(로그인 가능 계정)은 Cloudflare Access 에서 따로 관리 — 이 창은 '들어온 뒤 무엇을 할 수 있나'만 정함
//  - 옛 주소(github.io)·파일로 열었을 때는 아무것도 하지 않음
// ============================================================================
(function () {
  'use strict';
  if (/(^|\.)github\.io$/i.test(location.hostname) || location.protocol === 'file:') { window.Perms = { level: () => 'edit', nameOf: (e) => String(e || ''), canEdit: () => true, admin: false }; return; }
  const MENUS = [['raw', '원재료'], ['recipe', '레시피'], ['price', '제품단가'], ['production', '생산일지 · 생산 재고'], ['ms_inbound', '제품 출고'], ['ms_stock', '엠즈 재고'], ['invoice', '거래명세서'], ['factory_log', '공장 일지']];
  const TAB_MENU = { RAW: 'raw', RECIPE: 'recipe', PRODUCT_PRICE: 'price', PRODUCTION: 'production', PROD_STOCK: 'production', MS_INBOUND: 'ms_inbound', MS_STOCK: 'ms_stock', INVOICE: 'invoice', FACTORY_LOG: 'factory_log' };
  const LV = [['edit', '수정'], ['view', '조회'], ['none', '숨김']];
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, t) => { try { if (typeof window.showToast === 'function') window.showToast(m, t || 'info'); } catch (e) {} };
  let me = { email: '', admin: false, levels: {}, names: {} }, ready = false;
  const nameOf = (email) => { const e = String(email || ''); return (me.names && me.names[e.toLowerCase()]) || e; }; // 이름이 있으면 이름, 없으면 이메일 그대로
  const level = (menu) => me.levels[menu] || 'edit';
  async function api(method, body) {
    const res = await fetch('/api/perms', { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await res.json(); } catch (e) {}
    if (!res.ok || !j || j.ok === false) throw new Error((j && j.error) || `서버 응답 오류 (HTTP ${res.status})`);
    return j;
  }

  // ---------- 내 권한을 화면에 적용 ----------
  function paintBadge(tab) {
    let el = document.getElementById('permViewBadge');
    const lv = level(TAB_MENU[tab] || '');
    if (lv !== 'view') { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'permViewBadge'; el.className = 'fixed bottom-4 left-4 z-40 px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold shadow-lg'; document.body.appendChild(el); }
    el.textContent = '조회 전용 — 수정 내용은 저장되지 않습니다';
  }
  function apply() {
    Object.entries(TAB_MENU).forEach(([tab, menu]) => { const b = document.getElementById('masterTab_' + tab); if (b) b.style.display = level(menu) === 'none' ? 'none' : ''; });
    const cur = window.activeMasterDomain || 'RAW';
    if (level(TAB_MENU[cur]) === 'none') { const first = Object.keys(TAB_MENU).find((t) => level(TAB_MENU[t]) !== 'none'); if (first && window.__permsOrigSwitch) window.__permsOrigSwitch(first); paintBadge(first); }
    else paintBadge(cur);
    const le = document.getElementById('loginEmail'); if (le && me.email) { const sp = le.querySelector('span'); if (sp) sp.textContent = nameOf(me.email); le.title = '로그인한 계정: ' + me.email; le.classList.remove('hidden'); le.classList.add('flex'); }
    const btn = document.getElementById('permsAdminBtn'); if (btn) { btn.classList.toggle('hidden', !me.admin); btn.classList.toggle('flex', me.admin); }
  }
  function wrapSwitch() {
    if (window.__permsOrigSwitch || typeof window.switchMasterDomain !== 'function') return;
    const orig = window.switchMasterDomain; window.__permsOrigSwitch = orig;
    window.switchMasterDomain = function (tab) {
      if (ready && level(TAB_MENU[tab] || '') === 'none') { toast('이 메뉴를 볼 권한이 없습니다. 관리자에게 요청해 주세요.', 'error'); return; }
      const r = orig.apply(this, arguments); paintBadge(tab); return r;
    };
  }
  async function loadMe() {
    try { const r = await fetch('/api/me', { credentials: 'same-origin' }); const j = r.ok ? await r.json() : null; if (j && j.email) { me = { email: j.email, admin: !!j.admin, levels: j.levels || {}, names: j.names || {} }; ready = true; } } catch (e) {}
    wrapSwitch(); apply();
  }

  // ---------- 관리자: 권한 관리 창 ----------
  let st = null; // { def, users, admins, dirty, busy, msg }
  const sel = (who, menu, val, isDef) => `<select onchange="Perms._set('${esc(who)}','${menu}',this.value)" class="w-full border rounded-lg px-1.5 h-8 text-xs font-bold cursor-pointer ${val === 'none' ? 'border-rose-300 bg-rose-50 text-rose-800' : val === 'view' ? 'border-amber-300 bg-amber-50 text-amber-900' : val === 'edit' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-white text-stone-400'}">${isDef ? '' : `<option value="" ${!val ? 'selected' : ''}>기본값</option>`}${LV.map(([k, n]) => `<option value="${k}" ${val === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  function paint() {
    const host = document.getElementById('permsModal'); if (!host || !st) return;
    const head = MENUS.map(([, n]) => `<th class="py-2 px-1.5 text-center whitespace-nowrap">${esc(n)}</th>`).join('');
    const adminRows = st.admins.map((e) => `<tr class="border-b border-stone-100"><td class="py-1.5 px-2 font-bold text-stone-900 whitespace-nowrap">${esc(e)} <span class="ml-1 px-1.5 py-0.5 rounded bg-stone-900 text-white text-xs">관리자</span></td><td class="py-1 px-1"><input type="text" maxlength="30" value="${esc(st.names[e] || '')}" placeholder="이름" oninput="Perms._name('${esc(e)}',this.value)" class="border border-stone-300 rounded-lg px-2 h-8 text-xs font-bold w-24"></td><td colspan="${MENUS.length}" class="py-1.5 px-2 text-xs text-stone-500">모든 메뉴 수정 · 권한 관리 (바꿀 수 없음)</td><td></td></tr>`).join('');
    const defRow = `<tr class="border-b border-stone-200 bg-stone-50"><td class="py-1.5 px-2 font-bold text-stone-700 whitespace-nowrap">기본값 <span class="font-semibold text-xs text-stone-500">아래 목록에 없는 계정 · '기본값'으로 둔 칸</span></td><td></td>${MENUS.map(([m]) => `<td class="py-1 px-1">${sel('*', m, st.def[m] || 'edit', true)}</td>`).join('')}<td></td></tr>`;
    const rows = Object.keys(st.users).sort().map((e) => `<tr class="border-b border-stone-100"><td class="py-1.5 px-2 font-bold text-stone-900 whitespace-nowrap">${esc(e)}</td><td class="py-1 px-1"><input type="text" maxlength="30" value="${esc(st.names[e] || '')}" placeholder="이름" oninput="Perms._name('${esc(e)}',this.value)" class="border border-stone-300 rounded-lg px-2 h-8 text-xs font-bold w-24"></td>${MENUS.map(([m]) => `<td class="py-1 px-1">${sel(e, m, st.users[e][m] || '', false)}</td>`).join('')}<td class="py-1 px-1 text-right"><button type="button" onclick="Perms._remove('${esc(e)}')" title="이 계정의 설정 지우기(기본값을 따름)" class="w-7 h-7 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4 inline"></i></button></td></tr>`).join('');
    host.innerHTML = `<div class="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-[70] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto" onmousedown="if(event.target===this)Perms.close()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[1180px] flex flex-col max-h-[calc(100vh-32px)]">
        <div class="px-5 py-3 border-b border-stone-200 flex items-center justify-between gap-2"><h3 class="text-base font-extrabold text-stone-900">권한 관리 <span class="text-xs font-bold text-stone-500">계정별 · 메뉴별</span></h3><button type="button" onclick="Perms.close()" title="닫기" class="w-8 h-8 inline-flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button></div>
        <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          <div class="text-xs text-stone-600 leading-relaxed"><b class="text-emerald-800">수정</b> = 조회·저장 가능 · <b class="text-amber-800">조회</b> = 조회만 가능(저장 불가) · <b class="text-rose-800">숨김</b> = 상단 메뉴에 표시되지 않음.<br>원재료 권한에는 '원재료 단가 비교'가 포함됩니다. <b>이름</b>을 적으면 화면(로그인 표시·저장 기록·공장 일지)에 이메일 대신 이름이 나옵니다. 로그인할 수 있는 계정 자체는 Cloudflare 접속 허용 목록에서 따로 정합니다(여기에 적어도 접속 허용이 되지는 않습니다).</div>
          <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm min-w-[1080px]"><thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600"><th class="py-2 px-2">계정</th><th class="py-2 px-1.5">이름</th>${head}<th class="w-9"></th></tr></thead><tbody>${adminRows}${defRow}${rows || `<tr><td colspan="${MENUS.length + 3}" class="py-4 text-center text-sm text-stone-400">따로 정한 계정이 없습니다. 모두 기본값을 따릅니다.</td></tr>`}</tbody></table></div>
          <div class="flex flex-wrap items-center gap-2"><input id="permsEmailIn" type="email" placeholder="이메일 주소 (예: name@gmail.com)" onkeydown="if(event.key==='Enter'){event.preventDefault();Perms._add(this.value);}" class="border border-stone-300 rounded-lg px-3 h-9 text-sm w-80 max-w-full"><button type="button" onclick="Perms._add(document.getElementById('permsEmailIn').value)" class="px-3 h-9 rounded-xl border border-stone-300 bg-white text-xs font-extrabold text-stone-700 hover:bg-stone-50 cursor-pointer">계정 추가</button></div>
        </div>
        <div class="px-5 py-3 border-t border-stone-200 flex items-center justify-between gap-2"><span class="text-xs ${st.dirty ? 'font-bold text-amber-700' : 'text-stone-500'}">${esc(st.msg || (st.dirty ? '저장 안 됨' : (st.updatedAt ? `마지막 저장 ${String(st.updatedAt).slice(0, 16).replace('T', ' ')} UTC · ${nameOf(st.updatedBy)}` : '아직 정한 권한이 없습니다 (모두 수정)')))}</span>
          <div class="flex items-center gap-2"><button type="button" onclick="Perms.close()" class="px-4 h-9 rounded-xl border border-stone-300 bg-white text-sm font-bold text-stone-700 hover:bg-stone-50 cursor-pointer">닫기</button><button type="button" onclick="Perms._save()" ${st.busy ? 'disabled' : ''} class="px-5 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold cursor-pointer disabled:opacity-50">${st.busy ? '저장 중…' : '저장'}</button></div></div>
      </div></div>`;
    try { if (window.lucide) window.lucide.createIcons(); } catch (e) {}
  }
  async function open() {
    if (!me.admin) { toast('관리자만 권한을 관리할 수 있습니다.', 'error'); return; }
    let host = document.getElementById('permsModal'); if (!host) { host = document.createElement('div'); host.id = 'permsModal'; document.body.appendChild(host); }
    try { const j = await api('GET'); st = { def: j.def || {}, users: j.users || {}, names: j.names || {}, admins: j.admins || [], updatedAt: j.updatedAt, updatedBy: j.updatedBy, dirty: false, busy: false, msg: '' }; paint(); }
    catch (e) { toast('권한 설정을 불러오지 못했습니다: ' + e.message, 'error'); }
  }
  function close() { if (st && st.dirty && !confirm('저장하지 않은 권한 변경이 있습니다. 닫을까요?')) return; st = null; const h = document.getElementById('permsModal'); if (h) h.innerHTML = ''; }
  const P = {
    level, nameOf, canEdit: (menu) => level(menu) === 'edit', get admin() { return me.admin; }, get email() { return me.email; }, open, close, reload: loadMe,
    _set: (who, menu, val) => { if (!st) return; if (who === '*') st.def[menu] = val; else if (st.users[who]) { if (val) st.users[who][menu] = val; else delete st.users[who][menu]; } st.dirty = true; st.msg = ''; paint(); },
    _add: (v) => { if (!st) return; const e = String(v || '').trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) { toast('이메일 주소를 확인해 주세요.', 'error'); return; } if (st.admins.includes(e)) { toast('관리자 계정은 항상 모든 메뉴를 수정할 수 있습니다.', 'info'); return; } if (!st.users[e]) { st.users[e] = {}; st.dirty = true; } st.msg = ''; paint(); },
    _name: (e, v) => { if (!st) return; const t = String(v || '').trim(); if (t) st.names[e] = t.slice(0, 30); else delete st.names[e]; st.dirty = true; }, // 입력 중에는 다시 그리지 않음(커서 유지)
    _remove: (e) => { if (!st || !st.users[e]) return; delete st.users[e]; delete st.names[e]; st.dirty = true; st.msg = ''; paint(); },
    _save: async () => { if (!st || st.busy) return; st.busy = true; paint(); try { const j = await api('PUT', { def: st.def, users: st.users, names: st.names }); st = { def: j.def || {}, users: j.users || {}, names: j.names || {}, admins: j.admins || [], updatedAt: j.updatedAt, updatedBy: j.updatedBy, dirty: false, busy: false, msg: '' }; me.names = st.names; apply(); toast('권한을 저장했습니다. 해당 계정은 새로고침하면 적용됩니다.', 'success'); } catch (e) { st.busy = false; st.msg = '저장 실패: ' + e.message; } paint(); },
  };
  window.Perms = P;
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', loadMe); else loadMe();
})();
