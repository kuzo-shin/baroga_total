// [VERSION: cloud_store.js v1.7 - 2026-11-27 화면 문구 정리('판'→저장 번호·○번째 저장, '조각' 표현 삭제, 변경 내역 보기 등) / v1.6 - 2026-11-27 저장한 사람을 이름으로 표시(권한 관리에 적은 이름) / v1.5 - 2026-11-27 DB 창에 '저장 기록'(판별 시각·사람·바뀐 부분) + [바뀐 내용 보기](항목별 전 → 후) / v1.4 - 2026-11-27 새 주소의 'DB 연결' 버튼은 구글 주소 입력 대신 Cloudflare 저장 상태 안내(dbInfo) / v1.3 - 2026-11-27 8개 메뉴 모두 전환 완료(MOVED) → 옛 주소에서는 DB를 쓰는 메뉴를 막음 / v1.2 - 2026-11-27 거래명세서 전환 완료(MOVED) / v1.1 - 2026-11-27 메뉴별 전환: 구글 DB와 같은 말투로 답하는 연결(gas) · 전환 표시(active) · 옛 주소 차단 목록(MOVED) / v1.0 - 2026-11-27 신규: Cloudflare 자료 보관소 연결(조각으로 나누기·합치기·검증) + 구글 DB에서 가져오기]
// ============================================================================
// 바로가 공장 통합 관리 시스템 - Cloudflare 자료 보관소 (cloud_store.js)
//  구글 시트 DB는 메뉴마다 자료 전체를 JSON 한 덩어리로 저장했음. Cloudflare에서는 같은 자료를 '조각'으로 나눠 보관
//   · 달별 기록(생산일지·발주)은 달마다, 레시피는 품목마다, 엠즈 발주 이력은 달마다 한 조각 → 바뀐 조각만 올라감
//   · 화면이 쓰는 자료 모양은 그대로: 불러올 때 조각을 합쳐 예전과 글자 하나까지 같은 JSON 을 만듦
//  안전 장치
//   · 나눈 조각을 다시 합친 결과가 원본과 글자 그대로 같은지 매번 확인. 다르면 올리지 않고 오류
//   · 올린 뒤 서버에서 다시 읽어 합친 결과가 원본과 같은지 확인
//   · 서버는 조각의 지난 판을 보관하고(되돌려 읽기 가능), 가져올 때 구글 DB 원본 응답도 통째로 백업
//  메뉴 전환 (구글 DB → Cloudflare)
//   · 각 메뉴는 지금처럼 { action: 'getAll' } / { action: 'replaceAll', baseRevision, payload } 로 요청하고, CloudStore.gas(메뉴, 구글로 보내는 함수)가
//     전환된 메뉴면 Cloudflare 에서, 아니면 구글 DB 에서 같은 모양의 답을 돌려줌 → 메뉴 쪽 코드는 그대로
//   · 전환 표시(active)는 서버에 있음: 관리자가 켜는 순간부터 새 주소의 그 메뉴는 Cloudflare 를 읽고 씀
//   · MOVED: 전환이 끝난 메뉴. 옛 주소(github.io)에서는 이 메뉴를 막음(구글 DB에 따로 저장돼 자료가 갈라지지 않게)
//  이 파일은 브라우저(window.CloudStore)와 시험(node)에서 함께 씀
// ============================================================================
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.CloudStore = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MONTH = /^\d{4}-\d{2}/;
  // 메뉴별로 '나눠서 보관할 칸'. 여기 없는 칸은 칸 하나가 조각 하나
  const RULES = {
    raw: { orders: { type: 'arrayByMonth', field: 'date', dayOver: 300000 } },     // 발주·재고 기록 → 달마다 (한 달이 300KB를 넘으면 그 달은 날마다)
    recipe: { data: { type: 'arrayById', field: 'id' } },                          // 레시피 → 품목마다
    price: { categoryDbs: { type: 'objectByKey' } },                               // 제품단가 → 분류마다
    production: { days: { type: 'objectByMonth' }, crew: { type: 'objectByMonth' }, pack: { type: 'objectByMonth' }, scrap: { type: 'objectByMonth' } }, // 날짜별 기록 → 달마다
    ms_inbound: {},
    ms_stock: { hist: { type: 'objectByKey' } },                                   // 엠즈 발주 이력 → 달마다
    invoice: {},
    price_compare: {},
  };
  const DOMAINS = Object.keys(RULES);
  // 전환이 끝난 메뉴 (옛 주소에서 막음) — 2026-11-27 8개 메뉴 모두 전환. 전환 시점의 구글 DB 판: invoice 2 · ms_stock 5 · ms_inbound 18 · production 157 · price 193 · recipe 181 · raw 157 · price_compare 2
  const MOVED = ['invoice', 'ms_stock', 'ms_inbound', 'production', 'price', 'recipe', 'raw', 'price_compare'];
  const CLOUD_SITE = 'https://baroga-total.kuzo0909.workers.dev';
  // 구글 DB 응답에서 '화면이 쓰는 자료'가 들어 있는 칸
  const GAS_PICK = { raw: (j) => ({ orders: j.orders }), recipe: (j) => ({ data: j.data }), ms_inbound: (j) => j.data };
  const GAS_URL = {
    raw: 'AKfycbwDZDxhGuHRXobrud2_FaMeuIEXdXN-wdKn8MHxk2pyEMGxLTeXKD_uBokhTLw_Yfhc', recipe: 'AKfycbycrRwFx0Ixcj8-xBY7m-IiowUqZ1ByKoqhn5x43IMYDXF1FlsF8tQmIbAaOz6SSbtdVg',
    price: 'AKfycbw4zdcL2yjESq8G2_889Oz3pzdAuYJm-DjzEwMNUp4t0NjuRVcWaSnMdxTYD_9RrciZ_Q', production: 'AKfycbwTnkYkH8fiz4s-BOoHfI05Fhmo4Hm6CaoWH1tNSRluS_mrH1rRR6HkhEeRcGKHdjDH',
    ms_inbound: 'AKfycbxT64_EgYAeUHQntHumeeoAnVnc05uuehhD09kCMUiQInfZDegdrY0FnFTEjzaJSaJf', ms_stock: 'AKfycbwspl12U2V776l9lT2gDbvdb84FndSETHy20MR5-1vNsq6_Tvgd725xx3FSMWvFf6h_jQ',
    invoice: 'AKfycby9CW0wLQ6GsJR1zCVOqwkJDxOlCeiLZTaCAThpWEXw7Kw0f7MJ1fow7y47mYw2fMzL8g', price_compare: 'AKfycbzgx_coielgbXWvLuw3I3ymUv1kh3oPXD3eHBtB_hSsRDzq4yZz5SmETpOGsioYPabp0A',
  };
  const gasUrl = (d) => `https://script.google.com/macros/s/${GAS_URL[d]}/exec`;
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const bucketOf = (s) => (MONTH.test(String(s)) ? String(s).slice(0, 7) : '_');

  // ---------- 나누기 ----------
  function splitPart(name, v, rule, out) {
    const key = (b) => `p:${name}:${b}`;
    if (rule.type === 'objectByKey' && isObj(v)) {
      const order = Object.keys(v); order.forEach((k) => { out[key(k)] = JSON.stringify(v[k]); });
      return { type: 'objectByKey', order };
    }
    if (rule.type === 'objectByMonth' && isObj(v)) {
      const keys = Object.keys(v), groups = {}, border = [];
      keys.forEach((k) => { const b = bucketOf(k); if (!groups[b]) { groups[b] = {}; border.push(b); } groups[b][k] = v[k]; });
      border.forEach((b) => { out[key(b)] = JSON.stringify(groups[b]); });
      // 달끼리 모아 이어 붙였을 때 원래 순서와 같으면 달 순서만 적고, 아니면 날짜 순서를 통째로 적음
      const grouped = [].concat(...border.map((b) => Object.keys(groups[b])));
      const same = grouped.length === keys.length && grouped.every((k, i) => k === keys[i]);
      return same ? { type: 'objectByMonth', buckets: border } : { type: 'objectByMonth', buckets: border, keys };
    }
    if (rule.type === 'arrayByMonth' && Array.isArray(v) && v.every(isObj)) {
      const groups = {}, border = [], runs = [], DAY = /^\d{4}-\d{2}-\d{2}/;
      let names = v.map((it) => bucketOf(it[rule.field]));
      if (rule.dayOver) { // 너무 큰 달은 날짜별 조각으로 (D1 한 줄 2MB 제한에 걸리지 않게)
        const bytes = {}; v.forEach((it, i) => { bytes[names[i]] = (bytes[names[i]] || 0) + JSON.stringify(it).length; });
        names = names.map((b, i) => (b !== '_' && bytes[b] > rule.dayOver ? (DAY.test(String(v[i][rule.field])) ? String(v[i][rule.field]).slice(0, 10) : b + '-_') : b));
        // 하루가 그래도 크면(같은 날짜에 줄이 몰린 경우) 차례대로 #0, #1 … 로 더 나눔
        const sz = v.map((it) => JSON.stringify(it).length), tot = {}; names.forEach((b, i) => { tot[b] = (tot[b] || 0) + sz[i]; });
        const run = {}; names = names.map((b, i) => { if (tot[b] <= rule.dayOver) return b; const r = run[b] || (run[b] = { n: 0, bytes: 0 }); if (r.bytes && r.bytes + sz[i] > rule.dayOver) { r.n++; r.bytes = 0; } r.bytes += sz[i]; return b + '#' + r.n; });
      }
      v.forEach((it, i) => { const b = names[i]; if (!groups[b]) { groups[b] = []; border.push(b); } groups[b].push(it); const last = runs[runs.length - 1]; if (last && last[0] === b) last[1]++; else runs.push([b, 1]); });
      border.forEach((b) => { out[key(b)] = JSON.stringify(groups[b]); });
      return { type: 'arrayByMonth', runs }; // runs = [달, 연속 개수] … 원래 순서 그대로 되돌리는 데 씀
    }
    if (rule.type === 'arrayById' && Array.isArray(v) && v.every(isObj)) {
      const ids = v.map((it) => (it[rule.field] === undefined || it[rule.field] === null ? '' : String(it[rule.field])));
      if (ids.every((id) => id && id.length <= 150) && new Set(ids).size === ids.length) {
        v.forEach((it, i) => { out[key(ids[i])] = JSON.stringify(it); });
        return { type: 'arrayById', order: ids };
      }
    }
    return null; // 규칙을 쓸 수 없는 모양이면 통째로 한 조각
  }
  function split(domain, doc) {
    if (!RULES[domain]) throw new Error('없는 메뉴입니다: ' + domain);
    if (!isObj(doc)) throw new Error('자료가 객체가 아닙니다.');
    const out = {}, manifest = { v: 1, top: Object.keys(doc), parts: {} };
    manifest.top.forEach((k) => {
      const rule = RULES[domain][k], m = rule ? splitPart(k, doc[k], rule, out) : null;
      if (m) manifest.parts[k] = m; else out['k:' + k] = JSON.stringify(doc[k]);
    });
    out._manifest = JSON.stringify(manifest);
    return out;
  }
  // ---------- 합치기 ----------
  function need(sections, key) { if (!(key in sections)) throw new Error(`저장된 자료 일부를 찾을 수 없습니다. 관리자에게 알려 주세요. (${key})`); return JSON.parse(sections[key]); }
  function join(domain, sections) {
    if (!sections || typeof sections._manifest !== 'string') throw new Error('저장된 자료의 목록을 찾을 수 없습니다. 관리자에게 알려 주세요.');
    const mf = JSON.parse(sections._manifest), doc = {};
    mf.top.forEach((k) => {
      const p = mf.parts[k], key = (b) => `p:${k}:${b}`;
      if (!p) { doc[k] = need(sections, 'k:' + k); return; }
      if (p.type === 'objectByKey') { const o = {}; p.order.forEach((x) => { o[x] = need(sections, key(x)); }); doc[k] = o; }
      else if (p.type === 'objectByMonth') {
        const groups = {}; p.buckets.forEach((b) => { groups[b] = need(sections, key(b)); });
        const o = {};
        if (p.keys) p.keys.forEach((x) => { const g = groups[bucketOf(x)]; if (!g || !(x in g)) throw new Error(`저장된 자료 일부가 빠져 있습니다. 관리자에게 알려 주세요. (${k}/${x})`); o[x] = g[x]; });
        else p.buckets.forEach((b) => { Object.keys(groups[b]).forEach((x) => { o[x] = groups[b][x]; }); });
        doc[k] = o;
      } else if (p.type === 'arrayByMonth') {
        const groups = {}, at = {}, arr = [];
        p.runs.forEach(([b, n]) => { if (!groups[b]) { groups[b] = need(sections, key(b)); at[b] = 0; } for (let i = 0; i < n; i++) { if (at[b] >= groups[b].length) throw new Error(`저장된 자료의 개수가 맞지 않습니다. 관리자에게 알려 주세요. (${k}/${b})`); arr.push(groups[b][at[b]++]); } });
        Object.keys(groups).forEach((b) => { if (at[b] !== groups[b].length) throw new Error(`저장된 자료의 개수가 맞지 않습니다. 관리자에게 알려 주세요. (${k}/${b})`); });
        doc[k] = arr;
      } else if (p.type === 'arrayById') doc[k] = p.order.map((id) => need(sections, key(id)));
      else throw new Error('알 수 없는 저장 형식입니다. 관리자에게 알려 주세요. (' + p.type + ')');
    });
    return doc;
  }
  // 나눈 것을 다시 합쳐 원본과 글자 그대로 같은지 확인한 뒤 조각을 돌려줌. 다르면 오류(올리지 않음)
  function splitChecked(domain, doc) {
    const text = JSON.stringify(doc), clean = JSON.parse(text), sections = split(domain, clean);
    if (JSON.stringify(join(domain, sections)) !== text) throw new Error(`[${domain}] 저장 전 검증에서 자료가 원본과 다르게 나와 저장하지 않았습니다. 관리자에게 알려 주세요.`);
    return { sections, text };
  }
  function diff(prev, next) {
    const put = {}, del = []; prev = prev || {};
    Object.keys(next).forEach((k) => { if (prev[k] !== next[k]) put[k] = next[k]; });
    Object.keys(prev).forEach((k) => { if (!(k in next)) del.push(k); });
    return { put, del };
  }
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // ---------- 서버 ----------
  const API_BASE = () => (typeof window !== 'undefined' && typeof window.BAROGA_CLOUD_API === 'string' ? window.BAROGA_CLOUD_API.replace(/\/+$/, '') : '');
  const available = () => typeof location !== 'undefined' && (typeof window.BAROGA_CLOUD_API === 'string' || !(/(^|\.)github\.io$/i.test(location.hostname) || location.protocol === 'file:'));
  async function api(method, path, body, raw) {
    if (!available()) throw new Error('Cloudflare 자료 보관소는 새 주소에서만 쓸 수 있습니다');
    const opt = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) { opt.body = raw ? body : JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
    let res; try { res = await fetch(API_BASE() + path, opt); } catch (e) { throw new Error('서버에 연결하지 못했습니다. 로그인이 끝났을 수 있으니 화면을 새로고침해 주세요'); }
    let j = null; try { j = await res.json(); } catch (e) {}
    if (res.status === 401 || (!j && res.ok)) { const e = new Error('로그인이 필요합니다. 화면을 새로고침해 다시 로그인해 주세요'); e.unauthorized = true; throw e; }
    if (!res.ok || !j || j.ok === false) { const e = new Error((j && j.error) || `서버 응답 오류 (HTTP ${res.status})`); e.status = res.status; e.data = j; e.conflict = !!(j && j.conflict); throw e; }
    return j;
  }
  // 불러오기: { rev, empty, doc(예전과 같은 모양), sections, text }
  async function load(domain) {
    const j = await api('GET', '/api/store/' + domain);
    if (j.empty || !j.sections._manifest) return { rev: j.rev, empty: true, doc: null, sections: j.sections || {}, text: '' };
    const doc = join(domain, j.sections);
    return { rev: j.rev, empty: false, doc, sections: j.sections, text: JSON.stringify(doc), updatedAt: j.updatedAt, updatedBy: j.updatedBy };
  }
  // 저장: 바뀐 조각만 올림. prev = 마지막으로 불러온(또는 저장한) 조각들. 바뀐 것이 없으면 올리지 않음
  async function save(domain, doc, baseRev, prev, note) {
    const { sections, text } = splitChecked(domain, doc), d = diff(prev, sections), n = Object.keys(d.put).length + d.del.length;
    if (!n) return { rev: baseRev, sections, text, changed: 0 };
    const j = await api('PUT', '/api/store/' + domain, { baseRev, put: d.put, del: d.del, note: note || '' });
    return { rev: j.rev, sections, text, changed: n, bytes: j.bytes };
  }

  // ---------- 구글 DB에서 가져오기 (이식용) ----------
  async function readGas(domain, url) {
    const call = typeof window.barogaApi === 'function' ? window.barogaApi : null;
    if (!call) throw new Error('구글 DB를 읽을 수 없습니다 (barogaApi 없음)');
    const j = await call(url || gasUrl(domain), { action: 'getAll' }, 180000);
    if (!j || j.ok === false) throw new Error('구글 DB 불러오기 실패: ' + ((j && (j.error || j.message)) || '응답 없음'));
    const doc = (GAS_PICK[domain] || ((x) => x.payload))(j);
    if (!isObj(doc)) throw new Error('구글 DB 응답에 자료가 없습니다 (' + domain + ')');
    return { raw: j, doc, gasRev: j.revision, gasUpdatedAt: j.updatedAt || '' };
  }
  // 구글 DB → Cloudflare. 다시 실행해도 안전(바뀐 조각만 올림). 결과에 건수·크기·검증 여부를 담아 돌려줌
  async function importFromGas(domain, opt) {
    opt = opt || {};
    const g = await readGas(domain, opt.url), rep = { domain, gasRev: g.gasRev, gasUpdatedAt: g.gasUpdatedAt };
    const bk = await api('PUT', '/api/backup/' + domain, JSON.stringify(g.raw), true); rep.backup = bk.key;
    const cur = await api('GET', '/api/store/' + domain);
    const s = await save(domain, g.doc, cur.rev, cur.sections, `구글 DB(저장 번호 ${g.gasRev})에서 가져옴`);
    rep.changed = s.changed; rep.sections = Object.keys(s.sections).length; rep.bytes = new TextEncoder().encode(s.text).length;
    const back = await load(domain); rep.cloudRev = back.rev;
    rep.equal = back.text === s.text; rep.sha = await sha256(s.text); rep.shaCloud = await sha256(back.text);
    if (!rep.equal) throw Object.assign(new Error(`[${domain}] 올린 뒤 다시 읽은 자료가 원본과 다릅니다!`), { report: rep });
    return rep;
  }
  // 구글 DB와 Cloudflare 가 지금 같은지 (전환 전 점검용, 쓰기 없음)
  async function compareWithGas(domain, opt) {
    const g = await readGas(domain, opt && opt.url), back = await load(domain), text = JSON.stringify(g.doc);
    return { domain, gasRev: g.gasRev, cloudRev: back.rev, equal: back.text === text, bytesGas: new TextEncoder().encode(text).length, bytesCloud: new TextEncoder().encode(back.text).length };
  }

  // ---------- 메뉴 전환: 구글 DB와 같은 말투의 연결 ----------
  let flagsP = null;
  const state = {}; // 메뉴별 마지막으로 불러온(저장한) 판과 조각
  function flags(force) { // 전환된 메뉴 목록 (서버). 한 번 읽어 두고 씀
    if (!flagsP || force) flagsP = api('GET', '/api/store').then((j) => (Array.isArray(j.active) ? j.active : [])).catch((e) => { flagsP = null; throw e; });
    return flagsP;
  }
  async function isActive(domain) { if (!available()) return false; const a = await flags(); return a.includes(domain) || MOVED.includes(domain); }
  async function setActive(domain, on) { const j = await api('PUT', '/api/store-active', { domain, on: !!on }); flagsP = Promise.resolve(j.active); return j.active; }
  const kst = (iso) => { const d = iso ? new Date(iso) : new Date(); if (isNaN(d)) return ''; return new Date(d.getTime() + 9 * 3600000).toISOString().replace('T', ' ').slice(0, 19); };
  const CONFLICT_MSG = '다른 사용자가 먼저 저장했습니다. 새로고침 후 다시 입력해 주세요.';
  const conflictOut = (rev) => ({ ok: false, status: 'error', conflict: true, revision: rev, error: CONFLICT_MSG, message: CONFLICT_MSG });
  function wrapOut(domain, doc, rev, updatedAt) { // 구글 DB의 getAll 응답과 같은 모양
    if (domain === 'raw') return { ok: true, revision: rev, spreadsheetName: 'Cloudflare', sheetName: 'store', count: doc.orders.length, orders: doc.orders };
    if (domain === 'recipe') return { ok: true, status: 'ok', revision: rev, data: doc.data };
    if (domain === 'ms_inbound') return { ok: true, revision: rev, source: 'CLOUDFLARE', updatedAt: kst(updatedAt), data: doc };
    return { ok: true, status: 'ok', revision: rev, source: 'CLOUDFLARE', updatedAt: kst(updatedAt), payload: doc };
  }
  function docFromBody(domain, body) { // 저장 요청에서 자료 꺼내기 (구글 DB 스크립트와 같은 규칙)
    if (domain === 'raw') { const list = Array.isArray(body.orders) ? body.orders : (Array.isArray(body.data) ? body.data : null); return list ? { orders: list } : null; }
    if (domain === 'recipe') {
      const list = Array.isArray(body.data) ? body.data : (Array.isArray(body.recipes) ? body.recipes : null); if (!list || !Array.isArray(body.images)) return null;
      const img = {}; body.images.forEach((x) => { if (x && x.id && x.data) img[String(x.id)] = String(x.data); });
      return { data: list.map((r) => { const o = Object.assign({}, r); delete o.imageData; if (o.id && img[String(o.id)]) o.imageData = img[String(o.id)]; return o; }) };
    }
    return isObj(body.payload) ? body.payload : null;
  }
  async function emulate(domain, body) {
    const action = (body && body.action) || '';
    if (action === 'getAll') {
      const l = await load(domain);
      if (l.empty) { state[domain] = { rev: l.rev, sections: l.sections }; return domain === 'raw' ? { ok: true, revision: l.rev, count: 0, orders: [] } : domain === 'recipe' ? { ok: true, status: 'empty', revision: l.rev, data: [] } : { ok: true, status: 'empty', revision: l.rev }; }
      state[domain] = { rev: l.rev, sections: l.sections };
      return wrapOut(domain, l.doc, l.rev, l.updatedAt);
    }
    if (action !== 'replaceAll' && !(domain === 'raw' && body && (Array.isArray(body.orders) || Array.isArray(body.data)))) return { ok: false, status: 'error', error: '지원하지 않는 작업입니다: ' + action, message: '지원하지 않는 작업입니다: ' + action };
    const doc = docFromBody(domain, body);
    if (!doc) return { ok: false, status: 'error', error: '저장할 데이터 형식이 올바르지 않습니다.', message: '저장할 데이터 형식이 올바르지 않습니다.' };
    const hasBase = body.baseRevision !== undefined && body.baseRevision !== null, base = Number(body.baseRevision);
    let st = state[domain];
    if (!st || !hasBase || st.rev !== base) { const cur = await api('GET', '/api/store/' + domain); st = state[domain] = { rev: cur.rev, sections: cur.sections || {} }; }
    if (!hasBase || st.rev !== base) return conflictOut(st.rev);
    let r;
    try { r = await save(domain, doc, base, st.sections, body.note || ''); }
    catch (e) { if (e.conflict) { delete state[domain]; return conflictOut(e.data && e.data.rev); } throw e; }
    state[domain] = { rev: r.rev, sections: r.sections };
    const out = { ok: true, status: 'ok', revision: r.rev, updatedAt: kst(), source: 'CLOUDFLARE', changed: r.changed, warning: '' };
    if (domain === 'raw') out.count = doc.orders.length; if (domain === 'recipe') { out.count = doc.data.length; out.images = doc.data.filter((x) => x.imageData).length; }
    if (domain === 'ms_inbound') { out.records = (doc.records || []).length; out.returns = (doc.returns || []).length; }
    return out;
  }
  // 메뉴가 쓰는 연결. viaGas = 지금까지처럼 구글 DB로 보내는 함수(body, ms)
  function gas(domain, viaGas) {
    if (!RULES[domain]) throw new Error('없는 메뉴입니다: ' + domain);
    return async function (body, ms) {
      if (!available()) { // 옛 주소
        if (MOVED.includes(domain)) throw new Error('이 메뉴의 자료는 새 주소로 옮겼습니다. 새 주소에서 사용해 주세요 → ' + CLOUD_SITE);
        return viaGas(body, ms);
      }
      // 새 주소: 전환 여부를 모르면(서버에 못 닿으면) 구글 DB로 넘기지 않고 멈춤 — 전환된 메뉴를 구글에 저장하는 일을 막기 위해
      if (await isActive(domain)) return emulate(domain, body);
      return viaGas(body, ms);
    };
  }

  // ---------- 새 주소의 'DB 연결' 안내 ----------
  // 전환된 메뉴는 설정할 DB 주소가 없음 → 구글 주소 입력 창 대신 저장 상태(판·마지막 저장 시각·저장한 사람)를 보여 줌
  // 돌려주는 값: 안내 창을 띄웠으면 true (메뉴는 원래 창을 열지 않음), 옛 주소 등이면 false
  const NAMES = { raw: '원재료', recipe: '레시피', price: '제품단가', production: '생산일지 · 생산 재고', ms_inbound: '제품 출고', ms_stock: '엠즈 재고', invoice: '거래명세서', price_compare: '원재료 단가 비교' };
  const escH = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function closeInfo() { const el = document.getElementById('cloudDbInfo'); if (el) el.remove(); }
  const who = (email) => { try { return (typeof window !== 'undefined' && window.Perms && window.Perms.nameOf) ? window.Perms.nameOf(email) : String(email || ''); } catch (e) { return String(email || ''); } };
  // ---------- 저장 기록: 무엇이 바뀌었나 (v1.5) ----------
  const TOP_KO = { days: '생산일지', pack: '포장 완료', crew: '작업 인원', scrap: '파지', semiItems: '반제품 목록', stockBase: '재고 실사', stockAdjusts: '재고 조정', loss: '손실 기준', crewCfg: '인원 설정', orders: '발주·재고 기록', data: '레시피', categoryDbs: '제품단가', settings: '설정', pkCostRows: 'PK 원가표', records: '출고 기록', returns: '회송', unitPrices: '매입가', recipeLinks: '레시피 연결', hist: '발주 이력', docs: '거래명세서', items: '품목', calls: '전화 목록', quotes: '견적', vendors: '업체', recheck: '재확인 기록', sum: '요약' };
  const FIELD_KO = { actual: '실행', actualPk: '실행 PK', target: '목표', targetPk: '목표 PK', pk: '포장 PK', memo: '메모', note: '비고', lines: '품목', semi: '반제품', items: '품목', off: '휴무', offLabel: '휴무 이름', pkManual: 'PK 직접 입력', pricePk: '단가', pkPerBatch: '1배합 PK', name: '이름', unit: '단위', price: '가격', qty: '수량', weightG: '중량(g)', unitPrice: '단가', colB: '품목', colC: '규격', colD: '수량', amount: '금액', date: '날짜', used: '사용', waste: '폐기', stock: '재고', title: '제목', batchOutputEa: '1배합 생산 개수', pkQuantityEa: 'PK당 개수', productName: '제품명', sellingPrice: '판매가', divisionWeight: '분할 중량', lossRatio: '손실률', ingredients: '재료', ingredientsJson: '재료' };
  const SKIP = new Set(['updatedAt', 'importedAt', 'at', 'savedAt']);
  const lab = (o) => (isObj(o) ? (o.name || o.productName || o.item || o.title || o.colB || o.vendor || '') : '');
  const idOf = (o) => (isObj(o) ? (o.id != null ? o.id : o.rowId != null ? o.rowId : o.code != null ? o.code : o.productCode != null ? o.productCode : null) : null);
  const short = (v) => { if (v === undefined || v === null || v === '') return '없음'; if (typeof v === 'boolean') return v ? '예' : '아니오'; const t = typeof v === 'object' ? (isObj(v) ? (Object.entries(v).filter(([k, x]) => !['id', 'rowId', 'code', 'productCode', 'name', 'productName', 'item', 'title'].includes(k) && !SKIP.has(k) && (typeof x === 'number' || (typeof x === 'string' && x && x.length < 30)) && x !== 0).slice(0, 5).map(([k, x]) => `${FIELD_KO[k] || k} ${x}`).join(' · ') || JSON.stringify(v)) : JSON.stringify(v)) : String(v); return t.length > 70 ? t.slice(0, 70) + '…' : t; };
  const maybeJson = (v) => { if (typeof v !== 'string' || !/^\s*[[{]/.test(v)) return v; try { return JSON.parse(v); } catch (e) { return v; } };
  function walkDiff(a, b, path, out) {
    if (out.length >= 300) return;
    a = maybeJson(a); b = maybeJson(b);
    if (Array.isArray(a) && Array.isArray(b)) {
      const keyed = (arr) => arr.length > 0 && arr.every((x) => idOf(x) != null) && new Set(arr.map((x) => String(idOf(x)))).size === arr.length;
      if ((keyed(a) || !a.length) && (keyed(b) || !b.length) && (a.length || b.length)) {
        const ma = new Map(a.map((x) => [String(idOf(x)), x])), mb = new Map(b.map((x) => [String(idOf(x)), x]));
        b.forEach((x) => { const k = String(idOf(x)), o = ma.get(k); if (!o) pushWhole(path.concat(lab(x) || k), 'add', x, out, path.length); else walkDiff(o, x, path.concat(lab(x) || k), out); });
        a.forEach((x) => { const k = String(idOf(x)); if (!mb.has(k)) pushWhole(path.concat(lab(x) || k), 'del', x, out, path.length); });
        return;
      }
      if (a.length === b.length) { a.forEach((x, i) => walkDiff(x, b[i], path.concat(lab(b[i]) || lab(x) || `${i + 1}번 항목`), out)); return; }
      if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path, kind: 'set', a: `${a.length}건`, b: `${b.length}건` });
      return;
    }
    if (isObj(a) && isObj(b)) {
      new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => {
        if (SKIP.has(k)) return;
        const seg = FIELD_KO[k] || k;
        if (!(k in a)) { if (isObj(b[k]) || Array.isArray(b[k])) pushWhole(path.concat(lab(b[k]) ? `${seg} ${lab(b[k])}` : seg), 'add', b[k], out, 0); else if (b[k] !== '' && b[k] !== null && b[k] !== 0 && b[k] !== false) out.push({ path: path.concat(seg), kind: 'set', a: undefined, b: b[k] }); }
        else if (!(k in b)) pushWhole(path.concat(seg), 'del', a[k], out, 0);
        else walkDiff(a[k], b[k], path.concat(seg), out);
      });
      return;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path, kind: 'set', a, b });
  }
  // 통째로 생기거나 없어진 묶음(이름 없는 객체·목록)은 한 단계씩 풀어서 항목별로 보여 줌
  const isBox = (v) => Array.isArray(v) || (isObj(v) && !lab(v) && Object.values(v).some((x) => x && typeof x === 'object'));
  function pushWhole(path, kind, v, out, depth) {
    if (isBox(v) && depth < 4) { const before = out.length; walkDiff(kind === 'add' ? (Array.isArray(v) ? [] : {}) : v, kind === 'add' ? v : (Array.isArray(v) ? [] : {}), path, out); if (out.length > before) return; }
    out.push(kind === 'add' ? { path, kind, b: v } : { path, kind, a: v });
  }
  // 조각 이름 → 사람이 읽는 이름
  function sectionLabel(key, sample) {
    const m = /^([kp]):([^:]+)(?::(.*))?$/.exec(key); if (!m) return [key];
    const top = TOP_KO[m[2]] || m[2];
    if (m[1] === 'k' || !m[3] || /^\d{4}-\d{2}/.test(m[3])) return [top];
    return [top, lab(sample) || m[3]];
  }
  function changesOf(list) { // list: [{ key, before, after }] (JSON 글자) → [{ path:[], kind, a, b }]
    const out = [];
    (list || []).forEach((c) => {
      if (c.key === 'k:updatedAt' || c.key === 'k:importedAt') return; // 저장 시각만 바뀐 조각
      const a = c.before == null ? undefined : JSON.parse(c.before), b = c.after == null ? undefined : JSON.parse(c.after), pre = sectionLabel(c.key, b !== undefined ? b : a);
      if (a === undefined) out.push({ path: pre, kind: 'add', b }); else if (b === undefined) out.push({ path: pre, kind: 'del', a }); else walkDiff(a, b, pre, out);
    });
    return out;
  }
  function changesHtml(ch) {
    if (!ch.length) return '<div class="text-xs text-stone-500">변경된 값이 없습니다.</div>';
    const tag = { add: '<span class="px-1.5 rounded bg-emerald-100 text-emerald-800 font-bold">추가</span>', del: '<span class="px-1.5 rounded bg-rose-100 text-rose-800 font-bold">삭제</span>' };
    const rows = ch.slice(0, 200).map((c) => `<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1 border-b border-stone-100 last:border-0"><span class="text-stone-500">${c.path.map(escH).join(' › ')}</span>${c.kind === 'set' ? `<span class="font-bold text-stone-500 line-through decoration-stone-300">${escH(short(c.a))}</span><span class="text-stone-400">→</span><b class="text-stone-900">${escH(short(c.b))}</b>` : `${tag[c.kind]}<span class="text-stone-700">${escH(short(c.kind === 'add' ? c.b : c.a))}</span>`}</div>`).join('');
    return `<div class="text-xs">${rows}${ch.length > 200 ? `<div class="pt-1 text-stone-500">외 ${ch.length - 200}건</div>` : ''}</div>`;
  }
  async function showChanges(domain, rev, host) {
    if (host.dataset.open === '1') { host.dataset.open = ''; host.innerHTML = ''; return; }
    host.dataset.open = '1'; host.innerHTML = '<div class="text-xs text-stone-500 py-1">불러오는 중…</div>';
    try {
      const j = await api('GET', `/api/store/${domain}/changes?rev=${rev}`);
      if (j.tooBig) { host.innerHTML = `<div class="text-xs text-stone-500 py-1">자료 전체를 한꺼번에 저장한 기록이라 상세 내역을 표시하지 않습니다.</div>`; return; }
      const ch = changesOf(j.changes);
      host.innerHTML = `<div class="mt-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 max-h-72 overflow-y-auto"><div class="text-xs font-bold text-stone-500 pb-1">변경 ${ch.length}건${ch.length >= 300 ? ' 이상' : ''}</div>${changesHtml(ch)}</div>`;
    } catch (e) { host.innerHTML = `<div class="text-xs text-rose-700 font-bold py-1">${escH(e.message || e)}</div>`; }
  }
  function historyHtml(domain, j) {
    if (!j.revs.length) return '<p class="text-xs text-stone-500">저장 기록이 없습니다.</p>';
    return `<div class="rounded-xl border border-stone-200 divide-y divide-stone-100 max-h-[46vh] overflow-y-auto">${j.revs.map((r) => {
      const tops = [...new Set(r.keys.filter((k) => k !== 'k:updatedAt' && k !== 'k:importedAt').map((k) => sectionLabel(k)[0] + (/^p:[^:]+:(\d{4}-\d{2})/.test(k) ? ' ' + RegExp.$1 : '')))];
      return `<div class="px-3 py-2"><div class="flex flex-wrap items-center gap-x-3 gap-y-1"><b class="tabular-nums text-stone-900">${escH(r.rev)}번째 저장</b><span class="tabular-nums text-stone-600">${escH(kst(r.at))}</span><span class="text-stone-600" title="${escH(r.by || '')}">${escH(who(r.by) || '-')}</span><button type="button" data-rev="${escH(r.rev)}" class="ml-auto px-2.5 h-7 rounded-lg border border-stone-300 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer">변경 내역 보기</button></div>
        <div class="mt-0.5 text-xs text-stone-500">수정 항목: ${tops.slice(0, 8).map(escH).join(' · ') || '-'}${tops.length > 8 ? ` 외 ${tops.length - 8}` : ''}${r.note ? ` · 메모: ${escH(r.note)}` : ''}</div><div data-changes="${escH(r.rev)}"></div></div>`;
    }).join('')}</div><p class="text-xs text-stone-500">최근 ${j.revs.length}건 · 저장 기록은 180일간 보관됩니다. (2026-11-27 이후 기록)</p>`;
  }

  function dbInfo(domain) {
    if (!available() || !MOVED.includes(domain) || typeof document === 'undefined') return false;
    closeInfo();
    const el = document.createElement('div');
    el.id = 'cloudDbInfo';
    el.className = 'fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4';
    el.onclick = (e) => { if (e.target === el) closeInfo(); };
    const body = (inner) => `<div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[calc(100vh-32px)] overflow-y-auto text-sm">
      <div class="px-5 py-3 border-b border-stone-200 flex items-center justify-between"><h3 class="text-base font-extrabold text-stone-900">${escH(NAMES[domain] || domain)} DB</h3>
        <button type="button" data-close class="text-stone-400 hover:text-stone-700 cursor-pointer" aria-label="닫기"><i data-lucide="x" class="w-5 h-5"></i></button></div>
      <div class="p-5 space-y-3 text-stone-700">
        <p>이 메뉴의 자료는 서버에 저장됩니다.</p>
        ${inner}
      </div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end"><button type="button" data-close class="px-4 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold cursor-pointer">닫기</button></div></div>`;
    const paint = (inner) => { el.innerHTML = body(inner); el.querySelectorAll('[data-close]').forEach((b) => { b.onclick = closeInfo; }); try { if (window.lucide) window.lucide.createIcons(); } catch (e) {} };
    paint('<p class="text-stone-500">저장 상태를 불러오는 중…</p>');
    document.body.appendChild(el);
    api('GET', '/api/store').then((j) => {
      const d = (j.domains || []).find((x) => x.domain === domain);
      if (!d) { paint('<p class="text-rose-700 font-bold">서버에 이 메뉴의 자료가 없습니다.</p>'); return; }
      const kb = d.bytes >= 1048576 ? (d.bytes / 1048576).toFixed(2) + ' MB' : Math.round(d.bytes / 1024).toLocaleString() + ' KB';
      const row = (k, v) => `<div class="flex gap-3"><dt class="w-24 shrink-0 text-stone-500">${k}</dt><dd class="font-bold text-stone-900 break-all">${v}</dd></div>`;
      paint(`<dl class="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 space-y-1.5">${row('저장 번호', escH(d.rev))}${row('최근 저장', escH(kst(d.updatedAt)))}${row('저장한 사람', escH(who(d.updatedBy) || '-'))}${row('크기', escH(kb))}</dl>
        <div class="text-sm font-extrabold text-stone-900 pt-1">저장 기록</div><div id="cloudDbHist" class="space-y-2"><p class="text-xs text-stone-500">불러오는 중…</p></div>`);
      const hh = el.querySelector('#cloudDbHist');
      api('GET', `/api/store/${domain}/history`).then((h) => {
        if (!hh || !hh.isConnected) return;
        hh.innerHTML = historyHtml(domain, h);
        hh.querySelectorAll('button[data-rev]').forEach((b) => { b.onclick = () => showChanges(domain, b.dataset.rev, hh.querySelector(`[data-changes="${b.dataset.rev}"]`)); });
      }).catch((e) => { if (hh) hh.innerHTML = `<p class="text-xs text-rose-700 font-bold">저장 기록을 불러오지 못했습니다: ${escH(e.message || e)}</p>`; });
    }).catch((e) => paint(`<p class="text-rose-700 font-bold">${escH(e && e.message ? e.message : e)}</p>`));
    return true;
  }

  return { DOMAINS, RULES, MOVED, CLOUD_SITE, split, join, splitChecked, diff, sha256, load, save, importFromGas, compareWithGas, available, gasUrl, gas, isActive, setActive, flags, _api: api, _emulate: emulate, dbInfo, NAMES, _changesOf: changesOf };
});
