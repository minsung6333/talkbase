# Continue — TalkBase 작업 인계 (2026-06-06, Step 2 완료 시점)

> **새로 합류한 Claude에게:** 이 파일은 이전 세션의 모든 맥락을 담고 있습니다.
> 읽고 나서 곧바로 **워크스페이스 시스템 구현 Step 3 (헤더 워크스페이스 전환 드롭다운)** 부터 시작하세요.

---

## 🎯 미션

**TalkBase** — 녹음된 회의를 업무 지식으로 바꿔주는 SaaS.
**멀티 테넌트(워크스페이스 시스템)** 으로 확장 작업 중. Step 1~2 완료, Step 3부터 진행.

- 사용자가 본인 회의(clabi 내부) + 친구들 모임 + 외부 사용자도 사용 가능해야 함
- 단일 팀 모델 → **워크스페이스 기반** 으로 전환

---

## 👤 사용자 정보

- **이름**: 서민성 (sq15330@gmail.com)
- **소속**: clabi (개인 사업, 도메인 clabi.ai)
- **언어**: 한국어
- **OS**: Windows + Git Bash
- **현재 어드민 계정**: sq15330@gmail.com

**중요한 사용자 선호 사항**:
1. **배포 빈도** — 작은 변경마다 푸시하지 말고, **의미 있는 단위로 모아서** 배포. 사용자가 명시적으로 "배포하자" / "푸시하자" 라고 할 때만 git push.
2. **변경 사항 추적** — 작업할 때 "지금 미배포 변경: A, B, C" 식으로 알려주기.
3. **솔직한 의견** — 잘못된 방향 가면 직접 지적.
4. **간결한 보고** — 코드 변경 후 무엇이 바뀌었는지 짧게 정리.
5. **이모지 사용 OK**.

---

## 🏗 인프라 & 환경

### 배포
- **Production URL**: https://talkbase-navy.vercel.app
- **GitHub**: https://github.com/minsung6333/talkbase
- **Branch**: main (직접 푸시 → Vercel 자동 배포)
- **Vercel Plan**: **Pro** ($20/월)
- **Vercel Region**: icn1 (Seoul)

### 외부 서비스
- **Supabase** (서울 리전): Auth + PostgreSQL + RLS
- **Vercel Blob Storage** (Seoul ICN1): 녹음 파일 저장
  - 환경변수: BLOB_READ_WRITE_TOKEN, BLOB_STORE_ID, BLOB_WEBHOOK_PUBLIC_KEY
- **리턴제로 (RTZR)** STT: Sommers 모델
- **OpenAI** GPT-4o
- **Notion API**
- **네이버 웍스 SMTP**: hello@clabi.ai 발신

### ❗ R2는 떠났음
이전에 Cloudflare R2 사용했으나 CORS preflight 차단 문제로 **2026-06-06 Vercel Blob으로 완전 마이그레이션**. R2 관련 코드/환경변수 모두 제거됨.

---

## ✅ 워크스페이스 시스템 진행 상황

### Step 1: DB 스키마 + 마이그레이션 SQL ✅ **완료**

사용자가 Supabase SQL Editor에서 실행 완료. 다음이 적용된 상태:

- `workspaces` 테이블 생성 (id, name, slug, created_by, created_at)
- `workspace_members` 테이블 생성 (워크스페이스 단위 멤버십)
- `projects.workspace_id`, `recordings.workspace_id` 컬럼 추가 (NOT NULL)
- 기존 데이터 마이그레이션: "clabi" 워크스페이스 자동 생성, 모든 기존 데이터를 거기로 옮김
- 서민성(sq15330@gmail.com) → owner
- 기존 admin → admin / member → member (역할 유지)
- RLS 정책: 본인이 멤버인 워크스페이스만 보임

**참고: 옛날 `team_members` 테이블은 아직 살아있음 (Step 7에서 정리 예정).**

### Step 2: lib/workspace.ts + 미들웨어 + API + /workspaces 페이지 ✅ **완료**

새로 추가/수정된 파일:

**신규**:
- `src/lib/workspace.ts` — 헬퍼 함수 묶음
  - `WORKSPACE_COOKIE` = `'tb_workspace_id'`
  - `WORKSPACE_COOKIE_MAX_AGE` = 1년
  - `WorkspaceRole` = `'owner' | 'admin' | 'member'`
  - `getCurrentWorkspaceId()` — 쿠키에서 ID 읽기
  - `resolveCurrentWorkspace()` — 쿠키 검증 + 멤버 fallback
  - `getUserWorkspaces(userId)` — 사용자가 속한 모든 워크스페이스 + 역할
  - `getWorkspaceRole(workspaceId, userId)` — 특정 워크스페이스에서의 역할
  - `requireRole(current, required)` — 권한 부족 시 throw
  - `generateSlug(name)`, `generateUniqueSlug(name)` — URL용 slug 생성
- `src/app/api/workspaces/route.ts`
  - `GET` — 사용자 워크스페이스 목록 (역할 포함) + 현재 활성 ID
  - `POST` — 새 워크스페이스 생성 (생성자는 자동 owner, 쿠키 자동 설정)
- `src/app/api/workspaces/switch/route.ts`
  - `POST` — 워크스페이스 전환 (멤버십 검증 + 쿠키 변경)
- `src/app/workspaces/page.tsx` — 워크스페이스 목록 + 만들기 페이지
- `src/components/workspaces/WorkspaceList.tsx` — UI 컴포넌트 (목록, 전환, 생성)

**수정**:
- `src/lib/supabase/middleware.ts`
  - 워크스페이스 컨텍스트 자동 검증 추가
  - 로그인은 됐지만 워크스페이스 없으면 `/workspaces`로 리다이렉트
  - 쿠키 ID가 유효하지 않으면 사용자의 첫 워크스페이스로 fallback + 쿠키 자동 설정
  - 면제 경로: `/workspaces`, `/profile`, `/api/workspaces/*`, `/api/me`, `/api/profile`, 기존 공개 경로

### 동작 흐름 (현재)

1. **로그인 후** → 미들웨어가 쿠키 확인
2. **쿠키 무효** → 사용자의 첫 워크스페이스 자동 설정 (대부분 clabi)
3. **워크스페이스 없음** → `/workspaces`로 리다이렉트
4. **/workspaces 페이지** → 목록 + 새로 만들기
5. **전환** → `/api/workspaces/switch` 호출 → 쿠키 변경 → `/`로 이동

### 빌드 상태
✅ `npm run build` 통과 확인 (Step 2 끝 시점)

---

## 🚧 다음 작업 — Step 3부터

### Step 3: 헤더에 워크스페이스 전환 드롭다운 ⬅️ **여기서 시작**

**파일**: `src/components/layout/Header.tsx`

목표:
- 좌상단 로고 옆에 현재 워크스페이스명 표시 (드롭다운 트리거)
- 클릭하면 사용자가 속한 워크스페이스 목록 표시
- 각 항목 옆에 역할 아이콘 (Crown/Shield/User)
- 맨 아래 [+ 새 워크스페이스 만들기] 링크 (`/workspaces`로 이동)
- 선택 시 `/api/workspaces/switch` 호출 후 페이지 새로고침

힌트:
- `/api/workspaces` GET으로 목록 + 현재 ID 가져오기
- 현재 워크스페이스 이름은 sessionStorage에 캐싱하여 깜박임 방지 (기존 isAdmin 패턴 참고)
- 모바일에서는 헤더 가로 공간 부족 가능 → 줄임표 처리
- 컴포넌트 `Modal`을 재사용해도 좋고, 헤더 내 드롭다운으로 처리해도 됨

### Step 4: 모든 데이터 API에 `workspace_id` 필터링

목표:
- 현재 워크스페이스의 데이터만 보이도록 모든 API 수정
- `lib/workspace.ts`의 `resolveCurrentWorkspace()` 사용

수정 대상 파일:
- `src/app/api/home/route.ts` — 홈 대시보드 (recentRecordings, projects)
- `src/app/api/recordings/list/route.ts` — 보관함
- `src/app/api/search/route.ts` — 검색
- `src/app/api/projects/route.ts` (GET, POST) — 폴더 목록 + 생성 시 workspace_id 부여
- `src/app/api/projects/[id]/route.ts` — 폴더 수정/삭제
- `src/app/api/upload-blob-complete/route.ts` — 새 recording에 workspace_id 부여
- `src/app/api/recordings/[id]/move/route.ts` — 폴더 이동
- 그 외 `recordings` 또는 `projects` 조회하는 모든 라우트

수정 패턴:
```typescript
import { resolveCurrentWorkspace } from '@/lib/workspace'

const { workspaceId } = await resolveCurrentWorkspace()
if (!workspaceId) {
  return NextResponse.json({ error: '워크스페이스가 필요해요' }, { status: 403 })
}

// 모든 쿼리에 .eq('workspace_id', workspaceId) 추가
// INSERT 시에는 workspace_id 컬럼에 값 주입
```

### Step 5: `/workspaces/[id]/settings` 페이지

목표:
- 기존 `/admin` 기능 흡수 + 워크스페이스 자체 관리
- 멤버 초대/삭제 + 역할 변경
- 워크스페이스 이름 변경
- 워크스페이스 삭제 (Owner만)
- 본인 탈퇴

수정 사항:
- `src/app/admin/` 페이지 제거 → `/workspaces/[id]/settings`로
- `src/app/api/admin/invite/`, `/api/admin/members/`, `/api/admin/members/[id]/`를 워크스페이스 단위로 재작성
  - 예: `/api/workspaces/[id]/members/route.ts` (GET 목록, POST 초대)
  - 예: `/api/workspaces/[id]/members/[memberId]/route.ts` (DELETE, PATCH role)
- 헤더의 "관리" 메뉴 → 현재 워크스페이스 settings 링크

### Step 6: 초대 시스템 워크스페이스 단위로

목표:
- 초대 메일에 `workspace_id` (또는 토큰) 포함
- 클릭 시 자동으로 그 워크스페이스 멤버로 추가 + 쿠키 설정

수정 사항:
- `src/lib/email.ts`의 `sendInviteEmail()` — 워크스페이스 정보 받아서 본문 + 링크에 포함
- 초대 토큰 기반으로 가는 게 안전 (직접 ID 노출 X)
  - `workspace_invites` 테이블 신규 (token, workspace_id, email, expires_at)
  - `/invite?token=xxx` 페이지 추가
  - Google OAuth 콜백에서 처리하거나 별도 페이지
- 어드민 페이지에서 초대 → 새 시스템으로

### Step 7: 옛 `team_members` 정리

목표:
- `src/components/layout/Header.tsx` 등에서 옛 `team_members` 참조 제거
- `src/app/api/me/route.ts` — `team_members` → `workspace_members` 조회
- `src/app/auth/callback/route.ts` — 로그인 시 `team_members` 자동 등록 로직 → `workspace_members` 자동 등록
  - **주의**: 워크스페이스 없는 사용자 처리 (초대받은 적 없는 신규 사용자) — 어떻게 할지 결정 필요
  - 옵션 A: 신규 사용자는 워크스페이스 없이 가입 → `/workspaces`에서 만들거나 초대 기다림
  - 옵션 B: 자동으로 본인 이름의 워크스페이스 생성 (Notion 스타일)
  - **추천**: A안 (사용자가 의식적으로 선택)
- 모든 `team_members` 의존 코드 점검 및 제거/대체
- 마지막으로 SQL: `DROP TABLE team_members;` (사용자에게 안내)

### Step 8: 기존 `/api/admin/*` 라우트 정리

목표:
- `/api/admin/invite/`, `/api/admin/members/`, `/api/admin/members/[id]/` 제거
- 새 워크스페이스 API로 대체

---

## 📋 미배포 누적 변경사항 (커밋·푸시 대기 → **이제 푸시할 예정**)

> Step 2 끝 시점에 사용자가 "배포하자" 라고 명시했고, 이 continue.md 파일까지 함께 푸시.

1. `README.md` — 마지막 줄 `by clabi.ai` → `by 서민성` 변경
2. `continue.md` — 본 문서 (Step 2 완료 시점으로 업데이트)
3. **워크스페이스 시스템 Step 1~2 전체**:
   - `src/lib/workspace.ts` (신규)
   - `src/lib/supabase/middleware.ts` (수정)
   - `src/app/api/workspaces/route.ts` (신규)
   - `src/app/api/workspaces/switch/route.ts` (신규)
   - `src/app/workspaces/page.tsx` (신규)
   - `src/components/workspaces/WorkspaceList.tsx` (신규)

**커밋 메시지 권장**:
```
feat(workspace): 워크스페이스 시스템 도입 (Step 1~2)

- DB: workspaces, workspace_members 테이블 + projects/recordings에 workspace_id
- 기존 데이터 'clabi' 워크스페이스로 마이그레이션 (서민성 owner)
- lib/workspace.ts: 쿠키 기반 컨텍스트, 멤버십 검증, 역할 헬퍼
- 미들웨어: 로그인 + 워크스페이스 자동 검증 + fallback
- /workspaces 페이지: 목록 + 만들기 + 전환
- API: GET/POST /api/workspaces, POST /api/workspaces/switch

다음: Step 3 (헤더 워크스페이스 전환기) ~ Step 7 (team_members 정리)
```

---

## 📂 파일 구조 가이드

```
src/
├── app/
│   ├── page.tsx                # 홈 (Step 4에서 workspace_id 필터링 필요)
│   ├── upload/                 # 업로드 (Step 4)
│   ├── history/                # 보관함 (Step 4)
│   ├── search/                 # 검색 (Step 4)
│   ├── result/[id]/            # 결과 (그대로)
│   ├── processing/[id]/        # 처리 중 (그대로)
│   ├── profile/                # 프로필 (그대로, 워크스페이스 무관)
│   ├── admin/                  # ⚠️ Step 5에서 제거 예정
│   ├── workspaces/             # ⭐ Step 2 추가됨 — 목록 + 만들기
│   │   └── [id]/settings/      # ⚠️ Step 5에서 추가 예정
│   ├── login/                  # 로그인
│   ├── share/[token]/          # 공유 페이지 (워크스페이스 무관)
│   ├── help/                   # 도움말 (워크스페이스 무관)
│   ├── api/
│   │   ├── workspaces/         # ⭐ Step 2 추가됨
│   │   │   ├── route.ts        # GET, POST
│   │   │   └── switch/route.ts # POST 전환
│   │   ├── blob-upload/        # Vercel Blob 인증
│   │   ├── upload-blob-complete/  # 업로드 완료 (Step 4: workspace_id 부여)
│   │   ├── home/               # ⚠️ Step 4
│   │   ├── recordings/         # ⚠️ Step 4 (일부)
│   │   ├── projects/           # ⚠️ Step 4
│   │   ├── search/             # ⚠️ Step 4
│   │   ├── share/              # 공유 (그대로)
│   │   ├── help/               # 그대로
│   │   ├── admin/              # ⚠️ Step 5/8에서 제거
│   │   ├── me/                 # ⚠️ Step 7
│   │   ├── profile/            # 그대로
│   │   ├── access-request/     # 그대로
│   │   └── process/            # 그대로
│   ├── manifest.ts
│   ├── opengraph-image.tsx
│   └── layout.tsx
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # ⚠️ Step 3 워크스페이스 전환기 추가
│   │   └── ... (기타 layout)
│   ├── workspaces/             # ⭐ Step 2 추가됨
│   │   └── WorkspaceList.tsx
│   ├── upload/
│   │   ├── UploadForm.tsx      # Vercel Blob 업로드
│   │   ├── TemplatePicker.tsx  # 7개 템플릿 + 미리보기
│   │   └── ProcessingStatus.tsx
│   ├── result/
│   │   ├── ResultView.tsx
│   │   └── SharedView.tsx
│   ├── history/DriveView.tsx
│   ├── search/SearchView.tsx
│   ├── admin/AdminPanel.tsx    # ⚠️ Step 5에서 흡수
│   ├── profile/ProfileForm.tsx
│   └── ui/
│       ├── Modal.tsx
│       ├── TalkBaseLogo.tsx
│       ├── PWAInstallPrompt.tsx
│       └── ServiceWorkerRegister.tsx
├── lib/
│   ├── workspace.ts            # ⭐ Step 2 추가됨
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts       # ⭐ Step 2 수정됨
│   ├── rtzr.ts                 # STT (참석자 수 옵션 포함)
│   ├── openai.ts               # GPT (분량 자동 조절 + 템플릿 시스템)
│   ├── templates.ts            # 7개 템플릿 정의
│   ├── notion.ts
│   ├── email.ts
│   └── og/
└── types/index.ts              # Recording, TeamMember 등 (⚠️ Step 7에서 일부 정리)
```

---

## ⚠️ 주의 사항

### 변경하지 말 것
- **`PRD.md`** — 사용자가 직접 편집하는 문서
- **`src/lib/templates.ts`의 preview 필드** — 사용자에게 보여지는 실제 예시 텍스트. 변경 시 사용자 확인
- **`public/logo/*.svg`** — 사용자가 직접 디자인한 로고

### Vercel 환경변수
사용자가 직접 정리해야 할 R2 환경변수 (사용 안 함, 지워도 됨):
- R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL

### 코드 스타일
- TypeScript strict
- 한국어 주석/메시지 (코드 식별자는 영어)
- TailwindCSS 4
- 이모지 사용 OK
- `lucide-react` 아이콘 사용

### Next.js 16 + Turbopack 주의점
- `params`는 `Promise<{...}>` 형태 (await 필요)
- Client component에서는 `use(params)`
- Server component에서는 `await params`
- Route handlers (`route.ts`)는 `export const runtime`, `maxDuration` 명시 권장

### 배포 작업 방식
1. 변경 → `npm run build` 로컬 빌드 확인 (필수)
2. 빌드 성공해도 곧바로 push하지 말 것
3. 사용자에게 "지금 미배포 변경: X, Y, Z" 알림
4. 사용자가 "배포하자" / "푸시하자" / 큰 기능 완료 시점에 git add/commit/push

### 빌드 명령
```bash
cd "/c/Users/sms/code/stt ai/app"
npm run build
```

### 미들웨어 디버깅 팁
워크스페이스 컨텍스트가 꼬이는 경우:
1. 브라우저 쿠키에서 `tb_workspace_id` 확인
2. 잘못된 ID면 삭제 후 새로고침 → 미들웨어가 fallback으로 첫 워크스페이스 자동 설정
3. `/workspaces` 페이지에서 명시적으로 전환 가능

---

## 🎬 새 클로드의 다음 액션

1. **이 파일 전체를 읽기**
2. **사용자에게 인사**: "Step 2까지 푸시 완료된 상태로 인계받았어요. Step 3 (헤더 워크스페이스 전환기) 진행할게요."
3. **Step 3 작업 시작**: `src/components/layout/Header.tsx` 수정
4. **모든 작업 후 빌드 확인** (`npm run build`), 빌드 성공 시 사용자에게 미배포 변경 알림
5. **사용자가 "배포" 신호 줄 때까지 누적**

---

## 🔗 참고 링크

- **GitHub**: https://github.com/minsung6333/talkbase
- **Production**: https://talkbase-navy.vercel.app
- **Vercel Dashboard**: 사용자가 직접 접근
- **Supabase Dashboard**: 사용자가 직접 접근

---

작성: 2026-06-06 (Step 2 완료 시점)
다음 작업: Step 3 — 헤더 워크스페이스 전환기
