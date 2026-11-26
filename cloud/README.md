# 바로가 공장 ERP — Cloudflare 서버 (cloud/)

공장 ERP의 DB를 구글 시트에서 Cloudflare로 순서대로 옮기는 첫 단계입니다. 지금은 **공장 일지** 메뉴만 이 서버를 씁니다. 나머지 메뉴는 그대로 구글 시트 DB를 씁니다.

- **서버**: Cloudflare Worker `baroga-erp` (`cloud/src/index.js`)
- **글**: D1 `baroga-erp-db` · **사진**: R2 `baroga-erp-photos` (둘 다 첫 배포 때 자동으로 만들어짐)
- **화면**: 지금처럼 GitHub Pages (`factory_log.js`). 화면이 이 서버를 불러 자료를 주고받음
- **보호**: 다른 메뉴와 같은 접속 코드. 서버 쪽 코드는 Cloudflare 화면에서 비밀값 `ACCESS_CODE`로 넣음 (저장소에는 적지 않음). 넣기 전에는 서버가 모든 요청을 거부
- **주소**: `https://baroga-erp.<계정이름>.workers.dev` (운영팀 사이트와 같은 계정이면 `https://baroga-erp.kuzo0909.workers.dev`)

## 처음 배포 (한 번만)

화면 이름은 Cloudflare가 바꾸면 조금 다를 수 있습니다.

1. **R2 켜기**: Cloudflare 화면 왼쪽 **R2 Object Storage** → 결제 카드 등록 후 사용 시작 (무료 범위: 저장 10GB/월)
2. **저장소 연결**: **Workers & Pages → Create → Continue with GitHub** → `baroga_total` 선택
   - 목록에 `baroga_total`이 없으면 GitHub 쪽 Cloudflare 앱 설정에서 이 저장소를 추가
3. 설정
   - Project name: `baroga-erp` (이 이름이 주소가 됨)
   - Build command: 비움 · Deploy command: `npx wrangler deploy`
   - **Root directory (경로): `cloud`** ← 꼭 넣기. 고급 설정(Advanced)에 있음
   - **Protect with Cloudflare Access는 켜지 않음** (화면이 github.io에서 불러야 해서, 켜면 막힘)
4. **Deploy** → D1·R2가 자동으로 만들어짐. 표(테이블)는 서버가 첫 요청 때 만듦
5. **접속 코드 넣기**: Worker `baroga-erp` → **Settings → Variables and Secrets → Add** → Type **Secret**, 이름 `ACCESS_CODE`, 값 = ERP 사이트 접속 코드 → 저장(Deploy)
6. **확인**: 브라우저에서 `https://baroga-erp.<계정이름>.workers.dev/api/health` → `"accessCode":true,"db":true,"photos":true` 이면 정상
7. ERP 사이트 → **공장 일지** 메뉴. 주소가 기본값과 다르면 오른쪽 위 상태 표시를 눌러 서버 주소를 넣음

이후 main에 머지할 때마다 자동으로 다시 배포됩니다. (Settings → Build → Build watch paths에 `cloud/*`를 넣으면 이 폴더가 바뀔 때만 배포)

## 주소(API)

| 방식 | 주소 | 하는 일 |
|---|---|---|
| GET | `/api/health` | 서버 상태 (접속 코드 없이, 자료 없음) |
| GET | `/api/factory-log?from=&to=` | 그 기간에 걸친 일지 + 체크리스트가 남은 일지 |
| PUT | `/api/factory-log` | 일지 한 건 새로 만들기·고치기 (고칠 때 `id`·`rev`) |
| DELETE | `/api/factory-log/:id` | 일지와 그 사진 삭제 |
| POST | `/api/factory-log/:id/photos?name=` | 사진 한 장 올리기 (JPG·PNG·WEBP, 8MB까지, 일지당 20장) |
| GET · DELETE | `/api/photos/:id` | 사진 내려받기 · 삭제 |

모든 요청(health 제외)은 머리말 `X-Access-Code: encodeURIComponent(접속 코드)`가 필요합니다. 여러 사람이 같은 일지를 고치면 `rev`가 다른 쪽은 거부됩니다(409).

## 시험

```
cd cloud && node test/factory_log.test.mjs
```
node 22 이상. D1은 `node:sqlite`, R2는 메모리로 흉내 냅니다(가짜 자료).
