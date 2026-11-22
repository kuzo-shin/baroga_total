/**
 * [바로가 ERP] 6. 원재료 단가 비교 DB — Google Apps Script
 * 버전: v1.0 (2026-11-23 신규)
 *
 *  - 'PRICE_COMPARE_DB' 시트에 전체 데이터를 40,000자씩 나눠 저장 (한도 없음), 먼저 지우지 않음
 *  - 리비전 확인으로 다른 기기 저장분 덮어쓰기 방지, 동시 저장 잠금, 저장 후 다시 읽어 검증
 *  - 접속 코드(스크립트 속성 ACCESS_CODE) 인증 — 다른 DB와 같은 코드
 *  - 사람이 보는 요약 시트 '품목별_비교' · '업체별_연락처' 갱신
 *  - 매입 단가·업체 연락처가 들어 있으므로 공개 저장소(GitHub)가 아니라 이 시트에만 보관
 */

const DB_SHEET_NAME = 'PRICE_COMPARE_DB';
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
    return { source: 'PRICE_COMPARE_DB', updatedAt: String(values[0][2] || ''), payload: json ? JSON.parse(json) : null };
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
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.items) || !payload.items.length) {
      return jsonOut({ ok: false, status: 'error', message: '저장할 데이터 형식이 올바르지 않습니다 (items 필요).' });
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

// 구글 시트에서도 한눈에 볼 수 있도록 요약 표 2개 (원본은 PRICE_COMPARE_DB)
function writeTable_(ss, name, rows, nowStr) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, rows.length, rows[0].length).setNumberFormat('@');
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.getRange(1, rows[0].length + 1).setValue('최종 업데이트: ' + nowStr);
}
function syncReadableSheets(ss, payload, nowStr) {
  const num = function (v) { return v === null || v === undefined || v === '' ? '' : Math.round(Number(v)); };
  const rows = [['우선순위', '품목코드', '품목명', '규격', '현 거래처', '현재 원/kg', '한 달 사용량(kg)', '1순위 업체', '1순위 원/kg', '차액 원/kg(후보−현재)', '1년 차액(−절감)', '판단']];
  (payload.items || []).slice().sort(function (a, b) { return (a.priRank || 999) - (b.priRank || 999); }).forEach(function (it) {
    const r1 = (it.rows || []).filter(function (v) { return v.rank === 1; })[0] || {};
    rows.push([String(it.priRank || ''), String(it.code || ''), it.name || '', it.spec || '', it.supplier || '', String(num(it.curKg)), String(it.monthlyKg || ''),
      r1.vendor || '', String(num(r1.wkg)), String(num(r1.diff)), String(num(r1.m12)), it.verdict || '']);
  });
  writeTable_(ss, '품목별_비교', rows, nowStr);
  const crow = [['업체', '전화', '이메일', '홈페이지', '품목 수', '1년 차액(−절감)', '품목']];
  (payload.calls || []).forEach(function (c) {
    crow.push([c.vendor || '', c.phone || '', c.email || '', c.home || '', String((c.items || []).length), String(num(c.m12)), (c.items || []).map(function (i) { return i.name; }).join(', ')]);
  });
  if (crow.length > 1) writeTable_(ss, '업체별_연락처', crow, nowStr);
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
