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

export async function submitTranscription(audioUrl: string): Promise<string> {
  const token = await getAccessToken()

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
        diarization: { spk_count: 0 },   // 0 = 자동 감지
        use_itn: true,                    // 역정규화 (숫자 등)
        use_disfluency_filter: true,      // 필러 제거 (어, 음)
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
