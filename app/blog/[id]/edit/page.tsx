'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { use } from 'react'
import VisibilityToggle from '@/app/components/VisibilityToggle'
import TagInput from '@/app/components/TagInput'
import BlogEditor, { useBlogEditor } from '@/app/components/BlogEditor'

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')

  const editorHook = useBlogEditor('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: post } = await supabase
        .from('posts').select('*').eq('id', id).eq('user_id', user.id).single()
      if (!post) { router.push('/blog'); return }
      setTitle(post.title)
      setPublished(post.published)
      setIsPublic(post.is_public)
      setTags(post.tags ?? [])
      editorHook.editor?.commands.setContent(post.content)
      // 同步初始 markdown
      const TurndownService = (await import('turndown')).default
      const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
      editorHook.setMarkdown(td.turndown(post.content ?? ''))
      const { data: allPosts } = await supabase.from('posts').select('tags').eq('user_id', user.id)
      const all = Array.from(new Set((allPosts ?? []).flatMap((p: { tags: string[] }) => p.tags ?? [])))
      setTagSuggestions(all)
      setLoading(false)
    }
    if (editorHook.editor) load()
  }, [id, editorHook.editor, router]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async (pub: boolean) => {
    if (!title.trim()) { setError('请输入标题'); return }
    setSaving(true); setError('')
    try {
      const supabase = createClient()
      const content = await editorHook.getHTML()
      const { error: err } = await supabase.from('posts').update({
        title: title.trim(), content,
        published: pub, is_public: isPublic,
        tags,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      if (err) throw err
      router.push(`/blog/${id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally { setSaving(false) }
  }, [title, editorHook, id, isPublic, tags, router])

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

  if (loading) return <div className="flex items-center justify-center h-48"><span className="text-sm text-[#57606a]">加载中...</span></div>

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.push(`/blog/${id}`)} className="text-sm text-[#57606a] hover:text-[#0969da]">← 返回</button>
        <span className="text-[#d0d7de]">/</span>
        <span className="text-sm text-[#1f2328]">编辑文章</span>
      </div>

      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden mb-4">
        <div className="p-4 border-b border-[#d0d7de]">
          <input type="text" placeholder="文章标题" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl font-semibold text-[#1f2328] placeholder-[#8d96a0] focus:outline-none" />
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
            {published ? '取消发布' : '保存草稿'}
          </button>
          <button onClick={() => save(true)} disabled={saving || editorHook.uploading}
            className="px-4 py-2 text-sm bg-[#1a7f37] text-white rounded-md hover:bg-[#19692f] transition-colors disabled:opacity-50">
            {saving ? '保存中...' : '发布文章'}
          </button>
        </div>
        <VisibilityToggle value={isPublic} onChange={setIsPublic} />
      </div>
    </div>
  )
}
