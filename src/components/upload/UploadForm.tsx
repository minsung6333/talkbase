'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileAudio, X, FolderOpen, Plus } from 'lucide-react'
import type { RecordingType, Visibility, OutputFormat } from '@/types'

interface Project {
  id: string
  name: string
  space: 'team' | 'personal'
}

export default function UploadForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<RecordingType>('team_meeting')
  const [visibility, setVisibility] = useState<Visibility>('team')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('minutes')
  const [projectId, setProjectId] = useState<string>('')
  const [projects, setProjects] = useState<{ team: Project[]; personal: Project[] }>({ team: [], personal: [] })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setProjects).catch(() => {})
  }, [])

  const ACCEPTED_TYPES = ['audio/x-m4a', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/m4a']
  const MAX_SIZE_GB = 2

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) validateAndSetFile(dropped)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) validateAndSetFile(selected)
  }

  const validateAndSetFile = (f: File) => {
    setError('')
    if (f.size > MAX_SIZE_GB * 1024 * 1024 * 1024) {
      setError(`파일 크기가 ${MAX_SIZE_GB}GB를 초과해요`)
      return
    }
    setFile(f)
    if (!title) {
      setTitle(f.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title.trim()) return

    setUploading(true)
    setError('')

    try {
      // 1. Presigned URL 요청
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'audio/x-m4a',
          title: title.trim(),
          type,
          visibility,
          outputFormat,
          projectId: projectId || null,
        }),
      })

      if (!presignRes.ok) throw new Error('업로드 URL 생성 실패')
      const { uploadUrl, recordingId, fileKey } = await presignRes.json()

      // 2. R2에 직접 업로드 (진행률 추적)
      await uploadWithProgress(file, uploadUrl, setUploadProgress)

      // 3. 업로드 완료 → 처리 시작 요청
      await fetch('/api/process/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId, fileKey }),
      })

      // 4. 처리 중 페이지로 이동
      router.push(`/processing/${recordingId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했어요')
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 파일 드롭존 */}
      <div
        onDrop={handleFileDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !file && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
          file
            ? 'border-blue-200 bg-blue-50'
            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".m4a,.mp3,.wav,audio/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center gap-3">
            <FileAudio className="w-8 h-8 text-blue-500 flex-shrink-0" />
            <div className="text-left flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); setUploadProgress(0) }}
              className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-gray-600 font-medium">파일을 드래그하거나 클릭해서 선택</p>
            <p className="text-sm text-gray-400">m4a, mp3, wav · 최대 2GB</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* 메타데이터 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            제목 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 6월 팀 주간회의"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* 유형 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">유형</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['team_meeting', '팀 회의'],
              ['client_meeting', '고객 미팅'],
              ['phone_call', '통화'],
              ['other', '기타'],
            ] as [RecordingType, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  type === value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 공개 범위 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">공개 범위</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['team', '👥 팀 공유'],
              ['private', '🔒 나만 보기'],
            ] as [Visibility, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setVisibility(value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  visibility === value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 폴더 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <FolderOpen className="w-4 h-4 inline mr-1" />폴더
          </label>
          <select
            value={projectId}
            onChange={e => {
              setProjectId(e.target.value)
              // 폴더 공간에 따라 공개범위 자동 설정
              const allProjects = [...projects.team, ...projects.personal]
              const selected = allProjects.find(p => p.id === e.target.value)
              if (selected) setVisibility(selected.space === 'team' ? 'team' : 'private')
            }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">📄 미분류</option>
            {projects.team.length > 0 && (
              <optgroup label="🏢 팀 공유 공간">
                {projects.team.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            )}
            {projects.personal.length > 0 && (
              <optgroup label="🔒 내 공간">
                {projects.personal.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            )}
          </select>
          <p className="text-xs text-gray-400 mt-1">폴더 선택 시 공개 범위가 자동으로 설정돼요</p>
        </div>

        {/* 출력 형식 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">출력 형식</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['minutes', '📋 회의록'],
              ['summary', '📝 요약'],
            ] as [OutputFormat, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setOutputFormat(value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  outputFormat === value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 업로드 진행률 */}
      {uploading && uploadProgress > 0 && uploadProgress < 100 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm text-gray-600">
            <span>업로드 중...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">업로드가 완료되면 탭을 닫아도 처리가 계속돼요</p>
        </div>
      )}

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={!file || !title.trim() || uploading}
        className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? '처리 중...' : '변환 시작'}
      </button>
    </form>
  )
}

async function uploadWithProgress(
  file: File,
  url: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`업로드 실패: ${xhr.status}`))
    })
    xhr.addEventListener('error', () => reject(new Error('네트워크 오류')))
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'audio/x-m4a')
    xhr.send(file)
  })
}
