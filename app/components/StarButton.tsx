'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  id: string
  kind: 'post' | 'mindmap'
  isStarred: boolean
}

const table = { post: 'posts', mindmap: 'mindmaps' } as const

export default function StarButton({ id, kind, isStarred }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (loading) return
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.from(table[kind]).update({ is_starred: !isStarred }).eq('id', id)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isStarred ? '取消星标' : '添加星标'}
      className={`transition-colors disabled:opacity-50 ${
        isStarred ? 'text-[#d4a72c]' : 'text-[#8d96a0] hover:text-[#d4a72c]'
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill={isStarred ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={isStarred ? 0 : 1.5}
      >
        <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
      </svg>
    </button>
  )
}
