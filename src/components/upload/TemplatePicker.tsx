'use client'

import { useState } from 'react'
import { Eye, X, Check } from 'lucide-react'
import { TEMPLATE_LIST, type Template } from '@/lib/templates'
import type { OutputFormat } from '@/types'

interface Props {
  value: OutputFormat
  onChange: (value: OutputFormat) => void
}

export default function TemplatePicker({ value, onChange }: Props) {
  const [previewing, setPreviewing] = useState<Template | null>(null)

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          출력 형식
          <span className="ml-1.5 text-xs font-normal text-gray-400">
            ({TEMPLATE_LIST.length}개 — 클릭해서 미리보기 가능)
          </span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TEMPLATE_LIST.map(tpl => {
            const selected = value === tpl.id
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onChange(tpl.id)}
                className={`relative text-left rounded-2xl border p-3 transition-all ${
                  selected
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                }`}
              >
                {selected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="text-2xl mb-1.5">{tpl.emoji}</div>
                <p className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-gray-900'}`}>
                  {tpl.name}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
                  {tpl.shortDesc}
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreviewing(tpl) }}
                  className="mt-2 flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                >
                  <Eye className="w-3 h-3" /> 미리보기
                </button>
              </button>
            )
          })}
        </div>
      </div>

      {/* 미리보기 모달 */}
      {previewing && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewing(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{previewing.emoji}</div>
                <div>
                  <h2 className="font-bold text-gray-900">{previewing.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{previewing.shortDesc}</p>
                  <p className="text-xs text-blue-600 mt-1">💡 {previewing.bestFor}에 좋아요</p>
                </div>
              </div>
              <button onClick={() => setPreviewing(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 미리보기 본문 */}
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">미리보기 (예시)</p>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-gray-800 bg-gray-50 rounded-xl p-4">
                {previewing.preview}
              </pre>
            </div>

            {/* 푸터 */}
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setPreviewing(null)}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => { onChange(previewing.id); setPreviewing(null) }}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> 이 형식 선택
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
