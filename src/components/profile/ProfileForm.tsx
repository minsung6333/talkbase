'use client'

import { useEffect, useState } from 'react'
import { Mail, User, Crown, Loader2, Check, Activity, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Profile {
  email?: string
  full_name?: string
  avatar_url?: string
  role?: 'admin' | 'member'
  notification_email?: string | null
}

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notificationEmail, setNotificationEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(p => {
      setProfile(p)
      setNotificationEmail(p.notification_email || '')
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSavedMessage('')
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationEmail }),
    })
    const data = await res.json()
    if (res.ok) {
      setSavedMessage(notificationEmail ? '✓ 수신 이메일이 저장됐어요' : '✓ 로그인 이메일로 발송돼요')
      setTimeout(() => setSavedMessage(''), 3000)
    } else {
      setSavedMessage(`❌ ${data.error}`)
    }
    setSaving(false)
  }

  if (!profile) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 계정 정보 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">계정</h2>
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              {profile.role === 'admin' && <Crown className="w-4 h-4 text-yellow-500" />}
              <p className="font-medium text-gray-900">{profile.full_name || profile.email}</p>
            </div>
            <p className="text-sm text-gray-400">{profile.email}</p>
          </div>
        </div>
      </div>

      {/* 수신 이메일 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" /> 수신 이메일
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            회의록·요약이 완성되면 이 이메일로 발송돼요. 비워두면 로그인 이메일로 발송됩니다.
          </p>
        </div>

        <input
          type="email"
          value={notificationEmail}
          onChange={e => setNotificationEmail(e.target.value)}
          placeholder={profile.email}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? '저장 중...' : '저장'}
          </button>
          {savedMessage && (
            <span className="text-sm text-gray-500">{savedMessage}</span>
          )}
        </div>
      </div>

      {/* 진단 도구 */}
      <Link
        href="/help/pwa-status"
        className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-5 hover:border-purple-200 hover:bg-purple-50/30 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">업로드·PWA 진단</p>
            <p className="text-xs text-gray-500 mt-0.5">업로드가 안 될 때 어디서 막히는지 확인</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors" />
      </Link>
    </div>
  )
}
