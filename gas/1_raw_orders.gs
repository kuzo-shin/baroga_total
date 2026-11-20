/**
 * [바로가 ERP] 1. 원재료 발주 DB — Google Apps Script
 * 버전: v2.1 (2026-11-20 2단계 접속 코드 인증 추가 / v2.0 1단계 데이터 손실 방지)
 *
 * 변경 사항
 *  - 저장 전 전체 검증 → 통과 시에만 덮어쓰기 → 남는 행만 정리 (먼저 지우지 않음)
 *  - 리비전(revision) 확인: 불러온 뒤 다른 곳에서 먼저 저장했으면 저장 거부 (덮어쓰기 방지)
 *  - 동시 저장 잠금(LockService), 날짜 Asia/Seoul 고정
 *  - 문자 칸은 '일반 텍스트' 서식으로 저장 → 규격 '1/2' 등이 날짜로 바뀌지 않음
 *  - 위험 기능 제거: clearAll, appendOrders(리비전 우회)
 */

const SHEET_NAME = '원재료발주DB';
const TZ = 'Asia/Seoul';
const CELL_LIMIT = 49000; // 구글 시트 셀당 최대 50,000자
const HEADERS = ['id', 'date', 'colA', 'colB', 'colC', 'colD', 'prevQty', 'taxType', 'taxFreeAmount', 'taxableAmount', 'amount', 'colE'];
const KINDS   = ['text', 'text', 'text', 'text', 'text', 'number', 'number', 'text', 'number', 'number', 'number', 'text'];
const REVISION_KEY = 'DB_REVISION';

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

function getTargetSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  return { ss, sheet };
}

function cellToDateStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return String(v || '');
}

function readAll_() {
  try {
    const { ss, sheet } = getTargetSheet_();
    const lastRow = sheet.getLastRow();
    const orders = [];
    if (lastRow >= 2) {
      const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      values.forEach(r => {
        if (!r[0] && !r[3]) return;
        orders.push({
          id: String(r[0] || ''), date: cellToDateStr_(r[1]), colA: String(r[2] || ''), colB: String(r[3] || ''),
          colC: String(r[4] || ''), colD: Number(r[5] || 0), prevQty: r[6] === '' ? '' : Number(r[6]),
          taxType: String(r[7] || '과세'), taxFreeAmount: Number(r[8] || 0),
          taxableAmount: Number(r[9] || 0), amount: Number(r[10] || 0), colE: String(r[11] || '')
        });
      });
    }
    return jsonOut({ ok: true, revision: getRevision_(), spreadsheetName: ss.getName(), sheetName: sheet.getName(), count: orders.length, orders });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function writeAll_(body) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return jsonOut({ ok: false, error: '다른 저장 작업이 진행 중입니다. 잠시 후 다시 시도하세요.' });
  try {
    const action = body.action || '';
    if (action !== 'replaceAll' && action !== 'syncAll') {
      return jsonOut({ ok: false, error: '지원하지 않는 작업입니다: ' + action });
    }
    const current = getRevision_();
    if (body.baseRevision === undefined || body.baseRevision === null || Number(body.baseRevision) !== current) {
      return jsonOut({ ok: false, conflict: true, revision: current, error: '다른 곳에서 먼저 저장된 데이터가 있습니다. 새로고침 후 다시 시도하세요.' });
    }
    const list = Array.isArray(body.orders) ? body.orders : (Array.isArray(body.data) ? body.data : null);
    if (!list) return jsonOut({ ok: false, error: '저장할 데이터 형식이 올바르지 않습니다.' });

    const rows = list.map(o => [
      o.id || '', String(o.date || ''), o.colA || '', o.colB || '', o.colC || '',
      Number(o.colD || 0), (o.prevQty === '' || o.prevQty === null || o.prevQty === undefined) ? '' : Number(o.prevQty),
      o.taxType || '과세', Number(o.taxFreeAmount || 0), Number(o.taxableAmount || 0), Number(o.amount || 0), o.colE || ''
    ]);

    const { sheet } = getTargetSheet_();
    writeRowsSafely_(sheet, HEADERS, KINDS, rows);
    SpreadsheetApp.flush();
    const revision = bumpRevision_();
    return jsonOut({ ok: true, revision, count: rows.length });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 안전 쓰기: ① 전체 검증 → ② 한 번에 덮어쓰기 → ③ 남는 이전 행만 비우기
 * 검증에 실패하면 시트를 전혀 건드리지 않습니다.
 */
function writeRowsSafely_(sheet, headers, kinds, rows) {
  const width = headers.length;
  const prepared = rows.map((row, i) => row.map((v, j) => {
    if (kinds[j] === 'number') {
      if (v === '' || v === null || v === undefined) return '';
      const n = Number(v);
      if (!isFinite(n)) throw new Error((i + 2) + '행 ' + headers[j] + ' 값이 숫자가 아닙니다: ' + v);
      return n;
    }
    const s = String(v === null || v === undefined ? '' : v);
    if (s.length > CELL_LIMIT) throw new Error((i + 2) + '행 ' + headers[j] + ' 값이 ' + s.length + '자로 셀 한도(50,000자)를 넘습니다.');
    return s;
  }));
  const all = [headers].concat(prepared);

  if (sheet.getMaxRows() < all.length) sheet.insertRowsAfter(sheet.getMaxRows(), all.length - sheet.getMaxRows());
  if (sheet.getMaxColumns() < width) sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());

  kinds.forEach((k, j) => {
    if (k === 'text') sheet.getRange(1, j + 1, all.length, 1).setNumberFormat('@');
  });
  sheet.getRange(1, 1, all.length, width).setValues(all);

  const lastRow = sheet.getLastRow();
  if (lastRow > all.length) {
    sheet.getRange(all.length + 1, 1, lastRow - all.length, Math.max(width, sheet.getLastColumn())).clearContent();
  }
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
