export const dynamic = 'force-dynamic'

import Header from '@/components/layout/Header'
import HomeDashboard from '@/components/home/HomeDashboard'

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <HomeDashboard />
      </main>
    </>
  )
}
