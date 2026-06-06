export const dynamic = 'force-dynamic'

import Header from '@/components/layout/Header'
import DriveView from '@/components/history/DriveView'

export default function HistoryPage() {
  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <DriveView />
      </main>
    </>
  )
}
