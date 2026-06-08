'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  FolderOpen, Folder, Plus, Users, Lock, ChevronRight,
  FileText, MoreHorizontal, ArrowRight, Trash2, Pencil, X, Check, FolderInput
} from 'lucide-react'

interface Project {
  id: string
  name: string
  space: 'team' | 'personal'
  owner_id: string | null
  created_by: string
  created_at: string
}

interface Recording {
  id: string
  title: string
  type: string
  status: string
  output_format: string
  created_at: string
  project_id: string | null
  visibility: string
}

const STATUS_COLOR: Record<string, string> = {
  completed: 'text-green-600',
  failed: 'text-red-500',
  stt_processing: 'text-blue-500',
  ai_processing: 'text-blue-500',
  speaker_mapping: 'text-yellow-500',
  uploading: 'text-gray-400',
  saving: 'text-blue-500',
}
const STATUS_LABEL: Record<string, string> = {
  completed: '완료', failed: '실패', stt_processing: 'STT 중',
  ai_processing: 'AI 정리 중', speaker_mapping: '화자 지정',
  uploading: '업로드 중', saving: '저장 중',
}

export default function DriveView() {
  const [projects, setProjects] = useState<{ team: Project[]; personal: Project[] }>({ team: [], personal: [] })
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [currentFolder, setCurrentFolder] = useState<Project | null>(null)
  const [currentSpace, setCurrentSpace] = useState<'team' | 'personal' | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderSpace, setNewFolderSpace] = useState<'team' | 'personal'>('team')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [moveTarget, setMoveTarget] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const moveMenuRef = useRef<HTMLDivElement | null>(null)

  // 메뉴 바깥 클릭하면 닫기
  useEffect(() => {
    if (!moveTarget) return
    const handler = (e: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setMoveTarget(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moveTarget])

  const loadProjects = useCallback(async () => {
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(data)
  }, [])

  const loadRecordings = useCallback(async (projectId: string | 'unassigned', space: 'team' | 'personal') => {
    let url = '/api/recordings/list?'
    if (projectId === 'unassigned') {
      url += `no_project=true&space=${space}`
    } else {
      url += `project_id=${projectId}`
    }
    const res = await fetch(url)
    const data = await res.json()
    setRecordings(data.recordings || [])
  }, [])

  useEffect(() => {
    loadProjects().then(() => setLoading(false))
  }, [loadProjects])

  const handleFolderClick = (project: Project) => {
    setCurrentFolder(project)
    setCurrentSpace(project.space)
    loadRecordings(project.id, project.space)
  }

  const handleSpaceClick = (space: 'team' | 'personal') => {
    setCurrentFolder(null)
    setCurrentSpace(space)
    loadRecordings('unassigned', space)
  }

  const handleBack = () => {
    setCurrentFolder(null)
    setCurrentSpace(null)
    setRecordings([])
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim(), space: newFolderSpace }),
    })
    setNewFolderName('')
    setShowNewFolder(false)
    loadProjects()
  }

  const deleteFolder = async (id: string) => {
    if (!confirm('폴더를 삭제하면 안의 녹음은 미분류로 이동해요. 계속할까요?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (currentFolder?.id === id) handleBack()
    loadProjects()
  }

  const renameFolder = async (id: string) => {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    })
    setEditingFolder(null)
    loadProjects()
    if (currentFolder?.id === id) setCurrentFolder(prev => prev ? { ...prev, name: editName } : null)
  }

  const moveRecording = async (recordingId: string, projectId: string | null) => {
    await fetch(`/api/recordings/${recordingId}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    })
    setMoveTarget(null)
    if (currentFolder) loadRecordings(currentFolder.id, currentFolder.space)
    else if (currentSpace) loadRecordings('unassigned', currentSpace)
  }

  const deleteRecording = async (recordingId: string, title: string) => {
    if (!confirm(`"${title}"을 삭제할까요? 복구할 수 없어요.`)) return
    setMoveTarget(null)
    await fetch(`/api/recordings/${recordingId}/delete`, { method: 'DELETE' })
    if (currentFolder) loadRecordings(currentFolder.id, currentFolder.space)
    else if (currentSpace) loadRecordings('unassigned', currentSpace)
  }

  const allProjects = [...projects.team, ...projects.personal]

  // 루트 화면
  if (!currentSpace && !currentFolder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">녹음 보관함</h1>
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> 새 폴더
          </button>
        </div>

        {/* 새 폴더 만들기 — 모바일은 세로, 데스크탑은 한 줄 */}
        {showNewFolder && (
          <div className="bg-blue-50 rounded-2xl p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createFolder()}
              placeholder="폴더 이름"
              className="w-full sm:flex-1 border border-blue-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <div className="flex items-center gap-2">
              <select
                value={newFolderSpace}
                onChange={e => setNewFolderSpace(e.target.value as 'team' | 'personal')}
                className="flex-1 sm:flex-initial border border-blue-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none"
              >
                <option value="team">🏢 팀 공유</option>
                <option value="personal">🔒 나만 보기</option>
              </select>
              <button onClick={createFolder} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex-shrink-0">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setShowNewFolder(false)} className="p-2.5 text-gray-400 hover:text-gray-600 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 팀 공유 공간 */}
        <div>
          <div
            className="flex items-center gap-2 mb-3 cursor-pointer group"
            onClick={() => handleSpaceClick('team')}
          >
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">팀 공유 공간</h2>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {projects.team.map(p => (
              <FolderCard
                key={p.id}
                project={p}
                onClick={() => handleFolderClick(p)}
                onDelete={() => deleteFolder(p.id)}
                onRename={() => { setEditingFolder(p.id); setEditName(p.name) }}
                isEditing={editingFolder === p.id}
                editName={editName}
                setEditName={setEditName}
                onRenameConfirm={() => renameFolder(p.id)}
                onRenameCancel={() => setEditingFolder(null)}
              />
            ))}
            {projects.team.length === 0 && (
              <p className="text-sm text-gray-400 col-span-full py-4">팀 공유 폴더가 없어요</p>
            )}
          </div>
        </div>

        {/* 내 공간 */}
        <div>
          <div
            className="flex items-center gap-2 mb-3 cursor-pointer group"
            onClick={() => handleSpaceClick('personal')}
          >
            <Lock className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">내 공간</h2>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {projects.personal.map(p => (
              <FolderCard
                key={p.id}
                project={p}
                onClick={() => handleFolderClick(p)}
                onDelete={() => deleteFolder(p.id)}
                onRename={() => { setEditingFolder(p.id); setEditName(p.name) }}
                isEditing={editingFolder === p.id}
                editName={editName}
                setEditName={setEditName}
                onRenameConfirm={() => renameFolder(p.id)}
                onRenameCancel={() => setEditingFolder(null)}
              />
            ))}
            {projects.personal.length === 0 && (
              <p className="text-sm text-gray-400 col-span-full py-4">개인 폴더가 없어요</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 폴더/공간 내부 화면
  return (
    <div className="space-y-4">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-2">
        <button onClick={handleBack} className="text-sm text-blue-600 hover:underline">
          녹음 보관함
        </button>
        <ChevronRight className="w-4 h-4 text-gray-300" />
        {currentFolder ? (
          <span className="text-sm font-medium text-gray-800">{currentFolder.name}</span>
        ) : (
          <span className="text-sm font-medium text-gray-800">
            {currentSpace === 'team' ? '팀 공유 공간' : '내 공간'} (미분류)
          </span>
        )}
      </div>

      {/* 폴더 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentFolder?.space === 'team' || currentSpace === 'team'
            ? <Users className="w-5 h-5 text-blue-600" />
            : <Lock className="w-5 h-5 text-gray-500" />
          }
          <h1 className="text-xl font-bold text-gray-900">
            {currentFolder?.name || (currentSpace === 'team' ? '미분류 (팀)' : '미분류 (개인)')}
          </h1>
        </div>
      </div>

      {/* 녹음 목록 */}
      <div className="bg-white rounded-2xl border border-gray-100">
        {recordings.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">녹음이 없어요</p>
            <Link href="/" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
              녹음 업로드하기 →
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 text-xs text-gray-400 font-medium">
                <th className="text-left px-5 py-3">제목</th>
                <th className="text-left px-3 py-3 hidden sm:table-cell">상태</th>
                <th className="text-left px-3 py-3 hidden md:table-cell">날짜</th>
                <th className="px-3 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {recordings.map(r => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    {r.status === 'completed' ? (
                      <Link href={`/result/${r.id}`} className="font-medium text-gray-900 hover:text-blue-600 text-sm block">
                        {r.title}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-600 text-sm block">{r.title}</span>
                    )}
                    {/* 모바일 전용: 날짜 + 상태를 제목 아래에 작게 표시 */}
                    <div className="flex items-center gap-2 mt-0.5 md:hidden text-[11px]">
                      <span className="text-gray-400">
                        {new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                      </span>
                      <span className={`font-medium ${STATUS_COLOR[r.status] || 'text-gray-400'}`}>
                        · {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <span className={`text-xs font-medium ${STATUS_COLOR[r.status] || 'text-gray-400'}`}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell text-xs text-gray-400 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-3 py-3">
                    <div className="relative" ref={moveTarget === r.id ? moveMenuRef : undefined}>
                      <button
                        onClick={() => setMoveTarget(moveTarget === r.id ? null : r.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {moveTarget === r.id && (
                        <div className="absolute right-0 bottom-8 bg-white border border-gray-100 rounded-xl shadow-lg z-50 w-52 py-1">
                          <p className="px-3 py-2 text-xs font-medium text-gray-400 flex items-center gap-1">
                            <FolderInput className="w-3.5 h-3.5" /> 폴더로 이동
                          </p>
                          {allProjects.map(p => (
                            <button
                              key={p.id}
                              onClick={() => moveRecording(r.id, p.id)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              {p.space === 'team'
                                ? <Users className="w-3.5 h-3.5 text-blue-500" />
                                : <Lock className="w-3.5 h-3.5 text-gray-400" />
                              }
                              {p.name}
                            </button>
                          ))}
                          <button
                            onClick={() => moveRecording(r.id, null)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <ArrowRight className="w-3.5 h-3.5" /> 미분류로 이동
                          </button>
                          <hr className="my-1 border-gray-100" />
                          <button
                            onClick={() => deleteRecording(r.id, r.title)}
                            className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> 삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function FolderCard({
  project, onClick, onDelete, onRename,
  isEditing, editName, setEditName, onRenameConfirm, onRenameCancel
}: {
  project: Project
  onClick: () => void
  onDelete: () => void
  onRename: () => void
  isEditing: boolean
  editName: string
  setEditName: (v: string) => void
  onRenameConfirm: () => void
  onRenameCancel: () => void
}) {
  return (
    <div
      className="group relative bg-white border border-gray-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer"
      onClick={!isEditing ? onClick : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        {project.space === 'team'
          ? <FolderOpen className="w-8 h-8 text-blue-400" />
          : <Folder className="w-8 h-8 text-gray-400" />
        }
        <div
          className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onRename} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <input
            autoFocus
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onRenameConfirm(); if (e.key === 'Escape') onRenameCancel() }}
            className="flex-1 text-sm border border-blue-300 rounded-lg px-2 py-1 focus:outline-none"
          />
          <button onClick={onRenameConfirm} className="text-blue-600"><Check className="w-4 h-4" /></button>
        </div>
      ) : (
        <p className="text-sm font-medium text-gray-800 truncate">{project.name}</p>
      )}

      <p className="text-xs text-gray-400 mt-0.5">
        {project.space === 'team' ? '팀 공유' : '나만 보기'}
      </p>
    </div>
  )
}
