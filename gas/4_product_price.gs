/**
 * [바로가 ERP] 4. 제품단가(생산원가) DB — Google Apps Script
 * 버전: v2.1 (2026-11-20 2단계 접속 코드 인증 추가 / v2.0 1단계 데이터 손실 방지)
 *
 * 변경 사항
 *  - 기존: 전체 데이터를 'BAROGA_RAW_DB' 시트 A2 셀 한 칸에 저장 (기본 데이터만으로 한도의 91%)
 *          + 먼저 시트를 지우고 쓰기 → 한도 초과 시 A2가 빈 상태로 남음
 *  - 변경: 'PRICE_DB' 시트에 40,000자씩 나눠 여러 행으로 저장 (한도 없음), 먼저 지우지 않음
 *  - 'PRICE_DB'가 처음 생길 때까지는 기존 'BAROGA_RAW_DB'!A2를 그대로 읽음 (자동 이전, 원본은 백업으로 보존)
 *  - 리비전 확인으로 덮어쓰기 방지, 동시 저장 잠금
 *  - 사람이 보는 요약 시트(기본설정_DB, 공정별_품목DB)는 기존과 동일하게 갱신
 */

const DB_SHEET_NAME = 'PRICE_DB';
const LEGACY_SHEET_NAME = 'BAROGA_RAW_DB';
const CHUNK_SIZE = 40000;
const REVISION_KEY = 'DB_REVISION';
const TZ = 'Asia/Seoul';

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getRevision_() {
  return Number(PropertiesService.getScriptProperties().getProperty(REVISION_KEY) || 0);
}

function bumpRevision_() {
  const next = getRevision_() + 1;
  PropertiesService.getScriptProperties().setProperty(REVISION_KEY, String(next));
  return next;
}

function readPayload_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const db = ss.getSheetByName(DB_SHEET_NAME);
  if (db && db.getLastRow() >= 2) {
    const values = db.getRange(2, 1, db.getLastRow() - 1, 3).getValues();
    const json = values
      .filter(r => r[0] !== '' && r[0] !== null)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(r => String(r[1] || ''))
      .join('');
    return { source: 'PRICE_DB', updatedAt: String(values[0][2] || ''), payload: json ? JSON.parse(json) : null };
  }
  const legacy = ss.getSheetByName(LEGACY_SHEET_NAME);
  if (legacy) {
    const jsonStr = legacy.getRange('A2').getValue();
    if (jsonStr) {
      return { source: 'LEGACY_A2', updatedAt: String(legacy.getRange('B2').getValue() || ''), payload: JSON.parse(String(jsonStr)) };
    }
  }
  return { source: 'EMPTY', updatedAt: '', payload: null };
}

function readAll_() {
  try {
    const r = readPayload_();
    if (!r.payload) {
      return jsonOut({ ok: true, status: 'empty', revision: getRevision_(), message: '아직 저장된 DB 데이터가 없습니다.' });
    }
    return jsonOut({ ok: true, status: 'ok', revision: getRevision_(), source: r.source, updatedAt: r.updatedAt, payload: r.payload });
  } catch (err) {
    return jsonOut({ ok: false, status: 'error', message: String(err && err.message ? err.message : err) });
  }
}

function writeAll_(body) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return jsonOut({ ok: false, status: 'error', message: '다른 저장 작업이 진행 중입니다. 잠시 후 다시 시도하세요.' });
  try {
    if (body.action !== 'replaceAll') return jsonOut({ ok: false, status: 'error', message: '지원하지 않는 작업입니다: ' + body.action });

    const current = getRevision_();
    if (body.baseRevision === undefined || body.baseRevision === null || Number(body.baseRevision) !== current) {
      return jsonOut({ ok: false, status: 'error', conflict: true, revision: current, message: '다른 곳에서 먼저 저장된 데이터가 있습니다. 새로고침 후 다시 시도하세요.' });
    }
    const payload = body.payload;
    if (!payload || typeof payload !== 'object' || !payload.settings || !payload.categoryDbs || !Array.isArray(payload.pkCostRows)) {
      return jsonOut({ ok: false, status: 'error', message: '저장할 데이터 형식이 올바르지 않습니다 (settings/categoryDbs/pkCostRows 필요).' });
    }

    const json = JSON.stringify(payload);
    const nowStr = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
    const rows = splitChunks_(json).map((chunk, idx) => [idx + 1, chunk, idx === 0 ? nowStr : '']);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let db = ss.getSheetByName(DB_SHEET_NAME);
    if (!db) db = ss.insertSheet(DB_SHEET_NAME, ss.getNumSheets());
    writeChunkRows_(db, ['seq', 'json_chunk', 'updatedAt_KST'], rows);
    SpreadsheetApp.flush();

    const check = readPayload_();
    if (!check.payload || JSON.stringify(check.payload).length !== json.length) {
      return jsonOut({ ok: false, status: 'error', message: '저장 후 검증에 실패했습니다. 관리자에게 알려주세요.' });
    }
    const revision = bumpRevision_();

    // 사람이 보는 요약 시트 (실패해도 원본 저장은 이미 완료)
    let readableWarning = '';
    try {
      syncReadableSheets(ss, payload, nowStr);
    } catch (err2) {
      readableWarning = '요약 시트 갱신 실패: ' + String(err2);
    }

    return jsonOut({ ok: true, status: 'ok', revision, updatedAt: nowStr, chunks: rows.length, warning: readableWarning });
  } catch (err) {
    return jsonOut({ ok: false, status: 'error', message: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function splitChunks_(str) {
  const out = [];
  let i = 0;
  while (i < str.length) {
    let end = Math.min(i + CHUNK_SIZE, str.length);
    const code = str.charCodeAt(end - 1);
    if (end < str.length && code >= 0xD800 && code <= 0xDBFF) end -= 1;
    out.push(str.slice(i, end));
    i = end;
  }
  return out;
}

function writeChunkRows_(sheet, headers, rows) {
  const all = [headers].concat(rows);
  if (sheet.getMaxRows() < all.length) sheet.insertRowsAfter(sheet.getMaxRows(), all.length - sheet.getMaxRows());
  if (sheet.getMaxColumns() < headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  sheet.getRange(1, 2, all.length, 2).setNumberFormat('@');
  sheet.getRange(1, 1, all.length, headers.length).setValues(all);
  const lastRow = sheet.getLastRow();
  if (lastRow > all.length) sheet.getRange(all.length + 1, 1, lastRow - all.length, headers.length).clearContent();
}

// 구글 시트에서도 한눈에 볼 수 있도록 표 형태로 정리해주는 보조 함수 (기존과 동일)
function syncReadableSheets(ss, payload, nowStr) {
  const s = payload.settings;
  const dbs = payload.categoryDbs || {};

  let setSheet = ss.getSheetByName('기본설정_DB');
  if (!setSheet) setSheet = ss.insertSheet('기본설정_DB');
  setSheet.clear();

  const rows = [
    ['[바로가 기본설정 DB]', '최종 업데이트:', nowStr, ''],
    ['', '', '', ''],
    ['■ 월 고정비 항목명', '금액(원/월)', '단위', '비고'],
  ];
  (s.fixedCostItems || []).forEach(function (item) {
    rows.push([item.name, item.amount, item.unit || '원/월', item.note || '']);
  });
  rows.push(['', '', '', '']);
  rows.push(['■ 작업유형명', '기본급여(세전)', '', '']);
  (s.jobTypeSalaries || []).forEach(function (jt) {
    rows.push([jt.jobType, jt.baseSalary, '원/월', '']);
  });
  setSheet.getRange(1, 1, rows.length, 4).setValues(rows);

  let prodSheet = ss.getSheetByName('공정별_품목DB');
  if (!prodSheet) prodSheet = ss.insertSheet('공정별_품목DB');
  prodSheet.clear();

  const pRows = [
    ['카테고리', '품목ID', '품목명', '1배합 실생산(ea)', 'PK입수량(ea)', '공정1 인원', '공정2 인원', '공정3 인원'],
  ];
  const catNames = { PIE: '파이', DOUGH: '알생지', PARBAKE: '파베이크', BAKERY: '제과' };
  Object.keys(catNames).forEach(function (catKey) {
    (dbs[catKey] || []).forEach(function (p) {
      const s1Cnt = (p.stage1Rows || []).filter(function (r) { return !!r.jobTypeId; }).length;
      const s2Cnt = (p.stage2Rows || []).filter(function (r) { return !!r.jobTypeId; }).length;
      const s3Cnt = (p.stage3Rows || []).filter(function (r) { return !!r.jobTypeId; }).length;
      pRows.push([catNames[catKey], p.id, p.productName, p.batchOutputEa, p.pkQuantityEa, s1Cnt, s2Cnt, s3Cnt]);
    });
  });
  prodSheet.getRange(1, 1, pRows.length, 8).setValues(pRows);
}

// ============================================================================
// [2단계 보안] 접속 코드 인증
//  - 스크립트 속성 ACCESS_CODE 에 저장된 코드와 일치하는 요청만 읽기·저장 허용
//  - 설정: Apps Script 왼쪽 ⚙ 프로젝트 설정 → 스크립트 속성 → ACCESS_CODE 추가
//  - 코드가 설정되지 않았으면 모든 요청 거부 (안전한 기본값)
//  - 주소창으로 여는 GET 요청은 데이터를 돌려주지 않음
// ============================================================================
function checkAccess_(body) {
  const code = PropertiesService.getScriptProperties().getProperty('ACCESS_CODE');
  if (!code) {
    return { ok: false, unauthorized: true, status: 'error', error: '관리자가 접속 코드를 아직 설정하지 않았습니다 (스크립트 속성 ACCESS_CODE).', message: '접속 코드 미설정' };
  }
  if (!body || String(body.accessCode || '') !== String(code)) {
    Utilities.sleep(800); // 무작위 대입 지연
    return { ok: false, unauthorized: true, status: 'error', error: '접속 코드가 올바르지 않습니다.', message: '접속 코드 오류' };
  }
  return null;
}

function doGet(e) {
  return jsonOut({ ok: false, unauthorized: true, status: 'error', error: '접속 코드가 필요합니다. 사이트에서 접속 코드를 입력하세요.' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonOut({ ok: false, status: 'error', error: '요청 형식이 올바르지 않습니다.' });
  }
  const denied = checkAccess_(body);
  if (denied) return jsonOut(denied);
  if (body.action === 'getAll') return readAll_();
  return writeAll_(body);
}
