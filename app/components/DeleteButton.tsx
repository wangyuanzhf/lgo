'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TABLE = {
  post:    'posts',
  note:    'notes',
  mindmap: 'mindmaps',
} as const

export default function DeleteButton({
  id,
  kind,
  label = '删除',
}: {
  id: string
  kind: keyof typeof TABLE
  label?: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from(TABLE[kind]).delete().eq('id', id)
    if (error) {
      alert('删除失败：' + error.message)
      setLoading(false)
      setConfirming(false)
      return
    }
    router.refresh()
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-xs text-[#57606a]">确认删除？</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-[#cf222e] hover:underline disabled:opacity-50"
        >
          {loading ? '删除中...' : '确认'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-[#57606a] hover:underline"
        >
          取消
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-[#cf222e] hover:underline"
    >
      {label}
    </button>
  )
}
