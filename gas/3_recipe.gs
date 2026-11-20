/**
 * [바로가 ERP] 3. 레시피 DB — Google Apps Script
 * 버전: v2.1 (2026-11-20 2단계 접속 코드 인증 추가 / v2.0 1단계 데이터 손실 방지)
 *
 * 변경 사항
 *  - 기존: 시트를 먼저 전부 지우고 쓰기 → 레시피 1개라도 5만자 넘으면 시트 전체가 빈 상태로 남음
 *  - 변경: 전체 검증 → 한 번에 덮어쓰기 → 남는 행만 정리
 *  - 제품 사진은 '레시피이미지' 시트에 40,000자씩 나눠 별도 저장 (레시피 셀 한도 문제 해결)
 *  - 품목코드를 텍스트로 저장 (앞자리 0 보존), 수정일 Asia/Seoul
 *  - 위험 기능 제거: 주소(GET)만 열어도 저장되던 기능, JSONP(callback) 외부 조회
 *  - 리비전 확인으로 덮어쓰기 방지, 동시 저장 잠금
 *  - 처음 실행 시 첫 번째 시트 이름을 '레시피DB'로 고정 (시트 순서가 바뀌어도 안전)
 */

const RECIPE_SHEET_NAME = '레시피DB';
const IMAGE_SHEET_NAME = '레시피이미지';
const TZ = 'Asia/Seoul';
const CELL_LIMIT = 49000;
const CHUNK_SIZE = 40000;
const REVISION_KEY = 'DB_REVISION';
const HEADERS = ['productCode','productName','divisionWeight','customProductionQty','packQty','sellingPrice','lossRatio','unitPackCost','totalPackCost','productionCost','weightTotalG','ingredientsJson','updatedAt','id'];
const KINDS   = ['text','text','number','number','number','number','number','number','number','number','number','text','text','text'];

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

function getRecipeSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(RECIPE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(RECIPE_SHEET_NAME);
  }
  return sheet;
}

function cellToText_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return v === null || v === undefined ? '' : String(v);
}

function readImages_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(IMAGE_SHEET_NAME);
  const map = {};
  if (!sh || sh.getLastRow() < 2) return map;
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  const parts = {};
  values.forEach(r => {
    const id = String(r[0] || '');
    if (!id) return;
    if (!parts[id]) parts[id] = [];
    parts[id].push({ seq: Number(r[1]) || 0, chunk: String(r[2] || '') });
  });
  Object.keys(parts).forEach(id => {
    map[id] = parts[id].sort((a, b) => a.seq - b.seq).map(p => p.chunk).join('');
  });
  return map;
}

function readAll_() {
  try {
    const sheet = getRecipeSheet_();
    const rows = sheet.getDataRange().getValues();
    if (!rows || rows.length < 2) {
      return jsonOut({ ok: true, status: 'ok', revision: getRevision_(), data: [] });
    }
    const hasHeader = String(rows[0][0]) === 'productCode' || String(rows[0][13]) === 'id';
    const start = hasHeader ? 1 : 0;
    const images = readImages_();
    const data = [];
    for (let i = start; i < rows.length; i++) {
      const r = rows[i];
      if (!r[0] && !r[1] && !r[13]) continue;
      const obj = {};
      HEADERS.forEach((h, j) => {
        obj[h] = KINDS[j] === 'text' ? cellToText_(r[j]) : (r[j] === '' ? 0 : Number(r[j]));
      });
      if (obj.id && images[obj.id]) obj.imageData = images[obj.id];
      data.push(obj);
    }
    return jsonOut({ ok: true, status: 'ok', revision: getRevision_(), data: data });
  } catch (err) {
    return jsonOut({ ok: false, status: 'error', error: String(err && err.message ? err.message : err) });
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
    const list = Array.isArray(body.data) ? body.data : (Array.isArray(body.recipes) ? body.recipes : null);
    if (!list) return jsonOut({ ok: false, error: '저장할 데이터 형식이 올바르지 않습니다.' });
    if (!Array.isArray(body.images)) return jsonOut({ ok: false, error: '이미지 목록(images)이 없습니다. 화면을 새로고침해 최신 버전으로 저장하세요.' });

    // ① 레시피 행 준비 + 검증 (시트는 아직 건드리지 않음)
    const recipeRows = list.map((r, i) => HEADERS.map((h, j) => {
      const v = r[h];
      if (KINDS[j] === 'number') {
        const n = Number(v === '' || v === null || v === undefined ? 0 : v);
        if (!isFinite(n)) throw new Error((r.productName || ('행 ' + (i + 2))) + ' 의 ' + h + ' 값이 숫자가 아닙니다.');
        return n;
      }
      const s = v === null || v === undefined ? '' : String(v);
      if (s.length > CELL_LIMIT) throw new Error('[' + (r.productName || r.productCode) + '] ' + h + ' 이(가) ' + s.length + '자로 셀 한도(50,000자)를 넘습니다.');
      return s;
    }));

    // ② 이미지 행 준비 (40,000자씩 분할)
    const imageRows = [];
    body.images.forEach(img => {
      if (!img || !img.id || !img.data) return;
      splitChunks_(String(img.data)).forEach((chunk, idx) => imageRows.push([String(img.id), idx + 1, chunk]));
    });

    // ③ 쓰기
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    writeRowsSafely_(getRecipeSheet_(), HEADERS, KINDS, recipeRows);
    let imgSheet = ss.getSheetByName(IMAGE_SHEET_NAME);
    if (!imgSheet) imgSheet = ss.insertSheet(IMAGE_SHEET_NAME, ss.getNumSheets());
    writeRowsSafely_(imgSheet, ['id', 'seq', 'chunk'], ['text', 'number', 'text'], imageRows);
    SpreadsheetApp.flush();

    const revision = bumpRevision_();
    return jsonOut({ ok: true, status: 'ok', revision, count: recipeRows.length, images: body.images.filter(x => x && x.data).length });
  } catch (err) {
    return jsonOut({ ok: false, status: 'error', error: String(err && err.message ? err.message : err) });
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

function writeRowsSafely_(sheet, headers, kinds, rows) {
  const width = headers.length;
  const all = [headers].concat(rows);
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
