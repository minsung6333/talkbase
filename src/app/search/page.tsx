export const dynamic = 'force-dynamic'

import Header from '@/components/layout/Header'
import SearchView from '@/components/search/SearchView'

export default function SearchPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <SearchView />
      </main>
    </>
  )
}
