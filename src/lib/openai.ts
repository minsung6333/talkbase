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
    one_on_one: '1:1 면담',
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

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
