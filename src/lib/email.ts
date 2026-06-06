import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.WORKS_SMTP_HOST,
  port: Number(process.env.WORKS_SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.WORKS_SMTP_USER,
    pass: process.env.WORKS_SMTP_PASSWORD,
  },
})

export async function sendResultEmail(
  to: string,
  title: string,
  aiResult: string,
  notionUrl: string
) {
  const subject = `✅ [${title}] 회의록이 완성되었습니다`

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1a1a1a;">

  <div style="background: #EEF2FF; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
    <h1 style="margin: 0; font-size: 18px; color: #3730A3;">✅ ${title}</h1>
    <p style="margin: 6px 0 0; color: #6366F1; font-size: 14px;">회의록이 완성되었습니다</p>
  </div>

  <div style="background: #F9FAFB; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
    <pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.7; margin: 0; color: #374151;">${aiResult}</pre>
  </div>

  <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; display: flex; gap: 12px;">
    <a href="${notionUrl}"
       style="display: inline-block; background: #1a1a1a; color: white; text-decoration: none;
              padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;">
      📎 Notion에서 보기
    </a>
  </div>

  <p style="margin-top: 24px; font-size: 12px; color: #9CA3AF;">
    AI 회의록 메이커 · 자동 발송 메일입니다
  </p>
</body>
</html>`

  await transporter.sendMail({
    from: `"TalkBase" <${process.env.WORKS_SMTP_FROM}>`,
    to,
    subject,
    html,
  })
}

export async function sendAccessRequestEmail(data: {
  name: string
  email: string
  company?: string
  role?: string
  purpose?: string
}) {
  const subject = `[TalkBase 사용 요청] ${data.name}${data.company ? ` (${data.company})` : ''}`

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #0F172A; background: #ffffff;">

  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 28px;">
    <div style="width: 28px; height: 28px; background: #1A60FD; border-radius: 6px;"></div>
    <span style="font-size: 14px; font-weight: 700; color: #94A3B8;">TalkBase · 사용 요청</span>
  </div>

  <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 24px;">
    🙋 새로운 사용 요청이 들어왔어요
  </h1>

  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr><td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; color: #64748B; width: 110px;">이름</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; font-weight: 600;">${escapeHtml(data.name)}</td></tr>
    <tr><td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; color: #64748B;">이메일</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0;">
          <a href="mailto:${escapeHtml(data.email)}" style="color: #1A60FD; text-decoration: none;">${escapeHtml(data.email)}</a>
        </td></tr>
    ${data.company ? `<tr><td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; color: #64748B;">소속</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0;">${escapeHtml(data.company)}</td></tr>` : ''}
    ${data.role ? `<tr><td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0; color: #64748B;">직책</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0;">${escapeHtml(data.role)}</td></tr>` : ''}
    ${data.purpose ? `<tr><td style="padding: 12px 0; color: #64748B; vertical-align: top;">사용 목적</td>
        <td style="padding: 12px 0; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(data.purpose)}</td></tr>` : ''}
  </table>

  <div style="margin-top: 32px; padding: 16px; background: #EFF4FF; border-radius: 12px;">
    <p style="margin: 0; font-size: 13px; color: #1E40AF;">
      💡 관리자 페이지에서 이 이메일(<strong>${escapeHtml(data.email)}</strong>)을 초대하면 사용 가능해요.
    </p>
  </div>

  <p style="margin-top: 28px; font-size: 12px; color: #94A3B8;">TalkBase · 자동 발송 메일입니다</p>
</body>
</html>`

  await transporter.sendMail({
    from: `"TalkBase" <${process.env.WORKS_SMTP_FROM}>`,
    to: 'msseo@clabi.ai',
    replyTo: data.email,
    subject,
    html,
  })
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export async function sendInviteEmail(
  to: string,
  inviterName: string,
  appUrl: string
) {
  const subject = `🎉 ${inviterName}님이 TalkBase로 초대했어요`

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #0F172A; background: #ffffff;">

  <!-- 헤더 -->
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 36px;">
    <div style="width: 36px; height: 36px; background: #1A60FD; border-radius: 8px;"></div>
    <span style="font-size: 18px; font-weight: 700; color: #0F172A;">TalkBase</span>
  </div>

  <!-- 메인 -->
  <h1 style="font-size: 26px; font-weight: 700; margin: 0 0 16px; line-height: 1.3;">
    🎉 ${inviterName}님이<br/>
    TalkBase로 초대했어요
  </h1>

  <p style="font-size: 15px; line-height: 1.7; color: #475569; margin: 0 0 28px;">
    안녕하세요!<br/>
    <strong style="color: #0F172A;">${inviterName}</strong>님이 TalkBase 팀원으로 초대했습니다.
  </p>

  <!-- 카드 -->
  <div style="background: linear-gradient(135deg, #EFF4FF 0%, #F8FAFC 100%); border-radius: 16px; padding: 24px; margin-bottom: 28px;">
    <p style="font-size: 14px; font-weight: 700; color: #1A60FD; margin: 0 0 6px;">✨ TalkBase로 할 수 있는 일</p>
    <ul style="font-size: 14px; line-height: 1.8; color: #475569; margin: 0; padding-left: 20px;">
      <li>회의 녹음을 올리면 자동으로 회의록 작성</li>
      <li>화자별 발언 정리 + 액션 아이템 추출</li>
      <li>팀 폴더에 모아두고 검색</li>
    </ul>
  </div>

  <!-- CTA -->
  <div style="text-align: center; margin: 36px 0;">
    <a href="${appUrl}/login"
       style="display: inline-block; background: #1A60FD; color: white; text-decoration: none;
              padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600;">
      지금 시작하기 →
    </a>
    <p style="font-size: 13px; color: #94A3B8; margin: 16px 0 0;">
      이 이메일 주소의 Google 계정으로 로그인해주세요
    </p>
  </div>

  <!-- 푸터 -->
  <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 36px 0 20px;" />
  <p style="font-size: 12px; color: #94A3B8; line-height: 1.6; margin: 0;">
    이 초대를 원하지 않으시면 이 메일을 무시하시면 돼요.<br/>
    TalkBase · 녹음된 대화를 업무 지식으로 바꾸다
  </p>
</body>
</html>`

  await transporter.sendMail({
    from: `"TalkBase" <${process.env.WORKS_SMTP_FROM}>`,
    to,
    subject,
    html,
  })
}
