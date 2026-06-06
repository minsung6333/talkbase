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
    from: `"AI 회의록" <${process.env.WORKS_SMTP_FROM}>`,
    to,
    subject,
    html,
  })
}
