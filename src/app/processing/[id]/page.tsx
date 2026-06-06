import Header from '@/components/layout/Header'
import ProcessingStatus from '@/components/upload/ProcessingStatus'

export default async function ProcessingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <ProcessingStatus recordingId={id} />
      </main>
    </>
  )
}
