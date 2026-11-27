// Cloudflare Access 로그인 확인
//  - Access가 앞에서 로그인을 받고, 요청마다 Cf-Access-Jwt-Assertion 헤더에 서명된 토큰을 붙여 줌
//  - 여기서 서명(RS256)·대상(aud)·발급처(iss)·만료(exp)를 직접 확인한 뒤 이메일을 꺼냄
//  - ACCESS_TEAM_DOMAIN·ACCESS_AUD가 비어 있으면 모든 요청을 거부 (안전한 기본값)
//  - 내 컴퓨터 시험(localhost)에서만 DEV_EMAIL로 로그인한 것처럼 볼 수 있음

let certCache = { at: 0, team: '', keys: [] };

const b64urlToBytes = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const b64urlJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

async function getKeys(team, fetcher) {
  const now = Date.now();
  if (certCache.team === team && now - certCache.at < 3600_000 && certCache.keys.length) return certCache.keys;
  const res = await fetcher(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('Access 인증서를 받지 못했습니다');
  const json = await res.json();
  certCache = { at: now, team, keys: json.keys || [] };
  return certCache.keys;
}

export async function verifyAccessJwt(token, env, fetcher = fetch) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('토큰 형식 오류');
  const header = b64urlJson(parts[0]), payload = b64urlJson(parts[1]);
  if (header.alg !== 'RS256') throw new Error('지원하지 않는 서명 방식');
  const team = String(env.ACCESS_TEAM_DOMAIN).replace(/^https?:\/\//, '').replace(/\/$/, '');
  let keys = await getKeys(team, fetcher);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) { certCache.at = 0; keys = await getKeys(team, fetcher); jwk = keys.find((k) => k.kid === header.kid); }
  if (!jwk) throw new Error('서명 키를 찾지 못했습니다');
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!ok) throw new Error('서명이 맞지 않습니다');
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const allowed = String(env.ACCESS_AUD).split(',').map((s) => s.trim()).filter(Boolean);
  if (!auds.some((a) => allowed.includes(a))) throw new Error('이 사이트용 토큰이 아닙니다');
  if (payload.iss !== `https://${team}`) throw new Error('발급처가 다릅니다');
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now - 30) throw new Error('로그인이 만료되었습니다');
  if (payload.nbf && payload.nbf > now + 30) throw new Error('아직 쓸 수 없는 토큰입니다');
  if (!payload.email) throw new Error('토큰에 이메일이 없습니다');
  return String(payload.email).toLowerCase();
}

export async function getEmail(request, env, fetcher) {
  const host = new URL(request.url).hostname;
  if (env.DEV_EMAIL && (host === 'localhost' || host === '127.0.0.1')) return String(env.DEV_EMAIL).toLowerCase();
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    const e = new Error('로그인 설정이 아직 안 되었습니다 (ACCESS_TEAM_DOMAIN, ACCESS_AUD). 배포 안내를 확인하세요.');
    e.status = 503; throw e;
  }
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) { const e = new Error('로그인이 필요합니다'); e.status = 401; throw e; }
  try { return await verifyAccessJwt(token, env, fetcher); } catch (err) { err.status = 401; throw err; }
}
