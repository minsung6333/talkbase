# TalkBase

> 녹음된 대화를 업무 지식으로 바꾸다

갤럭시 폰 등에서 녹음한 m4a 파일을 업로드하면 자동으로 STT, 화자 분리, AI 회의록·요약 생성, Notion 저장, 이메일 발송까지 해주는 팀용 웹앱.

## 기능

- 🎙 m4a/mp3/wav 업로드 (최대 2GB, 4시간)
- ✍️ STT + 화자 분리 (리턴제로 RTZR · 한국어 CER 5.91%)
- 👤 화자 이름 매핑
- ✨ GPT 기반 회의록/요약 생성
- 📝 직접 편집 + AI 편집 + 재생성
- 🎯 타임스탬프 클릭 → 해당 구간 재생
- 📂 Google Drive 스타일 폴더 관리 (팀 공유 / 개인 공간)
- 🔍 통합 검색 (제목 · STT 전문 · AI 결과물)
- 📨 결과물 이메일 발송
- 🔗 Notion 페이지 자동 생성
- 📱 PWA 지원 (홈 화면 설치 가능)

## 기술 스택

- **프론트엔드**: Next.js 16 (App Router) + TailwindCSS + TypeScript
- **인증/DB**: Supabase (PostgreSQL + Auth)
- **저장소**: Cloudflare R2 (S3 호환)
- **STT**: 리턴제로 RTZR (Sommers 모델)
- **AI**: OpenAI GPT-4o
- **이메일**: 네이버 웍스 SMTP (Nodemailer)
- **외부 연동**: Notion API

## 환경 변수

`.env.local`에 아래 값들이 필요합니다.

```env
# App
NEXT_PUBLIC_APP_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# 리턴제로
RTZR_CLIENT_ID=
RTZR_CLIENT_SECRET=

# OpenAI
OPENAI_API_KEY=

# Notion
NOTION_API_KEY=
NOTION_DATABASE_ID=

# 네이버 웍스 SMTP
WORKS_SMTP_HOST=smtp.worksmobile.com
WORKS_SMTP_PORT=465
WORKS_SMTP_USER=
WORKS_SMTP_PASSWORD=
WORKS_SMTP_FROM=
```

## 개발

```bash
npm install
npm run dev
```

## 배포

Vercel에 배포됩니다. 모든 환경 변수를 Vercel 대시보드에 등록해야 합니다.

자세한 내용은 [PRD.md](./PRD.md) 참조.
