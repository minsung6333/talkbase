'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, FileText, Clock, Loader2 } from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  type: string
  created_at: string
  snippet?: string
  score: number
}

const TYPE_LABEL: Record<string, string> = {
  team_meeting: '팀 회의',
  client_meeting: '고객 미팅',
  one_on_one: '1:1',
  other: '기타',
}

function highlight(text: string, query: string) {
  if (!query) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-yellow-100 text-yellow-800 rounded px-0.5">{part}</mark>
      : part
  )
}

export default function SearchView() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data.results || [])
    setLoading(false)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') runSearch(query)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">검색</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="회의 제목, 내용, 발언 검색..."
            className="w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          <button
            onClick={() => runSearch(query)}
            disabled={!query.trim() || loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '검색'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 ml-1">제목, 회의록 내용, STT 발언 내용을 검색해요</p>
      </div>

      {/* 결과 */}
      {loading && (
        <div className="text-center py-10 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">검색 중...</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">"{query}"에 대한 결과가 없어요</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">{results.length}건 검색됨</p>
          {results.map(r => (
            <Link key={r.id} href={`/result/${r.id}`}
              className="block bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-sm transition-all group">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5 group-hover:text-blue-400 transition-colors" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                      {highlight(r.title, query)}
                    </h3>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg flex-shrink-0">
                      {TYPE_LABEL[r.type] || r.type}
                    </span>
                  </div>
                  {r.snippet && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                      {highlight(r.snippet, query)}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {new Date(r.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!searched && (
        <div className="text-center py-12 text-gray-300">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">회의 내용을 검색해보세요</p>
        </div>
      )}
    </div>
  )
}
