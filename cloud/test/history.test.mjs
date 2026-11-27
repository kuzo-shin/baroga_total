// 저장 기록 시험 (가짜 자료).  실행: node test/history.test.mjs
import assert from 'node:assert';
import worker from '../src/index.js';
import { makeD1 } from './d1mock.mjs';
const DB = makeD1();
const call = async (email, method, path, body) => { const res = await worker.fetch(new Request('http://localhost' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }), { DB, DEV_EMAIL: email, ADMIN_EMAILS: 'boss@example.com' }); return { s: res.status, j: await res.json() }; };
let r;
r = await call('a@example.com', 'PUT', '/api/store/production', { baseRev: 0, put: { _manifest: '{"v":1}', 'p:days:2026-11': '{"2026-11-03":{"x":1}}', 'k:memo': '"a"' } }); assert.strictEqual(r.j.rev, 1);
r = await call('b@example.com', 'PUT', '/api/store/production', { baseRev: 1, put: { 'p:days:2026-11': '{"2026-11-03":{"x":0.25}}' }, note: '고침' }); assert.strictEqual(r.j.rev, 2);
r = await call('a@example.com', 'PUT', '/api/store/production', { baseRev: 2, del: ['k:memo'], put: { _manifest: '{"v":2}' } }); assert.strictEqual(r.j.rev, 3);
r = await call('a@example.com', 'GET', '/api/store/production/history'); assert.strictEqual(r.s, 200);
assert.deepStrictEqual(r.j.revs.map((x) => [x.rev, x.by, x.keys.sort().join(','), x.removed]), [[3, 'a@example.com', 'k:memo', 1], [2, 'b@example.com', 'p:days:2026-11', 0], [1, 'a@example.com', 'k:memo,p:days:2026-11', 0]]);
r = await call('a@example.com', 'GET', '/api/store/production/changes?rev=2'); assert.strictEqual(r.j.by, 'b@example.com');
assert.deepStrictEqual(r.j.changes, [{ key: 'p:days:2026-11', before: '{"2026-11-03":{"x":1}}', beforeRev: 1, after: '{"2026-11-03":{"x":0.25}}' }]);
r = await call('a@example.com', 'GET', '/api/store/production/changes?rev=3'); assert.deepStrictEqual(r.j.changes, [{ key: 'k:memo', before: '"a"', beforeRev: 1, after: null }]);
r = await call('a@example.com', 'GET', '/api/store/production/changes?rev=1'); assert.strictEqual(r.j.changes.length, 2); assert.strictEqual(r.j.changes[0].before, null);
r = await call('a@example.com', 'GET', '/api/store/production/changes?rev=9'); assert.strictEqual(r.s, 404);
console.log('history.test: 모두 통과');
