// [VERSION: production.js v2.37 - 2026-11-24 엠즈 재고 탭용 stockForMs(공장 재고 현재고) 내보내기 / v2.35 - 2026-11-24 생산 재고: 재고조사 입력 버튼 3개 색 통일 · 상단에 재고 종류별 기준일 알림(생지 실사·카트 실사·월말 카트 재고·파지 재고조사) / v2.34 - 2026-11-24 생산 재고에 파지 재고 표(반제품 아래)와 [파지 재고조사 입력] 버튼, 파지 관리의 버튼은 안내로 바꿈 / v2.33 - 2026-11-24 파지 재고조사(기초 파지 재고) 입력: 남은 파지 = 조사한 재고 + 다음 날부터의 발생 − 사용 / v2.32 - 2026-11-24 파지 종류 재정리(패스츄리·퀸아망·쇼숑, 몽마르트 파지=패스츄리 파지) · 발생 종류는 품목 기준 · 사용은 레시피에 적힌 종류별로 계산(단과자 등 여러 종류) · 0 입력도 기록 / v2.31 - 2026-11-24 파지 사용 다시 켬: 믹싱에 쓰는 파지는 반제품 레시피에 등록된 파지 g × 배합 수로 계산(별도 기준 7.5kg·[파지 자동 차감 기준] 창 폐지) / v2.30 - 2026-11-23 파지 관리: 보는 기간(N월 전체·최근 3개월·누적) — 상단 카드와 아래 표에 적용 / 파지 사용 표시는 정리 전까지 끔(SCRAP_USE_ON=false, 저장값 보존) / v2.29 - 2026-11-23 파지 관리: 파지로 만드는 제품이 생산 스케쥴에 있으면 품목별 사용 kg 자동 표시(일자 창·달력·주간·월 표), 남은 파지에 반영 / v2.28 - 2026-11-23 파지 사용: 반제품 믹싱 1배합당 자동 차감(기본 패스츄리 7.5kg, 기준 설정 가능)·파지로 만드는 제품 자동 계산(레시피 기준)·직접 입력, 남은 파지 표시 / 파지·부족분 원재료 팝업 가운데 정렬 / v2.27 - 2026-11-23 파지 관리 상단 카드 글자 크기를 다른 탭과 맞춤 / v2.26 - 2026-11-23 DB 상태 UI를 다른 탭과 통일(상태 배지·DB 저장·새로고침), 파지 관리 검정 바탕 줄임 / v2.25 - 2026-11-23 파지 관리: 주간 합계 카드 개편, 상단 카드 글자 키움, 반죽별 '성형에서 빠진 양 중 파지·폐기' 표 / 원재료 손실 파지 전환율 문구 줄바꿈 / v2.24 - 2026-11-23 파지 관리: 생산 반죽 kg 대비 파지 비율(카드·달력·일자 창·표) / 원재료 손실: 파지 전환율(발생 vs 파지 품목 사용) / v2.23 - 2026-11-23 '2. 파지 관리' 탭 신설(달력·일자 창에서 파이 품목별 파지 kg 입력, 3종), 탭에 번호 표시 / v2.22 - 2026-11-23 원재료 손실: 알생지·파베이크 수율을 상단 카드·아래 표·주별 비교에서 따로 분리 / v2.21 - 2026-11-23 원재료 손실 머리: 1~12월 버튼(윗줄) + 보는 기간 버튼(아랫줄), 월말 카트 재고 입력을 생산 재고 화면으로 이동 / v2.20 - 2026-11-23 원재료 손실(파이 보관분 대응): 기간 '최근 3개월·누적', 월말 카트 재고 입력 → 재고 반영 계산, 성형한 날 사용 카트 미입력 경고(달력·일자 창) / v2.19 - 2026-11-23 원재료 손실: 금액 표기 통일(+초록 = 초과 생산, −빨강 = 생산 부족), 파이 초과분도 금액 표시 / v2.18 - 2026-11-23 원재료 손실: 상단 카드 파이·생지 같은 양식(수율+금액), 문구 정리(투입 대비 생산 초과/부족 등), 생지 부족분 원재료 팝업 / v2.17 - 2026-11-23 원재료 손실: 투입보다 파이에 쓴 반죽이 많으면 음수 대신 '투입보다 더 씀(초과)'으로 풀어 표시, 초과분은 손실 원재료비에서 제외 / v2.16 - 2026-11-23 원재료 손실(공정 표 형태로 개편·생산일지 연동 초록 점·생지 실제 생산은 포장 완료 등록 기준): 반죽 1개당 버터 1,000g 현장 기준(설정 가능), 1카트 기준을 반죽 이름 옆에 표시, 설명 문구 수정 / v2.15 - 2026-11-23 원재료 손실 개편: 파이 공정별(믹싱→라미네이팅→성형)·1카트 기준(개수×g)·버터 포함 중량, 파이를 생지 위로, 반제품 이름 레시피 기준 통일 / v2.14 - 2026-11-22 미배정 표시 삼각형 아이콘 + 범례 / v2.13 - 2026-11-22 작업 인원: 미배정 팀원 있으면 칸에 ! 표시·이름 / v2.12 - 2026-11-22 포장 안 된 품목 월별 구분, 참고 자료 안내 문구 / v2.11 - 2026-11-22 포장 달력 칸에 생산·포장 금액 / v2.10 - 2026-11-22 포장 완료: 금액 차이(KPI·주·품목), 포장 안 된 품목 목록 / v2.9 - 2026-11-22 포장 완료 등록 탭 신설(재고 입고 = 포장), 생산일지 창 크기 줄임, '실제 포장 수량'→'포장 수량' / v2.8 - 2026-11-22 일자 창에서 휴무일 지정(사유 문구), 달력 칸 옅은 빨강 + 문구 / v2.7 - 2026-11-22 달력 칸 최소 높이 1행(빈 주는 짧게), 기록 없는 주 합계 한 줄 / v2.6 - 2026-11-22 작업 인원에 1인 생산금액(KPI·날짜·주·파트별), 작업 구분별 생산 파트·인원 기준 설정 / v2.5 - 2026-11-22 달력 날짜 크게, 탭 아이콘, 작업 인원 휴무 영역 분리·배정 카드 색, 휴무 입력 칸 넓힘 / v2.4 - 2026-11-21 작업 인원 달력 칸 파트별 색 묶음·이름 줄바꿈·휴무 줄 분리, 인원 설정 창 탭 디자인 / v2.3 - 2026-11-21 '생산 달력'→'생산 스케쥴', 작업 인원(팀 9종 배정·휴무·인원 설정) 신설, 스케쥴 칸에 근무/휴무 인원 / v2.2 - 2026-11-21 주말 칸 60px 고정(금액 만원 표기), 남는 폭은 평일 품목명으로 / v2.1 - 2026-11-21 달력 칸 품목을 파트별로 묶고 왼쪽 색 띠로 구분 / v2.0 - 2026-11-21 생산 재고를 대항목으로 분리, 달력 칸 12종까지 표시 / v1.9 - 2026-11-21 달력 품목 줄 간격 좁힘(품목명 더 보이게), 주말 열 더 좁게 / v1.8 - 2026-11-21 달력: 토·일 한 칸으로 합침, 평일 넓게, 품목 줄 표처럼 열 고정, 앞으로 올 날은 '예정' / v1.7 - 2026-11-21 제품단가 중복 행은 매입가 있는 행 하나만 사용 / v1.6 - 2026-11-21 반제품(라미네이팅 카트) 재고: 만든·사용·폐기, 원재료비 평가, 파이 손실은 사용 카트 기준 / v1.5 - 2026-11-21 달력: 주말 열 좁게, 단위 뱃지(PK·배합) 앞으로, 글씨 굵게, 주 합계 카드 밝게 / v1.4 - 2026-11-21 일자 입력창 개편(화면 중앙·품목 고르기 판·큰 글씨), 달력 칸 하루 10종까지 표시 / v1.3 - 2026-11-21 원재료 손실(수율) 분석: 생지 투입 배합 대비 실제 생산, 파이 라미네이팅 카트 반죽 대비 사용 반죽, 주·월 비교 / v1.2 - 2026-11-21 기본 DB 주소, 7일 달력(주말 근무), 1~12월 버튼, 반제품 달력 표시, 품목 늦게 불러와도 자동 갱신 / v1.1 - 2026-11-21 단가 0원 품목은 제품단가 현재 값 자동 반영, 쇼숑오뽐므 BOX 재고(4PK=1BOX) / v1.0 - 2026-11-21 신규: 생산일지(주 5일 달력 · 목표/실행 · 달성률) + 생지 재고(PK, 엠즈 입고 차감, 원가·매입가 평가)]
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
  // 반제품 이름은 레시피 이름 기준: (기본)○○반죽 = 믹싱(배합), (버터)○○반죽 = 라미네이팅(카트)
  const DEFAULT_SEMI_ITEMS = [
    ['(기본)패스츄리반죽 믹싱', '배합'], ['(기본)파트푀이테반죽 믹싱', '배합'], ['(기본)몽마르트반죽 믹싱', '배합'], ['셰브런 토스트 반죽 믹싱', '배합'], ['정사각퍼프도우 반죽 믹싱', '배합'],
    ['(버터)패스츄리반죽 라미네이팅', '카트'], ['(버터)파트푀이테반죽 라미네이팅', '카트'], ['(버터)몽마르트반죽 라미네이팅', '카트'], ['셰브런 토스트 반죽 라미네이팅', '카트'], ['정사각퍼프도우 반죽 라미네이팅', '카트'],
  ].map(([name, unit], i) => ({ id: 'semi-' + (i + 1), name, unit }));
  // v2.15 이름 통일: 예전 생산일지 이름 → 레시피 이름 (기록·설정·재고 실사에 남은 이름을 불러올 때 한 번 바꿈)
  const SEMI_RENAME = {
    '패스츄리 반죽 믹싱': '(기본)패스츄리반죽 믹싱', '쇼숑 반죽 믹싱': '(기본)파트푀이테반죽 믹싱', '몽마르트 반죽 믹싱': '(기본)몽마르트반죽 믹싱',
    '패스츄리 반죽 라미네이팅': '(버터)패스츄리반죽 라미네이팅', '쇼숑 반죽 라미네이팅': '(버터)파트푀이테반죽 라미네이팅', '몽마르트 반죽 라미네이팅': '(버터)몽마르트반죽 라미네이팅',
  };
  // 1카트 기준 (2026-11-23 현장 기준): 반죽 덩어리 개수 × 버터 넣기 전 반죽 1개 무게(g), 반죽 1개에 넣는 버터(g)
  const DEFAULT_CART_STD = { '(버터)패스츄리반죽 라미네이팅': { pieces: 25, g: 3700, butter: 1000 }, '(버터)몽마르트반죽 라미네이팅': { pieces: 14, g: 3700, butter: 1000 }, '(버터)파트푀이테반죽 라미네이팅': { pieces: 20, g: 3100, butter: 1000 } };
  let renamedOnLoad = false;
  function migrateSemiNames(d) {
    let n = 0;
    const nn = (v) => { if (SEMI_RENAME[v]) { n++; return SEMI_RENAME[v]; } return v; };
    d.semiItems.forEach((x) => { x.name = nn(x.name); });
    Object.values(d.days).forEach((day) => (day.semi || []).forEach((l) => { l.name = nn(l.name); }));
    Object.values(d.scrap || {}).forEach((day) => { [...(day.items || []), ...(day.uses || [])].forEach((x) => { if (x && x.type === '몽마르트 파지') x.type = '패스츄리 파지'; }); }); // 몽마르트 파지 = 패스츄리 파지 (2026-11-24)
    // 이미 입력한 발생 기록도 새 기준(품목 이름)으로 종류를 맞춤: 퀸아망 → 퀸아망 파지, 쇼숑·크렘푀이유 → 쇼숑 파지, 크로와상·뺑오쇼콜라·몽마르트·보스톤 → 패스츄리 파지
    Object.values(d.scrap || {}).forEach((day) => (day.items || []).forEach((x) => { if (!x || !x.code) return; const t = String(x.name || '').replace(/\s/g, ''); const nt = /퀸아망/.test(t) ? '퀸아망 파지' : /쇼숑|크렘푀이유/.test(t) ? '쇼숑 파지' : /크로와상|크루아상|쇼콜라|몽마르트|보스톤/.test(t) ? '패스츄리 파지' : ''; if (nt && x.type !== nt) x.type = nt; }));
    const L = d.loss || {};
    if (L.scrapMix !== undefined) delete L.scrapMix; // 믹싱 파지 별도 기준(7.5kg) 폐지 → 레시피 기준
    ['cartKg', 'cart'].forEach((k) => { if (L[k]) Object.keys(L[k]).forEach((old) => { if (SEMI_RENAME[old]) { if (L[k][SEMI_RENAME[old]] === undefined) L[k][SEMI_RENAME[old]] = L[k][old]; delete L[k][old]; n++; } }); });
    Object.values(L.pie || {}).forEach((x) => { if (x && x.group) x.group = nn(x.group); });
    Object.values(L.endStock || {}).forEach((o) => Object.keys(o).forEach((old) => { if (SEMI_RENAME[old]) { o[SEMI_RENAME[old]] = o[old]; delete o[old]; n++; } }));
    const semiKey = (k) => (String(k).startsWith('SEMI:') && SEMI_RENAME[String(k).slice(5)] ? 'SEMI:' + SEMI_RENAME[String(k).slice(5)] : null);
    if (d.stockBase && d.stockBase.counts) Object.keys(d.stockBase.counts).forEach((k) => { const nk = semiKey(k); if (nk) { d.stockBase.counts[nk] = d.stockBase.counts[k]; delete d.stockBase.counts[k]; n++; } });
    d.stockAdjusts.forEach((a) => { const nk = semiKey(a.code); if (nk) { a.code = nk; n++; } if (a.name) a.name = nn(a.name); });
    return n;
  }

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
    return { version: 1, days: {}, semiItems: DEFAULT_SEMI_ITEMS.map((x) => ({ ...x })), stockBase: null, stockAdjusts: [], loss: { cart: {}, pie: {} }, crew: {}, crewCfg: null, pack: {}, scrap: {}, updatedAt: '' };
  }
  function normalizeDb(p) {
    const d = blankDb();
    if (!p || typeof p !== 'object') return d;
    d.days = p.days && typeof p.days === 'object' ? p.days : {};
    d.semiItems = Array.isArray(p.semiItems) && p.semiItems.length ? p.semiItems : d.semiItems;
    d.stockBase = p.stockBase && p.stockBase.date ? p.stockBase : null;
    d.stockAdjusts = Array.isArray(p.stockAdjusts) ? p.stockAdjusts : [];
    d.loss = p.loss && typeof p.loss === 'object' ? p.loss : { cart: {}, pie: {} };
    d.crew = p.crew && typeof p.crew === 'object' ? p.crew : {};
    d.crewCfg = p.crewCfg && typeof p.crewCfg === 'object' ? p.crewCfg : null;
    d.pack = p.pack && typeof p.pack === 'object' ? p.pack : {};
    d.scrap = p.scrap && typeof p.scrap === 'object' ? p.scrap : {};
    d.updatedAt = p.updatedAt || '';
    if (migrateSemiNames(d) > 0) renamedOnLoad = true;
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
  // 휴무일: db.days[date].off = true, offLabel = 사유(없으면 '휴무')
  function dayOff(date) { const d = db.days[date]; return d && d.off ? (String(d.offLabel || '').trim() || '휴무') : ''; }
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
  // 상태 배지: 다른 탭과 같은 양식 (초록 = 정상, 주황 = 불러오는/저장 중, 빨강 = 실패·미연결)
  function statusState(t) { return /실패|중지|미연결|먼저 저장|필요/.test(t || '') ? 'error' : /중\.\.\.|대기|올립니다/.test(t || '') ? 'syncing' : 'ok'; }
  const STATUS_BADGE = { ok: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100', syncing: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100', error: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100' };
  const STATUS_DOT = { ok: 'bg-emerald-500', syncing: 'bg-amber-500 animate-pulse', error: 'bg-rose-500' };
  const badgeCls = (st) => `flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl text-xs font-bold border ${STATUS_BADGE[st]} transition cursor-pointer`;
  function setStatus(t) {
    statusText = t;
    const el = document.getElementById('prodStatus'), st = statusState(t); if (el) el.textContent = t;
    const badge = document.getElementById('prodStatusBadge'), dot = document.getElementById('prodStatusDot');
    if (badge) badge.className = badgeCls(st); if (dot) dot.className = 'w-2 h-2 rounded-full ' + STATUS_DOT[st];
  }
  function saveNow() {
    if (!getUrl()) { openDbModal(); return; }
    if (!cloudLoaded) { toast('DB를 먼저 불러와 주세요 (오른쪽 새로고침 버튼).', 'error'); return; }
    if (saving) { toast('저장 중입니다.', 'info'); return; }
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    unsaved = true; pushCloud();
  }
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
        if (renamedOnLoad) { renamedOnLoad = false; markChanged(); toast('반제품 이름을 레시피 기준으로 바꿔 저장합니다.', 'info'); }
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
    const TAB_ICON = { CAL: 'calendar-range', SCRAP: 'recycle', CREW: 'users', PACK: 'package-check', LOSS: 'trending-down' };
    const tabBtn = (k, label) => `<button type="button" onclick="Prod.setView('${k}')" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-bold cursor-pointer ${view === k ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'}"><i data-lucide="${TAB_ICON[k]}" class="w-4 h-4"></i><span>${label}</span></button>`;
    const url = getUrl(), stText = statusText || (url ? 'DB 연동됨' : '이 기기에만 저장됨 (DB 미연결)');
    el.innerHTML = `
      <div class="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">${isStock ? '<h2 class="text-base font-extrabold text-stone-900">생산 재고 <span class="text-xs font-bold text-stone-500">냉동창고 생지 · 반제품 · 파지</span></h2>' : `${tabBtn('CAL', '1. 생산 스케쥴')}${tabBtn('SCRAP', '2. 파지 관리')}${tabBtn('CREW', '3. 작업 인원')}${tabBtn('PACK', '4. 포장 완료 등록')}${tabBtn('LOSS', '5. 원재료 손실')}`}</div>
          <div class="flex items-center gap-1.5 ml-auto">
            <button type="button" onclick="Prod.openDbModal()" id="prodStatusBadge" title="DB 연결 설정" class="${badgeCls(statusState(stText))}">
              <span id="prodStatusDot" class="w-2 h-2 rounded-full ${STATUS_DOT[statusState(stText)]}"></span>
              <span id="prodStatus">${esc(stText)}</span>
              <i data-lucide="settings" class="w-3.5 h-3.5 ml-0.5 opacity-75"></i>
            </button>
            <button type="button" onclick="Prod.saveNow()" class="flex items-center gap-1.5 px-3.5 py-1.5 h-9 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer">
              <i data-lucide="cloud-upload" class="w-3.5 h-3.5"></i><span>DB 저장</span>
            </button>
            <button type="button" onclick="Prod.pull()" title="DB 새로고침" class="flex items-center justify-center w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition cursor-pointer"><i data-lucide="refresh-cw" class="w-4 h-4"></i></button>
          </div>
        </div>
        ${isStock ? renderStock() : view === 'LOSS' ? renderLoss() : view === 'SCRAP' ? renderScrap() : view === 'CREW' ? renderCrew() : view === 'PACK' ? renderPack() : renderCalendar()}
      </div>
      <div id="prodModal"></div>`;
    if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }
    if (draft) renderEditor();
  }

  // ----- 생산 스케쥴 (달력) -----
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
    const _prods = getProducts(), _defs = pieDoughDefaults(_prods);
    const usedWarn = (date) => { if (date < USED_WARN_FROM) return ''; const miss = missingUsedGroups(db.days[date], _prods, _defs); return miss.length ? `<span class="self-center" title="파이를 성형했는데 사용 카트 미입력: ${esc(miss.map(semiShort).join(', '))}">${WARN_TRI('w-4 h-4')}</span>` : ''; };
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
        if (!c.inMonth) return `<div class="rounded-xl bg-stone-50/60 border border-dashed border-stone-200 p-2 text-xl leading-none text-stone-300 font-black">${c.day}</div>`;
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
        const isToday = c.date === tdy, off = dayOff(c.date);
        const offBlock = off ? `<div class="flex-1 flex items-center justify-center py-2 text-center text-base font-extrabold text-rose-700 break-keep">${esc(off)}</div>` : '';
        if (off && !items.length) return `<button type="button" onclick="Prod.openDay('${c.date}')" class="text-left min-h-[64px] rounded-xl border ${isToday ? 'border-amber-500 ring-1 ring-amber-300' : 'border-rose-200'} bg-rose-50 hover:border-rose-400 p-2 flex flex-col gap-1 cursor-pointer min-w-0">
          <div class="flex items-center justify-between gap-1"><span class="flex items-baseline gap-1.5 min-w-0"><span class="text-xl leading-none font-black tabular-nums ${isToday ? 'text-amber-700' : 'text-rose-600'}">${c.day}</span>${crewBadge(c.date)}</span></div>${offBlock}
        </button>`;
        return `<button type="button" onclick="Prod.openDay('${c.date}')" class="text-left min-h-[64px] rounded-xl border ${isToday ? 'border-amber-500 ring-1 ring-amber-300' : off ? 'border-rose-200' : 'border-stone-200'} ${off ? 'bg-rose-50' : 'bg-white'} hover:border-amber-400 hover:shadow-xs p-2 flex flex-col gap-1 cursor-pointer min-w-0">
          <div class="flex items-center justify-between gap-1"><span class="flex items-baseline gap-1.5 min-w-0"><span class="text-xl leading-none font-black tabular-nums ${isToday ? 'text-amber-700' : dayCls(c)}">${c.day}</span>${crewBadge(c.date)}${usedWarn(c.date)}</span>${off ? `<span class="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[11px] font-extrabold">${esc(off)}</span>` : dayBadge(c, t)}</div>
          ${lines.length ? `<div class="grid grid-cols-[auto_1fr] gap-x-1 text-xs tabular-nums"><span class="font-semibold text-stone-500">목표</span><span class="text-right font-bold">${won(t.target)}</span><span class="font-semibold text-stone-500">실행</span><span class="text-right font-extrabold text-amber-900">${won(t.actual)}</span></div>` : ''}
          ${items.length ? `<div class="${lines.length ? 'border-t border-stone-100 pt-1 ' : ''}flex flex-col gap-1">${shown}</div>` : '<div class="text-xs text-stone-300 mt-1">클릭해서 목표 입력</div>'}
        </button>`;
      }).join('');
      // 주말(토·일) 한 칸: 날짜별 작은 칸 2개(요약만), 눌러서 입력
      const wk = w.slice(5).map((c) => {
        if (!c.inMonth) return `<div class="flex-1 rounded-lg border border-dashed border-stone-200 bg-stone-50/60 p-1.5 text-base leading-none text-stone-300 font-black">${c.day}</div>`;
        const day = db.days[c.date], t = dayTotals(day);
        const n = (((day && day.lines) || []).length) + (((day && day.semi) || []).length);
        const isToday = c.date === tdy, off = dayOff(c.date);
        if (off && !n) return `<button type="button" onclick="Prod.openDay('${c.date}')" class="flex-1 text-left rounded-lg border ${isToday ? 'border-amber-500 ring-1 ring-amber-300' : 'border-rose-200'} bg-rose-50 hover:border-rose-400 p-1.5 flex flex-col gap-0.5 cursor-pointer min-w-0"><span class="text-base leading-none font-black tabular-nums text-rose-600">${c.day}<span class="text-[10px] font-extrabold ml-0.5">${DOW[c.dow]}</span></span><span class="text-[11px] font-extrabold text-rose-700 truncate" title="${esc(off)}">${esc(off)}</span></button>`;
        return `<button type="button" onclick="Prod.openDay('${c.date}')" class="flex-1 text-left rounded-lg border ${isToday ? 'border-amber-500 ring-1 ring-amber-300' : off ? 'border-rose-200' : 'border-stone-200'} ${off ? 'bg-rose-50' : n ? 'bg-white' : 'bg-stone-50'} hover:border-amber-400 p-1.5 flex flex-col gap-0.5 cursor-pointer min-w-0">
          <div class="flex items-center justify-between gap-1"><span class="text-base leading-none font-black tabular-nums ${isToday ? 'text-amber-700' : dayCls(c)}">${c.day}<span class="text-[10px] font-extrabold ml-0.5">${DOW[c.dow]}</span></span></div>${n ? `<div class="-mt-0.5">${dayBadge(c, t)}</div>` : ''}
          ${n ? `<div class="text-[11px] font-extrabold text-amber-900 tabular-nums truncate" title="실행 ${won(t.actual)} / 목표 ${won(t.target)}">${Math.round((t.actual || 0) / 10000).toLocaleString('ko-KR')}만</div><div class="text-[11px] text-stone-500 font-semibold">${n}품목</div>` : '<div class="text-[11px] text-stone-300">휴무</div>'}
        </button>`;
      }).join('');
      const weekendCell = `<div class="flex flex-col gap-1.5 min-w-0">${wk}</div>`;
      const wr = rateOf(wA, wT);
      if (!wT && !wA) return `<div class="grid gap-1.5" style="${GRID_STYLE}">${cells}${weekendCell}
        <div class="rounded-xl border border-stone-200 bg-stone-50/60 px-2.5 py-1.5 flex items-center gap-2 text-xs"><span class="px-1.5 py-0.5 rounded-md bg-white border border-stone-200 text-stone-500 font-extrabold">${wi + 1}주</span><span class="text-stone-400 font-semibold">기록 없음</span></div></div>`;
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
            <h3 class="text-base font-extrabold text-stone-900 px-1">${y}년 ${m}월 생산 스케쥴</h3>
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
          <div>· 배합은 제품단가 탭의 '1배합 PK수'로 PK를 계산합니다. 실제로 나온 PK가 다르면 <b>포장 수량</b> 칸을 고쳐 주세요. 생산 재고는 [포장 완료 등록] 수량으로 잡힙니다.</div>
          <div>· 금액 = 재고수량 × 엠즈 매입가. 줄을 만든 날의 단가로 고정됩니다. 단가가 0원인 품목은 제품단가 탭에 금액이 들어가면 자동으로 따라갑니다.</div>
          <div>· 쇼숑오뽐므는 PK로 입력하면 4PK = 1BOX로 바꿔 재고·금액을 BOX로 잡습니다.</div>
          <div>· 반제품은 수량만 기록하고 금액·재고에는 넣지 않습니다. 주말 근무도 같은 방식으로 입력합니다.</div>
        </div>
      </div>`;
  }

  // ----- 일자 편집 -----
  function openDay(date) {
    const day = db.days[date] || { lines: [], semi: [], memo: '' };
    draft = { date, lines: JSON.parse(JSON.stringify(day.lines || [])), semi: JSON.parse(JSON.stringify(day.semi || [])), memo: day.memo || '', off: !!day.off, offLabel: day.offLabel || '' };
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
    const off = !!draft.off, offLabel = off ? String(draft.offLabel || '').trim() : '';
    if (!lines.length && !semi.length && !draft.memo && !off) delete db.days[draft.date];
    else db.days[draft.date] = { lines, semi, memo: draft.memo, ...(off ? { off: true, offLabel } : {}), updatedAt: new Date().toISOString() };
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
      if (conv) conv.textContent = l.unit === '배합' || su !== 'PK' ? ` · 목표 ${num(tp)}${su} · 실행 ${num(lineAutoActualPk(l))}${su}` : '';
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
      return `<button type="button" onclick="Prod.setPicker('${c}', '')" class="px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${on ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}">${label}</button>`;
    }).join('');
    const chip = (key, label, sub, isUsed, onclick) => `<button type="button" onclick="${onclick}" class="text-left px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition ${isUsed ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-stone-200 bg-white hover:border-amber-400 hover:bg-amber-50/40'}"><div class="font-bold leading-tight truncate">${isUsed ? '✓ ' : ''}${esc(label)}</div><div class="text-[11px] text-stone-500">${sub}</div></button>`;
    let items = [];
    if (q || pickerCat !== 'SEMI') {
      items = products.filter((p) => (q ? (String(p.productName).toLowerCase().includes(q) || String(p.productCode).includes(q)) : p.cat === pickerCat))
        .map((p) => chip(p.productCode, p.productName, `${esc(p.productCode)} · ${CAT_LABEL[p.cat]} · ${p.unit}${p.stockUnit !== 'PK' ? ` (재고 ${p.stockUnit})` : ''}`, used.has(String(p.productCode)), `Prod.addProduct('${esc(p.productCode)}')`));
    }
    if (q || pickerCat === 'SEMI') {
      items = items.concat(db.semiItems.filter((s) => !q || s.name.toLowerCase().includes(q)).map((s) => chip(s.name, s.name, `반제품 · ${esc(s.unit)}`, usedSemi.has(s.name), `Prod.addSemiByName(${esc(JSON.stringify(s.name))})`)));
    }
    return `<div class="flex flex-wrap items-center gap-1 mb-1.5">${tabs}</div>
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-1">${items.join('') || '<div class="col-span-full py-4 text-center text-sm text-stone-400">찾는 품목이 없습니다.</div>'}</div>`;
  }
  function draftMissingUsed() {
    if (!draft || draft.date < USED_WARN_FROM) return [];
    const products = getProducts();
    return missingUsedGroups(draft, products, pieDoughDefaults(products));
  }
  function usedWarnBanner() {
    const miss = draftMissingUsed(); if (!miss.length) return '';
    return `<div class="mb-2 rounded-xl bg-amber-50 border border-amber-300 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-sm"><span class="inline-flex items-center gap-1.5 font-bold text-amber-900">${WARN_TRI('w-4 h-4')}파이를 성형했는데 사용 카트가 비어 있습니다: ${esc(miss.map(semiShort).join(', '))}</span><button type="button" onclick="Prod.addUsedRows()" class="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-extrabold cursor-pointer">사용 카트 칸으로 이동</button></div>`;
  }
  // 사용 카트를 적을 라미네이팅 줄이 없으면 추가하고 첫 줄로 이동
  function addUsedRows() {
    const miss = draftMissingUsed(); if (!miss.length) return;
    let firstId = null;
    miss.forEach((name) => { let l = draft.semi.find((x) => x.name === name); if (!l) { const it = db.semiItems.find((x) => x.name === name) || { name, unit: '카트' }; l = { id: uid(), name: it.name, unit: it.unit, target: 0, actual: 0, note: '' }; draft.semi.push(l); } if (!firstId) firstId = l.id; });
    renderEditor(); if (firstId) focusRow(firstId);
  }
  function renderEditor() {
    const host = document.getElementById('prodModal'); if (!host || !draft) return;
    const products = getProducts();
    const inCls = 'no-spinner w-full text-right border rounded-lg pl-2 pr-9 py-1 text-sm font-bold tabular-nums focus:border-amber-500';
    const bd = 'border-stone-300';
    const unitIn = (html, unit) => `<div class="relative">${html}<span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">${unit}</span></div>`;
    const lineRows = draft.lines.map((l) => {
      const known = productByCode(l.code, products);
      const su = lineStockUnit(l), pr = linePrice(l), following = !(Number(l.pricePk) > 0);
      const cur = known && ((Number(l.pricePk) > 0 && known.msBuyPricePk !== l.pricePk) || (Number(l.pkPerBatch) > 0 && known.batchOutputPk !== l.pkPerBatch));
      const added = !(Number(l.target) > 0) && Number(l.actual) > 0;
      return `<div data-line="${l.id}" class="grid grid-cols-[minmax(0,1.8fr)_96px_96px_112px_minmax(0,1fr)_30px] gap-2 items-center px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-sm transition">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5"><span class="text-[11px] font-bold px-1.5 py-0.5 rounded ${l.unit === 'PK' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}">${CAT_LABEL[l.cat] || ''}</span><span class="font-bold text-stone-900 truncate" title="${esc(l.name)}">${esc(l.name)}</span>${added ? '<span class="text-[11px] font-bold text-blue-700">계획 외</span>' : ''}</div>
          <div class="text-[11px] text-stone-500 truncate">${l.unit === '배합' ? `1배합 = ${num(linePkPerBatch(l))}PK · ` : ''}${su !== 'PK' ? `재고 ${su} (${linePerStock(l)}PK) · ` : ''}<span class="${cur ? 'text-rose-600' : ''}" title="${cur ? '현재 제품단가와 다름 — [현재 단가로 다시 계산]' : ''}">${won(pr)}/${su}${following ? ' (현재 단가 따름)' : ''}</span><span class="text-stone-400" data-k="conv"></span></div>
        </div>
        ${unitIn(`<input type="number" min="0" step="any" value="${l.target || ''}" placeholder="0" oninput="Prod.setLineField('${l.id}','target',this.value)" class="${inCls} ${bd}">`, l.unit)}
        ${unitIn(`<input type="number" min="0" step="any" value="${l.actual || ''}" placeholder="0" oninput="Prod.setLineField('${l.id}','actual',this.value)" class="${inCls} ${bd} bg-amber-50/70">`, l.unit)}
        ${unitIn(`<input type="number" min="0" step="any" data-k="apk" value="${l.pkManual ? l.actualPk : ''}" placeholder="${num(lineAutoActualPk(l))}" oninput="Prod.setLineField('${l.id}','actualPk',this.value)" title="포장 수량(PK). 비워 두면 회색 자동값 사용(원재료 손실 분석에서는 '미확인')" class="${inCls} ${l.unit === '배합' && Number(l.actual) > 0 && !l.pkManual ? 'border-amber-500 border-2' : bd}">`, su)}
        <div class="text-right text-sm tabular-nums leading-tight"><div class="text-stone-500" data-k="tamt"></div><div class="font-extrabold text-amber-900" data-k="aamt"></div></div>
        <button type="button" onclick="Prod.removeLine('${l.id}')" title="삭제" class="w-7 h-7 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer text-lg leading-none">×</button>
      </div>`;
    }).join('');
    const semiRows = draft.semi.map((l) => { const lam = isLaminating(l.name); return `<div data-semi="${l.id}" class="grid grid-cols-[minmax(0,1.8fr)_96px_96px_112px_minmax(0,1fr)_30px] gap-2 items-center px-2.5 py-1 rounded-lg text-sm border border-dashed border-stone-300 bg-stone-50 transition">
        <div class="min-w-0"><div class="flex items-center gap-1.5"><span class="text-[11px] font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-600">반제품</span><span class="font-bold text-stone-800 truncate">${esc(l.name)}</span></div>${lam ? '<div class="text-xs text-stone-500 mt-0.5">재고 관리 · 목표 / 만든 카트 / 사용 카트 / 폐기</div>' : '<div class="text-xs text-stone-400 mt-0.5">기록만 (재고·금액 제외)</div>'}</div>
        ${unitIn(`<input type="number" min="0" step="any" value="${l.target || ''}" placeholder="0" oninput="Prod.setSemiField('${l.id}','target',this.value)" title="목표" class="${inCls} ${bd}">`, esc(l.unit))}
        ${unitIn(`<input type="number" min="0" step="any" value="${l.actual || ''}" placeholder="0" oninput="Prod.setSemiField('${l.id}','actual',this.value)" title="${lam ? '만든 카트' : '실행'}" class="${inCls} ${bd} bg-amber-50/70">`, esc(l.unit))}
        ${lam ? `${unitIn(`<input type="number" min="0" step="any" value="${l.used || ''}" placeholder="0" oninput="Prod.setSemiField('${l.id}','used',this.value)" title="사용 카트 (파이 성형에 쓴 카트)" class="${inCls} ${bd} bg-blue-50/60">`, '사용')}
        <div class="flex items-center gap-1.5">${unitIn(`<input type="number" min="0" step="any" value="${l.waste || ''}" placeholder="0" oninput="Prod.setSemiField('${l.id}','waste',this.value)" title="폐기 카트" class="${inCls} ${bd} w-24 bg-rose-50/50">`, '폐기')}<input type="text" value="${esc(l.note || '')}" oninput="Prod.setSemiField('${l.id}','note',this.value)" placeholder="메모" class="min-w-0 flex-1 border border-stone-300 rounded-lg px-2 py-1.5 text-sm"></div>` : `<input type="text" value="${esc(l.note || '')}" oninput="Prod.setSemiField('${l.id}','note',this.value)" placeholder="메모" class="col-span-2 w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm">`}
        <button type="button" onclick="Prod.removeSemi('${l.id}')" title="삭제" class="w-7 h-7 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer text-lg leading-none">×</button>
      </div>`; }).join('');
    const d = parseYmd(draft.date);
    const pw = prevWorkday(draft.date);
    const lastWeek = (() => { const x = parseYmd(draft.date); x.setDate(x.getDate() - 7); return ymd(x); })();
    const keepScroll = (document.getElementById('prodEditBody') || {}).scrollTop || 0;
    host.innerHTML = `<div class="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-3 sm:p-6" onclick="if(event.target===this)Prod.closeDay()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[1180px] max-h-[94vh] flex flex-col overflow-hidden">
        <div class="px-5 py-2.5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-extrabold text-stone-900">${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]}) 생산일지</h3>
            <div class="text-xs text-stone-500 mt-0.5" id="prodEditCount"></div>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 text-xs">
            <button type="button" onclick="Prod.copyTargetsFrom('${pw}')" class="px-3 py-1.5 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">전 근무일(${pw.slice(5).replace('-', '/')}) 품목 불러오기</button>
            <button type="button" onclick="Prod.copyTargetsFrom('${lastWeek}')" class="px-3 py-1.5 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">지난주 같은 요일</button>
            <button type="button" onclick="Prod.refreshPrices()" class="px-3 py-1.5 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">현재 단가로 다시 계산</button>
            <button type="button" onclick="Prod.closeDay()" title="닫기" class="ml-1 w-8 h-8 rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer text-xl leading-none">×</button>
          </div>
        </div>
        <div class="px-5 py-1.5 border-b ${draft.off ? 'bg-rose-50 border-rose-200' : 'bg-stone-50 border-stone-200'} flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-2 text-sm font-extrabold cursor-pointer ${draft.off ? 'text-rose-700' : 'text-stone-700'}"><input type="checkbox" ${draft.off ? 'checked' : ''} onchange="Prod.setOff(this.checked)" class="w-4 h-4 accent-rose-600 cursor-pointer">이 날 휴무</label>
          ${draft.off ? `<input type="text" value="${esc(draft.offLabel || '')}" oninput="Prod.setOffLabel(this.value)" placeholder="달력에 보일 문구 (예: 추석 연휴) · 비우면 '휴무'" class="flex-1 min-w-[240px] max-w-[420px] border border-rose-200 bg-white rounded-lg px-3 py-1.5 text-sm font-semibold">` : '<span class="text-xs text-stone-500">체크하면 달력 칸이 옅은 빨간색으로 바뀌고 문구가 보입니다.</span>'}
        </div>
        <div id="prodEditBody" class="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3">
          <section>
            <div class="flex items-center justify-between gap-2 mb-2">
              <h4 class="text-sm font-extrabold text-stone-800">품목 추가</h4>
              <input type="search" value="${esc(pickerQuery)}" oninput="Prod.setPicker(null, this.value)" placeholder="품목명·코드 검색" class="w-56 border border-stone-300 rounded-lg px-3 py-1.5 text-sm">
            </div>
            <div id="prodPicker" class="rounded-xl bg-stone-50 border border-stone-200 p-2">${renderPickerBody()}</div>
          </section>
          <section>
            ${usedWarnBanner()}
            <div class="grid grid-cols-[minmax(0,1.8fr)_96px_96px_112px_minmax(0,1fr)_30px] gap-2 px-2.5 pb-1 text-xs font-extrabold text-stone-500">
              <div>오늘 품목</div><div class="text-right">목표</div><div class="text-right">실행</div><div class="text-right" title="배합으로 만든 실제 PK 수량 (원재료 손실 분석에 사용). 재고는 [포장 완료 등록] 기준">포장 수량</div><div class="text-right">목표 / 실행 금액</div><div></div>
            </div>
            <div class="flex flex-col gap-1.5">
              ${lineRows || '<div class="py-6 text-center text-sm text-stone-400 rounded-xl border border-dashed border-stone-200">위에서 품목을 눌러 추가하세요.</div>'}
              ${semiRows}
            </div>
            <div class="text-xs text-stone-500 mt-2 leading-relaxed">· 계획에 없던 품목은 목표를 비우고 실행만 적으면 됩니다. · 생지는 <b class="text-amber-800">포장 수량</b>을 적어야 원재료 손실 분석에 들어갑니다(주황 테두리 = 아직 안 적음). · 반제품은 금액에 들어가지 않습니다.</div>
          </section>
          <section>
            <label class="text-sm font-extrabold text-stone-800">그날 메모</label>
            <textarea oninput="Prod.setMemo(this.value)" rows="1" placeholder="사정·변경 사유 등" class="mt-1 w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm">${esc(draft.memo || '')}</textarea>
          </section>
        </div>
        <div class="px-5 py-2 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-3">
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

  // ===================== 작업 인원 =====================
  //  db.crewCfg = { staff:[{id,name,part,active}], teams:[{id,name,short,part}], leaveTypes:[{name,weight}] }
  //  db.crew = { 'YYYY-MM-DD': { assign:{ teamId:[{sid,w}] }, leaves:[{id,sid,type,note}] } }
  //  근무 인원 = 그날 배정된 사람 수 (한 사람은 최대 1명, 0.5 배정은 0.5명) / 휴무 인원 = 휴무 타입의 인원값 합 (반차 0.5)
  const DEFAULT_TEAMS = [
    ['론도', '론도', '시터(라미네이팅 기계)'], ['파이팀 작업대 / 바리오컷 포함', '파이 작업대', '파이/패스츄리 작업대'],
    ['파이/반죽/해포개량 작업대 (반죽과 분할+크라 파지 생산)', '파이 보조', '파이팀 보조'], ['라미네이팅', '라미네이팅', '라미네이팅 전담'],
    ['반죽 / 해포개량', '반죽·해포', '반죽·해포 전담'], ['알생지팀', '알생지', '생지 분할·성형'], ['파베이크팀', '파베이크', '파베이크 생산'],
    ['제과팀', '제과', '케이크/제과'], ['포장출하팀', '포장출하', '포장/출하'],
  ].map(([name, short, part], i) => ({ id: 't' + (i + 1), name, short, part }));
  const DEFAULT_LEAVES = [['연차', 1], ['무급휴무', 1], ['휴무', 1], ['병가', 1], ['경조', 1], ['외근', 1], ['오전반차', 0.5], ['오후반차', 0.5], ['무급반차', 0.5], ['무급오전휴무', 0.5], ['무급오후반차', 0.5], ['조퇴', 0.5], ['조기퇴근', 0.5]].map(([name, weight]) => ({ name, weight }));
  const STAFF_PARTS = ['생산총괄', '파이', '알파베', '제과', '출하', '지원', '품질관리', '사무'];
  // 작업 구분 → 생산 파트 (1인 생산금액 계산과 달력 색 묶음에 사용). [인원 설정 > 작업 구분]에서 바꿀 수 있음
  const PROD_CATS = [['PIE', '파이'], ['DOUGH', '알생지'], ['PARBAKE', '파베이크'], ['BAKERY', '제과'], ['NONE', '생산 외 (출하·지원)']];
  const DEFAULT_TEAM_CAT = { t1: 'PIE', t2: 'PIE', t3: 'PIE', t4: 'PIE', t5: 'DOUGH', t6: 'DOUGH', t7: 'PARBAKE', t8: 'BAKERY', t9: 'NONE' };
  const CAT_STYLE = {
    PIE: { bar: 'border-amber-400', text: 'text-amber-700', card: 'bg-amber-50 border-amber-200' },
    DOUGH: { bar: 'border-emerald-500', text: 'text-emerald-700', card: 'bg-emerald-50 border-emerald-200' },
    PARBAKE: { bar: 'border-orange-500', text: 'text-orange-700', card: 'bg-orange-50 border-orange-200' },
    BAKERY: { bar: 'border-violet-400', text: 'text-violet-700', card: 'bg-violet-50 border-violet-200' },
    NONE: { bar: 'border-sky-500', text: 'text-sky-700', card: 'bg-sky-50 border-sky-200' },
  };
  function teamCat(t) { return CAT_STYLE[t.cat] ? t.cat : (DEFAULT_TEAM_CAT[t.id] || 'NONE'); }
  function teamGroups(teams) {
    return PROD_CATS.map(([key, label]) => ({ key, label, ...CAT_STYLE[key], teams: teams.filter((t) => teamCat(t) === key) })).filter((g) => g.teams.length);
  }
  const man = (v) => (Math.round(v / 1000) / 10).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '만';
  // 하루 1인 생산금액: 생산 스케쥴 금액(엠즈 매입가) ÷ 근무 인원. 인원 기준은 설정(ALL: 전체 근무 / PROD: 생산 파트 인원만)
  function crewProd(date) {
    const cfg = crewCfg(), day = crewDays()[date], t = dayTotals(db.days[date]);
    const catOf = {}; cfg.teams.forEach((tm) => { catOf[tm.id] = teamCat(tm); });
    const ppl = {}, prodPpl = {}, catHeads = {};
    Object.entries((day && day.assign) || {}).forEach(([tid, arr]) => (arr || []).forEach((a) => {
      const w = Number(a.w) || 1, c = catOf[tid] || 'NONE';
      ppl[a.sid] = (ppl[a.sid] || 0) + w; if (c !== 'NONE') prodPpl[a.sid] = (prodPpl[a.sid] || 0) + w;
      catHeads[c] = (catHeads[c] || 0) + w;
    }));
    const cap = (o) => Object.values(o).reduce((sum, w) => sum + Math.min(1, w), 0);
    const all = cap(ppl), prod = cap(prodPpl);
    return { heads: cfg.perCapita === 'PROD' ? prod : all, all, prod, actual: t.actual, target: t.target, byCat: t.byCat, catHeads };
  }
  function crewCfg() {
    const c = db.crewCfg && typeof db.crewCfg === 'object' ? db.crewCfg : (db.crewCfg = {});
    if (!Array.isArray(c.staff)) c.staff = [];
    if (!Array.isArray(c.teams) || !c.teams.length) c.teams = DEFAULT_TEAMS.map((t) => ({ ...t }));
    if (!Array.isArray(c.leaveTypes) || !c.leaveTypes.length) c.leaveTypes = DEFAULT_LEAVES.map((t) => ({ ...t }));
    return c;
  }
  function crewDays() { if (!db.crew || typeof db.crew !== 'object') db.crew = {}; return db.crew; }
  function staffById(id) { return crewCfg().staff.find((s) => s.id === id) || null; }
  function staffName(id) { const s = staffById(id); return s ? s.name : '(삭제된 인원)'; }
  function leaveWeight(type) { const t = crewCfg().leaveTypes.find((x) => x.name === type); return t ? Number(t.weight) || 0 : 1; }
  function crewTotals(day) {
    const r = { work: 0, leave: 0, byTeam: {}, people: {} };
    if (!day) return r;
    Object.entries(day.assign || {}).forEach(([tid, arr]) => (arr || []).forEach((a) => {
      const w = Number(a.w) || 1;
      r.byTeam[tid] = (r.byTeam[tid] || 0) + w;
      r.people[a.sid] = (r.people[a.sid] || 0) + w;
    }));
    r.work = Object.values(r.people).reduce((s, w) => s + Math.min(1, w), 0);
    r.leave = (day.leaves || []).reduce((s, l) => s + (l.sid ? leaveWeight(l.type) : 0), 0);
    return r;
  }
  const n1 = (v) => (Math.round(v * 10) / 10).toLocaleString('ko-KR', { maximumFractionDigits: 1 });
  // 미배정 팀원: 그날 배정 기록이 있는데, 재직 중인 팀원이 배정도 하루 휴무도 없는 경우 (반차인데 배정이 없으면 포함)
  const WARN_TRI = (cls) => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true"><path d="M12 2.5 1.5 21h21L12 2.5z" fill="#f59e0b" stroke="#d97706" stroke-width="1.5" stroke-linejoin="round"/><rect x="11" y="8.5" width="2" height="6.5" rx="1" fill="#fff"/><circle cx="12" cy="17.8" r="1.2" fill="#fff"/></svg>`;
  function crewUnassigned(date) {
    const day = crewDays()[date];
    if (!day || !Object.values(day.assign || {}).some((a) => (a || []).length)) return [];
    const assigned = new Set(Object.values(day.assign || {}).flat().map((a) => a.sid));
    const fullLeave = new Set((day.leaves || []).filter((l) => l.sid && leaveWeight(l.type) >= 1).map((l) => l.sid));
    return crewCfg().staff.filter((s) => s.active !== false && !assigned.has(s.id) && !fullLeave.has(s.id));
  }
  function crewBadge(date) {
    const day = crewDays()[date];
    if (!day) return '';
    const t = crewTotals(day);
    if (!t.work && !t.leave) return '';
    return `<span class="text-[11px] font-bold text-stone-500 whitespace-nowrap">근무 <b class="text-stone-800">${n1(t.work)}</b> · 휴무 <b class="${t.leave ? 'text-rose-600' : 'text-stone-800'}">${n1(t.leave)}</b></span>`;
  }

  function renderCrew() {
    const ym = cursorMonth, [y, m] = ym.split('-').map(Number);
    const weeks = monthWeeks(ym), tdy = today(), cfg = crewCfg(), days = crewDays();
    const prevYm = ymd(new Date(y, m - 2, 1)).slice(0, 7), nextYm = ymd(new Date(y, m, 1)).slice(0, 7);
    // 월 집계 (팀별 월누적 인원·출근일수·평균)
    const teamSum = {}; let workSum = 0, leaveSum = 0, workDays = 0;
    Object.entries(days).forEach(([d, day]) => {
      if (d.slice(0, 7) !== ym) return;
      const t = crewTotals(day);
      workSum += t.work; leaveSum += t.leave; if (t.work > 0) workDays++;
      Object.entries(t.byTeam).forEach(([tid, w]) => { const s = teamSum[tid] || (teamSum[tid] = { sum: 0, days: 0 }); s.sum += w; if (w > 0) s.days++; });
    });
    // 1인 생산금액 (생산 실행 금액과 근무 인원이 둘 다 있는 날만)
    const pm = { actual: 0, target: 0, heads: 0, days: 0, missing: [], cat: {} };
    Object.keys(db.days).concat(Object.keys(days)).filter((d, i, a) => a.indexOf(d) === i && d.slice(0, 7) === ym).sort().forEach((d) => {
      const p = crewProd(d);
      if (p.actual > 0 && p.heads > 0) {
        pm.actual += p.actual; pm.target += p.target; pm.heads += p.heads; pm.days++;
        Object.entries(p.byCat).forEach(([c, v]) => { const o = pm.cat[c] || (pm.cat[c] = { amount: 0, heads: 0 }); o.amount += v.actual; });
        Object.entries(p.catHeads).forEach(([c, h]) => { const o = pm.cat[c] || (pm.cat[c] = { amount: 0, heads: 0 }); o.heads += h; });
      } else if (p.actual > 0) pm.missing.push(Number(d.slice(8)));
    });
    const basis = cfg.perCapita === 'PROD' ? '생산 파트 인원' : '전체 근무 인원';
    const kpi = (label, value, sub, hl) => `<div class="${hl ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200/90'} rounded-2xl p-4 border shadow-xs"><div class="text-xs font-bold ${hl ? 'text-amber-800' : 'text-stone-500'}">${label}</div><div class="mt-1 text-xl font-extrabold tabular-nums ${hl ? 'text-amber-900' : ''}">${value}</div>${sub ? `<div class="text-xs text-stone-500 mt-0.5">${sub}</div>` : ''}</div>`;
    const GRID_STYLE = 'grid-template-columns: repeat(5, minmax(0, 1fr)) 60px 132px';
    const ROW = 'display:grid;grid-template-columns:58px minmax(0,1fr) 22px;column-gap:4px;align-items:start';
    const LROW = 'display:grid;grid-template-columns:72px minmax(0,1fr);column-gap:4px;align-items:start';
    const dayCls = (c) => c.dow === 0 ? 'text-rose-600' : c.dow === 6 ? 'text-blue-600' : 'text-stone-900';
    const weekRows = weeks.map((w, wi) => {
      let wWork = 0, wLeave = 0, wDays = 0, wAc = 0, wHeads = 0;
      w.forEach((c) => { if (!c.inMonth) return; const t = crewTotals(days[c.date]); wWork += t.work; wLeave += t.leave; if (t.work > 0) wDays++; const p = crewProd(c.date); if (p.actual > 0 && p.heads > 0) { wAc += p.actual; wHeads += p.heads; } });
      const perLine = (p) => p.heads > 0 && (p.actual > 0 || p.target > 0)
        ? `<div class="flex items-center justify-between gap-1 rounded-md bg-amber-50 border border-amber-100 px-1.5 py-0.5 text-[11px] tabular-nums"><span class="font-bold text-amber-800">1인 생산</span><span><b class="font-extrabold text-amber-900">${p.actual > 0 ? man(p.actual / p.heads) : '-'}</b><span class="text-stone-500 font-semibold"> / 목표 ${man(p.target / p.heads)}</span></span></div>`
        : (p.actual > 0 ? '<div class="rounded-md bg-stone-50 border border-dashed border-stone-200 px-1.5 py-0.5 text-[11px] font-bold text-stone-400">생산 기록 있음 · 인원 미입력</div>' : '');
      const cells = w.slice(0, 5).map((c) => {
        if (!c.inMonth) return `<div class="rounded-xl bg-stone-50/60 border border-dashed border-stone-200 p-2 text-xl leading-none text-stone-300 font-black">${c.day}</div>`;
        const day = days[c.date], t = crewTotals(day), isToday = c.date === tdy, pd = crewProd(c.date), off = dayOff(c.date);
        const ga = (day && day.assign) || {};
        // 작업 구분을 파트별로 묶고 왼쪽 색 띠로 구분 (생산 스케쥴과 같은 방식). 이름은 줄바꿈해서 전부 보이게
        const teamBlocks = teamGroups(cfg.teams).map((g) => {
          const rows = g.teams.filter((tm) => (ga[tm.id] || []).length).map((tm) => {
            const arr = ga[tm.id];
            const names = arr.map((a) => `<span class="whitespace-nowrap">${esc(staffName(a.sid))}${Number(a.w) === 0.5 ? '<span class="ml-px px-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold">½</span>' : ''}</span>`).join('');
            return `<div class="text-xs leading-[1.35]" style="${ROW}"><span class="truncate font-extrabold ${g.text}" title="${esc(tm.name)}">${esc(tm.short || tm.name)}</span><span class="flex flex-wrap gap-x-1.5 font-semibold text-stone-800 min-w-0">${names}</span><b class="text-right font-extrabold tabular-nums text-stone-900">${n1(t.byTeam[tm.id] || 0)}</b></div>`;
          });
          return rows.length ? `<div class="border-l-[3px] ${g.bar} pl-1.5 flex flex-col gap-0.5">${rows.join('')}</div>` : '';
        }).join('');
        const lv = ((day && day.leaves) || []).filter((l) => l.sid);
        const leaveBlock = lv.length ? `<div class="${teamBlocks ? 'mt-1' : ''} rounded-lg bg-rose-50 border border-rose-200 px-1.5 py-1 flex flex-col gap-0.5">
            <div class="text-[11px] leading-4 font-extrabold text-rose-700 border-b border-rose-200 pb-0.5 mb-0.5">휴무 ${n1(t.leave)}명</div>
            ${lv.map((l) => `<div class="text-xs leading-[1.35]" style="${LROW}"><span class="truncate font-bold text-stone-800">${esc(staffName(l.sid))}</span><span class="min-w-0"><b class="font-extrabold text-rose-700">${esc(l.type)}</b>${l.note ? `<span class="text-stone-500 font-semibold"> · ${esc(l.note)}</span>` : ''}</span></div>`).join('')}
          </div>` : '';
        const una = crewUnassigned(c.date);
        const unaBlock = una.length ? `<div class="rounded-md bg-amber-50 border border-amber-300 px-1.5 py-0.5 text-[11px] leading-snug"><b class="inline-flex items-center gap-0.5 font-extrabold text-amber-800 align-middle">${WARN_TRI('w-3.5 h-3.5')}미배정 ${una.length}명</b> <span class="font-semibold text-stone-700">${una.map((x) => esc(x.name)).join(' ')}</span></div>` : '';
        return `<button type="button" onclick="Prod.openCrewDay('${c.date}')" class="text-left min-h-[64px] rounded-xl border ${isToday ? 'border-amber-500 ring-1 ring-amber-300' : una.length ? 'border-amber-400 ring-1 ring-amber-200' : off ? 'border-rose-200' : 'border-stone-200'} ${off ? 'bg-rose-50' : 'bg-white'} hover:border-amber-400 hover:shadow-xs p-2 flex flex-col gap-1 cursor-pointer min-w-0">
          <div class="flex items-center justify-between gap-1"><span class="flex items-center gap-1"><span class="text-xl leading-none font-black tabular-nums ${isToday ? 'text-amber-700' : dayCls(c)}">${c.day}</span>${una.length ? `<span title="미배정: ${esc(una.map((x) => x.name).join(', '))}" class="inline-flex">${WARN_TRI('w-5 h-5')}</span>` : ''}</span>${crewBadge(c.date)}</div>
          ${perLine(pd)}${unaBlock}
          ${teamBlocks || leaveBlock ? `<div class="flex flex-col gap-1">${teamBlocks}${leaveBlock}</div>` : off ? `<div class="flex-1 flex items-center justify-center py-2 text-center text-base font-extrabold text-rose-700 break-keep">${esc(off)}</div>` : '<div class="text-xs text-stone-300 mt-1">클릭해서 인원 배정</div>'}
        </button>`;
      }).join('');
      const wk = w.slice(5).map((c) => {
        if (!c.inMonth) return `<div class="flex-1 rounded-lg border border-dashed border-stone-200 bg-stone-50/60 p-1.5 text-base leading-none text-stone-300 font-black">${c.day}</div>`;
        const t = crewTotals(days[c.date]), isToday = c.date === tdy, pw = crewProd(c.date), offW = dayOff(c.date), unaW = crewUnassigned(c.date);
        return `<button type="button" onclick="Prod.openCrewDay('${c.date}')" class="flex-1 text-left rounded-lg border ${isToday ? 'border-amber-500 ring-1 ring-amber-300' : offW ? 'border-rose-200' : 'border-stone-200'} ${offW ? 'bg-rose-50' : t.work || t.leave ? 'bg-white' : 'bg-stone-50'} hover:border-amber-400 p-1.5 flex flex-col gap-0.5 cursor-pointer min-w-0">
          <span class="text-base leading-none font-black tabular-nums ${isToday ? 'text-amber-700' : dayCls(c)}">${c.day}<span class="text-[10px] font-extrabold ml-0.5">${DOW[c.dow]}</span>${unaW.length ? `<span title="미배정: ${esc(unaW.map((x) => x.name).join(', '))}" class="ml-1 inline-flex items-center gap-px align-middle text-[10px] font-black text-amber-700">${WARN_TRI('w-3.5 h-3.5')}${unaW.length}</span>` : ''}</span>
          ${t.work || t.leave ? `<span class="text-[11px] font-bold text-stone-600">근무 ${n1(t.work)}</span>${t.leave ? `<span class="text-[11px] font-bold text-rose-600">휴무 ${n1(t.leave)}</span>` : ''}${pw.actual > 0 && pw.heads > 0 ? `<span class="text-[11px] font-extrabold text-amber-800">1인 ${man(pw.actual / pw.heads)}</span>` : ''}` : (offW ? `<span class="text-[11px] font-extrabold text-rose-700 truncate">${esc(offW)}</span>` : '<span class="text-[11px] text-stone-300">휴무</span>')}
        </button>`;
      }).join('');
      if (!wWork && !wLeave && !wAc) return `<div class="grid gap-1.5" style="${GRID_STYLE}">${cells}<div class="flex flex-col gap-1.5 min-w-0">${wk}</div>
        <div class="rounded-xl border border-stone-200 bg-stone-50/60 px-2.5 py-1.5 flex items-center gap-2 text-xs"><span class="px-1.5 py-0.5 rounded-md bg-white border border-stone-200 text-stone-500 font-extrabold">${wi + 1}주</span><span class="text-stone-400 font-semibold">기록 없음</span></div></div>`;
      return `<div class="grid gap-1.5" style="${GRID_STYLE}">${cells}<div class="flex flex-col gap-1.5 min-w-0">${wk}</div>
        <div class="rounded-xl border border-sky-200 bg-sky-50/60 p-2.5 flex flex-col justify-center gap-1.5 text-xs tabular-nums">
          <span class="self-start px-1.5 py-0.5 rounded-md bg-white border border-sky-200 text-sky-800 font-extrabold">${wi + 1}주</span>
          <div><div class="font-semibold text-stone-500">평균 근무</div><div class="font-extrabold text-sky-900 text-sm">${wDays ? n1(wWork / wDays) + '명' : '-'}</div></div>
          <div><div class="font-semibold text-stone-500">휴무 합계</div><div class="font-bold text-stone-800 text-sm">${n1(wLeave)}명</div></div>
          <div><div class="font-semibold text-stone-500">1인 생산금액</div><div class="font-extrabold text-amber-900 text-sm">${wHeads ? man(wAc / wHeads) : '-'}</div></div>
        </div></div>`;
    }).join('');
    const teamTrs = cfg.teams.map((tm, i) => { const s = teamSum[tm.id] || { sum: 0, days: 0 }; return `<tr class="border-b border-stone-100 whitespace-nowrap"><td class="py-1.5 px-2 text-stone-400">${i + 1}</td><td class="py-1.5 px-2 font-bold">${esc(tm.short || tm.name)}</td><td class="py-1.5 px-2 text-xs text-stone-500">${esc(tm.part || '')}</td><td class="py-1.5 px-2 text-right tabular-nums">${n1(s.sum)}</td><td class="py-1.5 px-2 text-right tabular-nums">${s.days}</td><td class="py-1.5 px-2 text-right tabular-nums font-extrabold">${s.days ? n1(s.sum / s.days) : '-'}</td></tr>`; }).join('');
    const monthBtns = Array.from({ length: 12 }, (_, i) => { const mm = `${y}-${pad(i + 1)}`, on = mm === ym; return `<button type="button" onclick="Prod.setMonth('${mm}')" class="px-2.5 py-1 rounded-xl text-xs cursor-pointer ${on ? 'bg-amber-600 text-white font-extrabold shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200 font-bold'}">${i + 1}월</button>`; }).join('');
    const active = cfg.staff.filter((s) => s.active !== false).length;
    return `${!cfg.staff.length ? `<div class="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex flex-wrap items-center gap-2"><b>등록된 팀원이 없습니다.</b> [인원 설정]에서 팀원을 추가해 주세요.<button type="button" onclick="Prod.openCrewSettings()" class="px-3 py-1 rounded-lg bg-stone-900 text-white text-xs font-bold cursor-pointer">인원 설정</button></div>` : ''}
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
        ${kpi('1인 평균 생산금액', pm.heads ? man(pm.actual / pm.heads) + '원' : '-', `실행 금액 ÷ ${basis} · ${pm.days}일`, true)}
        ${kpi('1인 평균 목표금액', pm.heads ? man(pm.target / pm.heads) + '원' : '-', pm.missing.length ? `인원 미입력 ${pm.missing.join('·')}일 제외` : '같은 날 기준')}
        ${kpi(`${m}월 누적 근무`, n1(workSum) + '명', '하루 인원을 모두 더한 값')}
        ${kpi('출근 일수', workDays + '일', '근무 인원이 있는 날')}
        ${kpi('하루 평균 인원', workDays ? n1(workSum / workDays) + '명' : '-', `재직 팀원 ${active}명`)}
        ${kpi(`${m}월 휴무 합계`, n1(leaveSum) + '명', '반차 0.5명')}
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" onclick="Prod.setMonth('${prevYm}')" class="w-8 h-8 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">‹</button>
            <h3 class="text-base font-extrabold text-stone-900 px-1">${y}년 ${m}월 작업 인원</h3>
            <button type="button" onclick="Prod.setMonth('${nextYm}')" class="w-8 h-8 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">›</button>
            <div class="flex flex-wrap items-center gap-1 ml-2">${monthBtns}</div>
          </div>
          <div class="flex items-center gap-3 ml-auto mr-2 text-xs text-stone-600">
            <span class="inline-flex items-center gap-1" title="그날 배정 기록이 있는데, 재직 팀원 중 작업 배정도 하루 휴무도 없는 사람이 있는 날 (반차인데 배정이 없는 사람 포함)">${WARN_TRI('w-4 h-4')}<b class="font-extrabold text-amber-800">미배정</b> 재직 팀원 중 작업 배정·하루 휴무가 모두 없는 사람이 있는 날</span>
          </div>
          <button type="button" onclick="Prod.openCrewSettings()" class="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold cursor-pointer hover:bg-stone-50">인원 설정 (팀원·휴무 타입·작업 구분)</button>
        </div>
        <div class="grid gap-1.5 text-xs font-extrabold text-center" style="${GRID_STYLE}"><div class="text-stone-500">월</div><div class="text-stone-500">화</div><div class="text-stone-500">수</div><div class="text-stone-500">목</div><div class="text-stone-500">금</div><div><span class="text-blue-600">토</span>·<span class="text-rose-600">일</span></div><div class="text-stone-500">주 합계</div></div>
        ${weekRows}
      </div>
      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 items-start">
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <h3 class="text-sm font-extrabold text-stone-900">${m}월 파트별 1인 생산금액</h3>
        <div class="text-xs text-stone-500 mb-2">파트 품목 실행 금액 ÷ 그 파트 작업 구분 인원 (인원·생산이 다 있는 ${pm.days}일). 작업 구분의 파트는 [인원 설정 > 작업 구분]에서 바꿉니다.</div>
        <table class="w-full text-sm"><thead><tr class="text-xs text-stone-500 border-b border-stone-200"><th class="py-1 px-2 text-left">파트</th><th class="py-1 px-2 text-right">실행 금액</th><th class="py-1 px-2 text-right">투입 인원</th><th class="py-1 px-2 text-right">1인 평균</th></tr></thead><tbody>
          ${PROD_CATS.filter(([k]) => k !== 'NONE').map(([k, label]) => { const o = pm.cat[k] || { amount: 0, heads: 0 }; return `<tr class="border-b border-stone-100 whitespace-nowrap"><td class="py-1.5 px-2"><span class="border-l-[3px] ${CAT_STYLE[k].bar} pl-1.5 font-extrabold ${CAT_STYLE[k].text}">${label}</span></td><td class="py-1.5 px-2 text-right tabular-nums">${won(o.amount)}</td><td class="py-1.5 px-2 text-right tabular-nums">${n1(o.heads)}명</td><td class="py-1.5 px-2 text-right tabular-nums font-extrabold">${o.heads ? man(o.amount / o.heads) : '-'}</td></tr>`; }).join('')}
          <tr class="whitespace-nowrap bg-amber-50/60"><td class="py-1.5 px-2 font-extrabold">전체 (${basis})</td><td class="py-1.5 px-2 text-right tabular-nums font-bold">${won(pm.actual)}</td><td class="py-1.5 px-2 text-right tabular-nums font-bold">${n1(pm.heads)}명</td><td class="py-1.5 px-2 text-right tabular-nums font-extrabold text-amber-900">${pm.heads ? man(pm.actual / pm.heads) : '-'}</td></tr>
        </tbody></table>
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <h3 class="text-sm font-extrabold text-stone-900 mb-2">${m}월 작업 구분별</h3>
        <table class="w-full text-sm"><thead><tr class="text-xs text-stone-500 border-b border-stone-200"><th class="py-1 px-2 text-left">No</th><th class="py-1 px-2 text-left">작업 구분</th><th class="py-1 px-2 text-left">담당</th><th class="py-1 px-2 text-right">월누적 인원</th><th class="py-1 px-2 text-right">출근 일수</th><th class="py-1 px-2 text-right">평균 인원</th></tr></thead><tbody>${teamTrs}</tbody></table>
      </div>
      </div>`;
  }

  // ----- 하루 인원 배정 창 -----
  let crewDraft = null;
  function openCrewDay(date) {
    const day = crewDays()[date] || {};
    crewDraft = { date, assign: JSON.parse(JSON.stringify(day.assign || {})), leaves: JSON.parse(JSON.stringify(day.leaves || [])) };
    renderCrewEditor();
  }
  function closeCrewDay() { crewDraft = null; closeModal(); }
  function crewAdd(tid, sid) {
    if (!crewDraft || !sid) return;
    const arr = crewDraft.assign[tid] || (crewDraft.assign[tid] = []);
    if (!arr.some((a) => a.sid === sid)) arr.push({ sid, w: 1 });
    renderCrewEditor();
  }
  function crewToggleW(tid, sid) { const a = ((crewDraft && crewDraft.assign[tid]) || []).find((x) => x.sid === sid); if (a) { a.w = Number(a.w) === 0.5 ? 1 : 0.5; renderCrewEditor(); } }
  function crewRemove(tid, sid) { if (!crewDraft) return; crewDraft.assign[tid] = (crewDraft.assign[tid] || []).filter((x) => x.sid !== sid); renderCrewEditor(); }
  function crewAddLeave() { if (!crewDraft) return; crewDraft.leaves.push({ id: uid(), sid: '', type: crewCfg().leaveTypes[0].name, note: '' }); renderCrewEditor(); }
  function crewLeaveField(id, f, v) { const l = crewDraft && crewDraft.leaves.find((x) => x.id === id); if (!l) return; l[f] = v; if (f !== 'note') renderCrewEditor(); }
  function crewRemoveLeave(id) { if (!crewDraft) return; crewDraft.leaves = crewDraft.leaves.filter((x) => x.id !== id); renderCrewEditor(); }
  function crewCopyPrev() {
    if (!crewDraft) return;
    const days = crewDays(); const prev = Object.keys(days).filter((d) => d < crewDraft.date && Object.values((days[d] || {}).assign || {}).some((a) => a.length)).sort().pop();
    if (!prev) { toast('이전에 배정된 날이 없습니다.', 'info'); return; }
    const onLeave = new Set(crewDraft.leaves.filter((l) => l.sid && leaveWeight(l.type) >= 1).map((l) => l.sid));
    let n = 0;
    Object.entries(days[prev].assign || {}).forEach(([tid, arr]) => arr.forEach((a) => {
      const s = staffById(a.sid); if (!s || s.active === false || onLeave.has(a.sid)) return;
      const cur = crewDraft.assign[tid] || (crewDraft.assign[tid] = []);
      if (!cur.some((x) => x.sid === a.sid)) { cur.push({ sid: a.sid, w: a.w }); n++; }
    }));
    toast(`${prev}의 배정 ${n}건을 불러왔습니다 (퇴사자·오늘 휴무자 제외).`, 'info');
    renderCrewEditor();
  }
  function saveCrewDay() {
    if (!crewDraft) return;
    const leaves = crewDraft.leaves.filter((l) => l.sid);
    const assign = {}; Object.entries(crewDraft.assign).forEach(([tid, arr]) => { if ((arr || []).length) assign[tid] = arr; });
    const days = crewDays();
    if (!Object.keys(assign).length && !leaves.length) delete days[crewDraft.date];
    else days[crewDraft.date] = { assign, leaves, updatedAt: new Date().toISOString() };
    const d = crewDraft.date; crewDraft = null; closeModal(); markChanged(); render();
    toast(`${d} 작업 인원을 적용했습니다.`, 'success');
  }
  function staffOptions(excludeSet, selected) {
    const cfg = crewCfg();
    return STAFF_PARTS.concat(cfg.staff.map((s) => s.part).filter((p) => p && !STAFF_PARTS.includes(p)).filter((p, i, a) => a.indexOf(p) === i)).map((part) => {
      const ss = cfg.staff.filter((s) => (s.part || '') === part && (s.active !== false || s.id === selected) && !(excludeSet && excludeSet.has(s.id)));
      return ss.length ? `<optgroup label="${esc(part)}">${ss.map((s) => `<option value="${esc(s.id)}" ${s.id === selected ? 'selected' : ''}>${esc(s.name)}${s.active === false ? ' (퇴사)' : ''}</option>`).join('')}</optgroup>` : '';
    }).join('');
  }
  function renderCrewEditor() {
    if (!crewDraft) return;
    const cfg = crewCfg(), t = crewTotals(crewDraft), d = parseYmd(crewDraft.date);
    const leaveMap = {}; crewDraft.leaves.forEach((l) => { if (l.sid) leaveMap[l.sid] = l.type; });
    const assigned = new Set(Object.values(crewDraft.assign).flat().map((a) => a.sid));
    const unassigned = cfg.staff.filter((s) => s.active !== false && !assigned.has(s.id) && !(leaveMap[s.id] && leaveWeight(leaveMap[s.id]) >= 1));
    const teamCards = teamGroups(cfg.teams).flatMap((g) => g.teams.map((tm) => ({ tm, g }))).map(({ tm, g }) => {
      const arr = crewDraft.assign[tm.id] || [];
      const chips = arr.map((a) => `<span class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg border ${leaveMap[a.sid] ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'} text-sm font-bold">${esc(staffName(a.sid))}<button type="button" onclick="Prod.crewToggleW('${tm.id}','${a.sid}')" title="하루(1) / 반나절(0.5) 바꾸기" class="px-1 rounded text-xs font-extrabold cursor-pointer ${Number(a.w) === 0.5 ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-500'}">${Number(a.w) === 0.5 ? '0.5' : '1'}</button><button type="button" onclick="Prod.crewRemove('${tm.id}','${a.sid}')" class="w-5 h-5 rounded text-stone-400 hover:text-rose-700 cursor-pointer">×</button></span>`).join('');
      return `<div class="rounded-xl border ${g.card} p-2.5 flex flex-col gap-1.5">
        <div class="flex items-center justify-between gap-2"><div class="min-w-0"><span class="font-extrabold ${g.text}">${esc(tm.short || tm.name)}</span><span class="ml-1.5 text-xs text-stone-500">${esc(tm.part || '')}</span></div><b class="px-2 py-0.5 rounded-lg bg-white/80 text-sm tabular-nums text-stone-900">${n1(t.byTeam[tm.id] || 0)}명</b></div>
        <div class="flex flex-wrap gap-1">${chips || '<span class="text-xs text-stone-300">배정 없음</span>'}</div>
        <select onchange="Prod.crewAdd('${tm.id}', this.value)" class="border border-stone-300 bg-white rounded-lg px-2 py-1 text-sm"><option value="">+ 인원 추가</option>${staffOptions(new Set(arr.map((a) => a.sid)))}</select>
      </div>`;
    }).join('');
    const leaveRows = crewDraft.leaves.map((l) => `<div class="grid grid-cols-[136px_176px_minmax(0,1fr)_28px] gap-1.5 items-center">
        <select onchange="Prod.crewLeaveField('${l.id}','sid',this.value)" class="border border-rose-200 bg-white rounded-lg px-2 py-1 text-sm"><option value="">이름 선택</option>${staffOptions(null, l.sid)}</select>
        <select onchange="Prod.crewLeaveField('${l.id}','type',this.value)" class="border border-rose-200 bg-white rounded-lg px-2 py-1 text-sm">${cfg.leaveTypes.map((x) => `<option ${x.name === l.type ? 'selected' : ''} value="${esc(x.name)}">${esc(x.name)} (${n1(x.weight)}명)</option>`).join('')}</select>
        <input type="text" value="${esc(l.note || '')}" oninput="Prod.crewLeaveField('${l.id}','note',this.value)" placeholder="비고" class="border border-rose-200 bg-white rounded-lg px-2 py-1 text-sm">
        <button type="button" onclick="Prod.crewRemoveLeave('${l.id}')" class="w-7 h-7 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer">×</button>
      </div>`).join('');
    const host = document.getElementById('prodModal'); if (!host) return;
    const keep = (document.getElementById('crewEditBody') || {}).scrollTop || 0;
    host.innerHTML = `<div class="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-3 sm:p-6" onclick="if(event.target===this)Prod.closeCrewDay()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[1280px] max-h-[92vh] flex flex-col overflow-hidden">
        <div class="px-6 py-4 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div><h3 class="text-lg font-extrabold text-stone-900">${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]}) 작업 인원</h3>
            <div class="text-sm text-stone-600 mt-0.5">근무 <b class="text-stone-900">${n1(t.work)}명</b> · 휴무 <b class="text-rose-700">${n1(t.leave)}명</b> · 미배정 <b>${unassigned.length}명</b></div></div>
          <div class="flex items-center gap-1.5 text-xs">
            <button type="button" onclick="Prod.crewCopyPrev()" class="px-3 py-1.5 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">이전 근무일 배정 불러오기</button>
            <button type="button" onclick="Prod.closeCrewDay()" class="ml-1 w-8 h-8 rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer text-xl leading-none">×</button>
          </div>
        </div>
        <div id="crewEditBody" class="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-5">
          <section><h4 class="text-sm font-extrabold text-stone-800 mb-2">작업 구분별 배정 <span class="text-xs font-semibold text-stone-500">숫자를 누르면 1 ↔ 0.5(반나절)</span></h4><div class="grid grid-cols-1 md:grid-cols-2 gap-2">${teamCards}</div></section>
          <section class="flex flex-col gap-4">
            <div class="rounded-xl bg-rose-50 border border-rose-200 p-3"><div class="flex items-center justify-between mb-2"><h4 class="text-sm font-extrabold text-rose-800">휴무 <span class="text-xs font-bold text-rose-600">${n1(t.leave)}명</span></h4><button type="button" onclick="Prod.crewAddLeave()" class="px-2.5 py-1 rounded-lg bg-stone-900 text-white text-xs font-bold cursor-pointer">+ 휴무 추가</button></div>
              <div class="flex flex-col gap-1.5">${leaveRows || '<div class="text-xs text-rose-400">휴무 없음</div>'}</div></div>
            <div class="rounded-xl bg-stone-50 border border-stone-200 p-3"><h4 class="text-sm font-extrabold text-stone-800 mb-1.5">미배정 팀원 (${unassigned.length}명)</h4><div class="flex flex-wrap gap-1">${unassigned.map((s) => `<span class="px-2 py-0.5 rounded-lg bg-white border border-stone-200 text-xs font-bold text-stone-700">${esc(s.name)}</span>`).join('') || '<span class="text-xs text-stone-400">없음</span>'}</div></div>
          </section>
        </div>
        <div class="px-6 py-3 border-t border-stone-200 bg-stone-50 flex justify-end gap-2">
          <button type="button" onclick="Prod.closeCrewDay()" class="px-5 py-2 rounded-xl border border-stone-300 bg-white text-sm font-bold cursor-pointer">취소</button>
          <button type="button" onclick="Prod.saveCrewDay()" class="px-6 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">적용</button>
        </div>
      </div></div>`;
    const b = document.getElementById('crewEditBody'); if (b) b.scrollTop = keep;
  }

  // ----- 인원 설정 (팀원 입퇴사·휴무 타입·작업 구분) -----
  let crewCfgDraft = null, crewSetTab = 'STAFF', crewShowRetired = false;
  const PART_COLOR = { 생산총괄: 'bg-stone-700', 파이: 'bg-amber-400', 알파베: 'bg-emerald-500', 제과: 'bg-violet-400', 출하: 'bg-sky-500', 지원: 'bg-slate-400', 품질관리: 'bg-teal-500', 사무: 'bg-stone-400' };
  function openCrewSettings() { crewCfgDraft = JSON.parse(JSON.stringify(crewCfg())); crewSetTab = 'STAFF'; renderCrewSettings(); }
  function crewUsedIds() { const u = new Set(); Object.values(crewDays()).forEach((d) => { Object.values(d.assign || {}).forEach((a) => a.forEach((x) => u.add(x.sid))); (d.leaves || []).forEach((l) => u.add(l.sid)); }); return u; }
  function cfgField(kind, idx, f, v, redraw) { const arr = crewCfgDraft && crewCfgDraft[kind]; if (!arr || !arr[idx]) return; arr[idx][f] = f === 'weight' ? Number(v) : f === 'active' ? (v === true || v === 'true') : v; if (redraw) renderCrewSettings(); }
  function cfgAdd(kind) {
    if (kind === 'staff') {
      const nEl = document.getElementById('crewNewName'), pEl = document.getElementById('crewNewPart');
      const name = String((nEl && nEl.value) || '').trim();
      if (!name) { toast('이름을 입력해 주세요.', 'error'); if (nEl) nEl.focus(); return; }
      if (crewCfgDraft.staff.some((s) => s.active !== false && s.name === name)) { toast(`이미 재직 중인 이름입니다: ${name}`, 'error'); return; }
      crewCfgDraft.staff.push({ id: 's' + uid(), name, part: (pEl && pEl.value) || '지원', active: true });
      renderCrewSettings(); const n2 = document.getElementById('crewNewName'); if (n2) n2.focus();
      toast(`${name} 추가 (저장을 눌러야 반영됩니다)`, 'info');
    }
    if (kind === 'leaveTypes') {
      const nEl = document.getElementById('crewNewLeave'), wEl = document.getElementById('crewNewLeaveW');
      const name = String((nEl && nEl.value) || '').trim();
      if (!name) { toast('휴무 타입 이름을 입력해 주세요.', 'error'); return; }
      if (crewCfgDraft.leaveTypes.some((t) => t.name === name)) { toast(`이미 있는 타입입니다: ${name}`, 'error'); return; }
      crewCfgDraft.leaveTypes.push({ name, weight: wEl && wEl.value === '0.5' ? 0.5 : 1 }); renderCrewSettings();
    }
  }
  function cfgRemove(kind, idx) {
    const arr = crewCfgDraft[kind]; if (!arr || !arr[idx]) return;
    if (kind === 'staff') {
      const s = arr[idx];
      if (crewUsedIds().has(s.id)) { s.active = false; toast(`${s.name}은(는) 배정·휴무 기록이 있어 삭제 대신 '퇴사'로 바꿨습니다 (지난 기록 이름 유지).`, 'info'); renderCrewSettings(); return; }
    }
    arr.splice(idx, 1); renderCrewSettings();
  }
  function cfgPerCapita(k) { if (crewCfgDraft) { crewCfgDraft.perCapita = k; renderCrewSettings(); } }
  function crewSetTabTo(k) { crewSetTab = k; renderCrewSettings(); }
  function crewToggleRetired() { crewShowRetired = !crewShowRetired; renderCrewSettings(); }
  function renderCrewSettings() {
    const c = crewCfgDraft; if (!c) return;
    const inp = 'border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none';
    const parts = STAFF_PARTS.concat(c.staff.map((s) => s.part).filter((p) => p && !STAFF_PARTS.includes(p)).filter((p, i, a) => a.indexOf(p) === i));
    const activeN = c.staff.filter((s) => s.active !== false).length, retiredN = c.staff.length - activeN;
    const tabBtn = (k, label, n) => `<button type="button" onclick="Prod.crewSetTabTo('${k}')" class="px-4 py-2 rounded-xl text-sm cursor-pointer ${crewSetTab === k ? 'bg-white text-stone-900 font-extrabold shadow-xs' : 'text-stone-500 font-bold hover:text-stone-800'}">${label}<span class="ml-1.5 text-xs ${crewSetTab === k ? 'text-amber-700' : 'text-stone-400'}">${n}</span></button>`;
    let body = '';
    if (crewSetTab === 'STAFF') {
      const cards = parts.map((part) => {
        const list = c.staff.map((s, i) => ({ s, i })).filter(({ s }) => (s.part || '') === part && (crewShowRetired || s.active !== false));
        if (!list.length) return '';
        const on = list.filter(({ s }) => s.active !== false).length;
        const rows = list.map(({ s, i }) => { const act = s.active !== false; return `<div class="flex items-center gap-1.5 px-2 py-1.5 rounded-xl ${act ? 'hover:bg-stone-50' : 'bg-stone-50'}">
            <input type="text" value="${esc(s.name)}" oninput="Prod.cfgField('staff',${i},'name',this.value)" class="${inp} flex-1 min-w-0 ${act ? '' : 'text-stone-400 line-through'}">
            <select onchange="Prod.cfgField('staff',${i},'part',this.value,true)" class="${inp} w-[92px] text-xs">${parts.map((p) => `<option ${p === s.part ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>
            <button type="button" onclick="Prod.cfgField('staff',${i},'active',${act ? 'false' : 'true'},true)" title="눌러서 재직/퇴사 바꾸기" class="w-[50px] py-1 rounded-lg text-xs font-extrabold cursor-pointer ${act ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-200 text-stone-500 border border-stone-300'}">${act ? '재직' : '퇴사'}</button>
            <button type="button" onclick="Prod.cfgRemove('staff',${i})" title="삭제 (기록이 있으면 퇴사 처리)" class="w-7 h-7 rounded-lg text-stone-300 hover:text-rose-700 hover:bg-rose-50 cursor-pointer text-lg leading-none">×</button>
          </div>`; }).join('');
        return `<div class="rounded-2xl border border-stone-200 bg-white overflow-hidden">
          <div class="px-3 py-2 bg-stone-50 border-b border-stone-200 flex items-center justify-between"><span class="flex items-center gap-2 text-sm font-extrabold text-stone-800"><span class="w-2.5 h-2.5 rounded-full ${PART_COLOR[part] || 'bg-stone-300'}"></span>${esc(part)}</span><span class="text-xs font-bold text-stone-500">재직 <b class="text-stone-900">${on}</b>명</span></div>
          <div class="p-1.5 flex flex-col">${rows}</div></div>`;
      }).join('');
      body = `<div class="rounded-2xl bg-amber-50/70 border border-amber-200 p-3 flex flex-wrap items-center gap-2">
          <span class="text-sm font-extrabold text-amber-900 mr-1">입사자 추가</span>
          <input id="crewNewName" type="text" placeholder="이름" onkeydown="if(event.key==='Enter')Prod.cfgAdd('staff')" class="${inp} w-40">
          <select id="crewNewPart" class="${inp}">${parts.map((p) => `<option ${p === '지원' ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>
          <button type="button" onclick="Prod.cfgAdd('staff')" class="px-4 py-1.5 rounded-lg bg-stone-900 text-white text-sm font-extrabold cursor-pointer">+ 추가</button>
          <label class="ml-auto flex items-center gap-1.5 text-xs font-bold text-stone-600 cursor-pointer"><input type="checkbox" ${crewShowRetired ? 'checked' : ''} onchange="Prod.crewToggleRetired()" class="accent-amber-600">퇴사자 보기 (${retiredN}명)</label>
        </div>
        <div class="text-xs text-stone-500 mt-2 mb-3">퇴사자는 <b>재직</b> 버튼을 눌러 '퇴사'로 바꾸세요. 기록이 있는 팀원은 × 를 눌러도 '퇴사'로 남아 지난 기록의 이름이 유지됩니다.</div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">${cards || '<div class="text-sm text-stone-400 p-6">팀원이 없습니다.</div>'}</div>`;
    } else if (crewSetTab === 'LEAVE') {
      const col = (w, title, desc, cls) => {
        const rows = c.leaveTypes.map((t, i) => ({ t, i })).filter(({ t }) => (Number(t.weight) === 0.5 ? 0.5 : 1) === w).map(({ t, i }) => `<div class="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-stone-50">
            <input type="text" value="${esc(t.name)}" oninput="Prod.cfgField('leaveTypes',${i},'name',this.value)" class="${inp} flex-1 min-w-0">
            <div class="flex rounded-lg border border-stone-200 overflow-hidden text-xs font-extrabold">${[1, 0.5].map((v) => `<button type="button" onclick="Prod.cfgField('leaveTypes',${i},'weight',${v},true)" class="px-2.5 py-1.5 cursor-pointer ${Number(t.weight) === v ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}">${v === 1 ? '1명' : '0.5명'}</button>`).join('')}</div>
            <button type="button" onclick="Prod.cfgRemove('leaveTypes',${i})" class="w-7 h-7 rounded-lg text-stone-300 hover:text-rose-700 hover:bg-rose-50 cursor-pointer text-lg leading-none">×</button>
          </div>`).join('');
        return `<div class="rounded-2xl border border-stone-200 bg-white overflow-hidden"><div class="px-3 py-2 border-b border-stone-200 ${cls}"><div class="text-sm font-extrabold">${title}</div><div class="text-xs opacity-80">${desc}</div></div><div class="p-1.5 flex flex-col">${rows || '<div class="text-xs text-stone-400 p-3">없음</div>'}</div></div>`;
      };
      body = `<div class="rounded-2xl bg-amber-50/70 border border-amber-200 p-3 flex flex-wrap items-center gap-2 mb-3">
          <span class="text-sm font-extrabold text-amber-900 mr-1">휴무 타입 추가</span>
          <input id="crewNewLeave" type="text" placeholder="예: 공가" onkeydown="if(event.key==='Enter')Prod.cfgAdd('leaveTypes')" class="${inp} w-40">
          <select id="crewNewLeaveW" class="${inp}"><option value="1">휴무 1명</option><option value="0.5">휴무 0.5명</option></select>
          <button type="button" onclick="Prod.cfgAdd('leaveTypes')" class="px-4 py-1.5 rounded-lg bg-stone-900 text-white text-sm font-extrabold cursor-pointer">+ 추가</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          ${col(1, '하루 휴무 · 1명', '휴무 인원에 1명으로 더합니다', 'bg-rose-50 text-rose-800')}
          ${col(0.5, '반나절 휴무 · 0.5명', '휴무 인원에 0.5명으로 더합니다 (나머지 반나절은 작업 배정에서 0.5로)', 'bg-amber-50 text-amber-900')}
        </div>`;
    } else {
      const rows = teamGroups(c.teams).map((g) => g.teams.map((t) => { const i = c.teams.indexOf(t); return `<div class="grid gap-2 items-center px-2 py-1.5 border-l-[3px] ${g.bar} rounded-r-xl hover:bg-stone-50" style="grid-template-columns:28px 140px minmax(0,1fr) 170px 150px">
          <span class="text-xs font-extrabold text-stone-400 text-center">${i + 1}</span>
          <input type="text" value="${esc(t.short || '')}" oninput="Prod.cfgField('teams',${i},'short',this.value)" class="${inp} font-extrabold ${g.text}">
          <input type="text" value="${esc(t.name)}" oninput="Prod.cfgField('teams',${i},'name',this.value)" class="${inp}">
          <input type="text" value="${esc(t.part || '')}" oninput="Prod.cfgField('teams',${i},'part',this.value)" class="${inp} text-xs">
          <select onchange="Prod.cfgField('teams',${i},'cat',this.value,true)" class="${inp} text-xs ${g.text}">${PROD_CATS.map(([k, label]) => `<option value="${k}" ${teamCat(t) === k ? 'selected' : ''}>${label}</option>`).join('')}</select>
        </div>`; }).join('')).join('');
      const pc = c.perCapita === 'PROD' ? 'PROD' : 'ALL';
      body = `<div class="rounded-2xl bg-amber-50/70 border border-amber-200 px-3 py-2.5 mb-3 flex flex-wrap items-center gap-3">
          <span class="text-sm font-extrabold text-amber-900">1인 생산금액의 인원 기준</span>
          <div class="flex rounded-lg border border-stone-200 overflow-hidden text-xs font-extrabold bg-white">${[['ALL', '전체 근무 인원'], ['PROD', '생산 파트 인원만 (생산 외 제외)']].map(([k, label]) => `<button type="button" onclick="Prod.cfgPerCapita('${k}')" class="px-3 py-1.5 cursor-pointer ${pc === k ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'}">${label}</button>`).join('')}</div>
          <span class="text-xs text-stone-600">파트별 1인 금액은 항상 그 파트 인원으로 나눕니다.</span>
        </div>
        <div class="rounded-2xl border border-stone-200 bg-white p-2">
          <div class="grid gap-2 px-2 pb-1.5 mb-1 border-b border-stone-100 text-xs font-bold text-stone-500" style="grid-template-columns:28px 140px minmax(0,1fr) 170px 150px"><span class="text-center">No</span><span>달력에 보이는 이름</span><span>작업 구분 이름</span><span>담당</span><span>생산 파트 (1인 금액)</span></div>
          <div class="flex flex-col gap-1">${rows}</div></div>
        <div class="text-xs text-stone-500 mt-2">왼쪽 색은 생산 파트 색입니다 (달력 묶음 색과 같음): <b class="text-amber-700">파이</b> · <b class="text-emerald-700">알생지</b> · <b class="text-orange-700">파베이크</b> · <b class="text-violet-700">제과</b> · <b class="text-sky-700">생산 외</b></div>`;
    }
    const host = document.getElementById('prodModal'); if (!host) return;
    const keep = (document.getElementById('crewSetBody') || {}).scrollTop || 0;
    host.innerHTML = `<div class="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-3 sm:p-6" onclick="if(event.target===this)Prod.closeModal()">
      <div class="bg-stone-50 rounded-2xl shadow-2xl w-full max-w-[1180px] h-[88vh] flex flex-col overflow-hidden">
        <div class="px-6 pt-5 pb-3 bg-white border-b border-stone-200">
          <div class="flex items-start justify-between gap-3">
            <div><h3 class="text-xl font-extrabold text-stone-900">인원 설정</h3><div class="text-sm text-stone-500 mt-0.5">팀원 입퇴사, 휴무 타입, 작업 구분 이름을 관리합니다.</div></div>
            <div class="flex items-center gap-2">
              <div class="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">재직 <b class="text-base">${activeN}</b>명</div>
              <div class="px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-xs font-bold text-stone-600">퇴사 <b class="text-base">${retiredN}</b>명</div>
              <button type="button" onclick="Prod.closeModal()" class="ml-1 w-9 h-9 rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer text-2xl leading-none">×</button>
            </div>
          </div>
          <div class="mt-3 inline-flex p-1 rounded-2xl bg-stone-100">${tabBtn('STAFF', '팀원', activeN + '명')}${tabBtn('LEAVE', '휴무 타입', c.leaveTypes.length + '종')}${tabBtn('TEAM', '작업 구분', c.teams.length + '종')}</div>
        </div>
        <div id="crewSetBody" class="flex-1 overflow-y-auto px-6 py-4">${body}</div>
        <div class="px-6 py-3 border-t border-stone-200 bg-white flex items-center justify-between gap-2"><span class="text-xs text-stone-500">바꾼 내용은 [저장]을 눌러야 반영됩니다.</span><div class="flex gap-2"><button type="button" onclick="Prod.closeModal()" class="px-5 py-2 rounded-xl border border-stone-300 bg-white text-sm font-bold cursor-pointer">취소</button><button type="button" onclick="Prod.saveCrewSettings()" class="px-6 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">저장</button></div></div>
      </div></div>`;
    const b = document.getElementById('crewSetBody'); if (b) b.scrollTop = keep;
  }
  function saveCrewSettings() {
    const c = crewCfgDraft; if (!c) return;
    c.staff.forEach((s) => { s.name = String(s.name || '').trim(); });
    if (c.staff.some((s) => !s.name)) { toast('이름이 빈 팀원이 있습니다.', 'error'); return; }
    const names = c.staff.filter((s) => s.active !== false).map((s) => s.name); const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) { toast(`재직 팀원 이름이 겹칩니다: ${dup}`, 'error'); return; }
    c.leaveTypes = c.leaveTypes.filter((t) => String(t.name || '').trim()).map((t) => ({ name: String(t.name).trim(), weight: Number(t.weight) === 0.5 ? 0.5 : 1 }));
    db.crewCfg = c; crewCfgDraft = null; closeModal(); markChanged(); render();
    toast('인원 설정을 저장했습니다.', 'success');
  }

  // ===================== 포장 완료 등록 =====================
  //  생산(실행)한 생지는 냉동 후 출하팀이 포장해야 생산 재고로 들어감 → 재고 입고 = 포장 완료 수량
  //  db.pack = { 'YYYY-MM-DD': { items:[{id, code, name, pk, note}], memo, updatedAt } }   (수량은 모두 PK, 쇼숑은 재고에서 4PK=1BOX로 환산)
  const PACK_STYLE = {
    PIE: { bar: 'border-amber-400', text: 'text-amber-700' }, DOUGH: { bar: 'border-emerald-500', text: 'text-emerald-700' },
    PARBAKE: { bar: 'border-orange-500', text: 'text-orange-700' }, BAKERY: { bar: 'border-violet-400', text: 'text-violet-700' }, ETC: { bar: 'border-stone-300', text: 'text-stone-500' },
  };
  function packDays() { if (!db.pack || typeof db.pack !== 'object') db.pack = {}; return db.pack; }
  function packPerStock(code, products) { const p = productByCode(code, products); return p && Number(p.pkPerStock) > 0 ? Number(p.pkPerStock) : 1; }
  function packPrice(code, products) { const p = productByCode(code, products); return p ? Number(p.msBuyPricePk) || 0 : 0; } // 재고 단위당 엠즈 매입가
  function packItemAmt(it, products) { return (Number(it.pk) || 0) / packPerStock(it.code, products) * packPrice(it.code, products); }
  // 생산 실행 PK (재고 단위가 BOX여도 PK로 되돌림)
  function producedPkOf(l) { return lineActualPk(l) * linePerStock(l); }
  function packTotals(date, products) {
    const day = packDays()[date]; let pk = 0, amt = 0;
    ((day && day.items) || []).forEach((it) => { pk += Number(it.pk) || 0; amt += packItemAmt(it, products); });
    return { pk, amt, n: ((day && day.items) || []).length };
  }
  function prodTotalsPk(date) {
    const day = db.days[date]; let pk = 0, amt = 0;
    ((day && day.lines) || []).forEach((l) => { pk += producedPkOf(l); amt += lineActualPk(l) * linePrice(l); });
    return { pk, amt };
  }
  // 기간(포함) 품목별 생산 PK / 포장 PK
  function packCompare(from, to, products) {
    const map = {};
    const ensure = (code, name) => map[code] || (map[code] = { code, name, prod: 0, pack: 0, prodAmt: 0, packAmt: 0 });
    Object.entries(db.days).forEach(([d, day]) => { if (d < from || d > to) return; (day.lines || []).forEach((l) => { const x = ensure(String(l.code), l.name); x.prod += producedPkOf(l); x.prodAmt += lineActualPk(l) * linePrice(l); }); });
    Object.entries(packDays()).forEach(([d, day]) => { if (d < from || d > to) return; (day.items || []).forEach((it) => { const x = ensure(String(it.code), it.name); x.pack += Number(it.pk) || 0; x.packAmt += packItemAmt(it, products); }); });
    return Object.values(map).map((x) => { const p = productByCode(x.code, products); return { ...x, cat: p ? p.cat : '', name: p ? p.productName : x.name }; })
      .sort((a, b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat) || a.code.localeCompare(b.code));
  }
  const pct = (a, b) => b > 0 ? Math.round(a / b * 1000) / 10 : null;
  function rateBadge(r) {
    if (r === null) return '';
    const cls = r >= 98 && r <= 102 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : r < 98 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-sky-50 text-sky-800 border-sky-200';
    return `<span class="px-1.5 py-0.5 rounded-md border text-[11px] font-extrabold tabular-nums ${cls}">${num(r)}%</span>`;
  }

  function renderPack() {
    const ym = cursorMonth, [y, m] = ym.split('-').map(Number);
    const weeks = monthWeeks(ym), tdy = today(), products = getProducts(), pd = packDays();
    const prevYm = ymd(new Date(y, m - 2, 1)).slice(0, 7), nextYm = ymd(new Date(y, m, 1)).slice(0, 7);
    const dayCls = (c) => c.dow === 0 ? 'text-rose-600' : c.dow === 6 ? 'text-blue-600' : 'text-stone-900';
    const GRID_STYLE = 'grid-template-columns: repeat(5, minmax(0, 1fr)) 60px 150px';
    const ROW = 'display:grid;grid-template-columns:minmax(0,1fr) 44px;column-gap:4px;align-items:center';
    const mFrom = `${ym}-01`, mTo = `${ym}-31`;
    const mRows = packCompare(mFrom, mTo, products);
    const mProd = mRows.reduce((s, r) => s + r.prodAmt, 0), mPack = mRows.reduce((s, r) => s + r.packAmt, 0);
    const mProdPk = mRows.reduce((s, r) => s + r.prod, 0), mPackPk = mRows.reduce((s, r) => s + r.pack, 0);
    // 포장 대기 (포장 기록을 시작한 날부터 오늘까지 생산 − 포장)
    // 포장 안 된 품목: 선택한 달 안에서 품목별 생산 − 포장 (월별로 구분, 남은 것만 합산)
    const wait = mRows;
    const waitPk = wait.reduce((s, r) => s + Math.max(0, r.prod - r.pack), 0), waitAmt = wait.reduce((s, r) => s + Math.max(0, r.prodAmt - r.packAmt), 0);
    const lastProd = {}; Object.entries(db.days).forEach(([d, day]) => { if (d > tdy || d < mFrom || d > mTo) return; (day.lines || []).forEach((l) => { if (producedPkOf(l) > 0 && (!lastProd[l.code] || d > lastProd[l.code])) lastProd[String(l.code)] = d; }); });
    const waitList = wait.filter((r) => r.prod - r.pack > 0.05).map((r) => ({ ...r, last: lastProd[r.code] || '' })).sort((a, b) => (b.prodAmt - b.packAmt) - (a.prodAmt - a.packAmt));
    const kpi = (label, value, sub, hl) => `<div class="${hl ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200/90'} rounded-2xl p-4 border shadow-xs"><div class="text-xs font-bold ${hl ? 'text-amber-800' : 'text-stone-500'}">${label}</div><div class="mt-1 text-xl font-extrabold tabular-nums ${hl ? 'text-amber-900' : ''}">${value}</div>${sub ? `<div class="text-xs text-stone-500 mt-0.5">${sub}</div>` : ''}</div>`;
    const weekRows = weeks.map((w, wi) => {
      const inM = w.filter((c) => c.inMonth);
      const wFrom = inM.length ? inM[0].date : w[0].date, wTo = inM.length ? inM[inM.length - 1].date : w[6].date;
      const wr = inM.length ? packCompare(wFrom, wTo, products) : [];
      const wProd = wr.reduce((s, r) => s + r.prod, 0), wPack = wr.reduce((s, r) => s + r.pack, 0);
      const wProdAmt = wr.reduce((s, r) => s + r.prodAmt, 0), wPackAmt = wr.reduce((s, r) => s + r.packAmt, 0);
      const cells = w.slice(0, 5).map((c) => {
        if (!c.inMonth) return `<div class="rounded-xl bg-stone-50/60 border border-dashed border-stone-200 p-2 text-xl leading-none text-stone-300 font-black">${c.day}</div>`;
        const day = pd[c.date], items = (day && day.items) || [], isToday = c.date === tdy, off = dayOff(c.date);
        const pt = packTotals(c.date, products), prd = prodTotalsPk(c.date);
        const groups = [...CAT_ORDER, 'ETC'].map((cat) => {
          const rows = items.filter((it) => { const p = productByCode(it.code, products); return (p ? p.cat : 'ETC') === cat || (cat === 'ETC' && !CAT_ORDER.includes(p ? p.cat : 'ETC')); });
          if (!rows.length) return '';
          const st = PACK_STYLE[cat] || PACK_STYLE.ETC;
          return `<div class="border-l-[3px] ${st.bar} pl-1.5 flex flex-col gap-0.5">${rows.map((it) => { const p = productByCode(it.code, products); return `<div class="text-xs leading-tight" style="${ROW}"><span class="truncate font-semibold text-stone-800" title="${esc(p ? p.productName : it.name)}">${esc(p ? p.productName : it.name)}</span><b class="text-right font-extrabold tabular-nums text-stone-900">${num(it.pk)}<span class="text-[10px] text-stone-400 font-bold ml-px">PK</span></b></div>`; }).join('')}</div>`;
        }).join('');
        return `<button type="button" onclick="Prod.openPackDay('${c.date}')" class="text-left min-h-[64px] rounded-xl border ${isToday ? 'border-amber-500 ring-1 ring-amber-300' : off ? 'border-rose-200' : 'border-stone-200'} ${off ? 'bg-rose-50' : 'bg-white'} hover:border-amber-400 hover:shadow-xs p-2 flex flex-col gap-1 cursor-pointer min-w-0">
          <div class="flex items-center justify-between gap-1"><span class="text-xl leading-none font-black tabular-nums ${isToday ? 'text-amber-700' : off ? 'text-rose-600' : dayCls(c)}">${c.day}</span>${off ? `<span class="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[11px] font-extrabold">${esc(off)}</span>` : ''}</div>
          ${prd.pk || pt.pk ? `<div class="grid grid-cols-[auto_1fr_auto] gap-x-1.5 text-xs tabular-nums"><span class="font-semibold text-stone-500">생산</span><span class="text-right font-bold text-stone-600">${num(prd.pk)}PK</span><span class="text-right font-bold text-stone-600">${won(prd.amt)}</span><span class="font-semibold text-stone-500">포장</span><span class="text-right font-extrabold text-sky-800">${num(pt.pk)}PK</span><span class="text-right font-extrabold text-sky-800">${won(pt.amt)}</span></div>` : ''}
          ${groups ? `<div class="border-t border-stone-100 pt-1 flex flex-col gap-1">${groups}</div>` : `<div class="text-xs text-stone-300 mt-0.5">${off ? '' : '클릭해서 포장 입력'}</div>`}
        </button>`;
      }).join('');
      const wk = w.slice(5).map((c) => {
        if (!c.inMonth) return `<div class="flex-1 rounded-lg border border-dashed border-stone-200 bg-stone-50/60 p-1.5 text-base leading-none text-stone-300 font-black">${c.day}</div>`;
        const pt = packTotals(c.date, products), isToday = c.date === tdy, off = dayOff(c.date);
        return `<button type="button" onclick="Prod.openPackDay('${c.date}')" class="flex-1 text-left rounded-lg border ${isToday ? 'border-amber-500 ring-1 ring-amber-300' : off ? 'border-rose-200' : 'border-stone-200'} ${off ? 'bg-rose-50' : pt.n ? 'bg-white' : 'bg-stone-50'} hover:border-amber-400 p-1.5 flex flex-col gap-0.5 cursor-pointer min-w-0">
          <span class="text-base leading-none font-black tabular-nums ${isToday ? 'text-amber-700' : dayCls(c)}">${c.day}<span class="text-[10px] font-extrabold ml-0.5">${DOW[c.dow]}</span></span>
          ${pt.n ? `<span class="text-[11px] font-extrabold text-sky-800 tabular-nums">${num(pt.pk)}PK</span>` : off ? `<span class="text-[11px] font-extrabold text-rose-700 truncate">${esc(off)}</span>` : ''}
        </button>`;
      }).join('');
      if (!wProd && !wPack) return `<div class="grid gap-1.5" style="${GRID_STYLE}">${cells}<div class="flex flex-col gap-1.5 min-w-0">${wk}</div>
        <div class="rounded-xl border border-stone-200 bg-stone-50/60 px-2.5 py-1.5 flex items-center gap-2 text-xs"><span class="px-1.5 py-0.5 rounded-md bg-white border border-stone-200 text-stone-500 font-extrabold">${wi + 1}주</span><span class="text-stone-400 font-semibold">기록 없음</span></div></div>`;
      const r = pct(wPackAmt, wProdAmt);
      return `<div class="grid gap-1.5" style="${GRID_STYLE}">${cells}<div class="flex flex-col gap-1.5 min-w-0">${wk}</div>
        <div class="rounded-xl border border-sky-200 bg-sky-50/60 p-2.5 flex flex-col justify-center gap-1.5 text-xs tabular-nums">
          <div class="flex items-center justify-between"><span class="px-1.5 py-0.5 rounded-md bg-white border border-sky-200 text-sky-800 font-extrabold">${wi + 1}주</span>${rateBadge(r)}</div>
          <div><div class="font-semibold text-stone-500">생산 실행</div><div class="font-bold text-stone-800">${num(wProd)}PK</div></div>
          <div><div class="font-semibold text-stone-500">포장 완료</div><div class="font-extrabold text-sky-900">${num(wPack)}PK</div></div>
          <div><div class="font-semibold text-stone-500">차이 (포장 − 생산)</div><div class="font-bold ${wPack - wProd < 0 ? 'text-amber-800' : 'text-stone-800'}">${wPack - wProd > 0 ? '+' : ''}${num(wPack - wProd)}PK</div><div class="font-extrabold ${wPackAmt - wProdAmt < 0 ? 'text-amber-800' : 'text-stone-800'}">${wPackAmt - wProdAmt > 0 ? '+' : ''}${won(wPackAmt - wProdAmt)}</div></div>
          <div class="h-1.5 rounded-full bg-white border border-sky-100 overflow-hidden"><div class="h-full rounded-full ${r !== null && r >= 98 ? 'bg-emerald-500' : 'bg-sky-500'}" style="width:${r === null ? 0 : Math.min(100, r)}%"></div></div>
        </div></div>`;
    }).join('');
    const tableRows = mRows.filter((r) => r.prod || r.pack).map((r) => {
      const st = PACK_STYLE[r.cat] || PACK_STYLE.ETC, diff = r.pack - r.prod, rt = pct(r.pack, r.prod);
      return `<tr class="border-b border-stone-100 whitespace-nowrap"><td class="py-1.5 px-2"><span class="border-l-[3px] ${st.bar} pl-1.5 text-xs font-extrabold ${st.text}">${CAT_LABEL[r.cat] || '기타'}</span></td><td class="py-1.5 px-2 text-xs text-stone-500">${esc(r.code)}</td><td class="py-1.5 px-2 font-semibold">${esc(r.name)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums">${num(r.prod)}</td><td class="py-1.5 px-2 text-right tabular-nums font-bold text-sky-900">${num(r.pack)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums font-bold ${diff < 0 ? 'text-amber-800' : diff > 0 ? 'text-sky-800' : 'text-stone-500'}">${diff > 0 ? '+' : ''}${num(diff)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums text-stone-600">${won(r.prodAmt)}</td><td class="py-1.5 px-2 text-right tabular-nums text-sky-900">${won(r.packAmt)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums font-bold ${r.packAmt - r.prodAmt < -0.5 ? 'text-amber-800' : r.packAmt - r.prodAmt > 0.5 ? 'text-sky-800' : 'text-stone-500'}">${r.packAmt - r.prodAmt > 0 ? '+' : ''}${won(r.packAmt - r.prodAmt)}</td><td class="py-1.5 px-2 text-right">${rateBadge(rt)}</td></tr>`;
    }).join('');
    const monthBtns = Array.from({ length: 12 }, (_, i) => { const mm = `${y}-${pad(i + 1)}`, on = mm === ym; return `<button type="button" onclick="Prod.setMonth('${mm}')" class="px-2.5 py-1 rounded-xl text-xs cursor-pointer ${on ? 'bg-amber-600 text-white font-extrabold shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200 font-bold'}">${i + 1}월</button>`; }).join('');
    return `<div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
        ${kpi(`${m}월 생산 실행`, won(mProd), `${num(mProdPk)}PK`)}
        ${kpi(`${m}월 포장 완료`, won(mPack), `${num(mPackPk)}PK · 생산 재고 입고`)}
        ${kpi('금액 차이 (포장 − 생산)', `<span class="${mPack - mProd < 0 ? 'text-amber-800' : ''}">${mPack - mProd > 0 ? '+' : ''}${won(mPack - mProd)}</span>`, `${mPackPk - mProdPk > 0 ? '+' : ''}${num(mPackPk - mProdPk)}PK`)}
        ${kpi('포장률 (금액)', mProd ? num(pct(mPack, mProd)) + '%' : '-', '포장 완료 ÷ 생산 실행', true)}
        ${kpi(`${m}월 포장 안 된 수량`, mProdPk ? won(waitAmt) : '-', mProdPk ? `${num(waitPk)}PK · 이달 생산보다 포장이 적은 품목 합계` : '이 달 생산 기록이 없습니다')}
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" onclick="Prod.setMonth('${prevYm}')" class="w-8 h-8 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">‹</button>
            <h3 class="text-base font-extrabold text-stone-900 px-1">${y}년 ${m}월 포장 완료</h3>
            <button type="button" onclick="Prod.setMonth('${nextYm}')" class="w-8 h-8 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">›</button>
            <div class="flex flex-wrap items-center gap-1 ml-2">${monthBtns}</div>
          </div>
          <div class="text-xs text-stone-500">칸을 눌러 그날 포장한 수량(PK) 입력 · 냉동 후 1~2일 뒤 포장해도 그날 날짜로</div>
        </div>
        <div class="grid gap-1.5 text-xs font-extrabold text-center" style="${GRID_STYLE}"><div class="text-stone-500">월</div><div class="text-stone-500">화</div><div class="text-stone-500">수</div><div class="text-stone-500">목</div><div class="text-stone-500">금</div><div><span class="text-blue-600">토</span>·<span class="text-rose-600">일</span></div><div class="text-stone-500">주 합계</div></div>
        ${weekRows}
      </div>
      ${mProdPk ? `<div class="bg-white rounded-2xl border border-amber-200 shadow-xs p-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2 mb-2"><h3 class="text-sm font-extrabold text-amber-900">${m}월 포장 안 된 품목 <span class="text-xs font-bold text-amber-700">이달 생산 − 이달 포장</span></h3><span class="text-xs font-bold text-stone-600">합계 <b class="text-amber-900">${num(waitPk)}PK · ${won(waitAmt)}</b></span></div>
        <div class="text-xs text-stone-500 mb-2">※ 실제 생산은 PK 단위로 EA 수량에 딱 맞게 생산하지 않기 때문에 참고 자료입니다. (생산 PK는 배합 × 1배합 PK수로 계산한 값)</div>
        ${waitList.length ? `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">${waitList.map((r) => { const st = PACK_STYLE[r.cat] || PACK_STYLE.ETC; return `<div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50/60 border border-amber-100 text-sm"><span class="min-w-0 border-l-[3px] ${st.bar} pl-1.5"><b class="font-bold text-stone-800 truncate">${esc(r.name)}</b><span class="block text-[11px] text-stone-500">생산 ${num(r.prod)} · 포장 ${num(r.pack)}PK${r.last ? ` · 마지막 생산 ${r.last.slice(5).replace('-', '/')}` : ''}</span></span><span class="text-right tabular-nums shrink-0"><b class="block text-amber-900">${num(r.prod - r.pack)}PK</b><span class="text-[11px] text-stone-500">${won(r.prodAmt - r.packAmt)}</span></span></div>`; }).join('')}</div>` : '<div class="text-sm text-emerald-700 font-bold">모두 포장되었습니다.</div>'}
      </div>` : ''}
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <h3 class="text-sm font-extrabold text-stone-900">${m}월 품목별 생산 실행 vs 포장 완료</h3>
        <div class="text-xs text-stone-500 mb-2">차이가 − 이면 아직 포장 안 된 수량(포장 대기), + 이면 전달 생산분을 이달에 포장한 수량입니다. 포장률 98~102%는 초록. ※ 실제 생산은 PK 단위로 EA 수량에 딱 맞게 생산하지 않기 때문에 참고 자료입니다.</div>
        <table class="w-full text-sm"><thead><tr class="text-xs text-stone-500 border-b border-stone-200"><th class="py-1 px-2 text-left">파트</th><th class="py-1 px-2 text-left">코드</th><th class="py-1 px-2 text-left">품목</th><th class="py-1 px-2 text-right">생산 실행 PK</th><th class="py-1 px-2 text-right">포장 완료 PK</th><th class="py-1 px-2 text-right">차이 PK</th><th class="py-1 px-2 text-right">생산 금액</th><th class="py-1 px-2 text-right">포장 금액</th><th class="py-1 px-2 text-right">차이 금액</th><th class="py-1 px-2 text-right">포장률</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="10" class="py-6 text-center text-xs text-stone-400">이 달 기록이 없습니다.</td></tr>'}</tbody>
        ${tableRows ? `<tfoot><tr class="bg-stone-50 font-extrabold whitespace-nowrap"><td colspan="3" class="py-1.5 px-2">합계</td><td class="py-1.5 px-2 text-right tabular-nums">${num(mProdPk)}</td><td class="py-1.5 px-2 text-right tabular-nums text-sky-900">${num(mPackPk)}</td><td class="py-1.5 px-2 text-right tabular-nums">${mPackPk - mProdPk > 0 ? '+' : ''}${num(mPackPk - mProdPk)}</td><td class="py-1.5 px-2 text-right tabular-nums">${won(mProd)}</td><td class="py-1.5 px-2 text-right tabular-nums text-sky-900">${won(mPack)}</td><td class="py-1.5 px-2 text-right tabular-nums ${mPack - mProd < 0 ? 'text-amber-800' : ''}">${mPack - mProd > 0 ? '+' : ''}${won(mPack - mProd)}</td><td class="py-1.5 px-2 text-right">${rateBadge(pct(mPack, mProd))}</td></tr></tfoot>` : ''}</table>
      </div>`;
  }

  // ----- 하루 포장 입력 창 -----
  let packDraft = null, packQuery = '', packCat = 'PIE';
  function openPackDay(date) {
    const day = packDays()[date] || {};
    packDraft = { date, items: JSON.parse(JSON.stringify(day.items || [])), memo: day.memo || '' };
    packQuery = ''; renderPackEditor();
  }
  function closePackDay() { packDraft = null; closeModal(); }
  // 포장 대기 제안: 최근 7일(그날 포함) 생산 − 같은 기간 다른 날 포장
  function packSuggest(products) {
    const d = parseYmd(packDraft.date); const f = new Date(d); f.setDate(d.getDate() - 6);
    const from = ymd(f), to = packDraft.date, map = {};
    Object.entries(db.days).forEach(([dt, day]) => { if (dt < from || dt > to) return; (day.lines || []).forEach((l) => { const k = String(l.code); map[k] = (map[k] || 0) + producedPkOf(l); }); });
    Object.entries(packDays()).forEach(([dt, day]) => { if (dt < from || dt > to || dt === to) return; (day.items || []).forEach((it) => { const k = String(it.code); map[k] = (map[k] || 0) - (Number(it.pk) || 0); }); });
    return Object.entries(map).map(([code, pk]) => ({ code, pk: r1(pk), p: productByCode(code, products) })).filter((x) => x.pk > 0 && x.p)
      .sort((a, b) => CAT_ORDER.indexOf(a.p.cat) - CAT_ORDER.indexOf(b.p.cat) || a.code.localeCompare(b.code));
  }
  function packAdd(code, pk) {
    if (!packDraft) return;
    const products = getProducts(), p = productByCode(code, products); if (!p) return;
    let it = packDraft.items.find((x) => String(x.code) === String(code));
    if (!it) { it = { id: uid(), code: String(code), name: p.productName, pk: 0, note: '' }; packDraft.items.push(it); }
    if (pk != null) it.pk = r1(pk);
    renderPackEditor();
    setTimeout(() => { const row = document.querySelector(`[data-pack="${it.id}"]`); if (!row) return; row.scrollIntoView({ block: 'nearest' }); const inp = row.querySelector('input[type="number"]'); if (inp && pk == null) { inp.focus(); inp.select(); } }, 30);
  }
  function packAddAll() { const products = getProducts(); packSuggest(products).forEach((x) => { if (!packDraft.items.some((i) => String(i.code) === x.code)) packDraft.items.push({ id: uid(), code: x.code, name: x.p.productName, pk: x.pk, note: '' }); }); renderPackEditor(); }
  function packField(id, f, v) { const it = packDraft && packDraft.items.find((x) => x.id === id); if (!it) return; it[f] = f === 'pk' ? Number(v) || 0 : v; if (f === 'pk') renderPackTotals(); }
  function packRemove(id) { if (!packDraft) return; packDraft.items = packDraft.items.filter((x) => x.id !== id); renderPackEditor(); }
  function packPicker(cat, q) { if (cat) packCat = cat; if (q != null) packQuery = q; const box = document.getElementById('packPicker'); if (box) box.innerHTML = renderPackPicker(); }
  function renderPackPicker() {
    const products = getProducts(), q = packQuery.trim().toLowerCase(), used = new Set(packDraft.items.map((x) => String(x.code)));
    const tabs = CAT_ORDER.filter((c) => products.some((p) => p.cat === c)).map((c) => `<button type="button" onclick="Prod.packPicker('${c}', '')" class="px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${!q && packCat === c ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}">${CAT_LABEL[c]}</button>`).join('');
    const list = products.filter((p) => q ? (String(p.productCode) + ' ' + p.productName).toLowerCase().includes(q) : p.cat === packCat);
    return `<div class="flex flex-wrap items-center gap-1 mb-1.5">${tabs}</div><div class="grid grid-cols-3 lg:grid-cols-4 gap-1">${list.map((p) => `<button type="button" onclick="Prod.packAdd('${esc(p.productCode)}')" class="text-left px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer ${used.has(String(p.productCode)) ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-stone-200 bg-white hover:border-sky-400'}"><div class="font-bold leading-tight truncate">${used.has(String(p.productCode)) ? '✓ ' : ''}${esc(p.productName)}</div><div class="text-[11px] text-stone-500">${esc(p.productCode)} · ${CAT_LABEL[p.cat]}</div></button>`).join('') || '<div class="col-span-full py-3 text-center text-xs text-stone-400">찾는 품목이 없습니다.</div>'}</div>`;
  }
  function renderPackTotals() {
    if (!packDraft) return; const products = getProducts();
    let pk = 0, amt = 0; packDraft.items.forEach((it) => { pk += Number(it.pk) || 0; amt += packItemAmt(it, products); const row = document.querySelector(`[data-pack="${it.id}"] [data-k="amt"]`); if (row) row.textContent = won(packItemAmt(it, products)); const bx = document.querySelector(`[data-pack="${it.id}"] [data-k="box"]`); if (bx) { const per = packPerStock(it.code, products); bx.textContent = per > 1 ? `= ${num((Number(it.pk) || 0) / per)} BOX` : ''; } });
    const box = document.getElementById('packTotals'); if (box) box.innerHTML = `<span class="text-stone-500">포장</span> <b class="tabular-nums text-sky-900">${num(pk)}PK</b><span class="mx-2 text-stone-300">|</span><span class="text-stone-500">금액</span> <b class="tabular-nums text-stone-900">${won(amt)}</b>`;
  }
  function renderPackEditor() {
    const host = document.getElementById('prodModal'); if (!host || !packDraft) return;
    const products = getProducts(), d = parseYmd(packDraft.date), sug = packSuggest(products), prd = prodTotalsPk(packDraft.date);
    const rows = packDraft.items.map((it) => {
      const p = productByCode(it.code, products), st = PACK_STYLE[p ? p.cat : 'ETC'] || PACK_STYLE.ETC;
      return `<div data-pack="${it.id}" class="grid grid-cols-[minmax(0,1.5fr)_120px_90px_minmax(0,1fr)_110px_30px] gap-2 items-center px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-sm">
        <div class="min-w-0 border-l-[3px] ${st.bar} pl-2"><div class="font-bold truncate">${esc(p ? p.productName : it.name)}</div><div class="text-[11px] text-stone-500">${esc(it.code)} · ${CAT_LABEL[p ? p.cat : ''] || ''}</div></div>
        <div class="relative"><input type="number" min="0" step="any" value="${it.pk || ''}" placeholder="0" oninput="Prod.packField('${it.id}','pk',this.value)" class="no-spinner w-full text-right border border-stone-300 rounded-lg pl-2 pr-8 py-1 text-sm font-bold tabular-nums bg-sky-50/60 focus:border-sky-500"><span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-stone-400">PK</span></div>
        <div class="text-[11px] text-stone-500 font-semibold" data-k="box"></div>
        <input type="text" value="${esc(it.note || '')}" oninput="Prod.packField('${it.id}','note',this.value)" placeholder="비고 (예: 11/18 생산분)" class="border border-stone-200 rounded-lg px-2 py-1 text-xs">
        <div class="text-right text-sm font-extrabold tabular-nums text-stone-800" data-k="amt"></div>
        <button type="button" onclick="Prod.packRemove('${it.id}')" class="w-7 h-7 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer">×</button>
      </div>`;
    }).join('');
    const keep = (document.getElementById('packBody') || {}).scrollTop || 0;
    host.innerHTML = `<div class="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-3 sm:p-6" onclick="if(event.target===this)Prod.closePackDay()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-[1100px] max-h-[92vh] flex flex-col overflow-hidden">
        <div class="px-5 py-3 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
          <div><h3 class="text-base font-extrabold text-stone-900">${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]}) 포장 완료 등록</h3><div class="text-xs text-stone-500">그날 생산 실행 ${num(prd.pk)}PK · 포장한 수량만 생산 재고에 들어갑니다 (쇼숑도 PK로 입력 → 재고는 4PK = 1BOX)</div></div>
          <button type="button" onclick="Prod.closePackDay()" class="w-8 h-8 rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer text-xl leading-none">×</button>
        </div>
        <div id="packBody" class="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3">
          <section class="rounded-xl bg-sky-50 border border-sky-200 p-2.5">
            <div class="flex items-center justify-between gap-2 mb-1.5"><h4 class="text-sm font-extrabold text-sky-900">포장 대기 <span class="text-xs font-semibold text-sky-700">최근 7일 생산 − 다른 날 포장</span></h4>${sug.length ? '<button type="button" onclick="Prod.packAddAll()" class="px-2.5 py-1 rounded-lg bg-sky-700 text-white text-xs font-bold cursor-pointer">대기 수량 전부 넣기</button>' : ''}</div>
            <div class="flex flex-wrap gap-1">${sug.map((x) => `<button type="button" onclick="Prod.packAdd('${esc(x.code)}', ${x.pk})" class="px-2 py-1 rounded-lg bg-white border border-sky-200 hover:border-sky-500 text-xs font-bold cursor-pointer"><span class="text-stone-800">${esc(x.p.productName)}</span> <span class="text-sky-800 tabular-nums">${num(x.pk)}PK</span></button>`).join('') || '<span class="text-xs text-sky-700">대기 중인 품목이 없습니다.</span>'}</div>
          </section>
          <section>
            <div class="flex items-center justify-between gap-2 mb-1.5"><h4 class="text-sm font-extrabold text-stone-800">품목 추가</h4><input type="search" value="${esc(packQuery)}" oninput="Prod.packPicker(null, this.value)" placeholder="품목명·코드 검색" class="w-52 border border-stone-300 rounded-lg px-2.5 py-1 text-sm"></div>
            <div id="packPicker" class="rounded-xl bg-stone-50 border border-stone-200 p-2">${renderPackPicker()}</div>
          </section>
          <section>
            <div class="grid grid-cols-[minmax(0,1.5fr)_120px_90px_minmax(0,1fr)_110px_30px] gap-2 px-2.5 pb-1 text-xs font-extrabold text-stone-500"><div>포장한 품목</div><div class="text-right">포장 수량</div><div></div><div>비고</div><div class="text-right">금액(엠즈 매입가)</div><div></div></div>
            <div class="flex flex-col gap-1">${rows || '<div class="py-5 text-center text-sm text-stone-400 rounded-xl border border-dashed border-stone-200">포장 대기나 위 목록에서 품목을 눌러 추가하세요.</div>'}</div>
          </section>
          <section><label class="text-sm font-extrabold text-stone-800">메모</label><textarea oninput="Prod.packMemo(this.value)" rows="2" class="mt-1 w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm">${esc(packDraft.memo || '')}</textarea></section>
        </div>
        <div class="px-5 py-2.5 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-3">
          <div id="packTotals" class="text-sm"></div>
          <div class="flex gap-2"><button type="button" onclick="Prod.closePackDay()" class="px-5 py-2 rounded-xl border border-stone-300 bg-white text-sm font-bold cursor-pointer">취소</button><button type="button" onclick="Prod.savePackDay()" class="px-6 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">적용</button></div>
        </div>
      </div></div>`;
    const b = document.getElementById('packBody'); if (b) b.scrollTop = keep;
    renderPackTotals();
  }
  function savePackDay() {
    if (!packDraft) return;
    const items = packDraft.items.filter((it) => (Number(it.pk) || 0) > 0).map((it) => ({ ...it, pk: r1(Number(it.pk)) }));
    const pd = packDays();
    if (!items.length && !String(packDraft.memo || '').trim()) delete pd[packDraft.date];
    else pd[packDraft.date] = { items, memo: packDraft.memo || '', updatedAt: new Date().toISOString() };
    const d = packDraft.date; packDraft = null; closeModal(); markChanged(); render();
    toast(`${d} 포장 완료를 적용했습니다.`, 'success');
  }

  // ----- 2. 파지 관리 -----
  //  파이를 성형할 때 나오는 파지(자투리 반죽)를 날짜별·품목별로 기록 (kg). 파지는 일부 품목의 원재료로 다시 쓰임
  //  db.scrap = { 'YYYY-MM-DD': { items: [{ code, name, type, kg }], memo } }
  const SCRAP_TYPES = ['패스츄리 파지', '퀸아망 파지', '쇼숑 파지'];
  // 이름(레시피 원재료·반제품 이름) → 파지 종류. 몽마르트 파지는 패스츄리 파지와 같은 것으로 봄 (2026-11-24)
  const scrapTypeOfName = (nm) => { const t = String(nm || '').replace(/\s/g, ''); return /쇼숑|파트푀이테/.test(t) ? '쇼숑 파지' : /퀸아망/.test(t) ? '퀸아망 파지' : /패스츄리|몽마르트/.test(t) ? '패스츄리 파지' : ''; };
  // 파이 품목 이름 → 그 품목을 만들 때 나오는 파지 종류 (크로와상·뺑오쇼콜라·몽마르트·보스톤 = 패스츄리 / 퀸아망 = 퀸아망 / 쇼숑·크렘푀이유 = 쇼숑)
  const scrapTypeOfProduct = (nm) => { const t = String(nm || '').replace(/\s/g, ''); return /퀸아망/.test(t) ? '퀸아망 파지' : /쇼숑|크렘푀이유/.test(t) ? '쇼숑 파지' : /크로와상|크루아상|쇼콜라|몽마르트|보스톤/.test(t) ? '패스츄리 파지' : ''; };
  const SCRAP_STYLE = { '패스츄리 파지': { bar: 'border-amber-400', text: 'text-amber-800', bg: 'bg-amber-50 border-amber-200' }, '퀸아망 파지': { bar: 'border-violet-400', text: 'text-violet-800', bg: 'bg-violet-50 border-violet-200' }, '쇼숑 파지': { bar: 'border-emerald-400', text: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200' } };
  const scrapShort = (t) => String(t || '').replace(' 파지', '');
  function scrapDays() { if (!db.scrap || typeof db.scrap !== 'object') db.scrap = {}; return db.scrap; }
  // 레시피에 '파지'가 원재료로 들어가는 품목 = 파지로 만드는 품목 (파지 발생 대상 아님)
  function madeFromScrap(code) {
    const recipes = Array.isArray(window.recipesData) ? window.recipesData : [];
    const rc = recipes.find((x) => String(x.productCode) === String(code) && x.recipeType !== 'SUB');
    return !!rc && (rc.ingredients || []).some((i) => /파지/.test(String(i.item || '')));
  }
  // 파이 품목 → 기본 파지 종류 (그 품목이 쓰는 반죽 기준)
  function defaultScrapType(code, defs) {
    const p = productByCode(code, getProducts()), byName = scrapTypeOfProduct(p && p.productName);
    if (byName) return byName;                       // 품목 이름으로 정해진 종류 (파지로 만드는 크렘푀이유도 쇼숑 파지 발생 대상)
    if (madeFromScrap(code)) return '';
    const k = semiShort(pieSetting(code, defs).group);
    return /패스츄리|몽마르트/.test(k) ? '패스츄리 파지' : /파트푀이테|쇼숑/.test(k) ? '쇼숑 파지' : '';
  }
  // 파지 사용: ① 자동 — 반제품 믹싱 배합 수 × 그 반제품 레시피에 등록된 파지 g (별도 기준값 없음, 레시피가 기준) · 파지로 만드는 제품 ② 수동 — 일자 창에서 직접 입력(db.scrap[날짜].uses)
  // 파지 사용(믹싱·제품 자동 계산·직접 입력·남은 파지) 표시 여부 (2026-11-24 다시 켬: 레시피에 파지 등록)
  const SCRAP_USE_ON = true;
  const SCRAP_NOTYPE = '종류 구분 없음';
  // 반제품 믹싱 1배합에 들어가는 파지 = 그 반제품 레시피('… 믹싱'을 뗀 이름)의 원재료 중 이름에 '파지'가 있는 줄의 합
  //  종류: 원재료 이름에 적혀 있으면 그대로(쇼숑/몽마르트/패스츄리), '파지'뿐이면 그 반죽의 종류
  function scrapMixStd(name) {
    const recipes = Array.isArray(window.recipesData) ? window.recipesData : [];
    const rcName = String(name || '').replace(/\s*믹싱$/, '').trim();
    const rc = recipes.find((r) => r.recipeType === 'SUB' && String(r.productName || '').trim() === rcName); if (!rc) return null;
    let g = 0, type = '';
    (rc.ingredients || []).forEach((i) => {
      const q = Number(i.qty) || 0, unit = String(i.unit || '').toUpperCase(); let nm = String(i.item || ''), add = 0;
      if (i.rowType === 'SUB_RECIPE') { const sub = recipes.find((r) => r.id === i.subRecipeId); nm = String((sub && sub.productName) || nm); if (/파지/.test(nm)) add = unit === 'EA' ? q * (Number(sub && sub.divisionWeight) || 0) : unit === 'KG' ? q * 1000 : q; }
      else if (/파지/.test(nm)) add = unit === 'KG' ? q * 1000 : q;
      if (add > 0) { g += add; if (!type) type = scrapTypeOfName(nm); }
    });
    if (!(g > 0)) return null;
    if (!type) type = scrapTypeOfName(semiShort(name)) || SCRAP_NOTYPE;
    return { type, kg: g / 1000 };
  }
  function scrapAutoUses(date) {
    return ((db.days[date] || {}).semi || []).map((l) => { const st = scrapMixStd(l.name), n = Number(l.actual) || 0; return st && n > 0 ? { name: l.name, batches: n, perBatch: st.kg, type: st.type, kg: n * st.kg } : null; }).filter(Boolean);
  }
  function scrapUseTotals(from, to) {
    const t = { total: 0, auto: 0, manual: 0, product: 0, byType: {}, byProduct: {} }, products = getProducts();
    const add = (type, kg, k) => { if (!(kg > 0)) return; t.total += kg; t[k] += kg; t.byType[type] = (t.byType[type] || 0) + kg; };
    Object.keys(db.days).forEach((d) => { if (d < from || d > to) return; scrapAutoUses(d).forEach((u) => add(u.type, u.kg, 'auto')); scrapProductUses(d, products).forEach((u) => { u.parts.forEach((pt) => add(pt.type || SCRAP_NOTYPE, pt.kg, 'product')); if (u.kg > 0) t.byProduct[u.name] = (t.byProduct[u.name] || 0) + u.kg; }); });
    Object.entries(scrapDays()).forEach(([d, day]) => { if (d < from || d > to) return; (day.uses || []).forEach((u) => add(u.type, Number(u.kg) || 0, 'manual')); });
    return t;
  }
  const scrapFirstDate = () => Object.keys(scrapDays()).filter((d) => ((scrapDays()[d].items || []).some((it) => Number(it.kg) > 0))).sort()[0] || '';
  function scrapTotals(from, to) {
    const t = { total: 0, byType: {}, byCode: {} };
    Object.entries(scrapDays()).forEach(([d, day]) => { if (d < from || d > to) return; (day.items || []).forEach((it) => {
      const kg = Number(it.kg) || 0; if (!(kg > 0)) return;
      t.total += kg; t.byType[it.type] = (t.byType[it.type] || 0) + kg;
      const k = it.code || 'X:' + it.name, x = t.byCode[k] || (t.byCode[k] = { code: it.code, name: it.name, type: it.type, kg: 0, days: 0 });
      x.kg += kg; x.days++;
    }); });
    return t;
  }
  // 파이 한 줄의 생산 반죽 kg = 생산 개수 × 1개당 반죽 g (원재료 손실과 같은 기준). 기준이 없으면 null
  function pieLineKg(l, products, defs) {
    const p = productByCode(l.code, products), g = pieSetting(l.code, defs).gPerEa;
    const ea = lineActualPk(l) * linePerStock(l) * (p ? Number(p.pkQuantityEa) || 0 : 0);
    return g > 0 && ea > 0 ? (ea * g) / 1000 : null;
  }
  // 기간의 파이 생산 반죽 kg: 파지 종류별(그 품목이 쓰는 반죽 기준) · 품목별 · 날짜×품목별
  function pieProdKg(from, to, products, defs) {
    const out = { total: 0, byType: {}, byCode: {}, byDayCode: {} };
    Object.entries(db.days).forEach(([d, day]) => { if (d < from || d > to) return; (day.lines || []).forEach((l) => {
      if (l.cat !== 'PIE' || !(Number(l.actual) > 0)) return;
      const kg = pieLineKg(l, products, defs), t = defaultScrapType(l.code, defs); if (kg == null) return;
      out.byCode[l.code] = (out.byCode[l.code] || 0) + kg; out.byDayCode[d + '|' + l.code] = (out.byDayCode[d + '|' + l.code] || 0) + kg;
      if (!t) return; // 파지로 만드는 품목 등은 파지 발생 대상이 아니므로 합계에서 제외
      out.total += kg; out.byType[t] = (out.byType[t] || 0) + kg;
    }); });
    return out;
  }
  const ratioTxt = (scrapKg, prodKg) => (prodKg > 0 && scrapKg > 0 ? num((scrapKg / prodKg) * 100) + '%' : '');
  function pieLinesOf(date) { return ((db.days[date] || {}).lines || []).filter((l) => l.cat === 'PIE' && Number(l.actual) > 0); }
  function renderScrap() {
    const ym = cursorMonth, [y, m] = ym.split('-').map(Number), weeks = monthWeeks(ym), tdy = today(), sd = scrapDays();
    const prevYm = ymd(new Date(y, m - 2, 1)).slice(0, 7), nextYm = ymd(new Date(y, m, 0 + 1)).slice(0, 7);
    const mFrom = `${ym}-01`, mTo = `${ym}-31`, mt = scrapTotals(mFrom, mTo);
    const products = getProducts(), defs = pieDoughDefaults(products), mp = pieProdKg(mFrom, mTo, products, defs);
    const mu = scrapUseTotals(mFrom, mTo), first = scrapFirstDate();
    // 남은 파지 = (파지 재고조사가 있으면) 조사한 재고 + 조사 다음 날부터 이 달 말까지 발생 − 사용 / (없으면) 파지 기록을 시작한 날부터 발생 − 사용
    const sBase = scrapBase(), baseOn = !!sBase && sBase.date <= mTo, cumFrom = baseOn ? ymd(new Date(new Date(sBase.date + 'T00:00:00').getTime() + 86400000)) : first;
    const cumMade = cumFrom ? scrapTotals(cumFrom, mTo) : { total: 0, byType: {} }, cumUse = cumFrom ? scrapUseTotals(cumFrom, mTo) : { total: 0, byType: {} };
    const baseKg = (t) => (baseOn ? Number(sBase.kg[t]) || 0 : 0), baseTotal = baseOn ? SCRAP_TYPES.reduce((a, t) => a + baseKg(t), 0) : 0;
    const baseNote = baseOn ? `${Number(sBase.date.slice(5, 7))}/${Number(sBase.date.slice(8))} 재고조사 ${num(baseTotal)}kg 기준` : sBase ? `재고조사(${sBase.date}) 이전 달 — 기록 시작부터 발생 − 사용` : '재고조사 없음 — 기록 시작부터 발생 − 사용';
    // 보는 기간(카드·아래 표): N월 전체 · 최근 3개월 · 누적. 파지 기록 시작일 이전은 계산에서 뺌
    const sPeriods = lossPeriods(ym).filter((p) => ['M', 'Q', 'ALL'].includes(p.key)), sPer = sPeriods.find((p) => p.key === scrapPeriodKey) || sPeriods[0];
    const pClamped = sPer.key !== 'M' && !!first && first > sPer.from, pFrom = pClamped ? first : sPer.from, pTo = sPer.to, pLabel = sPer.key === 'M' ? `${m}월` : sPer.label;
    const pt = sPer.key === 'M' ? mt : scrapTotals(pFrom, pTo), pp = sPer.key === 'M' ? mp : pieProdKg(pFrom, pTo, products, defs), pu = sPer.key === 'M' ? mu : scrapUseTotals(pFrom, pTo);
    const pctChip = (scrapKg, prodKg) => { const r = ratioTxt(scrapKg, prodKg); return r ? `<span class="ml-1 text-[10px] font-bold text-stone-500 tabular-nums">${r}</span>` : ''; };
    const dayCls = (c) => (c.dow === 0 ? 'text-rose-600' : c.dow === 6 ? 'text-blue-600' : 'text-stone-900');
    const GRID_STYLE = `grid-template-columns: repeat(5, minmax(0, 1fr)) 60px ${SCRAP_USE_ON ? 196 : 176}px`;
    const kgTxt = (v) => `${num(v)}<span class="text-[10px] text-stone-400 font-bold ml-px">kg</span>`;
    const typeRows = (byType, prodBy) => SCRAP_TYPES.filter((t) => byType[t]).map((t) => `<div class="flex items-center justify-between gap-1 text-xs"><span class="font-bold ${SCRAP_STYLE[t].text}">${scrapShort(t)}</span><span class="whitespace-nowrap"><b class="tabular-nums">${kgTxt(byType[t])}</b>${pctChip(byType[t], (prodBy || {})[t])}</span></div>`).join('');
    const weekRows = weeks.map((w, wi) => {
      const inM = w.filter((c) => c.inMonth);
      const wt = inM.length ? scrapTotals(inM[0].date, inM[inM.length - 1].date) : { total: 0, byType: {} };
      const wp = inM.length ? pieProdKg(inM[0].date, inM[inM.length - 1].date, products, defs) : { total: 0, byType: {} };
      const wu = SCRAP_USE_ON && inM.length ? scrapUseTotals(inM[0].date, inM[inM.length - 1].date) : { total: 0, byType: {}, byProduct: {} };
      const cells = w.slice(0, 5).map((c) => {
        if (!c.inMonth) return `<div class="rounded-xl bg-stone-50/60 border border-dashed border-stone-200 p-2 text-xl leading-none text-stone-300 font-black">${c.day}</div>`;
        const allItems = ((sd[c.date] || {}).items || []), items = allItems.filter((it) => Number(it.kg) > 0), isToday = c.date === tdy, off = dayOff(c.date), pies = pieLinesOf(c.date);
        const sum = items.reduce((s, it) => s + Number(it.kg), 0);
        const done = new Set(allItems.map((it) => String(it.code))); // 0으로 적은 품목도 입력 완료
        const waiting = pies.filter((l) => !done.has(String(l.code)) && defaultScrapType(l.code, defs)).length;
        const groups = SCRAP_TYPES.map((t) => { const rows = items.filter((it) => it.type === t); return rows.length ? `<div class="border-l-[3px] ${SCRAP_STYLE[t].bar} pl-1.5 flex flex-col gap-0.5">${rows.map((it) => `<div class="text-xs leading-tight flex items-center justify-between gap-1"><span class="truncate font-semibold text-stone-800" title="${esc(it.name)}">${esc(it.name)}</span><span class="whitespace-nowrap"><b class="font-extrabold tabular-nums text-stone-900">${kgTxt(it.kg)}</b>${pctChip(it.kg, mp.byDayCode[c.date + '|' + it.code])}</span></div>`).join('')}</div>` : ''; }).join('');
        return `<button type="button" onclick="Prod.openScrapDay('${c.date}')" class="text-left min-h-[64px] rounded-xl border ${isToday ? 'border-amber-500 ring-1 ring-amber-300' : off ? 'border-rose-200' : 'border-stone-200'} ${off ? 'bg-rose-50' : 'bg-white'} hover:border-amber-400 hover:shadow-xs p-2 flex flex-col gap-1 cursor-pointer min-w-0">
          <div class="flex items-center justify-between gap-1"><span class="text-xl leading-none font-black tabular-nums ${isToday ? 'text-amber-700' : off ? 'text-rose-600' : dayCls(c)}">${c.day}</span>${off ? `<span class="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[11px] font-extrabold">${esc(off)}</span>` : sum ? `<span class="text-xs font-extrabold text-stone-800 tabular-nums whitespace-nowrap">${num(sum)}<span class="text-[10px] text-stone-400 font-bold">kg</span>${(() => { const dp = pies.reduce((a, l) => a + (defaultScrapType(l.code, defs) ? mp.byDayCode[c.date + '|' + l.code] || 0 : 0), 0), r = ratioTxt(sum, dp); return r ? ` <span class="ml-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">${r}</span>` : ''; })()}</span>` : ''}</div>
          ${groups ? `<div class="flex flex-col gap-1">${groups}</div>` : ''}
          ${(() => { if (!SCRAP_USE_ON) return ''; const us = [...scrapAutoUses(c.date).map((u) => ({ type: u.type, kg: u.kg, auto: true })), ...((sd[c.date] || {}).uses || []).map((u) => ({ type: u.type, kg: Number(u.kg) || 0 }))].filter((u) => u.kg > 0); if (!us.length && !scrapProductUses(c.date, products).length) return ''; const by = {}; us.forEach((u) => { by[u.type] = (by[u.type] || 0) + u.kg; }); const pu = scrapProductUses(c.date, products).filter((u) => u.kg > 0 || u.unknown); return `<div class="border-t border-dashed border-stone-200 pt-1 flex flex-col gap-0.5">${pu.map((u) => `<div class="text-xs leading-tight flex items-center justify-between gap-1"><span class="truncate font-semibold text-sky-800" title="${esc(u.name)} — 파지로 만드는 제품">${esc(u.name)}</span><b class="font-extrabold tabular-nums text-sky-800 whitespace-nowrap">${u.unknown ? '?' : '−' + num(u.kg)}<span class="text-[10px] font-bold ml-px">kg</span></b></div>`).join('')}${SCRAP_TYPES.filter((t) => by[t]).map((t) => `<div class="text-xs leading-tight flex items-center justify-between gap-1"><span class="font-semibold text-sky-800">${scrapShort(t)} 사용</span><b class="font-extrabold tabular-nums text-sky-800 whitespace-nowrap">−${num(by[t])}<span class="text-[10px] font-bold ml-px">kg</span></b></div>`).join('')}</div>`; })()}
          ${waiting ? `<div class="text-[11px] font-bold text-amber-700">파이 ${waiting}종 생산 · 파지 미입력</div>` : !groups && !off ? '<div class="text-xs text-stone-300 mt-0.5">클릭해서 파지 입력</div>' : ''}
        </button>`;
      }).join('');
      const wk = w.slice(5).map((c) => {
        if (!c.inMonth) return `<div class="flex-1 rounded-lg border border-dashed border-stone-200 bg-stone-50/60 p-1.5 text-base leading-none text-stone-300 font-black">${c.day}</div>`;
        const sum = ((sd[c.date] || {}).items || []).reduce((s, it) => s + (Number(it.kg) || 0), 0), isToday = c.date === tdy, off = dayOff(c.date);
        return `<button type="button" onclick="Prod.openScrapDay('${c.date}')" class="flex-1 text-left rounded-lg border ${isToday ? 'border-amber-500 ring-1 ring-amber-300' : off ? 'border-rose-200' : 'border-stone-200'} ${off ? 'bg-rose-50' : sum ? 'bg-white' : 'bg-stone-50'} hover:border-amber-400 p-1.5 flex flex-col gap-0.5 cursor-pointer min-w-0">
          <span class="text-base leading-none font-black tabular-nums ${isToday ? 'text-amber-700' : dayCls(c)}">${c.day}<span class="text-[10px] font-extrabold ml-0.5">${DOW[c.dow]}</span></span>
          ${sum ? `<span class="text-[11px] font-extrabold tabular-nums">${num(sum)}kg</span>` : ''}
        </button>`;
      }).join('');
      return `<div class="grid gap-1.5" style="${GRID_STYLE}">${cells}<div class="flex flex-col gap-1.5 min-w-0">${wk}</div>
        ${wt.total || wu.total ? `<div class="rounded-xl border border-stone-200 bg-stone-50/50 p-2.5 flex flex-col gap-1.5 min-w-0">
          <div class="flex items-center justify-between gap-1"><span class="px-1.5 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-700 text-[11px] font-extrabold">${wi + 1}주</span>${ratioTxt(wt.total, wp.total) ? `<span class="text-[11px] font-bold text-stone-500">파지 비율 <b class="ml-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs tabular-nums">${ratioTxt(wt.total, wp.total)}</b></span>` : ''}</div>
          <div class="grid grid-cols-2 gap-1 text-center tabular-nums"><div class="rounded-lg bg-stone-50 border border-stone-200 py-1"><div class="text-[10px] font-bold text-stone-500">생산 반죽</div><div class="text-sm font-extrabold text-stone-700">${num(wp.total, 0)}<span class="text-[10px] font-bold text-stone-400">kg</span></div></div><div class="rounded-lg bg-amber-50 border border-amber-200 py-1"><div class="text-[10px] font-bold text-amber-800">파지</div><div class="text-sm font-extrabold text-stone-900">${num(wt.total)}<span class="text-[10px] font-bold text-stone-400">kg</span></div></div></div>
          <table class="w-full text-xs tabular-nums"><thead><tr class="text-[10px] font-bold text-stone-400"><th class="text-left font-bold">종류</th><th class="text-right font-bold">발생</th><th class="text-right font-bold">비율</th>${SCRAP_USE_ON ? '<th class="text-right font-bold">사용</th>' : ''}</tr></thead><tbody>${SCRAP_TYPES.filter((t) => wt.byType[t] || wu.byType[t]).map((t) => `<tr class="border-t border-stone-100"><td class="py-0.5 font-extrabold ${SCRAP_STYLE[t].text}">${scrapShort(t)}</td><td class="py-0.5 text-right font-extrabold text-stone-900">${num(wt.byType[t] || 0)}</td><td class="py-0.5 text-right font-bold text-stone-500">${ratioTxt(wt.byType[t], wp.byType[t]) || '-'}</td>${SCRAP_USE_ON ? `<td class="py-0.5 text-right font-bold text-sky-800">${wu.byType[t] ? '−' + num(wu.byType[t]) : '-'}</td>` : ''}</tr>`).join('')}${Object.entries(wu.byProduct).map(([n, kg]) => `<tr class="border-t border-stone-100"><td class="py-0.5 font-bold text-sky-800 truncate max-w-[84px]" colspan="3" title="${esc(n)} — 파지로 만드는 제품">${esc(n)}</td><td class="py-0.5 text-right font-bold text-sky-800">−${num(kg)}</td></tr>`).join('')}</tbody></table>
        </div>` : `<div class="rounded-xl border border-stone-200 bg-stone-50/60 px-2.5 py-1.5 flex items-center gap-2 text-xs"><span class="px-1.5 py-0.5 rounded-md bg-white border border-stone-200 text-stone-500 font-extrabold">${wi + 1}주</span><span class="text-stone-400 font-semibold">기록 없음</span></div>`}</div>`;
    }).join('');
    const monthBtns = Array.from({ length: 12 }, (_, i) => { const mm = `${y}-${pad(i + 1)}`, on = mm === ym; return `<button type="button" onclick="Prod.setMonth('${mm}')" class="px-2.5 py-1 rounded-xl text-xs cursor-pointer ${on ? 'bg-amber-600 text-white font-extrabold shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200 font-bold'}">${i + 1}월</button>`; }).join('');
    // 카드: 생산 반죽 kg → 파지 kg, 비율(파지 ÷ 생산 반죽)
    const useLine = (useKg, left) => `사용 <b class="text-sky-800">${num(useKg)}kg</b> · 남은 파지 <b class="${left < 0 ? 'text-rose-700' : 'text-stone-800'}">${num(left)}kg</b>`;
    const ratioCard = (label, prodKg, scrapKg, sub, cls) => `<div class="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs"><div class="flex items-start justify-between gap-2"><div class="text-xs font-bold ${cls || 'text-stone-500'}">${label}</div><div class="text-xl leading-none font-extrabold tabular-nums ${cls || 'text-stone-900'}">${ratioTxt(scrapKg, prodKg) || '-'}</div></div>
        <div class="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm tabular-nums"><span class="text-stone-500 text-xs">생산 반죽</span><b>${num(prodKg)}kg</b><span class="text-stone-300 font-extrabold">→</span><span class="text-stone-500 text-xs">파지</span><b>${num(scrapKg)}kg</b></div><div class="text-xs text-stone-500 mt-0.5">${sub}</div></div>`;
    // 반죽별: 투입한 (버터)반죽 − 완성품에 들어간 반죽 = 성형에서 빠진 양 → 그중 파지로 회수한 양, 나머지는 폐기
    // 반죽별 파지 = 그 반죽을 쓰는 품목에서 나온 파지 합계 (퀸아망 파지는 패스츄리 반죽, 몽마르트에서 나온 패스츄리 파지는 몽마르트 반죽). 품목 없이 직접 추가한 줄은 종류로 나눔
    const typeOfGroup = (g) => scrapTypeOfName(g.ch.short);
    const scrapOfGroup = (g) => Object.values(pt.byCode).reduce((a, r) => { const grp = r.code ? pieSetting(r.code, defs).group : ''; const hit = grp ? grp === g.name : (/쇼숑/.test(r.type) ? /파트푀이테|쇼숑/.test(g.ch.short) : /패스츄리/.test(g.ch.short)); return a + (hit ? r.kg : 0); }, 0);
    const ML = computeLoss(pFrom, pTo, products, defs, pClamped ? null : sPer);
    const lossRows = ML.pies.filter((g) => g.ch.ready && typeOfGroup(g) && (g.carts > 0 || g.usedKg > 0 || scrapOfGroup(g) > 0)).map((g) => {
      const t = typeOfGroup(g), st = SCRAP_STYLE[t], sc = scrapOfGroup(g), gap = g.inputKg != null ? g.inputKg - g.usedKg : null, waste = gap != null ? gap - sc : null;
      return `<tr class="border-b border-stone-100 whitespace-nowrap"><td class="py-1.5 px-2"><span class="border-l-[3px] ${st.bar} pl-1.5 font-extrabold ${st.text}">${esc(g.ch.short)} 반죽</span></td>
        <td class="py-1.5 px-2 text-right tabular-nums">${g.inputKg != null ? num(g.inputKg) + 'kg' : '-'}<div class="text-[10px] text-stone-400">${num(g.carts)}카트 · ${esc(g.basis)}</div></td>
        <td class="py-1.5 px-2 text-right tabular-nums">${num(g.usedKg)}kg</td>
        <td class="py-1.5 px-2 text-right tabular-nums font-bold">${gap != null ? num(gap) + 'kg' : '-'}</td>
        <td class="py-1.5 px-2 text-right tabular-nums font-extrabold">${num(sc)}kg</td>
        <td class="py-1.5 px-2 text-right tabular-nums font-bold">${gap > 0 ? num((sc / gap) * 100) + '%' : '-'}</td>
        <td class="py-1.5 px-2 text-right tabular-nums font-extrabold ${waste > 0 ? 'text-rose-700' : 'text-amber-700'}">${waste == null ? '-' : waste >= 0 ? num(waste) + 'kg' : `${num(waste)}kg`}${waste != null && waste < 0 ? '<div class="text-[10px] font-bold">빠진 양보다 파지가 많음 · 전월 보관 반죽 확인</div>' : gap > 0 && waste >= 0 ? `<div class="text-[10px] font-bold text-stone-500">투입의 ${num((waste / g.inputKg) * 100)}%</div>` : ''}</td></tr>`;
    }).join('');
    // 품목별: 그 달 생산 반죽 kg 대비 파지
    const tableRows = Object.values(pt.byCode).sort((a, b) => SCRAP_TYPES.indexOf(a.type) - SCRAP_TYPES.indexOf(b.type) || b.kg - a.kg).map((r) => { const pk = pp.byCode[r.code], st = SCRAP_STYLE[r.type] || {}; return `<tr class="border-b border-stone-100 whitespace-nowrap"><td class="py-1.5 px-2"><span class="border-l-[3px] ${st.bar || 'border-stone-300'} pl-1.5 text-xs font-extrabold ${st.text || 'text-stone-600'}">${esc(r.type || '-')}</span></td><td class="py-1.5 px-2 font-semibold">${esc(r.name)}</td><td class="py-1.5 px-2 text-right tabular-nums">${r.days}일</td><td class="py-1.5 px-2 text-right tabular-nums">${pk ? num(pk) + 'kg' : '-'}</td><td class="py-1.5 px-2 text-right tabular-nums font-extrabold">${num(r.kg)}kg</td><td class="py-1.5 px-2 text-right tabular-nums font-bold">${ratioTxt(r.kg, pk) || '-'}</td></tr>`; }).join('');
    return `<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        ${ratioCard(`${pLabel} 파이 전체`, pp.total, pt.total, (SCRAP_USE_ON ? useLine(pu.total, baseTotal + cumMade.total - cumUse.total) + ` <span class="text-stone-400">(${baseNote})</span> · ` : '') + `입력한 날 ${Object.keys(sd).filter((d) => d >= pFrom && d <= pTo && ((sd[d].items || []).some((it) => Number(it.kg) > 0))).length}일`)}
        ${SCRAP_TYPES.map((t) => ratioCard(t, pp.byType[t] || 0, pt.byType[t] || 0, SCRAP_USE_ON ? useLine(pu.byType[t] || 0, baseKg(t) + (cumMade.byType[t] || 0) - (cumUse.byType[t] || 0)) : `${scrapShort(t)} 반죽을 쓰는 파이`, SCRAP_STYLE[t].text)).join('')}
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" onclick="Prod.setMonth('${prevYm}')" class="w-8 h-8 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">‹</button>
            <h3 class="text-base font-extrabold text-stone-900 px-1">${y}년 ${m}월 파지 관리</h3>
            <button type="button" onclick="Prod.setMonth('${nextYm}')" class="w-8 h-8 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">›</button>
            <div class="flex flex-wrap items-center gap-1 ml-2">${monthBtns}</div>
          </div>
          <div class="flex flex-wrap items-center gap-2"><span class="px-2.5 py-1 rounded-lg bg-stone-100 text-xs font-bold text-stone-600">파지 재고조사: ${sBase ? sBase.date.slice(5).replace('-', '/') + ' 기준' : '없음'} <span class="font-semibold text-stone-400">(생산 재고에서 입력)</span></span><div class="text-xs text-stone-500">칸을 눌러 그날 파지 발생량(kg) 입력 · % = 파지 ÷ 생산 반죽(생산 개수 × 1개당 반죽 g)</div></div>
        </div>
        <div class="flex flex-wrap items-center gap-1 border-t border-stone-100 pt-2 mb-1"><span class="text-xs font-extrabold text-stone-500 mr-1">보는 기간</span>${sPeriods.map((p) => `<button type="button" onclick="Prod.setScrapPeriod('${p.key}')" class="px-2.5 py-1 rounded-xl text-xs cursor-pointer ${p.key === sPer.key ? 'bg-stone-900 text-white font-extrabold' : 'bg-white border border-stone-200 text-stone-600 font-bold hover:bg-stone-100'}">${p.label}${p.sub ? ` <span class="${p.key === sPer.key ? 'text-stone-300' : 'text-stone-400'} font-semibold">${p.sub}</span>` : ''}</button>`).join('')}<span class="text-[11px] text-stone-500 ml-2">위 카드와 아래 표는 '보는 기간' 기준, 달력은 선택한 달입니다.${pClamped ? ` 파지 기록을 ${pFrom.slice(5).replace('-', '/')}부터 시작해서 그날 이후만 계산합니다.` : ''}</span></div>
        <div class="grid gap-1.5 text-xs font-extrabold text-stone-500 px-1" style="${GRID_STYLE}">${['월', '화', '수', '목', '금'].map((d) => `<div>${d}</div>`).join('')}<div>주말</div><div>주간 합계</div></div>
        ${weekRows}
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <h3 class="text-sm font-extrabold mb-1">${pLabel} 반죽별 — 성형에서 빠진 반죽 중 파지와 폐기</h3>
        <div class="text-xs text-stone-500 mb-2 leading-relaxed">성형에서 빠진 양 = 투입한 (버터)반죽 − 완성품에 들어간 반죽 · 그중 <b>파지</b>는 모아서 다시 쓰는 양, <b>폐기</b>(빠진 양 − 파지)는 파지로도 회수하지 못하고 버린 양입니다. 투입 반죽은 5. 원재료 손실과 같은 기준(사용 카트 &gt; 재고 반영 &gt; 만든 카트)이며, 보관분 때문에 월 단위는 오차가 있습니다.</div>
        <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm"><thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600 whitespace-nowrap"><th class="py-2 px-2">반죽</th><th class="py-2 px-2 text-right">① 투입한 (버터)반죽</th><th class="py-2 px-2 text-right">② 완성품에 들어간 반죽</th><th class="py-2 px-2 text-right">③ 성형에서 빠진 양 (①−②)</th><th class="py-2 px-2 text-right">④ 파지</th><th class="py-2 px-2 text-right">파지 회수율 (④÷③)</th><th class="py-2 px-2 text-right">폐기 (③−④)</th></tr></thead>
          <tbody>${lossRows || '<tr><td colspan="7" class="py-6 text-center text-xs text-stone-400">이 달 라미네이팅·파이 생산 기록이 없습니다.</td></tr>'}</tbody></table></div>
      </div>
      ${!SCRAP_USE_ON ? '' : `      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <h3 class="text-sm font-extrabold mb-1">${pLabel} 파지 사용 — 어디에 얼마나 썼는지</h3>
        <div class="text-xs text-stone-500 mb-2">생산 스케쥴 실행에서 자동 계산: 반제품 믹싱(반제품 레시피의 1배합 파지 × 배합 수) · 파지로 만드는 제품(레시피의 1배합 파지 × 배합 수). 직접 입력한 사용은 '직접 입력'으로 합칩니다.</div>
        <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm"><thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600 whitespace-nowrap"><th class="py-2 px-2">사용처</th><th class="py-2 px-2">구분</th><th class="py-2 px-2 text-right">사용한 파지</th><th class="py-2 px-2 text-right">전체 사용 중</th></tr></thead>
          <tbody>${(() => { const rows = []; const mixBy = {}; Object.keys(db.days).forEach((dd) => { if (dd < pFrom || dd > pTo) return; scrapAutoUses(dd).forEach((u) => { mixBy[u.name] = (mixBy[u.name] || 0) + u.kg; }); }); Object.entries(mixBy).forEach(([n, kg]) => rows.push([n, '반제품 믹싱 · 자동', kg])); Object.entries(pu.byProduct).forEach(([n, kg]) => rows.push([n, '파지로 만드는 제품 · 자동', kg])); if (pu.manual > 0) rows.push(['직접 입력한 사용', '직접 입력', pu.manual]); rows.sort((a, b) => b[2] - a[2]); return rows.length ? rows.map(([n, k, kg]) => `<tr class="border-b border-stone-100 whitespace-nowrap"><td class="py-1.5 px-2 font-semibold">${esc(n)}</td><td class="py-1.5 px-2 text-xs text-stone-500">${k}</td><td class="py-1.5 px-2 text-right tabular-nums font-extrabold text-sky-800">${num(kg)}kg</td><td class="py-1.5 px-2 text-right tabular-nums text-stone-600">${pu.total > 0 ? num((kg / pu.total) * 100) + '%' : '-'}</td></tr>`).join('') + `<tr class="bg-stone-50 font-extrabold"><td class="py-1.5 px-2" colspan="2">합계</td><td class="py-1.5 px-2 text-right tabular-nums">${num(pu.total)}kg</td><td></td></tr>` : '<tr><td colspan="4" class="py-6 text-center text-xs text-stone-400">이 달 파지 사용 기록이 없습니다.</td></tr>'; })()}</tbody></table></div>
      </div>`}
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <h3 class="text-sm font-extrabold mb-2">${pLabel} 품목별 파지 발생</h3>
        <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm"><thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600 whitespace-nowrap"><th class="py-2 px-2">파지 종류</th><th class="py-2 px-2">품목</th><th class="py-2 px-2 text-right">입력 일수</th><th class="py-2 px-2 text-right">생산 반죽</th><th class="py-2 px-2 text-right">파지 발생량</th><th class="py-2 px-2 text-right">파지 비율</th></tr></thead>
          <tbody>${tableRows || '<tr><td colspan="6" class="py-6 text-center text-xs text-stone-400">이 달 파지 기록이 없습니다.</td></tr>'}</tbody></table></div>
      </div>`;
  }
  let scrapDraft = null, scrapPeriodKey = 'M';
  function openScrapDay(date) {
    const products = getProducts(), defs = pieDoughDefaults(products), saved = ((scrapDays()[date] || {}).items || []), used = new Set();
    const items = pieLinesOf(date).map((l) => {
      const sv = saved.find((x) => String(x.code) === String(l.code)); if (sv) used.add(sv);
      return { id: uid(), code: String(l.code), name: l.name, actual: Number(l.actual) || 0, unit: l.unit, prodKg: pieLineKg(l, products, defs), fromScrap: madeFromScrap(l.code) && !defaultScrapType(l.code, defs), type: sv ? sv.type : defaultScrapType(l.code, defs), kg: sv ? Number(sv.kg) || 0 : 0, zero: !!sv && !(Number(sv.kg) > 0) };
    });
    saved.filter((x) => !used.has(x)).forEach((x) => items.push({ id: uid(), code: String(x.code || ''), name: x.name, actual: 0, unit: '', manual: true, type: x.type, kg: Number(x.kg) || 0 }));
    scrapDraft = { date, items, uses: (((scrapDays()[date] || {}).uses) || []).map((u) => ({ id: uid(), type: u.type, name: u.name || '', kg: Number(u.kg) || 0 })), memo: (scrapDays()[date] || {}).memo || '' };
    renderScrapEditor();
  }
  function renderScrapEditor() {
    const d = scrapDraft; if (!d) return;
    const dt = new Date(d.date + 'T00:00:00'), inCls = 'no-spinner w-24 text-right border border-stone-300 rounded-lg px-2 py-1.5 text-sm font-extrabold tabular-nums bg-amber-50/70';
    const sel = (it) => `<select onchange="Prod.setScrapField('${it.id}','type',this.value)" class="border border-stone-300 rounded-lg px-2 py-1.5 text-sm font-bold ${SCRAP_STYLE[it.type] ? SCRAP_STYLE[it.type].text : 'text-stone-400'}"><option value="">해당 없음</option>${SCRAP_TYPES.map((t) => `<option ${t === it.type ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    const rows = d.items.map((it) => `<div class="grid grid-cols-[minmax(0,1.5fr)_100px_140px_200px_26px] gap-2 items-center px-2.5 py-1.5 rounded-lg border ${it.type ? 'border-stone-200 bg-white' : 'border-dashed border-stone-300 bg-stone-50'}">
        <div class="min-w-0">${it.manual ? `<input type="text" value="${esc(it.name)}" oninput="Prod.setScrapField('${it.id}','name',this.value)" placeholder="내용 (예: 재단 자투리)" class="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm font-bold">` : `<div class="font-bold text-stone-900 truncate">${esc(it.name)}</div>${it.fromScrap ? '<div class="text-[11px] font-bold text-stone-400">파지로 생산하는 품목 — 보통 입력하지 않음</div>' : ''}`}</div>
        <div class="text-right text-sm tabular-nums">${it.manual ? '<span class="text-xs text-stone-400">직접 추가</span>' : `<span class="inline-flex items-center gap-1" title="생산 스케쥴의 실행 값"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><b>${num(it.actual)}</b> ${esc(it.unit)}</span>${it.prodKg ? `<div class="text-[11px] text-stone-500">반죽 ${num(it.prodKg)}kg</div>` : ''}`}</div>
        ${sel(it)}
        <div class="flex items-center justify-end gap-1"><input type="number" min="0" step="any" value="${it.kg || (it.zero ? '0' : '')}" placeholder="" oninput="Prod.setScrapField('${it.id}','kg',this.value)" class="${inCls}"><span class="text-xs font-bold text-stone-500">kg</span><span data-scrap-pct="${it.id}" class="w-12 text-right text-xs font-bold text-stone-500 tabular-nums">${ratioTxt(it.kg, it.prodKg)}</span></div>
        ${it.manual ? `<button type="button" onclick="Prod.removeScrapRow('${it.id}')" title="삭제" class="w-7 h-7 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer text-lg leading-none">×</button>` : '<span></span>'}
      </div>`).join('');
    const autos = scrapAutoUses(d.date);
    const useGrid = 'grid grid-cols-[minmax(0,1.5fr)_140px_200px_26px] gap-2 items-center px-2.5 py-1.5 rounded-lg border';
    const autoRows = autos.map((u) => `<div class="${useGrid} border-sky-200 bg-sky-50/50"><div class="min-w-0"><div class="font-bold text-stone-900 truncate">${esc(u.name)}</div><div class="text-[11px] text-stone-500"><span class="inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>생산 스케쥴 반제품 ${num(u.batches)}배합 × ${num(u.perBatch)}kg · 자동 차감</span></div></div><div class="text-sm font-bold ${SCRAP_STYLE[u.type] ? SCRAP_STYLE[u.type].text : ''}">${esc(u.type)}</div><div class="text-right text-sm font-extrabold tabular-nums text-sky-800">−${num(u.kg)} kg</div><span></span></div>`).join('');
    const prodRows = scrapProductUses(d.date, getProducts()).map((u) => `<div class="${useGrid} border-sky-200 bg-sky-50/50"><div class="min-w-0"><div class="font-bold text-stone-900 truncate">${esc(u.name)} <span class="text-[11px] font-bold text-stone-400">파지로 만드는 제품</span></div><div class="text-[11px] text-stone-500"><span class="inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>생산 스케쥴 실행 ${num(u.qty)} ${esc(u.unit)}${u.unknown ? ' · 제품단가에 1배합 실생산이 없어 계산 불가' : ` = ${num(u.batches, 2)}배합 × 레시피 파지 ${num(u.perBatch, 2)}kg`}</span></div></div><div class="text-sm font-bold leading-tight">${u.parts.map((pt) => `<div class="${SCRAP_STYLE[pt.type] ? SCRAP_STYLE[pt.type].text : 'text-stone-400'}">${esc(pt.type || SCRAP_NOTYPE)}${u.parts.length > 1 && !u.unknown ? ` <span class="text-[11px] tabular-nums">${num(pt.kg)}kg</span>` : ''}</div>`).join('')}</div><div class="text-right text-sm font-extrabold tabular-nums text-sky-800">${u.unknown ? '-' : '−' + num(u.kg) + ' kg'}</div><span></span></div>`).join('');
    const useRows = d.uses.map((u) => `<div class="${useGrid} border-stone-200 bg-white"><input type="text" value="${esc(u.name)}" oninput="Prod.setScrapUse('${u.id}','name',this.value)" placeholder="어디에 썼는지 (예: 밤사과 막대)" class="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm font-bold">
        <select onchange="Prod.setScrapUse('${u.id}','type',this.value)" class="border border-stone-300 rounded-lg px-2 py-1.5 text-sm font-bold ${SCRAP_STYLE[u.type] ? SCRAP_STYLE[u.type].text : ''}">${SCRAP_TYPES.map((t) => `<option ${t === u.type ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <div class="flex items-center justify-end gap-1"><input type="number" min="0" step="any" value="${u.kg || ''}" placeholder="0" oninput="Prod.setScrapUse('${u.id}','kg',this.value)" class="no-spinner w-24 text-right border border-stone-300 rounded-lg px-2 py-1.5 text-sm font-extrabold tabular-nums bg-sky-50/70"><span class="text-xs font-bold text-stone-500">kg</span><span class="w-12"></span></div>
        <button type="button" onclick="Prod.removeScrapUse('${u.id}')" title="삭제" class="w-7 h-7 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer text-lg leading-none">×</button></div>`).join('');
    modal(`<div class="px-5 py-3 border-b border-stone-200 flex items-center justify-between gap-2"><div><h3 class="text-base font-extrabold">${dt.getMonth() + 1}월 ${dt.getDate()}일 (${DOW[dt.getDay()]}) 파지 발생${SCRAP_USE_ON ? ' · 사용' : ''}</h3><div class="text-xs text-stone-500 mt-0.5">생산 스케쥴에 실행이 입력된 파이 품목이 그대로 나옵니다. 품목마다 나온 파지를 kg으로 적고, 파지가 없으면 0을 적으세요(비워 두면 '미입력'으로 남습니다).${SCRAP_USE_ON ? ' 사용: 반제품 믹싱과 파지로 만드는 제품은 생산 스케쥴에서 자동으로 계산되고, 그 밖에 쓴 파지는 직접 추가합니다.' : ''}</div></div><span id="scrapSum" class="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm font-extrabold tabular-nums whitespace-nowrap"></span></div>
      <div class="p-4 max-h-[65vh] overflow-y-auto flex flex-col gap-1.5">
        ${SCRAP_USE_ON ? '<div class="text-xs font-extrabold text-amber-800">파지 발생</div>' : ''}
        <div class="grid grid-cols-[minmax(0,1.5fr)_100px_140px_200px_26px] gap-2 px-2.5 text-xs font-extrabold text-stone-500"><div>파이 품목</div><div class="text-right">실행</div><div>파지 종류</div><div class="text-right">파지 발생량 · 비율</div><div></div></div>
        ${rows || '<div class="py-6 text-center text-sm text-stone-400">이 날 실행이 입력된 파이 품목이 없습니다. 생산 스케쥴에 실행을 먼저 입력하거나 아래에서 직접 추가하세요.</div>'}
        <div><button type="button" onclick="Prod.addScrapRow()" class="mt-1 px-3 py-1.5 rounded-lg border border-dashed border-stone-300 text-xs font-bold text-stone-600 cursor-pointer hover:bg-stone-50">+ 직접 추가 (품목 없이 파지만)</button></div>
        ${!SCRAP_USE_ON ? '' : `        <div class="mt-3 pt-3 border-t border-stone-200 text-xs font-extrabold text-sky-800">파지 사용</div>
        <div class="grid grid-cols-[minmax(0,1.5fr)_140px_200px_26px] gap-2 px-2.5 text-xs font-extrabold text-stone-500"><div>사용처</div><div>파지 종류</div><div class="text-right">사용량</div><div></div></div>
        ${autoRows}${prodRows}${useRows}${!autoRows && !prodRows && !useRows ? '<div class="py-3 text-center text-xs text-stone-400">이 날 자동 차감(반제품 믹싱)이나 직접 입력한 사용이 없습니다.</div>' : ''}
        <div><button type="button" onclick="Prod.addScrapUse()" class="mt-1 px-3 py-1.5 rounded-lg border border-dashed border-sky-300 text-xs font-bold text-sky-800 cursor-pointer hover:bg-sky-50">+ 사용 직접 추가</button></div>`}
        <input type="text" value="${esc(d.memo)}" oninput="Prod.setScrapMemo(this.value)" placeholder="메모" class="mt-2 w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm">
      </div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2"><button type="button" onclick="Prod.closeScrapDay()" class="px-4 py-2 rounded-xl border border-stone-300 text-sm font-bold cursor-pointer">취소</button><button type="button" onclick="Prod.saveScrapDay()" class="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">저장</button></div>`, true);
    updateScrapSum();
  }
  function updateScrapSum() {
    const el = document.getElementById('scrapSum'); if (!el || !scrapDraft) return;
    const made = scrapDraft.items.reduce((t, it) => t + (it.type && it.kg > 0 ? it.kg : 0), 0);
    const used = scrapAutoUses(scrapDraft.date).reduce((t, u) => t + u.kg, 0) + scrapProductUses(scrapDraft.date, getProducts()).reduce((t, u) => t + u.kg, 0) + scrapDraft.uses.reduce((t, u) => t + (u.kg > 0 ? u.kg : 0), 0);
    el.textContent = SCRAP_USE_ON ? `발생 ${num(made)}kg · 사용 ${num(used)}kg` : `합계 ${num(made)}kg`;
  }
  function setScrapUse(id, field, value) {
    const u = scrapDraft && scrapDraft.uses.find((x) => x.id === id); if (!u) return;
    if (field === 'kg') { u.kg = Math.max(0, parseFloat(value) || 0); updateScrapSum(); } else if (field === 'type') { u.type = value; renderScrapEditor(); } else u.name = value;
  }
  function addScrapUse() { if (!scrapDraft) return; scrapDraft.uses.push({ id: uid(), type: SCRAP_TYPES[0], name: '', kg: 0 }); renderScrapEditor(); }
  function removeScrapUse(id) { if (!scrapDraft) return; scrapDraft.uses = scrapDraft.uses.filter((x) => x.id !== id); renderScrapEditor(); }
  function setScrapField(id, field, value) {
    const it = scrapDraft && scrapDraft.items.find((x) => x.id === id); if (!it) return;
    if (field === 'kg') { it.kg = Math.max(0, parseFloat(value) || 0); it.zero = String(value).trim() !== '' && !(it.kg > 0); updateScrapSum(); const el = document.querySelector(`[data-scrap-pct="${id}"]`); if (el) el.textContent = ratioTxt(it.kg, it.prodKg); }
    else if (field === 'type') { it.type = value; renderScrapEditor(); }
    else if (field === 'name') it.name = value;
  }
  function addScrapRow() { if (!scrapDraft) return; scrapDraft.items.push({ id: uid(), code: '', name: '', actual: 0, unit: '', manual: true, type: SCRAP_TYPES[0], kg: 0 }); renderScrapEditor(); }
  function removeScrapRow(id) { if (!scrapDraft) return; scrapDraft.items = scrapDraft.items.filter((x) => x.id !== id); renderScrapEditor(); }
  function closeScrapDay() { scrapDraft = null; closeModal(); }
  function saveScrapDay() {
    const d = scrapDraft; if (!d) return;
    const bad = d.items.find((it) => it.kg > 0 && !it.type);
    if (bad) { toast(`'${bad.name || '직접 추가'}'의 파지 종류를 선택해 주세요.`, 'error'); return; }
    const items = d.items.filter((it) => it.kg > 0 || (it.zero && it.code && !it.manual)).map((it) => ({ code: it.code, name: String(it.name || '').trim() || '직접 추가', type: it.type, kg: it.kg })); // 0을 적은 품목도 '입력함'으로 기록
    const sd = scrapDays(), memo = String(d.memo || '').trim();
    const uses = d.uses.filter((u) => u.kg > 0).map((u) => ({ type: u.type, name: String(u.name || '').trim(), kg: u.kg }));
    if (items.length || uses.length || memo) sd[d.date] = { items, uses, memo }; else delete sd[d.date];
    scrapDraft = null; closeModal(); markChanged(); render();
    toast('파지 발생량을 저장했습니다.', 'success');
  }

  // ----- 원재료 손실 (수율) 분석 -----
  //  파이(공정 순서대로): ① 믹싱  배합 × 레시피 '(기본)○○반죽' 1배합 중량 = 만든 반죽
  //                      ② 라미네이팅  카트 × 1카트 개수 × 반죽 1개 g = 접은 반죽 (여기에 버터가 들어가 '(버터)○○반죽'이 됨)
  //                      ③ 성형  카트 × 1카트 개수 × 버터 포함 1개 g = 투입한 버터 반죽  vs  파이 생산 개수 × 1개당 반죽 g
  //  생지(배합 입력): 투입 배합 × 1배합 PK수(표준) vs 실제 생산 수량(포장 수량을 직접 입력한 줄만) → 수율·손실 원재료비
  function lossCfg() { db.loss = db.loss && typeof db.loss === 'object' ? db.loss : {}; db.loss.cart = db.loss.cart || {}; db.loss.pie = db.loss.pie || {}; return db.loss; }
  function isLaminating(name) { return /라미네이팅/.test(String(name || '')); }
  function laminatingItems() { return db.semiItems.filter((s) => isLaminating(s.name)); }
  // '(버터)패스츄리반죽 라미네이팅' → '패스츄리'
  function semiShort(name) { return String(name || '').replace(/^\((기본|버터)\)/, '').replace(/\s*(라미네이팅|믹싱)$/, '').replace(/\s*반죽$/, '').trim(); }
  function cartStd(name) { const c = lossCfg().cart[name] || DEFAULT_CART_STD[name] || {}; const d = DEFAULT_CART_STD[name] || {}; return { pieces: Number(c.pieces) || 0, g: Number(c.g) || 0, butter: Number(c.butter) > 0 ? Number(c.butter) : Number(d.butter) || 0 }; }
  function recipeMetricsByName(name) {
    const recipes = Array.isArray(window.recipesData) ? window.recipesData : [];
    const rc = recipes.find((r) => r.recipeType === 'SUB' && String(r.productName || '').trim() === name);
    if (!rc || typeof window.calculateRecipeMetrics !== 'function') return null;
    try { const m = window.calculateRecipeMetrics(JSON.parse(JSON.stringify(rc))); return { rc, weightG: Number(m.weightTotalG) || 0, cost: Number(m.rawMaterialCost) || 0 }; } catch (e) { return null; }
  }
  // 라미네이팅 반제품 1종의 공정 기준: 믹싱 반제품·레시피(기본/버터)·1카트 기준을 한데 묶음
  function doughChain(lamName) {
    const butterName = lamName.replace(/\s*라미네이팅$/, ''), linked = /^\(버터\)/.test(butterName);
    const baseName = butterName.replace(/^\(버터\)/, '(기본)');
    const mixName = lamName.replace(/^\(버터\)/, '(기본)').replace(/라미네이팅$/, '믹싱');
    const std = cartStd(lamName), c = { lamName, mixName, short: semiShort(lamName), butterName: linked ? butterName : '', baseName: linked ? baseName : '', pieces: std.pieces, g: std.g };
    const base = linked ? recipeMetricsByName(baseName) : null, butter = linked ? recipeMetricsByName(butterName) : null;
    c.hasBase = !!base; c.hasButter = !!butter;
    c.baseBatchKg = base ? base.weightG / 1000 : null;                       // 믹싱 1배합 반죽 kg
    c.baseCostPerKg = base && base.weightG > 0 ? (base.cost / base.weightG) * 1000 : null;
    c.batchCost = base ? base.cost : null;                                   // 믹싱 1배합 원재료비
    c.piecesPerBatch = base && std.g > 0 ? base.weightG / std.g : null;      // 1배합으로 나오는 반죽 개수
    // 버터 1개분 = (버터)레시피의 버터 등 직접 재료 g ÷ 기본 반죽 개수
    let rawG = 0, baseEa = 0;
    ((butter && butter.rc.ingredients) || []).forEach((i) => { const q = Number(i.qty) || 0; if (i.rowType === 'SUB_RECIPE') { if (String(i.unit || '').toUpperCase() === 'EA') baseEa += q; } else rawG += q; });
    c.butterRecipe = butter && baseEa > 0 ? rawG / baseEa : null;             // 레시피로 계산한 1개당 버터 (참고)
    c.butterPerPiece = std.butter > 0 ? std.butter : c.butterRecipe;          // 현장 기준(1개당 버터 g) 우선
    c.butterPieceG = c.butterPerPiece != null && std.g > 0 ? std.g + c.butterPerPiece : null;  // 버터 넣은 뒤 1개 g
    c.butterCostPerKg = butter && butter.weightG > 0 ? (butter.cost / butter.weightG) * 1000 : null;
    c.cartBaseKg = std.pieces && std.g ? (std.pieces * std.g) / 1000 : null;  // 1카트 기본 반죽 kg
    c.cartButterKg = std.pieces && c.butterPieceG ? (std.pieces * c.butterPieceG) / 1000 : null; // 1카트 버터 반죽 kg
    c.ready = !!(c.cartBaseKg && c.cartButterKg);
    c.why = !linked ? '레시피 연결 없음' : !std.pieces || !std.g ? '1카트 기준 미설정' : !base ? `레시피 '${baseName}' 없음` : !butter ? `레시피 '${butterName}' 없음` : c.butterPerPiece == null ? '반죽 1개당 버터 g 미설정' : '';
    return c;
  }
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
      const lamHit = laminatingItems().find((x) => { const k = semiShort(x.name).replace(/\s/g, ''); return k && nm.replace(/\s/g, '').includes(k); });
      const group = lamHit ? lamHit.name : '';
      out[p.productCode] = { group, gPerEa: grams > 0 && p.batchOutputEa > 0 ? Math.round((grams / p.batchOutputEa) * 10) / 10 : 0, recipeDiv: r ? Number(r.divisionWeight) || 0 : 0, doughNames: nm, subIds, hasRecipe: !!r };
    });
    return out;
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
    const ymOf = (k) => ymd(new Date(y, m - 1 + k, 1)).slice(0, 7), end = ymd(new Date(y, m, 0));
    const first = Object.keys(db.days).sort()[0] || `${ym}-01`, firstYm = first.slice(0, 7), [fy, fm] = firstYm.split('-').map(Number);
    // stockPrev/stockLast: 월초·월말 카트 재고(실사)를 반영할 때 쓰는 달 (기간 시작 전달 말 · 기간 마지막 달 말)
    return [
      { key: 'M', label: `${m}월 전체`, sub: '', from: `${ym}-01`, to: end, stockPrev: ymOf(-1), stockLast: ym },
      { key: 'Q', label: '최근 3개월', sub: `${Number(ymOf(-2).slice(5))}~${m}월`, from: `${ymOf(-2)}-01`, to: end, stockPrev: ymOf(-3), stockLast: ym },
      { key: 'ALL', label: '누적', sub: `${firstYm.slice(2).replace('-', '.')}~`, from: `${firstYm}-01`, to: end, stockPrev: ymd(new Date(fy, fm - 2, 1)).slice(0, 7), stockLast: ym },
      ...weeks];
  }
  // 성형한 날 '사용 카트' 입력 확인 (이 날짜부터 경고)
  const USED_WARN_FROM = '2026-11-23';
  function missingUsedGroups(day, products, defs) {
    if (!day) return [];
    const need = {};
    (day.lines || []).forEach((l) => { if (l.cat !== 'PIE' || !(lineActualPk(l) > 0)) return; const g = pieSetting(l.code, defs).group; if (g) need[g] = true; });
    (day.semi || []).forEach((x) => { if (need[x.name] && Number(x.used) > 0) delete need[x.name]; });
    return Object.keys(need).filter((n) => doughChain(n).ready);
  }
  // 레시피 1배합에 들어가는 파지 g: 원재료 이름에 '파지' 또는 '(파지)…' 반제품
  function recipeScrapInfo(code) {
    const recipes = Array.isArray(window.recipesData) ? window.recipesData : [];
    const rc = recipes.find((x) => String(x.productCode) === String(code) && x.recipeType !== 'SUB'); if (!rc) return { g: 0, type: '', byType: {} };
    let g = 0; const byType = {};
    (rc.ingredients || []).forEach((i) => {
      const q = Number(i.qty) || 0, unit = String(i.unit || '').toUpperCase();
      let add = 0, nm = String(i.item || '');
      if (i.rowType === 'SUB_RECIPE') { const sub = recipes.find((r) => r.id === i.subRecipeId); nm = String((sub && sub.productName) || i.item || ''); if (/파지/.test(nm)) add = unit === 'EA' ? q * (Number(sub && sub.divisionWeight) || 0) : unit === 'KG' ? q * 1000 : q; }
      else if (/파지/.test(nm)) add = unit === 'KG' ? q * 1000 : q;
      if (add > 0) { g += add; const t = scrapTypeOfName(nm); byType[t] = (byType[t] || 0) + add; } // 레시피에 적힌 파지 종류별 g ('파지'뿐이면 종류 없음 = '')
    });
    const types = Object.keys(byType).filter(Boolean);
    return { g, type: types.length === 1 && !byType[''] ? types[0] : '', byType };
  }
  function recipeScrapG(code) { return recipeScrapInfo(code).g; }
  // 그날 파지로 만드는 제품이 쓴 파지 (생산 스케쥴 실행 × 레시피 1배합 파지). 종류는 레시피 이름으로 알 수 있을 때만
  function scrapProductUses(date, products) {
    return ((db.days[date] || {}).lines || []).map((l) => {
      if (!(Number(l.actual) > 0)) return null;
      const info = recipeScrapInfo(l.code); if (!(info.g > 0)) return null;
      const p = productByCode(l.code, products);
      const ea = lineActualPk(l) * linePerStock(l) * (p ? Number(p.pkQuantityEa) || 0 : 0), outEa = p ? Number(p.batchOutputEa) || 0 : 0;
      const batches = l.unit === '배합' ? Number(l.actual) : outEa > 0 ? ea / outEa : null;
      const parts = Object.entries(info.byType).map(([type, g]) => ({ type, perBatch: g / 1000, kg: batches == null ? 0 : (batches * g) / 1000 })); // 레시피에 적힌 종류별 사용량
      return { code: String(l.code), name: l.name, cat: l.cat, qty: Number(l.actual), unit: l.unit, perBatch: info.g / 1000, batches, kg: batches == null ? 0 : (batches * info.g) / 1000, type: info.type, parts, unknown: batches == null };
    }).filter(Boolean);
  }
  // 파지 전환: 기간에 발생한 파지(2. 파지 관리) vs 파지를 쓰는 품목의 생산에 들어간 파지(레시피 기준)
  function computeScrapConversion(from0, to, products) {
    // 파지 기록을 시작한 날 이전의 사용분은 비교에서 뺌 (발생 기록이 없는 기간이라 전환율이 부풀려짐)
    const first = Object.keys(scrapDays()).filter((d) => ((scrapDays()[d].items || []).some((it) => Number(it.kg) > 0))).sort()[0] || '';
    const from = first && first > from0 ? first : from0, clamped = from !== from0;
    const made = scrapTotals(from, to), use = {};
    Object.keys(db.days).forEach((d) => { if (d < from || d > to) return; scrapProductUses(d, products).forEach((u) => {
      const x = use[u.code] || (use[u.code] = { code: u.code, name: u.name, cat: u.cat, qty: 0, unit: u.unit, gPerBatch: u.perBatch * 1000, batches: 0, kg: 0, unknown: false });
      x.qty += u.qty; if (u.unknown) x.unknown = true; else { x.batches += u.batches; x.kg += u.kg; }
    }); });
    // 반제품 믹싱에 자동 차감된 파지 (레시피 품목과 겹치지 않음)
    const mixUse = {};
    if (SCRAP_USE_ON) Object.keys(db.days).forEach((d) => { if (d < from || d > to) return; scrapAutoUses(d).forEach((u) => { const x = mixUse[u.name] || (mixUse[u.name] = { code: 'MIX:' + u.name, name: u.name, cat: '', mix: true, qty: 0, unit: '배합', gPerBatch: u.perBatch * 1000, batches: 0, kg: 0, unknown: false }); x.qty += u.batches; x.batches += u.batches; x.kg += u.kg; }); });
    Object.values(mixUse).forEach((x) => { use[x.code] = x; });
    const rows = Object.values(use).sort((a, b) => b.kg - a.kg), usedKg = rows.reduce((s, r) => s + r.kg, 0);
    return { made, rows, usedKg, rate: made.total > 0 ? (usedKg / made.total) * 100 : null, from, clamped };
  }
  function computeLoss(from, to, products, defs, per) {
    const doughRows = {}, pieGroups = {}, mixOf = {};
    laminatingItems().forEach((s) => { const ch = doughChain(s.name); pieGroups[s.name] = { name: s.name, ch, batches: 0, made: 0, usedCarts: 0, usedRecorded: false, waste: 0, usedKg: 0, pies: {}, missingG: [] }; mixOf[ch.mixName] = pieGroups[s.name]; });
    Object.entries(db.days).forEach(([d, day]) => {
      if (d < from || d > to) return;
      (day.semi || []).forEach((s) => {
        if (mixOf[s.name]) { mixOf[s.name].batches += Number(s.actual) || 0; return; }
        const g = pieGroups[s.name]; if (!g) return;
        g.made += Number(s.actual) || 0; g.waste += Number(s.waste) || 0;
        if (Number(s.used) > 0) { g.usedRecorded = true; g.usedCarts += Number(s.used); }
      });
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
    const packPk = {};
    Object.entries(packDays()).forEach(([d, day]) => { if (d < from || d > to) return; (day.items || []).forEach((it) => { packPk[String(it.code)] = (packPk[String(it.code)] || 0) + (Number(it.pk) || 0); }); });
    const dough = Object.values(doughRows).map((r) => {
      // 실제 생산: 포장 완료 등록이 있으면 그 PK, 없으면 일자 창에서 직접 적은 포장 수량(그 줄만)
      const pk = packPk[String(r.code)] || 0;
      if (pk > 0) { r.src = 'PACK'; r.expC = r.expAll; r.actC = pk; r.bC = r.batches; r.unconfirmed = 0; }
      else if (r.bC > 0) r.src = 'MANUAL';
      else { r.src = ''; r.unconfirmed = 1; }
      const yieldPct = r.expC > 0 ? (r.actC / r.expC) * 100 : null;
      const lossMoney = r.expC > 0 ? (1 - r.actC / r.expC) * r.bC * r.matPerBatch : null;
      return { ...r, yieldPct, diff: r.actC - r.expC, lossMoney };
    }).sort((a, b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat) || a.code.localeCompare(b.code));
    const pies = Object.values(pieGroups).map((g) => {
      const ch = g.ch, x = { ...g };
      x.active = g.batches > 0 || g.made > 0 || g.usedKg > 0;
      // ① 믹싱
      x.mixKg = ch.baseBatchKg != null ? g.batches * ch.baseBatchKg : null;
      x.mixPieces = ch.piecesPerBatch != null ? g.batches * ch.piecesPerBatch : null;
      x.mixCost = ch.batchCost != null ? g.batches * ch.batchCost : null;
      // ② 라미네이팅 (만든 카트)
      x.lamPieces = ch.pieces ? g.made * ch.pieces : null;
      x.lamBaseKg = ch.cartBaseKg != null ? g.made * ch.cartBaseKg : null;
      x.lamButterKg = ch.cartButterKg != null ? g.made * ch.cartButterKg : null;
      x.mixDiffKg = x.mixKg != null && x.lamBaseKg != null ? x.mixKg - x.lamBaseKg : null;        // 믹싱했지만 라미네이팅하지 않은 반죽
      x.mixLossPct = x.mixDiffKg != null && x.mixKg > 0 ? (x.mixDiffKg / x.mixKg) * 100 : null;
      x.mixLossMoney = x.mixDiffKg != null && ch.baseCostPerKg != null ? x.mixDiffKg * ch.baseCostPerKg : null;
      // ③ 성형 (사용 카트를 적었으면 사용 카트, 아니면 만든 카트)
      // 기준 우선순위: ① 사용 카트(성형한 날 적은 값) ② 재고 반영(기간 전 재고 + 만든 카트 − 기간 말 재고) ③ 만든 카트
      const es = lossCfg().endStock || {}, o = per && per.stockPrev ? (es[per.stockPrev] || {})[g.name] : undefined, c = per && per.stockLast ? (es[per.stockLast] || {})[g.name] : undefined;
      x.stockOpen = o; x.stockClose = c;
      x.stockCarts = o !== undefined && c !== undefined ? Number(o) + g.made - Number(c) : null;
      x.basisKey = g.usedRecorded ? 'USED' : x.stockCarts !== null ? 'STOCK' : 'MADE';
      x.basis = { USED: '사용 카트', STOCK: '재고 반영', MADE: '만든 카트 (사용 카트·재고 미입력)' }[x.basisKey];
      x.carts = x.basisKey === 'USED' ? g.usedCarts : x.basisKey === 'STOCK' ? x.stockCarts : g.made;
      x.inputKg = ch.cartButterKg != null ? x.carts * ch.cartButterKg : null;
      x.diffKg = x.inputKg != null ? x.inputKg - g.usedKg : null;
      x.lossPct = x.inputKg > 0 ? (1 - g.usedKg / x.inputKg) * 100 : null;
      x.over = x.diffKg != null && x.diffKg < 0;                                   // 투입보다 더 씀 (기록 확인 필요)
      x.lossMoney = x.diffKg != null && ch.butterCostPerKg != null ? x.diffKg * ch.butterCostPerKg : null; // 부족 +, 초과 −
      return x;
    });
    const sumExp = dough.reduce((s, r) => s + r.expC, 0), sumAct = dough.reduce((s, r) => s + r.actC, 0);
    const pieIn = pies.reduce((s, g) => s + (g.inputKg || 0), 0), pieUsed = pies.reduce((s, g) => s + (g.inputKg != null ? g.usedKg : 0), 0);
    return { dough, pies, doughYield: sumExp > 0 ? (sumAct / sumExp) * 100 : null, doughLossMoney: dough.reduce((s, r) => s + (r.lossMoney || 0), 0), unconfirmed: dough.reduce((s, r) => s + r.unconfirmed, 0),
      pieYield: pieIn > 0 ? (pieUsed / pieIn) * 100 : null, doughCats: CAT_ORDER.filter((c) => c !== 'PIE').map((c) => { const rows = dough.filter((r) => r.cat === c && r.expC > 0), e = rows.reduce((s, r) => s + r.expC, 0), a = rows.reduce((s, r) => s + r.actC, 0); const all = dough.filter((r) => r.cat === c); return { cat: c, n: rows.length, total: all.length, unconfirmed: all.reduce((s, r) => s + r.unconfirmed, 0), yieldPct: e > 0 ? (a / e) * 100 : null, money: rows.length ? rows.reduce((s, r) => s + (r.lossMoney || 0), 0) : null, rows }; }).filter((x) => x.total),
      pieLossPct: pieIn > 0 ? (1 - pieUsed / pieIn) * 100 : null, pieLossMoney: pies.reduce((s, g) => s + (g.lossMoney || 0), 0), pieHasMoney: pies.some((g) => g.lossMoney != null && g.carts > 0), pieOver: pies.filter((g) => g.over && g.carts > 0).map((g) => g.ch.short) };
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
  // 파이 성형: 투입보다 더 쓴 것으로 나오면(음수) 손실이 아니라 '초과' — 카트 기록 누락 가능성
  function pieLossCell(v) {
    if (v === null || v === undefined) return '<span class="text-stone-400">-</span>';
    if (v < 0) return `<span class="font-extrabold tabular-nums text-amber-700" title="생산된 라미네이팅 반죽보다 성형에 사용한 반죽이 더 많음">초과 ${Math.abs(v).toFixed(1)}%</span>`;
    return `<span class="font-extrabold tabular-nums ${v <= 3 ? 'text-emerald-700' : 'text-rose-700'}">부족 ${v.toFixed(1)}%</span>`;
  }
  function renderLoss() {
    const products = getProducts(), defs = pieDoughDefaults(products);
    const periods = lossPeriods(cursorMonth);
    const per = periods.find((p) => p.key === lossPeriodKey) || periods[0];
    const L = computeLoss(per.from, per.to, products, defs, per);
    const SC = computeScrapConversion(per.from, per.to, products);
    const [y, m] = cursorMonth.split('-').map(Number);
    const prevYm = ymd(new Date(y, m - 2, 1)).slice(0, 7), nextYm = ymd(new Date(y, m, 1)).slice(0, 7);
    const monthBtns = Array.from({ length: 12 }, (_, i) => { const mm = `${y}-${pad(i + 1)}`, on = mm === cursorMonth; return `<button type="button" onclick="Prod.setMonth('${mm}')" class="px-2.5 py-1 rounded-xl text-xs cursor-pointer ${on ? 'bg-amber-600 text-white font-extrabold shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200 font-bold'}">${i + 1}월</button>`; }).join('');
    const pBtns = periods.map((p) => `<button type="button" onclick="Prod.setLossPeriod('${p.key}')" class="px-2.5 py-1 rounded-xl text-xs cursor-pointer ${p.key === per.key ? 'bg-stone-900 text-white font-extrabold' : 'bg-white border border-stone-200 text-stone-600 font-bold hover:bg-stone-100'}">${p.label}${p.sub ? ` <span class="${p.key === per.key ? 'text-stone-300' : 'text-stone-400'} font-semibold">${p.sub}</span>` : ''}</button>`).join('');
    // ● 초록 점 = 생산일지·포장 완료 등록에 입력한 값을 그대로 불러온 것 (입력을 고치면 바로 바뀜)
    const live = (html, src) => `<span class="inline-flex items-center gap-1 whitespace-nowrap" title="${src || '생산일지'}에서 실시간으로 불러온 값"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>${html}</span>`;
    const SRC = { PACK: '포장 완료 등록', MANUAL: '일자 창 포장 수량' };
    const moneyCell = (v) => { if (v == null) return '<span class="text-stone-400">-</span>'; const r = Math.round(v); return r === 0 ? '<span class="font-bold tabular-nums text-stone-500">0원</span>' : `<span class="font-bold tabular-nums ${r > 0 ? 'text-rose-700' : 'text-emerald-700'}">${r > 0 ? '−' : '+'}${won(Math.abs(r))}</span>`; };
    const doughTr = (r) => `<tr class="border-b border-stone-100 whitespace-nowrap">
        <td class="py-1.5 px-2 font-bold">${esc(r.name)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums">${live(num(r.batches) + '배합')}</td>
        <td class="py-1.5 px-2 text-right tabular-nums text-stone-600">${num(r.expAll)} ${r.su}</td>
        <td class="py-1.5 px-2 text-right tabular-nums font-bold">${r.src ? live(num(r.actC) + ' ' + r.su, SRC[r.src]) : '<span class="text-amber-700 text-xs">포장 기록 없음</span>'}</td>
        <td class="py-1.5 px-2 text-right tabular-nums ${r.diff < 0 ? 'text-rose-700' : 'text-emerald-700'}">${r.src ? (r.diff > 0 ? '+' : '') + num(r.diff) : '-'}</td>
        <td class="py-1.5 px-2 text-right">${yieldCell(r.yieldPct)}</td>
        <td class="py-1.5 px-2 text-right tabular-nums">${r.lossMoney === null ? '-' : (r.matPerBatch ? moneyCell(r.lossMoney) : '<span class="text-stone-400" title="제품단가 탭 원재료비 없음">원재료비 없음</span>')}${r.src && r.diff < 0 ? ` <button type="button" onclick="Prod.openLossMaterials('${esc(r.code)}')" class="ml-1 px-1.5 py-0.5 rounded-md border border-stone-300 bg-white text-[11px] font-bold text-stone-700 hover:bg-stone-50 cursor-pointer">원재료</button>` : ''}</td>
        <td class="py-1.5 px-2 text-xs text-stone-500">${r.src ? SRC[r.src] : '-'}</td>
      </tr>`;
    const kg = (v) => (v == null ? '-' : num(v) + 'kg');
    const no = (n) => `<span class="inline-flex w-5 h-5 rounded-full bg-stone-900 text-white text-[11px] font-extrabold items-center justify-center mr-1.5">${n}</span>`;
    const c1 = 'py-1.5 px-2 font-bold whitespace-nowrap', c2 = 'py-1.5 px-2 text-right tabular-nums font-extrabold whitespace-nowrap', c3 = 'py-1.5 px-2 text-xs text-stone-500 tabular-nums', c4 = 'py-1.5 px-2 text-right tabular-nums font-extrabold whitespace-nowrap', c5 = 'py-1.5 px-2 text-xs tabular-nums';
    const pieCards = L.pies.filter((g) => g.active || g.ch.ready).map((g) => {
      const ch = g.ch;
      if (!ch.ready) return `<div class="rounded-2xl border border-stone-200 p-3 flex flex-wrap items-center justify-between gap-2"><b class="text-sm">${esc(ch.short)} 반죽</b><span class="text-xs font-bold text-rose-700">기준 미설정 — ${esc(ch.why)}${g.batches || g.made ? ` (기록: 믹싱 ${num(g.batches)}배합 · 라미네이팅 ${num(g.made)}카트)` : ''}</span></div>`;
      const pies = Object.values(g.pies);
      const pieTrs = pies.map((pe) => `<tr class="border-b border-stone-100"><td class="py-1 px-2 pl-9 text-xs text-stone-600">${esc(pe.name)}</td><td class="py-1 px-2 text-right text-xs tabular-nums">${live(num(pe.ea, 0) + '개')}</td><td class="${c3}">× 1개당 반죽 ${pe.gPerEa ? num(pe.gPerEa) + 'g' : '<b class="text-rose-700">미설정</b>'}</td><td class="py-1 px-2 text-right text-xs tabular-nums">${kg((pe.ea * pe.gPerEa) / 1000)}</td><td></td></tr>`).join('');
      const usedPct = g.inputKg > 0 ? Math.max(0, Math.min(100, (g.usedKg / g.inputKg) * 100)) : 0;
      const hasResult = g.carts > 0;
      return `<div class="rounded-2xl border border-stone-200 overflow-hidden">
        <div class="px-3 py-2.5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2"><b class="text-base">${esc(ch.short)} 반죽</b><span class="px-2 py-0.5 rounded-lg bg-white border border-stone-300 text-xs font-bold text-stone-700 tabular-nums">1카트 = ${ch.pieces}개 × (반죽 ${num(ch.g, 0)}g + 버터 ${num(ch.butterPerPiece, 0)}g) = ${num(ch.cartButterKg)}kg</span></div>
          <div class="flex items-center gap-3 text-sm">${!hasResult ? '<span class="text-xs text-stone-400">라미네이팅 기록 없음</span>' : g.over ? `<span class="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-300 text-xs font-extrabold text-amber-800">투입 대비 생산 초과 ${num(-g.diffKg)}kg</span>${moneyCell(g.lossMoney)}` : `<span class="text-stone-500 text-xs">투입 대비 생산 부족</span><b class="tabular-nums text-rose-700">${num(g.diffKg)}kg</b>${pieLossCell(g.lossPct)}${moneyCell(g.lossMoney)}`}</div>
        </div>
        <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm min-w-[720px]">
          <thead><tr class="text-[11px] font-extrabold text-stone-500 border-b border-stone-200"><th class="py-1.5 px-2">공정</th><th class="py-1.5 px-2 text-right">입력한 수량</th><th class="py-1.5 px-2">계산 기준</th><th class="py-1.5 px-2 text-right">반죽 무게</th><th class="py-1.5 px-2">비고</th></tr></thead>
          <tbody>
            <tr class="border-b border-stone-100"><td class="${c1}">${no(1)}믹싱</td><td class="${c2}">${live(num(g.batches) + '배합')}</td><td class="${c3}">× 1배합 ${num(ch.baseBatchKg)}kg <span class="text-stone-400">(레시피 ${esc(ch.baseName)} · ${num(ch.piecesPerBatch)}개)</span></td><td class="${c4}">${kg(g.mixKg)}</td><td class="${c5} text-stone-500">원재료 투입 ${g.mixCost != null ? won(g.mixCost) : '-'}</td></tr>
            <tr class="border-b border-stone-100"><td class="${c1}">${no(2)}라미네이팅</td><td class="${c2}">${live(num(g.made) + '카트')}</td><td class="${c3}">× ${ch.pieces}개 × ${num(ch.g, 0)}g <span class="text-stone-400">(접은 반죽 ${num(g.lamPieces, 0)}개)</span></td><td class="${c4}">${kg(g.lamBaseKg)}</td><td class="${c5} ${g.mixDiffKg > 0 ? 'text-amber-700 font-bold' : 'text-stone-500'}">${g.batches > 0 && g.mixDiffKg != null ? `믹싱보다 ${num(Math.abs(g.mixDiffKg))}kg ${g.mixDiffKg > 0 ? '적음' : '많음'} (${Math.abs(g.mixLossPct).toFixed(1)}%)` : ''}</td></tr>
            <tr class="border-b border-stone-200"><td class="py-1.5 px-2 pl-9 text-xs text-stone-600">+ 버터</td><td></td><td class="${c3}">${num(g.lamPieces, 0)}개 × ${num(ch.butterPerPiece, 0)}g</td><td class="py-1.5 px-2 text-right text-xs tabular-nums">+${kg(g.lamPieces != null ? (g.lamPieces * ch.butterPerPiece) / 1000 : null)}</td><td class="${c5} text-stone-500">버터 포함 ${kg(g.lamButterKg)}</td></tr>
            <tr class="border-b border-stone-100 bg-amber-50/50"><td class="${c1}">${no(3)}생산된 라미네이팅 반죽</td><td class="${c2}">${live(num(g.carts) + '카트')}</td><td class="${c3}">× 1카트 ${num(ch.cartButterKg)}kg <span class="px-1.5 py-0.5 rounded-md border text-[11px] font-bold ${g.basisKey === 'MADE' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}">${esc(g.basis)}</span>${g.basisKey === 'STOCK' ? ` <span class="text-stone-400">기간 전 ${num(g.stockOpen)} + 만든 ${num(g.made)} − 기간 말 ${num(g.stockClose)}</span>` : ''}</td><td class="${c4}">${kg(g.inputKg)}</td><td class="${c5} text-stone-500">${g.basisKey === 'USED' && g.stockCarts !== null ? `재고 기준으로는 ${num(g.stockCarts)}카트 (차이 ${num(g.stockCarts - g.usedCarts)}카트 = 폐기·입력 누락)` : g.basisKey === 'MADE' ? '보관분(최대 2주) 때문에 월 단위는 오차가 큼' : ''}</td></tr>
            <tr class="border-b border-stone-100"><td class="py-1.5 px-2 pl-9 font-bold whitespace-nowrap">성형에 사용한 반죽</td><td></td><td class="${c3}">${pies.length ? '아래 파이 생산 합계' : '이 기간 파이 생산 기록 없음'}</td><td class="${c4}">${kg(g.usedKg)}</td><td></td></tr>
            ${pieTrs}
            ${!hasResult ? `<tr class="bg-stone-50"><td class="${c1}">결과</td><td></td><td class="${c3}">라미네이팅 카트 기록이 없어 계산할 수 없습니다</td><td class="${c4}">-</td><td></td></tr>`
              : g.over ? `<tr class="bg-amber-50"><td class="${c1} text-amber-800">투입 대비 생산 초과</td><td></td><td class="py-1.5 px-2 text-xs font-bold text-amber-800">성형에 사용한 반죽 ${kg(g.usedKg)} − 생산된 라미네이팅 반죽 ${kg(g.inputKg)}</td><td class="${c4} text-amber-700">+${kg(-g.diffKg)}</td><td class="${c5} font-bold text-amber-800">${moneyCell(g.lossMoney)} · 라미네이팅 반죽은 냉동 보관 후 사용하기 때문에 전월 생산 포함 확인 필요</td></tr>`
              : `<tr class="bg-rose-50"><td class="${c1} text-rose-800">투입 대비 생산 부족</td><td></td><td class="py-1.5 px-2"><div class="text-xs font-bold text-rose-800 mb-1">생산된 라미네이팅 반죽 ${kg(g.inputKg)} − 성형에 사용한 반죽 ${kg(g.usedKg)}</div><div class="h-2 rounded-full bg-rose-200 overflow-hidden max-w-[260px]" title="생산된 라미네이팅 반죽 중 성형에 사용한 비율"><div class="h-full bg-emerald-500" style="width:${usedPct.toFixed(1)}%"></div></div></td><td class="${c4} text-rose-700">−${kg(g.diffKg)}</td><td class="${c5}">${pieLossCell(g.lossPct)} · ${moneyCell(g.lossMoney)}</td></tr>`}
          </tbody></table></div>
        ${g.missingG.length ? `<div class="px-3 py-1.5 text-[11px] font-bold text-rose-700 border-t border-stone-200">1개당 반죽 g 미설정: ${esc(g.missingG.join(', '))}</div>` : ''}
      </div>`;
    }).join('');
    // 주별 비교
    const shown = L.pies.filter((g) => g.ch.ready);
    const trend = periods.filter((p) => p.key[0] === 'W').map((p) => ({ p, r: computeLoss(p.from, p.to, products, defs, p) }));
    const trendCats = CAT_ORDER.filter((c) => c !== 'PIE' && (L.doughCats.some((d) => d.cat === c) || trend.some(({ r }) => r.doughCats.some((d) => d.cat === c))));
    const trendTrs = trend.map(({ p, r }) => `<tr class="border-b border-stone-100 whitespace-nowrap ${p.key === per.key ? 'bg-amber-50' : ''}"><td class="py-1.5 px-2 font-bold">${p.label} <span class="text-xs text-stone-400">${p.sub}</span></td>${r.pies.filter((g) => g.ch.ready).map((g) => `<td class="py-1.5 px-2 text-right">${g.carts ? pieLossCell(g.lossPct) : '<span class="text-stone-400">-</span>'}</td>`).join('')}<td class="py-1.5 px-2 text-right tabular-nums">${r.pieHasMoney ? moneyCell(r.pieLossMoney) : '<span class="text-stone-400">-</span>'}</td>${trendCats.map((c) => { const x = r.doughCats.find((d) => d.cat === c); return `<td class="py-1.5 px-2 text-right">${yieldCell(x ? x.yieldPct : null)}</td><td class="py-1.5 px-2 text-right tabular-nums">${x ? moneyCell(x.money) : '<span class="text-stone-400">-</span>'}</td>`; }).join('')}</tr>`).join('');
    // 상단 요약 카드: 파이·생지 같은 양식 (수율 + 부족 원재료비, 아래에 구분별)
    const sumCard = (title, sub, y, money, rows, warn, rowsTitle) => `<div class="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs flex flex-col gap-2">
        <div class="flex items-start justify-between gap-3"><div><div class="text-sm font-extrabold text-stone-900">${title} <span class="text-xs font-bold text-stone-400">${esc(per.label)}</span></div><div class="text-[11px] text-stone-500">${sub}</div><div class="text-[11px] text-stone-500">금액: <b class="text-emerald-700">+ 초과 생산</b> / <b class="text-rose-700">− 생산 부족</b></div></div>
          <div class="text-right"><div class="text-2xl leading-none">${yieldCell(y)}</div><div class="mt-1 text-xs text-stone-500">원재료비 차이 ${moneyCell(money)}</div></div></div>
        <div class="border-t border-stone-100 pt-1.5 flex flex-col gap-0.5 text-sm">${rowsTitle && rows.length ? `<div class="text-[11px] font-bold text-stone-400">${rowsTitle}</div>` : ''}${rows.map((r) => `<div class="grid grid-cols-[minmax(0,1fr)_auto_110px] gap-2 items-center"><span class="font-bold text-stone-700 truncate">${esc(r.name)}${r.note ? ` <span class="text-[11px] font-bold text-amber-700">${r.note}</span>` : ''}</span><span>${yieldCell(r.y)}</span><span class="text-right text-xs">${moneyCell(r.money)}</span></div>`).join('') || '<span class="text-xs text-stone-400">기록 없음</span>'}</div>
        ${warn ? `<div class="text-[11px] font-bold text-amber-700">${esc(warn)}</div>` : ''}</div>`;
    return `
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 flex flex-col gap-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" onclick="Prod.setMonth('${prevYm}')" class="w-8 h-8 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">‹</button>
            <h3 class="text-base font-extrabold text-stone-900 px-1">${y}년 ${m}월 원재료 손실</h3>
            <button type="button" onclick="Prod.setMonth('${nextYm}')" class="w-8 h-8 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50">›</button>
            <div class="flex flex-wrap items-center gap-1 ml-2">${monthBtns}</div>
          </div>
          <button type="button" onclick="Prod.openLossSettings()" class="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold cursor-pointer hover:bg-stone-50">손실 기준 설정 (1카트 기준 · 파이 반죽 g)</button>
        </div>
        <div class="flex flex-wrap items-center gap-1 border-t border-stone-100 pt-2.5"><span class="text-xs font-extrabold text-stone-500 mr-1">보는 기간</span>${pBtns}</div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-${Math.min(4, 2 + L.doughCats.length) || 1} gap-3">
        ${sumCard('파이 수율', '성형에 사용한 반죽 ÷ 생산된 라미네이팅 반죽', L.pieYield, L.pieHasMoney ? L.pieLossMoney : null, shown.filter((g) => g.carts > 0).map((g) => ({ name: g.ch.short, y: g.inputKg > 0 ? (g.usedKg / g.inputKg) * 100 : null, money: g.lossMoney, note: g.over ? '생산 초과' : '' })), '')}
        ${L.doughCats.map((x) => sumCard(CAT_LABEL[x.cat] + ' 수율', '실제 생산(포장) ÷ 표준 생산(투입 배합 × 1배합 PK수)', x.yieldPct, x.money, x.rows.filter((r) => r.lossMoney != null).sort((p, q) => Math.abs(q.lossMoney) - Math.abs(p.lossMoney)).slice(0, 3).map((r) => ({ name: r.name, y: r.yieldPct, money: r.lossMoney })), x.unconfirmed ? `포장 기록 없는 품목 ${x.unconfirmed}종 제외` : '', '금액 차이 큰 품목')).join('')}
        <div class="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs flex flex-col gap-2">
          <div class="flex items-start justify-between gap-3"><div><div class="text-sm font-extrabold text-stone-900">파지 전환율 <span class="text-xs font-bold text-stone-400">${esc(per.label)}</span></div><div class="text-[11px] text-stone-500 leading-snug">파지 품목 생산에 사용한 파지<br>÷ 파이에서 나온 파지</div></div>
            <div class="text-right"><div class="text-2xl leading-none font-extrabold tabular-nums ${SC.rate == null ? 'text-stone-400' : SC.rate > 100 ? 'text-amber-700' : 'text-stone-900'}">${SC.rate == null ? '-' : SC.rate.toFixed(1) + '%'}</div><div class="mt-1 text-xs text-stone-500 tabular-nums">발생 <b class="text-stone-800">${num(SC.made.total)}kg</b> → 사용 <b class="text-stone-800">${num(SC.usedKg)}kg</b></div></div></div>
          <div class="border-t border-stone-100 pt-1.5 flex flex-col gap-0.5 text-sm"><div class="text-[11px] font-bold text-stone-400">파지를 많이 쓴 품목</div>${SC.rows.slice(0, 3).map((r) => `<div class="flex items-center justify-between gap-2"><span class="font-bold text-stone-700 truncate">${esc(r.name)}</span><b class="tabular-nums whitespace-nowrap">${num(r.kg)}kg</b></div>`).join('') || '<span class="text-xs text-stone-400">파지 품목 생산 기록 없음</span>'}</div>
        </div>
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <h3 class="text-sm font-extrabold mb-1">파이 — 반죽 공정별 손실 (믹싱 → 라미네이팅 → 성형)</h3>
        <div class="text-xs text-stone-500 mb-2 leading-relaxed"><span class="inline-flex items-center gap-1 font-bold text-stone-700"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>초록 점</span> = 생산일지(배합·카트·파이 생산)에 입력한 값을 실시간으로 불러온 것입니다. 회색 글씨는 계산 기준(레시피·1카트 기준)입니다.<br>라미네이팅 반죽은 최대 2주 보관했다가 쓰므로 '만든 카트' 기준은 달마다 튑니다. 정확도는 <b>① 사용 카트</b>(성형한 날 일자 창에 적기) &gt; <b>② 재고 반영</b>(생산 재고 화면의 [월말 카트 재고 입력]) &gt; ③ 만든 카트 순이며, ③일 때는 <b>최근 3개월·누적</b>으로 보세요.</div>
        <div class="flex flex-col gap-3">${pieCards || '<div class="py-6 text-center text-xs text-stone-400">라미네이팅 반제품이 없습니다.</div>'}</div>
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1"><h3 class="text-sm font-extrabold">파지 전환 — 파이에서 나온 파지 대비 파지 품목에 쓴 양</h3><div class="flex items-center gap-3 text-sm"><span class="text-xs text-stone-500">전환율</span><b class="tabular-nums">${SC.rate == null ? '-' : SC.rate.toFixed(1) + '%'}</b><span class="text-xs text-stone-500">남은 파지(발생 − 사용)</span><b class="tabular-nums ${SC.made.total - SC.usedKg < 0 ? 'text-amber-700' : ''}">${num(SC.made.total - SC.usedKg)}kg</b></div></div>
        <div class="text-xs text-stone-500 mb-2 leading-relaxed">발생 = <b>2. 파지 관리</b>에 입력한 kg · 사용 = 파지가 들어가는 품목의 생산 배합 수 × 레시피 1배합 파지 g (PK로 입력한 품목은 생산 개수 ÷ 제품단가 '1배합 실생산'으로 배합 수 계산). 파지도 보관했다가 쓰므로 <b>최근 3개월·누적</b>으로 보는 것이 정확합니다. 레시피에 '파지'로만 적힌 줄은 종류(패스츄리·퀸아망·쇼숑)를 알 수 없어 합계로 비교합니다.${SC.clamped ? ` <b class="text-amber-700">파지 기록을 ${SC.from.slice(5).replace('-', '/')}부터 시작해서, 그날 이후의 생산만 비교했습니다.</b>` : ''}</div>
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
          <div class="rounded-xl border border-stone-200 overflow-hidden"><table class="w-full text-sm"><thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600"><th class="py-2 px-2 text-left">발생한 파지</th><th class="py-2 px-2 text-right">kg</th></tr></thead><tbody>
            ${SCRAP_TYPES.map((t) => `<tr class="border-b border-stone-100"><td class="py-1.5 px-2"><span class="border-l-[3px] ${SCRAP_STYLE[t].bar} pl-1.5 font-bold ${SCRAP_STYLE[t].text}">${t}</span></td><td class="py-1.5 px-2 text-right tabular-nums font-bold">${live(num(SC.made.byType[t] || 0) + 'kg', '2. 파지 관리')}</td></tr>`).join('')}
            <tr class="bg-stone-50 font-extrabold"><td class="py-1.5 px-2">합계</td><td class="py-1.5 px-2 text-right tabular-nums">${num(SC.made.total)}kg</td></tr></tbody></table></div>
          <div class="rounded-xl border border-stone-200 overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600 whitespace-nowrap"><th class="py-2 px-2 text-left">파지를 쓰는 품목</th><th class="py-2 px-2 text-right">생산 (실행)</th><th class="py-2 px-2 text-right">배합 수</th><th class="py-2 px-2 text-right">1배합 파지</th><th class="py-2 px-2 text-right">사용한 파지</th></tr></thead><tbody>
            ${SC.rows.map((r) => `<tr class="border-b border-stone-100 whitespace-nowrap"><td class="py-1.5 px-2 font-bold">${esc(r.name)} <span class="text-[11px] font-bold text-stone-400">${r.mix ? '반제품 · 자동 차감' : CAT_LABEL[r.cat] || ''}</span></td><td class="py-1.5 px-2 text-right tabular-nums">${live(num(r.qty) + ' ' + esc(r.unit))}</td><td class="py-1.5 px-2 text-right tabular-nums text-stone-600">${r.unknown ? '<span class="text-rose-700 text-xs font-bold">1배합 실생산 없음</span>' : num(r.batches, 2)}</td><td class="py-1.5 px-2 text-right tabular-nums text-stone-600">${num(r.gPerBatch / 1000, 2)}kg</td><td class="py-1.5 px-2 text-right tabular-nums font-extrabold">${num(r.kg)}kg</td></tr>`).join('') || '<tr><td colspan="5" class="py-6 text-center text-xs text-stone-400">이 기간에 파지를 쓰는 품목의 생산 기록이 없습니다.</td></tr>'}
            ${SC.rows.length ? `<tr class="bg-stone-50 font-extrabold"><td class="py-1.5 px-2" colspan="4">합계</td><td class="py-1.5 px-2 text-right tabular-nums">${num(SC.usedKg)}kg</td></tr>` : ''}</tbody></table></div>
        </div>
      </div>
      ${L.doughCats.map((x) => `<div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1"><h3 class="text-sm font-extrabold">${CAT_LABEL[x.cat]} — 투입 배합 대비 실제 생산</h3><div class="flex items-center gap-3 text-sm"><span class="text-xs text-stone-500">수율</span>${yieldCell(x.yieldPct)}<span class="text-xs text-stone-500">원재료비 차이</span>${moneyCell(x.money)}</div></div>
        <div class="text-xs text-stone-500 mb-2">표준 생산 = 생산일지 투입 배합 × 제품단가 '1배합 PK수' · 실제 생산 = <b>포장 완료 등록</b>의 PK 합계(없으면 일자 창에서 직접 적은 포장 수량)</div>
        <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm">
          <thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600 whitespace-nowrap"><th class="py-2 px-2">품목</th><th class="py-2 px-2 text-right">투입 배합</th><th class="py-2 px-2 text-right">표준 생산</th><th class="py-2 px-2 text-right">실제 생산</th><th class="py-2 px-2 text-right">차이</th><th class="py-2 px-2 text-right">수율</th><th class="py-2 px-2 text-right">원재료비 차이 (+초과/−부족)</th><th class="py-2 px-2">실제 생산 출처</th></tr></thead>
          <tbody>${L.dough.filter((r) => r.cat === x.cat).map(doughTr).join('')}</tbody></table></div>
      </div>`).join('') || '<div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-6 text-center text-xs text-stone-400">이 기간 알생지·파베이크 실행 기록이 없습니다.</div>'}
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <h3 class="text-sm font-extrabold mb-2">${m}월 주별 비교</h3>
        <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm"><thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600 whitespace-nowrap"><th class="py-2 px-2">주</th>${shown.map((g) => `<th class="py-2 px-2 text-right">${esc(g.ch.short)} 성형</th>`).join('')}<th class="py-2 px-2 text-right">파이 원재료비 차이</th>${trendCats.map((c) => `<th class="py-2 px-2 text-right">${CAT_LABEL[c]} 수율</th><th class="py-2 px-2 text-right">${CAT_LABEL[c]} 원재료비 차이</th>`).join('')}</tr></thead><tbody>${trendTrs}</tbody></table></div>
      </div>`;
  }
  // 레시피 1배합을 원재료 단위까지 펼침 (반제품은 안의 원재료로) → { 이름: { g, cost } }
  function flattenRecipeMaterials(rc) {
    const out = {};
    const walk = (ev, scale) => (ev.itemBreakdown || []).forEach((b) => {
      if (b.subEval) { walk(b.subEval, scale * (Number(b.scale) || 0)); return; }
      const name = String((b.ig && b.ig.item) || '').trim() || '(이름 없음)';
      const o = out[name] || (out[name] = { name, g: 0, cost: 0 });
      o.g += (Number(b.effWeightG) || 0) * scale; o.cost += (Number(b.effCost) || 0) * scale;
    });
    walk(window.evaluateRecipeBaseTotals(JSON.parse(JSON.stringify(rc))), 1);
    return Object.values(out);
  }
  function openLossMaterials(code) {
    const products = getProducts(), defs = pieDoughDefaults(products);
    const periods = lossPeriods(cursorMonth), per = periods.find((p) => p.key === lossPeriodKey) || periods[0];
    const r = computeLoss(per.from, per.to, products, defs, per).dough.find((x) => String(x.code) === String(code)); if (!r) return;
    const recipes = Array.isArray(window.recipesData) ? window.recipesData : [];
    const rc = recipes.find((x) => String(x.productCode) === String(code) && x.recipeType !== 'SUB');
    const lostBatches = r.expC > 0 ? (1 - r.actC / r.expC) * r.bC : 0;
    let body;
    if (!rc || typeof window.evaluateRecipeBaseTotals !== 'function') body = '<div class="py-8 text-center text-sm text-stone-500">이 품목코드로 연결된 레시피가 없어 원재료를 나눌 수 없습니다.</div>';
    else {
      let mats = []; try { mats = flattenRecipeMaterials(rc); } catch (e) { mats = []; }
      mats = mats.map((m) => ({ ...m, lostG: m.g * lostBatches, lostCost: m.cost * lostBatches })).sort((a, b) => b.lostCost - a.lostCost);
      const sumG = mats.reduce((t, m) => t + m.lostG, 0), sumC = mats.reduce((t, m) => t + m.lostCost, 0), batchC = mats.reduce((t, m) => t + m.cost, 0);
      const gfmt = (g) => (g >= 1000 ? num(g / 1000, 2) + 'kg' : num(g, 0) + 'g');
      body = `<table class="w-full text-sm"><thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600"><th class="py-2 px-2 text-left">원재료</th><th class="py-2 px-2 text-right">1배합 사용량</th><th class="py-2 px-2 text-right">부족분 수량</th><th class="py-2 px-2 text-right">부족분 금액</th></tr></thead>
        <tbody>${mats.map((m) => `<tr class="border-b border-stone-100"><td class="py-1.5 px-2 font-bold">${esc(m.name)}</td><td class="py-1.5 px-2 text-right tabular-nums text-stone-500">${gfmt(m.g)}</td><td class="py-1.5 px-2 text-right tabular-nums font-bold">${gfmt(m.lostG)}</td><td class="py-1.5 px-2 text-right tabular-nums font-bold text-rose-700">${m.cost ? won(m.lostCost) : '<span class="text-stone-400">단가 없음</span>'}</td></tr>`).join('')}
        <tr class="bg-stone-50 font-extrabold"><td class="py-2 px-2">합계</td><td></td><td class="py-2 px-2 text-right tabular-nums">${gfmt(sumG)}</td><td class="py-2 px-2 text-right tabular-nums text-rose-700">${won(sumC)}</td></tr></tbody></table>
        <div class="mt-2 text-xs text-stone-500 leading-relaxed">부족분 = 레시피 1배합 사용량 × 부족 배합 ${num(lostBatches, 2)}배합. 금액은 레시피의 원재료 단가 기준(1배합 ${won(batchC)})입니다.${r.matPerBatch && Math.abs(batchC - r.matPerBatch) > 1 ? ` 표의 원재료비 차이(${won(r.lossMoney)})는 제품단가 탭의 1배합 원재료비(${won(r.matPerBatch)}) 기준이라 합계와 다를 수 있습니다.` : ''} 반제품(르방·폴리쉬 등)은 그 안의 원재료로 풀어서 더했습니다.</div>`;
    }
    modal(`<div class="px-5 py-3 border-b border-stone-200"><h3 class="text-base font-extrabold">${esc(r.name)} — 부족분 원재료 <span class="text-xs font-bold text-stone-400">${esc(per.label)}</span></h3>
        <div class="text-xs text-stone-500 mt-0.5">투입 ${num(r.bC)}배합 · 표준 생산 ${num(r.expC)} ${r.su} · 실제 생산 ${num(r.actC)} ${r.su} · 수율 ${r.yieldPct == null ? '-' : r.yieldPct.toFixed(1) + '%'} → 부족 ${num(lostBatches, 2)}배합 분량${rc ? ` · 레시피 ${esc(rc.productName)}` : ''}</div></div>
      <div class="p-4 max-h-[65vh] overflow-y-auto">${body}</div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end"><button type="button" onclick="Prod.closeModal()" class="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">닫기</button></div>`, true);
  }
  let endStockYm = '';
  // 파지 재고조사(기초 파지 재고): 조사한 날 마감 후 실제로 남아 있던 파지 kg. 남은 파지 = 이 값 + 다음 날부터의 발생 − 사용
  //  db.loss.scrapBase = { date: 'YYYY-MM-DD', kg: { '패스츄리 파지': n, … } }
  function scrapBase() { const b = lossCfg().scrapBase; return b && b.date && b.kg && typeof b.kg === 'object' ? b : null; }
  // 오늘 기준 파지 재고: (재고조사가 있으면) 조사한 재고 + 다음 날부터 발생 − 사용 / (없으면) 기록 시작부터 발생 − 사용
  function scrapStockNow() {
    const b = scrapBase(), to = today(), on = !!b && b.date <= to;
    const from = on ? ymd(new Date(new Date(b.date + 'T00:00:00').getTime() + 86400000)) : scrapFirstDate();
    const made = from ? scrapTotals(from, to) : { total: 0, byType: {} }, use = from ? scrapUseTotals(from, to) : { total: 0, byType: {} };
    const rows = SCRAP_TYPES.map((t) => { const base = on ? Number(b.kg[t]) || 0 : 0, m = made.byType[t] || 0, u = use.byType[t] || 0; return { type: t, base, made: m, used: u, cur: base + m - u }; });
    const untyped = Object.keys(use.byType).filter((t) => !SCRAP_TYPES.includes(t)).reduce((a, t) => a + use.byType[t], 0);
    return { base: on ? b : null, from, rows, untyped, total: rows.reduce((a, r) => a + r.cur, 0) - untyped };
  }
  function openScrapBase() {
    const b = scrapBase(), cin = 'no-spinner w-28 text-right border border-stone-300 rounded-lg px-2 py-1.5 font-extrabold tabular-nums bg-amber-50/70';
    modal(`<div class="px-5 py-3 border-b border-stone-200"><h3 class="text-base font-extrabold">파지 재고조사 입력</h3><div class="text-xs text-stone-500 mt-0.5 leading-relaxed">조사한 날 작업을 마친 뒤 냉동고에 실제로 남아 있는 파지를 종류별로 달아서 적으세요. 그 뒤로 <b>남은 파지 = 조사한 재고 + 다음 날부터의 발생 − 사용</b>으로 계산합니다. 다시 조사하면 새 날짜·값으로 덮어씁니다. 없는 종류는 0을 적으세요.</div></div>
      <div class="p-4 flex flex-col gap-3 text-sm">
        <label class="flex items-center justify-between gap-3"><span class="font-bold">조사한 날</span><input type="date" id="scrapBaseDate" value="${b ? b.date : today()}" max="${today()}" class="border border-stone-300 rounded-lg px-2 py-1.5 font-bold"></label>
        ${SCRAP_TYPES.map((t) => `<label class="flex items-center justify-between gap-3"><span class="border-l-[3px] ${SCRAP_STYLE[t].bar} pl-1.5 font-bold ${SCRAP_STYLE[t].text}">${t}</span><span class="whitespace-nowrap"><input type="number" min="0" step="any" data-scrap-base="${t}" value="${b && b.kg[t] !== undefined ? b.kg[t] : ''}" placeholder="0" class="${cin}"> <span class="text-xs font-bold text-stone-500">kg</span></span></label>`).join('')}
      </div>
      <div class="px-5 py-3 border-t border-stone-200 flex items-center justify-between gap-2">${b ? '<button type="button" onclick="Prod.clearScrapBase()" class="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 text-sm font-bold cursor-pointer hover:bg-rose-50">재고조사 지우기</button>' : '<span></span>'}<div class="flex gap-2"><button type="button" onclick="Prod.closeModal()" class="px-4 py-2 rounded-xl border border-stone-300 text-sm font-bold cursor-pointer">취소</button><button type="button" onclick="Prod.saveScrapBase()" class="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">저장</button></div></div>`, true);
  }
  function saveScrapBase() {
    const date = (document.getElementById('scrapBaseDate') || {}).value || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('조사한 날을 선택해 주세요.', 'error'); return; }
    if (date > today()) { toast('조사한 날은 오늘 이후로 적을 수 없습니다.', 'error'); return; }
    const kg = {}; document.querySelectorAll('[data-scrap-base]').forEach((el) => { kg[el.dataset.scrapBase] = Math.max(0, parseFloat(el.value) || 0); });
    lossCfg().scrapBase = { date, kg };
    closeModal(); markChanged(); render();
    toast(`파지 재고조사(${date})를 저장했습니다. 남은 파지는 이 값부터 계산합니다.`, 'success');
  }
  function clearScrapBase() {
    if (!confirm('파지 재고조사 값을 지울까요? 남은 파지는 다시 기록 시작일부터 발생 − 사용으로 계산합니다.')) return;
    delete lossCfg().scrapBase; closeModal(); markChanged(); render();
    toast('파지 재고조사 값을 지웠습니다.', 'success');
  }
  function openEndStock(ymArg) {
    endStockYm = ymArg || today().slice(0, 7); // 버튼으로 열면 이번 달, ‹ ›로 다른 달
    const [y, m] = endStockYm.split('-').map(Number), prev = ymd(new Date(y, m - 2, 1)).slice(0, 7), next = ymd(new Date(y, m, 1)).slice(0, 7), es = lossCfg().endStock || {};
    const lam = laminatingItems().filter((x) => doughChain(x.name).ready);
    const inp = (ym, name) => `<input type="number" min="0" step="any" data-es-ym="${ym}" data-es-name="${esc(name)}" value="${(es[ym] || {})[name] !== undefined ? (es[ym] || {})[name] : ''}" placeholder="미입력" class="no-spinner w-24 text-right border border-stone-300 rounded-lg px-2 py-1 font-bold tabular-nums"> 카트`;
    const nav = 'w-8 h-8 rounded-lg border border-stone-200 font-bold cursor-pointer hover:bg-stone-50';
    modal(`<div class="px-5 py-3 border-b border-stone-200"><div class="flex items-center gap-1.5"><button type="button" onclick="Prod.openEndStock('${prev}')" class="${nav}">‹</button><h3 class="text-base font-extrabold px-1">${y}년 ${m}월 말 카트 재고 (실사)</h3><button type="button" onclick="Prod.openEndStock('${next}')" class="${nav}">›</button></div>
        <div class="text-xs text-stone-500 mt-1">월 마지막 근무일 마감 후 냉동고에 남은 라미네이팅 카트 수입니다. 생산일지 → 원재료 손실에서 그 달 투입 = 전월 말 재고 + 만든 카트 − 이번 달 말 재고로 계산하는 데 씁니다. 0카트면 0을 적고, 모르면 비워 두세요.</div></div>
      <div class="p-4"><table class="w-full text-sm"><thead><tr class="text-xs font-extrabold text-stone-500"><th class="py-1.5 px-2 text-left">반죽</th><th class="py-1.5 px-2 text-right">${Number(prev.slice(5))}월 말 (전월)</th><th class="py-1.5 px-2 text-right">${m}월 말</th></tr></thead>
        <tbody>${lam.map((x) => `<tr class="border-b border-stone-100"><td class="py-1.5 px-2 font-bold">${esc(x.name)}</td><td class="py-1.5 px-2 text-right whitespace-nowrap">${inp(prev, x.name)}</td><td class="py-1.5 px-2 text-right whitespace-nowrap">${inp(endStockYm, x.name)}</td></tr>`).join('')}</tbody></table></div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2"><button type="button" onclick="Prod.closeModal()" class="px-4 py-2 rounded-xl border border-stone-300 text-sm font-bold cursor-pointer">취소</button><button type="button" onclick="Prod.saveEndStock()" class="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">저장</button></div>`);
  }
  function saveEndStock() {
    const cfg = lossCfg(); cfg.endStock = cfg.endStock || {};
    document.querySelectorAll('[data-es-ym]').forEach((el) => {
      const ym = el.dataset.esYm, name = el.dataset.esName, v = String(el.value).trim();
      cfg.endStock[ym] = cfg.endStock[ym] || {};
      if (v === '' || isNaN(parseFloat(v))) delete cfg.endStock[ym][name]; else cfg.endStock[ym][name] = Math.max(0, parseFloat(v));
      if (!Object.keys(cfg.endStock[ym]).length) delete cfg.endStock[ym];
    });
    endStockYm = ''; closeModal(); markChanged(); render();
    toast('월말 카트 재고를 저장했습니다.', 'success');
  }
  function openLossSettings() {
    const products = getProducts(), defs = pieDoughDefaults(products), cfg = lossCfg();
    const lam = laminatingItems();
    const cin = 'no-spinner w-20 text-right border border-stone-300 rounded-lg px-2 py-1 font-bold tabular-nums';
    const cartRows = lam.map((s) => { const ch = doughChain(s.name); return `<tr class="border-b border-stone-100"><td class="py-1.5 px-2"><div class="font-bold">${esc(s.name)}</div><div class="text-xs ${ch.ready ? 'text-stone-500' : 'text-rose-700 font-bold'}">${ch.ready ? `믹싱 1배합 ${num(ch.baseBatchKg)}kg = ${num(ch.piecesPerBatch)}개 · 버터 포함 1개 ${num(ch.butterPieceG, 0)}g · 1카트 ${num(ch.cartButterKg)}kg${ch.butterRecipe != null && Math.abs(ch.butterRecipe - ch.butterPerPiece) > 1 ? ` · <span class="text-amber-700">레시피 계산 버터 ${num(ch.butterRecipe, 0)}g/개</span>` : ''} · 원재료비 ${ch.butterCostPerKg == null ? '-' : won(ch.butterCostPerKg) + '/kg'}` : esc(ch.why)}</div></td><td class="py-1.5 px-2 text-right whitespace-nowrap"><input type="number" min="0" step="any" data-cart-pieces="${esc(s.name)}" value="${ch.pieces || ''}" placeholder="개" class="${cin}"> 개 × <input type="number" min="0" step="any" data-cart-g="${esc(s.name)}" value="${ch.g || ''}" placeholder="g" class="${cin}"> g + 버터 <input type="number" min="0" step="any" data-cart-butter="${esc(s.name)}" value="${ch.butterPerPiece != null ? Math.round(ch.butterPerPiece * 10) / 10 : ''}" placeholder="g" class="${cin}"> g</td></tr>`; }).join('');
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
        <div><h4 class="text-sm font-extrabold mb-1">라미네이팅 1카트 기준</h4><div class="text-xs text-stone-500 mb-1">1카트에 올리는 반죽 개수 × (버터 넣기 전 반죽 1개 무게 + 반죽 1개에 넣는 버터). 원재료비는 레시피 '(기본)·(버터)○○반죽'에서 계산합니다.</div><table class="w-full text-sm">${cartRows}</table></div>
        <div><h4 class="text-sm font-extrabold mb-1">파이별 반죽 그룹 · 1개당 반죽 사용량</h4><div class="text-xs text-stone-500 mb-1">레시피 계산 = 레시피의 반죽 반제품 총량 ÷ 제품단가 '1배합 실생산(ea)'</div><table class="w-full text-sm">${pieRows}</table></div>
      </div>
      <div class="px-5 py-3 border-t border-stone-200 flex justify-end gap-2"><button type="button" onclick="Prod.closeModal()" class="px-4 py-2 rounded-xl border border-stone-300 text-sm font-bold cursor-pointer">취소</button><button type="button" onclick="Prod.saveLossSettings()" class="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer">저장</button></div>`);
  }
  function saveLossSettings() {
    const cfg = lossCfg(), defs = pieDoughDefaults(getProducts());
    document.querySelectorAll('[data-cart-pieces]').forEach((el) => {
      const name = el.dataset.cartPieces, gEl = document.querySelector(`[data-cart-g="${CSS.escape(name)}"]`);
      const bEl = document.querySelector(`[data-cart-butter="${CSS.escape(name)}"]`);
      const pieces = parseFloat(el.value) || 0, g = parseFloat(gEl && gEl.value) || 0, butter = parseFloat(bEl && bEl.value) || 0, d = DEFAULT_CART_STD[name] || {};
      if (pieces > 0 && g > 0 && !(pieces === d.pieces && g === d.g && butter === (d.butter || 0))) cfg.cart[name] = butter > 0 ? { pieces, g, butter } : { pieces, g }; else delete cfg.cart[name];
    });
    delete cfg.cartKg; // 예전 '1카트 kg' 설정은 1카트 기준(개수 × g)으로 대체
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
    // 재고 입고 = 포장 완료 등록 수량 (PK → 재고 단위, 쇼숑 4PK=1BOX). 생산 실행만으로는 재고에 안 들어감
    Object.entries(db.pack || {}).forEach(([d, day]) => { if (!after(d)) return; (day.items || []).forEach((it) => { const per = packPerStock(it.code, products); ensure(String(it.code), it.name).produced += (Number(it.pk) || 0) / per; }); });
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
      const ch = doughChain(s.name);
      x.cartKg = ch.cartButterKg || 0; // 버터 포함 1카트 반죽 kg
      x.costPerKg = ch.butterCostPerKg; x.recipeName = ch.butterName;
      x.cartCost = x.cartKg && ch.butterCostPerKg != null ? x.cartKg * ch.butterCostPerKg : null;
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
    // 상단 알림: 재고 종류별 기준일(마지막으로 실제로 센 날)
    const dAgo = (d) => { const n = Math.round((new Date(today() + 'T00:00:00') - new Date(d + 'T00:00:00')) / 86400000); return n <= 0 ? '오늘' : `${n}일 전`; };
    const esAll = lossCfg().endStock || {}, esYm = Object.keys(esAll).filter((k) => Object.keys(esAll[k] || {}).length).sort().pop() || '';
    const semiCounted = !!base && Object.keys(base.counts || {}).some((k) => k.startsWith('SEMI:'));
    const sbase = scrapBase();
    const baseChip = (label, val, sub, ok) => `<div class="flex items-center gap-2 px-3 py-2 rounded-xl border ${ok ? 'border-stone-200 bg-white' : 'border-amber-300 bg-amber-50'}"><span class="w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}"></span><span class="text-xs font-bold text-stone-500">${label}</span><b class="text-sm tabular-nums ${ok ? 'text-stone-900' : 'text-amber-900'}">${val}</b>${sub ? `<span class="text-[11px] text-stone-400">${sub}</span>` : ''}</div>`;
    const baseStrip = `<div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-3"><div class="flex flex-wrap items-center gap-2"><span class="text-xs font-extrabold text-stone-700 mr-1">재고 기준일</span>
        ${baseChip('생지(완제품) 실사', base ? esc(base.date) : '미입력', base ? dAgo(base.date) : '재고 실사 입력 필요', !!base)}
        ${baseChip('라미네이팅 카트 실사', base ? esc(base.date) : '미입력', base ? (semiCounted ? dAgo(base.date) : '카트 수량은 0으로 실사') : '재고 실사 입력 필요', !!base)}
        ${baseChip('월말 카트 재고', esYm ? `${Number(esYm.slice(5))}월 말` : '미입력', esYm ? `${esYm.slice(0, 4)}년 · 원재료 손실 계산용` : '월말 카트 재고 입력 필요', !!esYm)}
        ${baseChip('파지 재고조사', sbase ? esc(sbase.date) : '미입력', sbase ? dAgo(sbase.date) : '파지 재고조사 입력 필요', !!sbase)}
      </div><div class="mt-1.5 text-[11px] text-stone-400">기준일 = 마지막으로 실제로 세어 입력한 날. 현재고는 그날 이후의 생산·출고·사용을 더하고 뺀 계산값입니다.</div></div>`;
    return `
      ${baseStrip}
      ${!base ? `<div class="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm"><b>재고 실사 수량이 아직 없습니다.</b> 냉동창고 재고를 세어 [재고 실사 입력]에 넣으면, 그 날 이후의 포장 완료 등록 수량과 엠즈 입고(출고)로 재고가 자동 계산됩니다.</div>` : ''}
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
            <button type="button" onclick="Prod.openCountModal()" class="px-3 py-1.5 rounded-lg bg-stone-900 text-white font-extrabold cursor-pointer hover:bg-stone-800">재고 실사 입력</button>
            <button type="button" onclick="Prod.openAdjustModal()" class="px-3 py-1.5 rounded-lg border border-stone-300 font-bold cursor-pointer hover:bg-stone-50">재고 조정 (폐기·회송 등)</button>
          </div>
        </div>
        <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm min-w-[1100px]">
          <thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600"><th class="py-2 px-2">파트</th><th class="py-2 px-2">코드</th><th class="py-2 px-2">품목</th><th class="py-2 px-2 text-right">실사</th><th class="py-2 px-2 text-right" title="포장 완료 등록 수량">+포장 입고</th><th class="py-2 px-2 text-right">−엠즈 출고</th><th class="py-2 px-2 text-right">±조정</th><th class="py-2 px-2 text-right">현재고</th><th class="py-2 px-2 text-right">원가/단위</th><th class="py-2 px-2 text-right">원가 금액</th><th class="py-2 px-2 text-right">매입가/단위</th><th class="py-2 px-2 text-right">매입가 금액</th></tr></thead>
          <tbody>${trs || '<tr><td colspan="12" class="py-6 text-center text-xs text-stone-400">제품단가 탭 품목이 없습니다.</td></tr>'}</tbody>
        </table></div>
      </div>
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1"><h3 class="text-sm font-extrabold text-stone-900">반제품 재고 — 라미네이팅 카트</h3><div class="flex flex-wrap gap-1.5"><button type="button" onclick="Prod.openEndStock()" title="월 마지막 근무일에 센 카트 수 → 생산일지 원재료 손실의 '재고 반영' 계산에 사용" class="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-extrabold cursor-pointer hover:bg-stone-800">월말 카트 재고 입력</button><button type="button" onclick="Prod.openLossSettings()" class="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold cursor-pointer hover:bg-stone-50">1카트 기준 설정</button></div></div>
        <div class="text-xs text-stone-500 mb-2">현재고 = 실사 + 만든 카트 − 사용 카트 − 폐기 ± 조정. 금액 = 카트 × 1카트 반죽 kg × 반죽 원재료비/kg (레시피 기준).</div>
        <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm min-w-[900px]">
          <thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600"><th class="py-2 px-2">반제품</th><th class="py-2 px-2 text-right">실사</th><th class="py-2 px-2 text-right">+만듦</th><th class="py-2 px-2 text-right">−사용</th><th class="py-2 px-2 text-right">−폐기</th><th class="py-2 px-2 text-right">±조정</th><th class="py-2 px-2 text-right">현재고</th><th class="py-2 px-2 text-right">1카트</th><th class="py-2 px-2 text-right">원재료비/kg</th><th class="py-2 px-2 text-right">원재료비 금액</th></tr></thead>
          <tbody>${semiTrs}</tbody></table></div>
      </div>
      ${(() => { const S = scrapStockNow(); const td = 'py-1.5 px-2 text-right tabular-nums';
        return `<div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1"><h3 class="text-sm font-extrabold text-stone-900">파지 재고</h3><button type="button" onclick="Prod.openScrapBase()" title="냉동고에 실제로 남아 있는 파지를 종류별로 달아서 입력 → 남은 파지 계산의 시작점" class="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-extrabold cursor-pointer hover:bg-stone-800">파지 재고조사 입력${S.base ? ` <span class="font-semibold text-stone-300">(${S.base.date.slice(5).replace('-', '/')})</span>` : ''}</button></div>
        <div class="text-xs text-stone-500 mb-2">${S.base ? `현재고 = ${S.base.date} 재고조사 + 다음 날부터 발생 − 사용.` : '재고조사가 없어 파지 기록을 시작한 날부터 발생 − 사용으로 계산합니다(그 전부터 쌓인 파지는 빠져 있어 실제와 다릅니다).'} 발생 = 생산일지 2. 파지 관리에 입력한 kg · 사용 = 생산 스케쥴 실행 × 레시피의 파지.</div>
        <div class="overflow-x-auto"><table class="w-full text-left border-collapse text-sm">
          <thead><tr class="bg-stone-100 text-xs font-extrabold text-stone-600"><th class="py-2 px-2">파지</th><th class="py-2 px-2 text-right">재고조사</th><th class="py-2 px-2 text-right">+발생</th><th class="py-2 px-2 text-right">−사용</th><th class="py-2 px-2 text-right">현재고</th></tr></thead>
          <tbody>${S.rows.map((r) => `<tr class="border-b border-stone-100 ${r.cur < 0 ? 'bg-rose-50' : ''}"><td class="py-1.5 px-2"><span class="border-l-[3px] ${SCRAP_STYLE[r.type].bar} pl-1.5 font-bold ${SCRAP_STYLE[r.type].text}">${r.type}</span></td><td class="${td}">${S.base ? num(r.base) + 'kg' : '-'}</td><td class="${td} text-emerald-700">${r.made ? '+' + num(r.made) : '-'}</td><td class="${td} text-blue-700">${r.used ? '-' + num(r.used) : '-'}</td><td class="${td} font-extrabold ${r.cur < 0 ? 'text-rose-700' : ''}">${num(r.cur)}kg</td></tr>`).join('')}
          ${S.untyped > 0 ? `<tr class="border-b border-stone-100"><td class="py-1.5 px-2 font-bold text-stone-500">${SCRAP_NOTYPE} <span class="text-[11px] font-semibold text-stone-400">레시피에 '파지'로만 적힌 사용</span></td><td class="${td}">-</td><td class="${td}">-</td><td class="${td} text-blue-700">-${num(S.untyped)}</td><td class="${td} font-extrabold text-rose-700">-${num(S.untyped)}kg</td></tr>` : ''}
          <tr class="bg-stone-50 font-extrabold"><td class="py-1.5 px-2">합계</td><td class="${td}">${S.base ? num(S.rows.reduce((a, r) => a + r.base, 0)) + 'kg' : '-'}</td><td class="${td}">+${num(S.rows.reduce((a, r) => a + r.made, 0))}</td><td class="${td}">-${num(S.rows.reduce((a, r) => a + r.used, 0) + S.untyped)}</td><td class="${td} ${S.total < 0 ? 'text-rose-700' : ''}">${num(S.total)}kg</td></tr></tbody></table></div>
      </div>`; })()}
      ${unmappedList.length ? `<div class="bg-white rounded-2xl border border-rose-200 p-4 text-xs"><h4 class="font-extrabold text-rose-800 mb-1">재고에서 빼지 못한 엠즈 출고 (품목코드 연결 없음)</h4><div class="text-stone-600 mb-2">엠즈 입고 → 매입가 DB 관리에서 '레시피 품목코드'를 연결하면 재고에서 빠집니다. 생산일지 품목(제품단가 탭)에 없는 상품일 수도 있습니다.</div>${unmappedList.map(([k, pk]) => `<div class="flex justify-between border-b border-stone-100 py-1"><span>${esc(k)}</span><b class="tabular-nums">${num(pk)} PK</b></div>`).join('')}</div>` : ''}
      <div class="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4 text-xs">
        <h4 class="text-sm font-extrabold text-stone-900 mb-2">재고 조정 기록</h4>
        ${adjRows ? `<table class="w-full"><thead><tr class="text-stone-500 border-b"><th class="py-1 px-2 text-left">날짜</th><th class="py-1 px-2 text-left">품목</th><th class="py-1 px-2 text-right">증감</th><th class="py-1 px-2 text-left">사유</th><th></th></tr></thead><tbody>${adjRows}</tbody></table>` : '<div class="text-stone-400">조정 기록이 없습니다.</div>'}
      </div>`;
  }
  function modal(html, center) { const h = document.getElementById('prodModal'); if (h) h.innerHTML = `<div class="fixed inset-0 z-50 bg-stone-900/40 flex ${center ? 'items-center' : 'items-start'} justify-center p-3 sm:p-6 overflow-y-auto" onclick="if(event.target===this)Prod.closeModal()"><div class="bg-white rounded-2xl shadow-xl w-full max-w-[720px]">${html}</div></div>`; }
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
    setView: (v) => { view = v; render(); }, setMonth: (m) => { cursorMonth = m; lossPeriodKey = 'M'; scrapPeriodKey = 'M'; render(); }, setScrapPeriod: (k) => { scrapPeriodKey = k; render(); }, pull: () => pullCloud(true),
    openDay, closeDay, addLine, setLineProduct, setLineField, removeLine, refreshPrices, copyTargetsFrom,
    addSemi, setSemiField, removeSemi, addProduct, addSemiByName, setPicker, setMemo: (v) => { if (draft) draft.memo = v; }, setOff: (v) => { if (draft) { draft.off = !!v; renderEditor(); } }, setOffLabel: (v) => { if (draft) draft.offLabel = v; }, saveDay,
    openPackDay, closePackDay, packAdd, packAddAll, packField, packRemove, packPicker, savePackDay, packMemo: (v) => { if (packDraft) packDraft.memo = v; },
    openCrewDay, closeCrewDay, crewAdd, crewToggleW, crewRemove, crewAddLeave, crewLeaveField, crewRemoveLeave, crewCopyPrev, saveCrewDay,
    openCrewSettings, cfgField, cfgAdd, cfgRemove, saveCrewSettings, crewSetTabTo, crewToggleRetired, cfgPerCapita,
    setLossPeriod: (k) => { lossPeriodKey = k; render(); }, openScrapDay, closeScrapDay, saveScrapDay, setScrapField, addScrapRow, removeScrapRow, setScrapUse, addScrapUse, removeScrapUse, setScrapMemo: (v) => { if (scrapDraft) scrapDraft.memo = v; },
    openLossSettings, saveLossSettings, openLossMaterials, openEndStock, saveEndStock, openScrapBase, saveScrapBase, clearScrapBase, addUsedRows,
    openCountModal, saveCount, openAdjustModal, saveAdjust, removeAdjust, closeModal, loadMs, openDbModal, saveDbUrl, saveNow,
    _debug: () => ({ db, dbRevision, cloudLoaded, products: getProducts() }),
    // 엠즈 재고 탭에서 공장 재고(PK)를 더할 때 사용: 재고 실사 기준일과 품목별 현재고
    stockForMs: () => ({ loaded: !!cloudLoaded, baseDate: db.stockBase ? db.stockBase.date : '', rows: computeStock().rows.map((r) => ({ code: r.code, unit: r.unit, cur: r.cur })) }),
  };
})();
