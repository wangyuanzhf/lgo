'use client'

import { useState } from 'react'
import { getStoredName, setStoredName } from './hooks/useAnonToken'
import { createClient } from '@/lib/supabase/client'

type Props = {
  postId: string
  parentId?: string
  anonToken: string
  onSubmitted: () => void
  onCancel?: () => void
}

export default function CommentForm({ postId, parentId, anonToken, onSubmitted, onCancel }: Props) {
  const [name, setName] = useState(() => getStoredName())
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !body.trim()) {
      setError('昵称和内容不能为空')
      return
    }
    if (!anonToken) return
    setSubmitting(true)
    setError('')
    const supabase = createClient()
    const { error: dbErr } = await supabase.from('comments').insert({
      post_id: postId,
      author_name: name.trim(),
      body: body.trim(),
      anon_token: anonToken,
      parent_id: parentId ?? null,
    })
    setSubmitting(false)
    if (dbErr) {
      setError(dbErr.message)
      return
    }
    setStoredName(name.trim())
    setBody('')
    onSubmitted()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <input
          type="text"
          placeholder="你的昵称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="w-full px-3 py-1.5 text-sm border border-[#d0d7de] rounded-md focus:outline-none focus:border-[#0969da] bg-white"
        />
      </div>
      <div>
        <textarea
          placeholder={parentId ? '写下你的回复…' : '写下你的评论…'}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          rows={3}
          className="w-full px-3 py-1.5 text-sm border border-[#d0d7de] rounded-md focus:outline-none focus:border-[#0969da] bg-white resize-none"
        />
      </div>
      {error && <p className="text-xs text-[#cf222e]">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !anonToken}
          className="px-4 py-1.5 text-sm bg-[#1f2328] text-white rounded-md hover:bg-[#2d333b] disabled:opacity-50 transition-colors"
        >
          {submitting ? '提交中…' : '提交'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-sm border border-[#d0d7de] text-[#57606a] rounded-md hover:bg-[#f6f8fa] transition-colors"
          >
            取消
          </button>
        )}
      </div>
    </form>
  )
}
