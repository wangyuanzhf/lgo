'use client'

import { useState } from 'react'
import CommentItem from './CommentItem'
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

export default function CommentThread({
  root,
  replies,
  postId,
  anonToken,
  onRefresh,
}: {
  root: Comment
  replies: Comment[]
  postId: string
  anonToken: string
  onRefresh: () => void
}) {
  const [showReplyForm, setShowReplyForm] = useState(false)

  return (
    <div className="border border-[#d0d7de] rounded-md bg-white">
      <div className="p-4">
        <CommentItem comment={root} myToken={anonToken} />
        <button
          onClick={() => setShowReplyForm((v) => !v)}
          className="mt-2 text-xs text-[#57606a] hover:text-[#0969da]"
        >
          {showReplyForm ? '取消回复' : '回复'}
        </button>
        {showReplyForm && (
          <div className="mt-3">
            <CommentForm
              postId={postId}
              parentId={root.id}
              anonToken={anonToken}
              onSubmitted={() => {
                setShowReplyForm(false)
                onRefresh()
              }}
              onCancel={() => setShowReplyForm(false)}
            />
          </div>
        )}
      </div>

      {replies.length > 0 && (
        <div className="border-t border-[#d0d7de] divide-y divide-[#d0d7de]">
          {replies.map((reply) => (
            <div key={reply.id} className="pl-8 pr-4 py-4 bg-[#f6f8fa]">
              <CommentItem comment={reply} myToken={anonToken} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
