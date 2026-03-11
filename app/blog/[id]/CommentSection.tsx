'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAnonToken } from './hooks/useAnonToken'
import CommentThread from './CommentThread'
import CommentForm from './CommentForm'

type Comment = {
  id: string
  author_name: string
  body: string
  status: string
  created_at: string
  anon_token: string
  parent_id: string | null
}

export default function CommentSection({ postId }: { postId: string }) {
  const anonToken = useAnonToken()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchComments = useCallback(async () => {
    if (!anonToken) return
    const supabase = createClient()

    const [approvedRes, pendingRes] = await Promise.all([
      supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .eq('status', 'approved')
        .order('created_at', { ascending: true }),
      supabase.rpc('get_my_pending_comments', {
        p_post_id: postId,
        p_anon_token: anonToken,
      }),
    ])

    const approved: Comment[] = approvedRes.data ?? []
    const pending: Comment[] = pendingRes.data ?? []

    // Merge, dedup by id
    const seen = new Set<string>()
    const merged: Comment[] = []
    for (const c of [...approved, ...pending]) {
      if (!seen.has(c.id)) {
        seen.add(c.id)
        merged.push(c)
      }
    }
    merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    setComments(merged)
    setLoading(false)
  }, [anonToken, postId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const roots = comments.filter((c) => !c.parent_id)
  const repliesFor = (id: string) => comments.filter((c) => c.parent_id === id)

  return (
    <div className="mt-8">
      <h2 className="text-base font-semibold text-[#1f2328] mb-4">
        评论 <span className="text-[#57606a] font-normal">({roots.length})</span>
      </h2>

      {loading ? (
        <p className="text-sm text-[#57606a]">加载中…</p>
      ) : (
        <div className="space-y-4">
          {roots.map((root) => (
            <CommentThread
              key={root.id}
              root={root}
              replies={repliesFor(root.id)}
              postId={postId}
              anonToken={anonToken}
              onRefresh={fetchComments}
            />
          ))}

          {roots.length === 0 && (
            <p className="text-sm text-[#57606a]">暂无评论，来写第一条吧。</p>
          )}
        </div>
      )}

      <div className="mt-6 border border-[#d0d7de] rounded-md bg-white p-4">
        <p className="text-sm font-medium text-[#1f2328] mb-3">发表评论</p>
        <CommentForm
          postId={postId}
          anonToken={anonToken}
          onSubmitted={fetchComments}
        />
      </div>
    </div>
  )
}
