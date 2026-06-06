const RTZR_API = 'https://openapi.vito.ai'

interface RtzrToken {
  access_token: string
  expire_at: number
}

let cachedToken: RtzrToken | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expire_at > Date.now() / 1000 + 60) {
    return cachedToken.access_token
  }

  const res = await fetch(`${RTZR_API}/v1/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.RTZR_CLIENT_ID!,
      client_secret: process.env.RTZR_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) throw new Error('RTZR 인증 실패')
  cachedToken = await res.json()
  return cachedToken!.access_token
}

export async function submitTranscription(
  audioUrl: string,
  options?: { speakerCount?: number }
): Promise<string> {
  const token = await getAccessToken()

  // 참석자 수가 지정되면 정확한 수로, 아니면 자동 감지(0)
  // RTZR 사양: spk_count_min/max 또는 단일 spk_count
  const spkCount = options?.speakerCount && options.speakerCount > 0
    ? options.speakerCount
    : 0

  const res = await fetch(`${RTZR_API}/v1/transcribe`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: {
        model_name: 'sommers',
        use_diarization: true,
        diarization: {
          spk_count: spkCount,                       // 0 = 자동
          ...(spkCount > 0 ? {
            spk_count_min: spkCount,
            spk_count_max: spkCount,
          } : {}),
        },
        use_itn: true,
        use_disfluency_filter: true,
        use_paragraph_splitter: true,
        paragraph_splitter: { min: 10, max: 50 },
      },
      url: audioUrl,
    }),
  })

  if (!res.ok) throw new Error(`STT 요청 실패: ${res.status}`)
  const data = await res.json()
  return data.id
}

export async function getTranscriptionResult(jobId: string) {
  const token = await getAccessToken()

  const res = await fetch(`${RTZR_API}/v1/transcribe/${jobId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!res.ok) throw new Error(`STT 결과 조회 실패: ${res.status}`)
  return res.json()
}
