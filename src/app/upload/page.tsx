export const dynamic = 'force-dynamic'

import Header from '@/components/layout/Header'
import UploadForm from '@/components/upload/UploadForm'

export default function UploadPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">녹음 파일 업로드</h1>
          <p className="text-gray-500 mt-1 text-sm">
            갤럭시 녹음 파일(m4a)을 올리면 회의록 또는 요약을 자동으로 만들어드려요
          </p>
        </div>
        <UploadForm />
      </main>
    </>
  )
}
