// [VERSION: cloud_store.js v1.0 - 2026-11-27 신규: Cloudflare 자료 보관소 연결(조각으로 나누기·합치기·검증) + 구글 DB에서 가져오기]
// ============================================================================
// 바로가 공장 통합 관리 시스템 - Cloudflare 자료 보관소 (cloud_store.js)
//  구글 시트 DB는 메뉴마다 자료 전체를 JSON 한 덩어리로 저장했음. Cloudflare에서는 같은 자료를 '조각'으로 나눠 보관
//   · 달별 기록(생산일지·발주)은 달마다, 레시피는 품목마다, 엠즈 발주 이력은 달마다 한 조각 → 바뀐 조각만 올라감
//   · 화면이 쓰는 자료 모양은 그대로: 불러올 때 조각을 합쳐 예전과 글자 하나까지 같은 JSON 을 만듦
//  안전 장치
//   · 나눈 조각을 다시 합친 결과가 원본과 글자 그대로 같은지 매번 확인. 다르면 올리지 않고 오류
//   · 올린 뒤 서버에서 다시 읽어 합친 결과가 원본과 같은지 확인
//   · 서버는 조각의 지난 판을 보관하고(되돌려 읽기 가능), 가져올 때 구글 DB 원본 응답도 통째로 백업
//  이 파일은 브라우저(window.CloudStore)와 시험(node)에서 함께 씀
// ============================================================================
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.CloudStore = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MONTH = /^\d{4}-\d{2}/;
  // 메뉴별로 '나눠서 보관할 칸'. 여기 없는 칸은 칸 하나가 조각 하나
  const RULES = {
    raw: { orders: { type: 'arrayByMonth', field: 'date' } },                      // 발주·재고 기록 → 달마다
    recipe: { data: { type: 'arrayById', field: 'id' } },                          // 레시피 → 품목마다
    price: { categoryDbs: { type: 'objectByKey' } },                               // 제품단가 → 분류마다
    production: { days: { type: 'objectByMonth' }, crew: { type: 'objectByMonth' }, pack: { type: 'objectByMonth' }, scrap: { type: 'objectByMonth' } }, // 날짜별 기록 → 달마다
    ms_inbound: {},
    ms_stock: { hist: { type: 'objectByKey' } },                                   // 엠즈 발주 이력 → 달마다
    invoice: {},
    price_compare: {},
  };
  const DOMAINS = Object.keys(RULES);
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
      const groups = {}, border = [], runs = [];
      v.forEach((it) => { const b = bucketOf(it[rule.field]); if (!groups[b]) { groups[b] = []; border.push(b); } groups[b].push(it); const last = runs[runs.length - 1]; if (last && last[0] === b) last[1]++; else runs.push([b, 1]); });
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
  function need(sections, key) { if (!(key in sections)) throw new Error(`조각이 없습니다: ${key}`); return JSON.parse(sections[key]); }
  function join(domain, sections) {
    if (!sections || typeof sections._manifest !== 'string') throw new Error('조각 목록(_manifest)이 없습니다.');
    const mf = JSON.parse(sections._manifest), doc = {};
    mf.top.forEach((k) => {
      const p = mf.parts[k], key = (b) => `p:${k}:${b}`;
      if (!p) { doc[k] = need(sections, 'k:' + k); return; }
      if (p.type === 'objectByKey') { const o = {}; p.order.forEach((x) => { o[x] = need(sections, key(x)); }); doc[k] = o; }
      else if (p.type === 'objectByMonth') {
        const groups = {}; p.buckets.forEach((b) => { groups[b] = need(sections, key(b)); });
        const o = {};
        if (p.keys) p.keys.forEach((x) => { const g = groups[bucketOf(x)]; if (!g || !(x in g)) throw new Error(`조각 안에 값이 없습니다: ${k}/${x}`); o[x] = g[x]; });
        else p.buckets.forEach((b) => { Object.keys(groups[b]).forEach((x) => { o[x] = groups[b][x]; }); });
        doc[k] = o;
      } else if (p.type === 'arrayByMonth') {
        const groups = {}, at = {}, arr = [];
        p.runs.forEach(([b, n]) => { if (!groups[b]) { groups[b] = need(sections, key(b)); at[b] = 0; } for (let i = 0; i < n; i++) { if (at[b] >= groups[b].length) throw new Error(`조각 안에 줄이 모자랍니다: ${k}/${b}`); arr.push(groups[b][at[b]++]); } });
        Object.keys(groups).forEach((b) => { if (at[b] !== groups[b].length) throw new Error(`조각 안에 줄이 남습니다: ${k}/${b}`); });
        doc[k] = arr;
      } else if (p.type === 'arrayById') doc[k] = p.order.map((id) => need(sections, key(id)));
      else throw new Error('모르는 조각 방식: ' + p.type);
    });
    return doc;
  }
  // 나눈 것을 다시 합쳐 원본과 글자 그대로 같은지 확인한 뒤 조각을 돌려줌. 다르면 오류(올리지 않음)
  function splitChecked(domain, doc) {
    const text = JSON.stringify(doc), clean = JSON.parse(text), sections = split(domain, clean);
    if (JSON.stringify(join(domain, sections)) !== text) throw new Error(`[${domain}] 나눈 조각을 합친 결과가 원본과 다릅니다. 올리지 않았습니다.`);
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
    const s = await save(domain, g.doc, cur.rev, cur.sections, `구글 DB 판 ${g.gasRev} 에서 가져옴`);
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
  return { DOMAINS, RULES, split, join, splitChecked, diff, sha256, load, save, importFromGas, compareWithGas, available, gasUrl, _api: api };
});
