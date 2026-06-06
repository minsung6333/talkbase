import OpenAI from 'openai'
import type { SttResult, OutputFormat } from '@/types'
import { TEMPLATES, type TemplateId } from './templates'

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

  // 회의 길이 기반 분량 가이드
  const durationSec = sttResult.length > 0
    ? sttResult[sttResult.length - 1].start_at + (sttResult[sttResult.length - 1].duration || 0)
    : 0
  const durationMin = Math.round(durationSec / 60)

  let lengthGuide = ''
  let maxTokens = 2000
  if (durationMin <= 20) {
    lengthGuide = '간결하게 핵심만 (300~500자 정도).'
    maxTokens = 1500
  } else if (durationMin <= 60) {
    lengthGuide = '표준 분량 (1000~1500자, 각 섹션 4~6개 항목).'
    maxTokens = 3000
  } else if (durationMin <= 120) {
    lengthGuide = '상세 분량 (2000~3000자, 각 섹션 6~10개 항목, 시간대별 흐름 포함).'
    maxTokens = 5000
  } else {
    lengthGuide = '매우 상세하게 (3500자 이상, 각 섹션 10개 이상, 시간대별 흐름과 주제 전환 명확히, 중요 인용구 포함).'
    maxTokens = 8000
  }

  // 템플릿 조회 (없으면 회의록 폴백)
  const template = TEMPLATES[outputFormat as TemplateId] || TEMPLATES.minutes
  const systemPrompt = template.systemPromptBuilder(durationMin, lengthGuide)

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
    max_tokens: maxTokens,
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
