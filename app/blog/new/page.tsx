'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import VisibilityToggle from '@/app/components/VisibilityToggle'
import TagInput from '@/app/components/TagInput'
import BlogEditor, { useBlogEditor } from '@/app/components/BlogEditor'

export default function NewBlogPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')

  const editorHook = useBlogEditor('<p>开始写作...</p>')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('posts').select('tags').eq('user_id', user.id)
      const all = Array.from(new Set((data ?? []).flatMap((p: { tags: string[] }) => p.tags ?? [])))
      setTagSuggestions(all)
    })
  }, [router])

  const save = useCallback(async (published: boolean) => {
    if (!title.trim()) { setError('请输入标题'); return }
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('is_banned').eq('id', user.id).single()
      if (profile?.is_banned) { setError('账号已被禁言，无法发布内容'); setSaving(false); return }
      const content = await editorHook.getHTML()
      const { error: err } = await supabase.from('posts').insert({
        user_id: user.id,
        title: title.trim(),
        content,
        published,
        is_public: isPublic,
        tags,
      })
      if (err) throw err
      router.push('/blog')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }, [title, editorHook, isPublic, tags, router])

  const suggestTags = async () => {
    setSuggesting(true)
    try {
      const content = await editorHook.getHTML()
      const res = await fetch('/api/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, type: 'post' }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? '大模型不可用'); return }
      const newTags = (data.tags as string[]).filter((t) => !tags.includes(t))
      setTags((prev) => [...prev, ...newTags].slice(0, 10))
    } catch {
      alert('大模型不可用')
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.push('/blog')} className="text-sm text-[#57606a] hover:text-[#0969da]">← 返回列表</button>
        <span className="text-[#d0d7de]">/</span>
        <span className="text-sm text-[#1f2328]">新建文章</span>
      </div>

      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden mb-4">
        <div className="p-4 border-b border-[#d0d7de]">
          <input
            type="text"
            placeholder="文章标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl font-semibold text-[#1f2328] placeholder-[#8d96a0] focus:outline-none"
          />
        </div>
      </div>

      <BlogEditor userId={userId} hook={editorHook} />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 bg-white border border-[#d0d7de] rounded-md p-4">
        <TagInput
          tags={tags}
          onChange={setTags}
          suggestions={tagSuggestions}
          onSuggest={suggestTags}
          suggesting={suggesting}
          type="post"
        />
      </div>

      <div className="flex items-center gap-4 mt-4">
        <div className="flex gap-3">
          <button onClick={() => save(false)} disabled={saving || editorHook.uploading}
            className="px-4 py-2 text-sm border border-[#d0d7de] text-[#1f2328] bg-white rounded-md hover:bg-[#f6f8fa] transition-colors disabled:opacity-50">
            保存草稿
          </button>
          <button onClick={() => save(true)} disabled={saving || editorHook.uploading}
            className="px-4 py-2 text-sm bg-[#1a7f37] text-white rounded-md hover:bg-[#19692f] transition-colors disabled:opacity-50">
            {saving ? '发布中...' : '发布文章'}
          </button>
        </div>
        <VisibilityToggle value={isPublic} onChange={setIsPublic} />
      </div>
    </div>
  )
}
