export const dynamic = 'force-dynamic'

import WorkspaceList from '@/components/workspaces/WorkspaceList'
import TalkBaseLogo from '@/components/ui/TalkBaseLogo'

export default function WorkspacesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">
      <header className="px-6 py-5 flex items-center">
        <TalkBaseLogo variant="wordmark" size={26} />
      </header>

      <main className="max-w-2xl mx-auto px-5 sm:px-6 py-8 sm:py-12">
        <WorkspaceList />
      </main>
    </div>
  )
}
