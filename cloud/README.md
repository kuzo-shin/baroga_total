# 바로가 공장 ERP — Cloudflare 서버 (cloud/)

공장 ERP를 구글 시트 DB에서 Cloudflare로 순서대로 옮기는 중입니다. 화면과 서버를 한 주소에서 제공하고, 허용한 구글 계정으로 로그인한 사람만 열 수 있습니다.

- **주소**: `https://baroga-total.kuzo0909.workers.dev` (새 주소, 로그인 필요). 옛 주소(GitHub Pages)는 이식이 끝날 때까지 함께 둠
- **서버**: Cloudflare Worker `baroga-total` (`cloud/src/index.js`, 설정은 저장소 맨 위 `wrangler.jsonc`)
- **화면**: 배포할 때 `index.html`·`*.js`·`*.png`만 `.site/`로 모아 함께 올림
- **글**: D1 `baroga-erp-db` · **사진**: R2 `baroga-erp-photos`
- **로그인**: Cloudflare Access. Worker → Access 탭의 정책에 든 계정만 통과. 서버는 요청마다 Access 토큰의 서명·대상·만료를 다시 확인(`cloud/src/auth.js`)하고 이메일을 작성자·수정자로 남김
  - `wrangler.jsonc`의 `ACCESS_TEAM_DOMAIN`·`ACCESS_AUD`는 Access 탭의 Application values 값(비밀값 아님). 없으면 서버가 모든 요청을 거부
- **이식 현황**: 공장 일지 = Cloudflare. 원재료·레시피·제품단가·생산일지·생산 재고·제품 출고·엠즈 재고·거래명세서 = 아직 구글 시트(접속 코드 그대로)

## 설정 기록 (2026-11-27)
1. R2 켜짐, Worker `baroga-total`이 저장소에 연결됨 (Build command 비움 · Deploy command `npx wrangler deploy` · Root directory 비움)
2. main에 머지하면 자동 배포. D1·R2는 첫 배포 때 자동 생성됨
3. Worker → **Access** 탭 → Protect this Worker behind Access → Scope **All traffic**, 정책 **Cloudflare account members**(계정 주인만) 로 시작
4. 직원을 들이려면: Zero Trust → Access controls → Policies 에서 공장용 정책(Allow · Emails)을 만들어 이 Worker에 연결
5. 구글 로그인 버튼: Zero Trust → Integrations → Identity providers 에 Google 추가(Google Cloud 콘솔에서 OAuth 클라이언트를 만들어 Client ID·Secret 입력). 추가 전에는 이메일 코드(One-time PIN)로 로그인

주의: `wrangler.jsonc`의 `name`은 Cloudflare에 만든 Worker 이름과 같아야 합니다.

## 주소(API)

| 방식 | 주소 | 하는 일 |
|---|---|---|
| GET | `/api/me` | 로그인한 사람의 이메일 |
| GET | `/api/factory-log?from=&to=` | 그 기간에 걸친 일지 + 체크리스트가 남은 일지 |
| PUT | `/api/factory-log` | 일지 한 건 새로 만들기·고치기 (고칠 때 `id`·`rev`) |
| DELETE | `/api/factory-log/:id` | 일지와 그 사진 삭제 |
| POST | `/api/factory-log/:id/photos?name=` | 사진 한 장 올리기 (JPG·PNG·WEBP, 8MB까지, 일지당 20장) |
| GET · DELETE | `/api/photos/:id` | 사진 내려받기 · 삭제 |

모든 요청은 로그인(Access)을 거쳐야 합니다. 여러 사람이 같은 일지를 고치면 `rev`가 다른 쪽은 거부됩니다(409).

## 시험

```
cd cloud && node test/factory_log.test.mjs
```
node 22 이상. D1은 `node:sqlite`, R2는 메모리로 흉내 냅니다(가짜 자료).
