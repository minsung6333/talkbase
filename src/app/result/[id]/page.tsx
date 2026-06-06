import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import ResultView from '@/components/result/ResultView'

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: recording } = await supabase
    .from('recordings')
    .select('*')
    .eq('id', id)
    .single()

  if (!recording) notFound()

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ResultView recording={recording} />
      </main>
    </>
  )
}
