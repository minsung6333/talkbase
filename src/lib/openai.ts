import OpenAI from 'openai'
import type { SttResult, OutputFormat } from '@/types'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateAiResult(
  sttResult: SttResult[],
  outputFormat: OutputFormat,
  title: string,
  recordingType: string,
  date: string,
  customPrompt?: string
): Promise<string> {
  const transcript = sttResult
    .map(u => `[${formatTime(u.start_at)}] ${u.speaker}: ${u.text}`)
    .join('\n')

  const typeLabel: Record<string, string> = {
    team_meeting: '팀 회의',
    client_meeting: '고객 미팅',
    phone_call: '통화',
    other: '기타',
  }

  const systemPrompt = outputFormat === 'minutes'
    ? `당신은 전문 회의록 작성자입니다. 주어진 음성 전사 내용을 바탕으로 체계적인 회의록을 작성하세요.
회의록은 반드시 다음 형식으로 작성하세요:

📋 회의록

일시: {날짜}
유형: {유형}
참석자: {화자 목록}

📌 안건
- (논의된 주요 안건들)

💬 주요 내용
(화자별 핵심 발언 요약)

✅ 결정사항
- (회의에서 결정된 사항들)

📌 액션아이템
- [ ] 담당자: 업무내용 (기한이 언급된 경우 기재)`
    : `당신은 전문 요약 작성자입니다. 주어진 음성 전사 내용을 바탕으로 핵심 요약을 작성하세요.
요약은 반드시 다음 형식으로 작성하세요:

📝 요약

핵심 요약
- (3줄 이내로 핵심 내용)

주요 논의사항
(중요하게 논의된 내용)

결론
(최종 결론 및 다음 단계)`

  const userPrompt = `제목: ${title}
날짜: ${date}
유형: ${typeLabel[recordingType] || recordingType}
${customPrompt ? `\n추가 지시사항: ${customPrompt}` : ''}
[음성 전사 내용]
${transcript}`

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  })

  return response.choices[0].message.content || ''
}

export async function generateReport(
  sttResult: SttResult[],
  title: string,
  recordingType: string,
  date: string,
  options: {
    addressee: string         // 수신 호칭 (예: "부서장님")
    senderName: string        // 발신자 이름
    customPrompt?: string     // 추가 지시사항
    shareUrl?: string         // 공유 링크 (옵션)
  }
): Promise<string> {
  const transcript = sttResult
    .map(u => `[${formatTime(u.start_at)}] ${u.speaker}: ${u.text}`)
    .join('\n')

  const typeLabel: Record<string, string> = {
    team_meeting: '팀 회의',
    client_meeting: '고객 미팅',
    phone_call: '통화',
    other: '기타',
  }

  const systemPrompt = `당신은 비즈니스 회의 보고서 작성자입니다.
주어진 회의 내용을 바탕으로 상사 보고용 이메일 보고서를 작성하세요.

🎯 작성 원칙:
1. 화자별로 누가 무슨 말을 했는지 정리하지 마세요. (X "홍길동: ~을 말함")
2. 논의된 내용을 자연스러운 흐름으로 통합해서 풀어쓰세요.
3. 격식 있는 보고체 사용: "~함", "~예정임", "~하기로 함", "~검토함", "~제안함"
4. 결정 사항과 후속 조치를 명확히 구분하세요.
5. 핵심만 간결하게. 불필요한 세부사항은 생략.
6. 이모지는 사용하지 마세요. 섹션 구분은 ■ 마크만 사용.
7. 마치 부서 회의 끝나고 정리해서 보고하는 톤으로.

📋 출력 형식 (반드시 이대로):
[프로젝트명/주제] {회의명} 결과 보고

{수신 호칭},

오늘 진행된 {회의명} 결과를 다음과 같이 보고드립니다.

■ 회의 개요
- 일시: {날짜}
- 참석: {참석자 명단}

■ 주요 논의 내용
- (논의된 내용을 흐름으로 정리, 화자 구분 없이, 각 항목 1줄로)
- ...

■ 결정 사항
1. (결정된 사항)
2. ...

■ 후속 조치
- {담당자}: {할 일} (기한이 있으면 ~{기한}, 없으면 생략)
- ...

{공유 링크가 있는 경우} 상세 회의록은 아래 링크 참고 부탁드립니다.
🔗 {공유 링크}

감사합니다.
{발신자 이름} 드림`

  const userPrompt = `회의 정보:
- 회의명: ${title}
- 날짜: ${date}
- 유형: ${typeLabel[recordingType] || recordingType}

작성 옵션:
- 수신 호칭: ${options.addressee}
- 발신자 이름: ${options.senderName}
${options.shareUrl ? `- 공유 링크: ${options.shareUrl}` : '- 공유 링크: 없음 (해당 섹션 생략)'}
${options.customPrompt ? `- 추가 요청: ${options.customPrompt}` : ''}

[회의 전사 내용]
${transcript}`

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  })

  return response.choices[0].message.content || ''
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
