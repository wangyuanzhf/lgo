'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import VisibilityToggle from '@/app/components/VisibilityToggle'

function MenuBar({ editor, userId }: { editor: ReturnType<typeof useEditor> | null; userId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  if (!editor) return null
  const btn = (active: boolean) =>
    `px-2 py-1 text-xs rounded border transition-colors ${active ? 'bg-[#1f2328] text-white border-[#1f2328]' : 'bg-white text-[#57606a] border-[#d0d7de] hover:bg-[#f6f8fa]'}`

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) { alert('图片大小不能超过 5MB'); return }
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('post-images').upload(path, file)
    if (error) { alert('上传失败：' + error.message); return }
    const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(path)
    editor.chain().focus().setImage({ src: publicUrl }).run()
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
      <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)} type="button">— 分割线</button>
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

export default function NewBlogPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
    })
  }, [router])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Image],
    content: '<p>开始写作...</p>',
    editorProps: {
      attributes: { class: 'prose max-w-none p-4 min-h-[400px] focus:outline-none text-[#1f2328]' },
    },
  })

  const save = useCallback(async (published: boolean) => {
    if (!title.trim()) { setError('请输入标题'); return }
    if (!editor) return
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { error: err } = await supabase.from('posts').insert({
        user_id: user.id,
        title: title.trim(),
        content: editor.getHTML(),
        published,
        is_public: isPublic,
      })
      if (err) throw err
      router.push('/blog')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }, [title, editor, isPublic, router])

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.push('/blog')} className="text-sm text-[#57606a] hover:text-[#0969da]">← 返回列表</button>
        <span className="text-[#d0d7de]">/</span>
        <span className="text-sm text-[#1f2328]">新建文章</span>
      </div>

      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="p-4 border-b border-[#d0d7de]">
          <input
            type="text"
            placeholder="文章标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl font-semibold text-[#1f2328] placeholder-[#8d96a0] focus:outline-none"
          />
        </div>
        <MenuBar editor={editor} userId={userId} />
        <EditorContent editor={editor!} />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-4 mt-4">
        <div className="flex gap-3">
          <button onClick={() => save(false)} disabled={saving}
            className="px-4 py-2 text-sm border border-[#d0d7de] text-[#1f2328] bg-white rounded-md hover:bg-[#f6f8fa] transition-colors disabled:opacity-50">
            保存草稿
          </button>
          <button onClick={() => save(true)} disabled={saving}
            className="px-4 py-2 text-sm bg-[#1a7f37] text-white rounded-md hover:bg-[#19692f] transition-colors disabled:opacity-50">
            {saving ? '发布中...' : '发布文章'}
          </button>
        </div>
        <VisibilityToggle value={isPublic} onChange={setIsPublic} />
      </div>
    </div>
  )
}
