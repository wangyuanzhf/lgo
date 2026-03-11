'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import PostCard from './PostCard'

type Post    = { kind: 'post';    id: string; title: string; content: string; created_at: string; is_public: boolean }
type Note    = { kind: 'note';    id: string; content: string;                created_at: string; is_public: boolean }
type Mindmap = { kind: 'mindmap'; id: string; title: string;                  created_at: string; is_public: boolean }
type ContentItem = Post | Note | Mindmap

type Tab = 'all' | 'post' | 'note' | 'mindmap'

const TABS: { key: Tab; label: string; emptyText: string }[] = [
  { key: 'all',     label: '全部',     emptyText: '暂无内容' },
  { key: 'post',    label: '博客',     emptyText: '暂无博客文章' },
  { key: 'note',    label: '随笔',     emptyText: '暂无随笔' },
  { key: 'mindmap', label: '思维导图', emptyText: '暂无思维导图' },
]

function matchesSearch(item: ContentItem, q: string): boolean {
  const lower = q.toLowerCase()
  if (item.kind === 'note')    return item.content.toLowerCase().includes(lower)
  return item.title.toLowerCase().includes(lower)
}

function FeedCard({ item, isSelf }: { item: ContentItem; isSelf: boolean }) {
  const time = new Date(item.created_at).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  if (item.kind === 'post') {
    return <PostCard item={item} isSelf={isSelf} time={time} />
  }

  if (item.kind === 'note') {
    return (
      <div className="bg-white border border-[#d0d7de] rounded-md p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-1.5 py-0.5 rounded bg-[#dafbe1] text-[#1a7f37] border border-[#acd7b4]">随笔</span>
          {!item.is_public && isSelf && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-[#f6f8fa] text-[#57606a] border border-[#d0d7de]">私密</span>
          )}
          <span className="text-xs text-[#57606a] ml-auto">{time}</span>
        </div>
        <p className="text-sm text-[#1f2328] whitespace-pre-wrap leading-relaxed line-clamp-4">
          {item.content}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#d0d7de] rounded-md p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-[#fff8c5] text-[#7d4e00] border border-[#e3c26f]">导图</span>
          {!item.is_public && isSelf && (
            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-[#f6f8fa] text-[#57606a] border border-[#d0d7de]">私密</span>
          )}
          <Link
            href={`/mindmap/${item.id}`}
            className="text-sm font-medium text-[#1f2328] hover:text-[#0969da] truncate"
          >
            {item.title}
          </Link>
        </div>
        <span className="shrink-0 text-xs text-[#57606a]">{time}</span>
      </div>
    </div>
  )
}

export default function ProfileFeed({
  feed,
  isSelf,
  emptyMessage,
}: {
  feed: ContentItem[]
  isSelf: boolean
  emptyMessage: string
}) {
  const [tab, setTab]       = useState<Tab>('all')
  const [query, setQuery]   = useState('')

  const counts = useMemo(() => ({
    all:     feed.length,
    post:    feed.filter(i => i.kind === 'post').length,
    note:    feed.filter(i => i.kind === 'note').length,
    mindmap: feed.filter(i => i.kind === 'mindmap').length,
  }), [feed])

  const visible = useMemo(() => {
    let items = tab === 'all' ? feed : feed.filter(i => i.kind === tab)
    if (query.trim()) items = items.filter(i => matchesSearch(i, query.trim()))
    return items
  }, [feed, tab, query])

  const currentTab = TABS.find(t => t.key === tab)!

  if (feed.length === 0) {
    return (
      <div className="bg-white border border-[#d0d7de] rounded-md p-12 text-center">
        <p className="text-sm text-[#57606a]">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div>
      {/* 搜索框 + 标签页 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        {/* 标签页 */}
        <div className="flex items-center gap-1 bg-white border border-[#d0d7de] rounded-md p-0.5 shrink-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded transition-colors ${
                tab === t.key
                  ? 'bg-[#1f2328] text-white'
                  : 'text-[#57606a] hover:text-[#1f2328] hover:bg-[#f6f8fa]'
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full leading-none ${
                tab === t.key
                  ? 'bg-white/20 text-white'
                  : 'bg-[#f6f8fa] text-[#57606a] border border-[#d0d7de]'
              }`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {/* 搜索框 */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c959f]"
            width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
          >
            <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`搜索${currentTab.label === '全部' ? '全部内容' : currentTab.label}...`}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#d0d7de] rounded-md bg-white text-[#1f2328] placeholder-[#8c959f] focus:outline-none focus:border-[#0969da] focus:ring-[3px] focus:ring-[#0969da]/20 transition-shadow"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8c959f] hover:text-[#1f2328]"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 内容列表 */}
      {visible.length === 0 ? (
        <div className="bg-white border border-[#d0d7de] rounded-md p-10 text-center">
          <p className="text-sm text-[#57606a]">
            {query ? `没有找到包含「${query}」的${currentTab.label === '全部' ? '内容' : currentTab.label}` : currentTab.emptyText}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(item => (
            <FeedCard key={`${item.kind}-${item.id}`} item={item} isSelf={isSelf} />
          ))}
        </div>
      )}
    </div>
  )
}
