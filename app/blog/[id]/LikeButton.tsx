'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAnonToken } from './hooks/useAnonToken'

export default function LikeButton({
  postId,
  initialCount,
}: {
  postId: string
  initialCount: number
}) {
  const supabase = createClient()
  const anonToken = useAnonToken()
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!anonToken) return
    supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('anon_token', anonToken)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLiked(true)
      })
  }, [anonToken, postId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle() {
    if (!anonToken || loading) return
    setLoading(true)
    const prevLiked = liked
    const prevCount = count
    setLiked(!liked)
    setCount((c) => liked ? c - 1 : c + 1)
    let error
    if (liked) {
      ;({ error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('anon_token', anonToken))
    } else {
      ;({ error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, anon_token: anonToken }))
    }
    if (error) {
      setLiked(prevLiked)
      setCount(prevCount)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || !anonToken}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm transition-colors ${
        liked
          ? 'bg-[#ffebe9] border-[#ff8182] text-[#cf222e]'
          : 'bg-white border-[#d0d7de] text-[#57606a] hover:bg-[#f6f8fa] hover:border-[#8c959f]'
      } disabled:opacity-50`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
        <path d="M8 13.5C8 13.5 1.5 9.5 1.5 5.5a3 3 0 0 1 6-0.5 3 3 0 0 1 6 0.5C13.5 9.5 8 13.5 8 13.5Z" strokeLinejoin="round"/>
      </svg>
      <span>{count}</span>
    </button>
  )
}
