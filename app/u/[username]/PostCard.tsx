'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function PostCard({
  item,
  isSelf,
  time,
}: {
  item: { id: string; title: string; content: string; is_public: boolean }
  isSelf: boolean
  time: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-[#d0d7de] rounded-md p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-[#ddf4ff] text-[#0969da] border border-[#b6e3ff]">博客</span>
          {!item.is_public && isSelf && (
            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-[#f6f8fa] text-[#57606a] border border-[#d0d7de]">私密</span>
          )}
          <Link href={`/blog/${item.id}`} className="text-base font-semibold text-[#1f2328] hover:text-[#0969da] hover:underline truncate">
            {item.title}
          </Link>
        </div>
        <span className="shrink-0 text-xs text-[#57606a]">{time}</span>
      </div>

      <div className="border-t border-[#d0d7de] pt-3">
        <div
          className={`prose prose-sm max-w-none text-[#1f2328] prose-headings:text-[#1f2328] prose-a:text-[#0969da] prose-code:text-[#cf222e] prose-code:bg-[#f6f8fa] prose-code:px-1 prose-code:rounded prose-pre:bg-[#1f2328] overflow-hidden transition-all duration-300 ${
            expanded ? '' : 'max-h-40'
          }`}
          dangerouslySetInnerHTML={{ __html: item.content }}
        />

        {!expanded && (
          <div className="relative -mt-8 pt-8 bg-gradient-to-t from-white to-transparent">
            <button
              onClick={() => setExpanded(true)}
              className="mt-1 text-xs text-[#0969da] hover:underline"
            >
              展开全文 ↓
            </button>
          </div>
        )}

        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#d0d7de] flex items-center gap-4">
            <Link href={`/blog/${item.id}`} className="text-xs text-[#0969da] hover:underline">
              查看原文 →
            </Link>
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-[#57606a] hover:underline"
            >
              收起 ↑
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
