export type RecordingType = 'team_meeting' | 'client_meeting' | 'one_on_one' | 'other'
export type Visibility = 'team' | 'private'
export type OutputFormat = 'minutes' | 'summary'
export type ProcessingStatus = 'uploading' | 'stt_pending' | 'stt_processing' | 'speaker_mapping' | 'ai_processing' | 'saving' | 'completed' | 'failed'

export interface Recording {
  id: string
  user_id: string
  title: string
  type: RecordingType
  visibility: Visibility
  output_format: OutputFormat
  status: ProcessingStatus
  duration_seconds?: number
  file_key: string          // Cloudflare R2 key
  file_url?: string         // R2 signed URL
  stt_result?: SttResult[]
  ai_result?: string        // 회의록 or 요약 markdown
  notion_page_url?: string
  rtzr_job_id?: string
  speaker_map?: Record<string, string>  // { "화자1": "홍길동" }
  share_token?: string | null
  share_enabled?: boolean
  created_at: string
  updated_at: string
  user?: {
    email: string
    full_name?: string
    avatar_url?: string
  }
}

export interface SttResult {
  speaker: string           // "화자1", "화자2" → 이름 매핑 후 "홍길동"
  start_at: number          // 초 단위 (예: 134.5)
  duration: number
  text: string
}

export interface TeamMember {
  id: string
  user_id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: 'admin' | 'member'
  invited_at: string
  joined_at?: string
}

export interface Invite {
  id: string
  email: string
  token: string
  invited_by: string
  expires_at: string
  used: boolean
}
