'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Mathematics from '@tiptap/extension-mathematics'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { use } from 'react'
import VisibilityToggle from '@/app/components/VisibilityToggle'
import TagInput from '@/app/components/TagInput'
import { uploadImageToStorage } from '../hooks/useImageUpload'

function MenuBar({
  editor,
  userId,
  onUploadStart,
  onUploadEnd,
}: {
  editor: ReturnType<typeof useEditor> | null
  userId: string
  onUploadStart: () => void
  onUploadEnd: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  if (!editor) return null
  const btn = (active: boolean) =>
    `px-2 py-1 text-xs rounded border transition-colors ${active ? 'bg-[#1f2328] text-white border-[#1f2328]' : 'bg-white text-[#57606a] border-[#d0d7de] hover:bg-[#f6f8fa]'}`

  const handleImageUpload = async (file: File) => {
    onUploadStart()
    try {
      const url = await uploadImageToStorage(file, userId)
      editor.chain().focus().setImage({ src: url }).run()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '上传失败')
    } finally {
      onUploadEnd()
    }
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-[#d0d7de] bg-[#f6f8fa]">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} type="button">B</button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} type="button"><em>I</em></button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))} type="button"><s>S</s></button>
      <button onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive('code'))} type="button">`c`</button>
      <div className="w-px bg-[#d0d7de] mx-1" />
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive('heading', { level: 1 }))} type="button">H1</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))} type="button">H2</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))} type="button">H3</button>
      <div className="w-px bg-[#d0d7de] mx-1" />
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))} type="button">• 列表</button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))} type="button">1. 列表</button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))} type="button">" 引用</button>
      <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btn(editor.isActive('codeBlock'))} type="button">{'<>'} 代码块</button>
      <div className="w-px bg-[#d0d7de] mx-1" />
      <label className={`${btn(false)} cursor-pointer`}>
        图片
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = '' }}
        />
      </label>
      <button onClick={() => editor.chain().focus().undo().run()} className={btn(false)} type="button">↩ 撤销</button>
      <button onClick={() => editor.chain().focus().redo().run()} className={btn(false)} type="button">↪ 重做</button>
    </div>
  )
}

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
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Image, Mathematics],
    content: '',
    editorProps: {
      attributes: { class: 'prose max-w-none p-4 min-h-[400px] focus:outline-none text-[#1f2328]' },
      handlePaste(view, event) {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (!file || !userId) return true
            setUploading(true)
            uploadImageToStorage(file, userId)
              .then((url) => {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: url })
                  )
                )
              })
              .catch((e) => alert(e instanceof Error ? e.message : '上传失败'))
              .finally(() => setUploading(false))
            return true
          }
        }
        return false
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false
        const files = event.dataTransfer?.files
        if (!files?.length) return false
        const file = files[0]
        if (!file.type.startsWith('image/')) return false
        event.preventDefault()
        if (!userId) return true
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
        setUploading(true)
        uploadImageToStorage(file, userId)
          .then((url) => {
            const pos = coords?.pos ?? view.state.selection.anchor
            view.dispatch(
              view.state.tr.insert(pos, view.state.schema.nodes.image.create({ src: url }))
            )
          })
          .catch((e) => alert(e instanceof Error ? e.message : '上传失败'))
          .finally(() => setUploading(false))
        return true
      },
    },
  })

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
      editor?.commands.setContent(post.content)
      // load all tags for suggestions
      const { data: allPosts } = await supabase
        .from('posts').select('tags').eq('user_id', user.id)
      const all = Array.from(new Set((allPosts ?? []).flatMap((p: { tags: string[] }) => p.tags ?? [])))
      setTagSuggestions(all)
      setLoading(false)
    }
    if (editor) load()
  }, [id, editor, router])

  const save = useCallback(async (pub: boolean) => {
    if (!title.trim()) { setError('请输入标题'); return }
    if (!editor) return
    setSaving(true); setError('')
    try {
      const supabase = createClient()
      const { error: err } = await supabase.from('posts').update({
        title: title.trim(), content: editor.getHTML(),
        published: pub, is_public: isPublic,
        tags,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      if (err) throw err
      router.push(`/blog/${id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally { setSaving(false) }
  }, [title, editor, id, isPublic, tags, router])

  const suggestTags = async () => {
    setSuggesting(true)
    try {
      const res = await fetch('/api/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: editor?.getHTML() ?? '', type: 'post' }),
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
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="p-4 border-b border-[#d0d7de]">
          <input type="text" placeholder="文章标题" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl font-semibold text-[#1f2328] placeholder-[#8d96a0] focus:outline-none" />
        </div>
        <MenuBar
          editor={editor}
          userId={userId}
          onUploadStart={() => setUploading(true)}
          onUploadEnd={() => setUploading(false)}
        />
        {uploading && (
          <div className="px-4 py-2 bg-[#ddf4ff] text-xs text-[#0969da] border-b border-[#b6e3ff]">
            图片上传中...
          </div>
        )}
        <EditorContent editor={editor!} />
      </div>
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
          <button onClick={() => save(false)} disabled={saving || uploading}
            className="px-4 py-2 text-sm border border-[#d0d7de] text-[#1f2328] bg-white rounded-md hover:bg-[#f6f8fa] transition-colors disabled:opacity-50">
            {published ? '取消发布' : '保存草稿'}
          </button>
          <button onClick={() => save(true)} disabled={saving || uploading}
            className="px-4 py-2 text-sm bg-[#1a7f37] text-white rounded-md hover:bg-[#19692f] transition-colors disabled:opacity-50">
            {saving ? '保存中...' : '发布文章'}
          </button>
        </div>
        <VisibilityToggle value={isPublic} onChange={setIsPublic} />
      </div>
    </div>
  )
}
