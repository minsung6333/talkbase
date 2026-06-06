export const dynamic = 'force-dynamic'

import Header from '@/components/layout/Header'
import ProfileForm from '@/components/profile/ProfileForm'

export default function ProfilePage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">프로필</h1>
        <ProfileForm />
      </main>
    </>
  )
}
