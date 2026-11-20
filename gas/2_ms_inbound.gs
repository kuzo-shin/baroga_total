/**
 * [바로가 ERP] 2. 엠즈 입고 DB — Google Apps Script
 * 버전: v2.1 (2026-11-20 2단계 접속 코드 인증 추가 / v2.0 1단계 데이터 손실 방지)
 *
 * 변경 사항
 *  - 기존: 전체 데이터를 첫 번째 시트 A1 셀 한 칸에 저장 (셀당 50,000자 한도 → 12월 중 초과 예상)
 *  - 변경: 'MS_DB' 시트에 40,000자씩 나눠 여러 행으로 저장 (한도 없음)
 *  - 기존 A1 데이터는 'MS_DB' 시트가 처음 생길 때까지 그대로 읽어 옴 (자동 이전, 원본 A1은 건드리지 않음 = 백업)
 *  - 리비전 확인으로 덮어쓰기 방지, 동시 저장 잠금, 저장 성공/실패 응답
 */

const DB_SHEET_NAME = 'MS_DB';
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
    return { source: 'MS_DB', updatedAt: String(values[0][2] || ''), data: json ? JSON.parse(json) : null };
  }
  // 이전 방식(첫 번째 시트 A1) 자동 읽기
  const legacy = ss.getSheets()[0].getRange('A1').getValue();
  const text = String(legacy || '').trim();
  if (text.startsWith('{') || text.startsWith('[')) {
    return { source: 'LEGACY_A1', updatedAt: '', data: JSON.parse(text) };
  }
  return { source: 'EMPTY', updatedAt: '', data: null };
}

function readAll_() {
  try {
    const r = readPayload_();
    return jsonOut({ ok: true, revision: getRevision_(), source: r.source, updatedAt: r.updatedAt, data: r.data });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function writeAll_(body) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return jsonOut({ ok: false, error: '다른 저장 작업이 진행 중입니다. 잠시 후 다시 시도하세요.' });
  try {
    if (body.action !== 'replaceAll') return jsonOut({ ok: false, error: '지원하지 않는 작업입니다: ' + body.action });

    const current = getRevision_();
    if (body.baseRevision === undefined || body.baseRevision === null || Number(body.baseRevision) !== current) {
      return jsonOut({ ok: false, conflict: true, revision: current, error: '다른 곳에서 먼저 저장된 데이터가 있습니다. 새로고침 후 다시 시도하세요.' });
    }

    const payload = body.payload;
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.records) || !Array.isArray(payload.returns)) {
      return jsonOut({ ok: false, error: '저장할 데이터 형식이 올바르지 않습니다 (records/returns 필요).' });
    }

    const json = JSON.stringify(payload);
    const nowStr = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
    const rows = splitChunks_(json).map((chunk, idx) => [idx + 1, chunk, idx === 0 ? nowStr : '']);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let db = ss.getSheetByName(DB_SHEET_NAME);
    if (!db) db = ss.insertSheet(DB_SHEET_NAME, ss.getNumSheets());
    writeChunkRows_(db, ['seq', 'json_chunk', 'updatedAt_KST'], rows);
    SpreadsheetApp.flush();

    // 저장 직후 다시 읽어서 그대로 복원되는지 확인
    const check = readPayload_();
    if (!check.data || JSON.stringify(check.data).length !== json.length) {
      return jsonOut({ ok: false, error: '저장 후 검증에 실패했습니다. 관리자에게 알려주세요.' });
    }

    const revision = bumpRevision_();
    return jsonOut({ ok: true, revision, updatedAt: nowStr, records: payload.records.length, returns: payload.returns.length, chunks: rows.length });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

// 이모지 등 2칸짜리 문자가 두 셀에 쪼개지지 않도록 경계를 조정해 자름
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
