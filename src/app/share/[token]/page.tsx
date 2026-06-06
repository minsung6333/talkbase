import { createClient as createAdmin } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import SharedView from '@/components/result/SharedView'
import TalkBaseLogo from '@/components/ui/TalkBaseLogo'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: recording } = await db
    .from('recordings')
    .select('id, title, type, output_format, ai_result, stt_result, created_at, share_token, share_enabled')
    .eq('share_token', token)
    .single()

  if (!recording || !recording.share_enabled) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 배너 */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center font-bold text-gray-900">
            <TalkBaseLogo variant="icon" size={36} />
            <span className="tracking-tight text-base -ml-1">TalkBase</span>
          </Link>
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
            🔒 읽기 전용 공유
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <SharedView recording={recording} shareToken={token} />
      </main>
    </div>
  )
}
