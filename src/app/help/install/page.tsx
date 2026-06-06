'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Smartphone, Apple, Share, Plus, MoreVertical, Check } from 'lucide-react'
import TalkBaseLogo from '@/components/ui/TalkBaseLogo'

type Tab = 'ios' | 'android'

export default function InstallGuidePage() {
  const [tab, setTab] = useState<Tab>('ios')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> 뒤로
          </Link>
          <Link href="/" className="flex items-center font-bold text-gray-900">
            <TalkBaseLogo variant="icon" size={28} />
            <span className="tracking-tight text-sm -ml-1">TalkBase</span>
          </Link>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* 인트로 */}
        <div className="text-center mb-10">
          <div className="inline-flex w-14 h-14 bg-blue-50 rounded-2xl items-center justify-center mb-4">
            <Smartphone className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">앱처럼 사용하기</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            TalkBase는 PWA(Progressive Web App)로 만들어졌어요.<br />
            홈 화면에 추가하면 일반 앱처럼 사용할 수 있어요.
          </p>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6 max-w-xs mx-auto">
          <button
            onClick={() => setTab('ios')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === 'ios' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Apple className="w-4 h-4" /> iPhone
          </button>
          <button
            onClick={() => setTab('android')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === 'android' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Smartphone className="w-4 h-4" /> 갤럭시 / 안드로이드
          </button>
        </div>

        {/* iOS 가이드 */}
        {tab === 'ios' && (
          <div className="space-y-4">
            <Note color="orange">
              <strong>중요:</strong> iPhone은 <strong>Safari</strong>에서만 설치 가능해요. 크롬·네이버앱 등으로 접속했다면 Safari로 다시 열어주세요.
            </Note>

            <Step n={1} title="Safari로 TalkBase 접속">
              주소창에 <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">talkbase-navy.vercel.app</span> 입력 또는 받은 링크 열기
            </Step>

            <Step n={2} title="공유 버튼 누르기">
              화면 하단의 <Share className="w-4 h-4 inline mx-0.5 text-blue-500" /> 공유 버튼을 누르세요
            </Step>

            <Step n={3} title="“홈 화면에 추가” 선택">
              메뉴를 아래로 스크롤하면 <Plus className="w-4 h-4 inline mx-0.5 text-blue-500" /> <strong>홈 화면에 추가</strong>가 있어요
            </Step>

            <Step n={4} title="추가 완료">
              우측 상단 <strong>추가</strong> 누르면 홈 화면에 TalkBase 아이콘이 생성돼요
            </Step>

            <div className="bg-blue-50 rounded-2xl p-5 mt-6">
              <h3 className="font-semibold text-blue-900 text-sm mb-2">✨ 앱으로 사용하면 좋은 점</h3>
              <ul className="text-sm text-blue-700 space-y-1 ml-1">
                <li>• 사파리 주소창 없이 풀스크린으로 사용</li>
                <li>• 홈 화면에서 바로 실행</li>
                <li>• 자동 로그인 유지 (브라우저보다 안정적)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Android 가이드 */}
        {tab === 'android' && (
          <div className="space-y-4">
            <Note color="blue">
              <strong>크롬 권장:</strong> 가장 안정적으로 사용할 수 있어요. 삼성 인터넷도 가능합니다.
            </Note>

            <Step n={1} title="크롬으로 TalkBase 접속">
              주소창에 <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">talkbase-navy.vercel.app</span> 입력
            </Step>

            <Step n={2} title="설치 안내가 자동으로 뜨면">
              하단 또는 상단에 <strong>설치 안내</strong>가 자동으로 나타나요. <strong>설치하기</strong>를 누르세요.
            </Step>

            <Step n={3} title="안내가 안 뜨면 수동 설치">
              우측 상단 <MoreVertical className="w-4 h-4 inline mx-0.5 text-gray-600" /> 메뉴 클릭 →{' '}
              <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong> 선택
            </Step>

            <Step n={4} title="설치 완료">
              잠시 기다리면 홈 화면에 TalkBase 아이콘이 생성돼요. 앱처럼 실행할 수 있어요.
            </Step>

            <div className="bg-blue-50 rounded-2xl p-5 mt-6">
              <h3 className="font-semibold text-blue-900 text-sm mb-2">✨ 앱으로 사용하면 좋은 점</h3>
              <ul className="text-sm text-blue-700 space-y-1 ml-1">
                <li>• 주소창 없이 풀스크린으로 사용</li>
                <li>• 홈 화면에서 바로 실행</li>
                <li>• 앱 서랍에서도 검색 가능</li>
                <li>• 자동 로그인 유지</li>
              </ul>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-12 space-y-3">
          <h2 className="text-lg font-bold text-gray-900 mb-4">자주 묻는 질문</h2>
          <Faq q="설치하지 않고 브라우저에서만 써도 되나요?">
            네, 브라우저에서도 모든 기능을 사용할 수 있어요. 다만 설치하면 매번 주소를 입력하지 않아도 되고 화면이 더 넓어요.
          </Faq>
          <Faq q="iPhone에서 크롬으로 설치할 수 없나요?">
            iOS의 정책상 PWA 설치는 Safari에서만 가능해요. 크롬으로 사용은 가능하지만 홈 화면 추가는 Safari로 해주세요.
          </Faq>
          <Faq q="녹음 파일은 어디서 올리나요?">
            갤럭시 녹음앱에서 만들어진 m4a 파일을 그대로 업로드할 수 있어요. 공유 → TalkBase 또는 파일 선택으로요.
          </Faq>
        </div>

        {/* 푸터 */}
        <div className="text-center mt-12 pb-12">
          <Link href="/login" className="text-sm text-blue-600 hover:underline">
            로그인 화면으로 돌아가기 →
          </Link>
        </div>
      </main>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
          {n}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  )
}

function Note({ color, children }: { color: 'orange' | 'blue'; children: React.ReactNode }) {
  const styles = color === 'orange'
    ? 'bg-orange-50 text-orange-800 border-orange-100'
    : 'bg-blue-50 text-blue-800 border-blue-100'
  return (
    <div className={`${styles} border rounded-2xl px-4 py-3 text-sm`}>
      {children}
    </div>
  )
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="bg-white rounded-2xl border border-gray-100 p-4 group">
      <summary className="font-medium text-gray-900 text-sm cursor-pointer flex items-center gap-2 list-none">
        <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
        {q}
      </summary>
      <p className="text-sm text-gray-500 mt-3 pl-6 leading-relaxed">{children}</p>
    </details>
  )
}
