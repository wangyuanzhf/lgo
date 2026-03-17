'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Mathematics from '@tiptap/extension-mathematics'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { useState, useEffect, useRef, useCallback } from 'react'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { uploadImageToStorage } from '@/app/blog/[id]/hooks/useImageUpload'

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })

// turndown 默认不支持表格，添加 GFM 表格规则
turndown.addRule('table', {
  filter: 'table',
  replacement(_content, node) {
    const table = node as HTMLTableElement
    const rows = Array.from(table.querySelectorAll('tr'))
    if (!rows.length) return ''
    const toMd = (cells: Element[]) =>
      '| ' + cells.map((c) => (c.textContent ?? '').replace(/\n/g, ' ').trim()).join(' | ') + ' |'
    const header = rows[0]
    const headerCells = Array.from(header.querySelectorAll('th, td'))
    const sep = '| ' + headerCells.map(() => '---').join(' | ') + ' |'
    const body = rows.slice(1).map((r) => toMd(Array.from(r.querySelectorAll('td, th')))).join('\n')
    return '\n\n' + toMd(headerCells) + '\n' + sep + (body ? '\n' + body : '') + '\n\n'
  },
})

type Mode = 'rich' | 'markdown'

function MenuBar({
  editor,
  userId,
  onUploadStart,
  onUploadEnd,
  mode,
  onModeChange,
}: {
  editor: ReturnType<typeof useEditor> | null
  userId: string
  onUploadStart: () => void
  onUploadEnd: () => void
  mode: Mode
  onModeChange: (m: Mode) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const btn = (active: boolean) =>
    `px-2 py-1 text-xs rounded border transition-colors ${active ? 'bg-[#1f2328] text-white border-[#1f2328]' : 'bg-white text-[#57606a] border-[#d0d7de] hover:bg-[#f6f8fa]'}`

  const handleImageUpload = async (file: File) => {
    if (mode === 'markdown') return
    onUploadStart()
    try {
      const url = await uploadImageToStorage(file, userId)
      editor?.chain().focus().setImage({ src: url }).run()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '上传失败')
    } finally {
      onUploadEnd()
    }
  }

  const modeBtn = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => onModeChange(m)}
      className={`px-2 py-1 text-xs rounded border transition-colors ${
        mode === m
          ? 'bg-[#0969da] text-white border-[#0969da]'
          : 'bg-white text-[#57606a] border-[#d0d7de] hover:bg-[#f6f8fa]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-[#d0d7de] bg-[#f6f8fa]">
      {/* 模式切换 */}
      {modeBtn('rich', '富文本')}
      {modeBtn('markdown', 'Markdown')}
      <div className="w-px bg-[#d0d7de] mx-1" />

      {mode === 'rich' && editor && (
        <>
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
          <button
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className={btn(false)}
            type="button"
          >
            ⊞ 表格
          </button>
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
          <div className="w-px bg-[#d0d7de] mx-1" />
          <button onClick={() => editor.chain().focus().undo().run()} className={btn(false)} type="button">↩ 撤销</button>
          <button onClick={() => editor.chain().focus().redo().run()} className={btn(false)} type="button">↪ 重做</button>
        </>
      )}

      {mode === 'markdown' && (
        <span className="text-xs text-[#57606a] flex items-center px-1">
          支持标准 Markdown 语法，切回富文本时自动渲染
        </span>
      )}
    </div>
  )
}

export function useBlogEditor(initialHtml: string = '') {
  const [mode, setMode] = useState<Mode>('rich')
  const [markdown, setMarkdown] = useState('')
  const [uploading, setUploading] = useState(false)
  const mdRef = useRef<HTMLTextAreaElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image,
      Mathematics,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialHtml,
    editorProps: {
      attributes: { class: 'prose max-w-none p-4 min-h-[400px] focus:outline-none text-[#1f2328] [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_th]:border-[#d0d7de] [&_th]:bg-[#f6f8fa] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-[#d0d7de] [&_td]:px-3 [&_td]:py-2' },
    },
  })

  // 初始内容设置
  useEffect(() => {
    if (initialHtml && editor && !editor.isDestroyed) {
      editor.commands.setContent(initialHtml)
      setMarkdown(turndown.turndown(initialHtml))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHtml])

  const switchMode = useCallback(async (newMode: Mode) => {
    if (newMode === mode) return
    if (newMode === 'markdown') {
      // 富文本 → Markdown：把当前 HTML 转成 md
      const html = editor?.getHTML() ?? ''
      setMarkdown(turndown.turndown(html))
    } else {
      // Markdown → 富文本：把 md 转成 HTML 再载入编辑器
      const html = await marked(markdown, { async: true })
      editor?.commands.setContent(html)
    }
    setMode(newMode)
  }, [mode, editor, markdown])

  const getHTML = useCallback(async (): Promise<string> => {
    if (mode === 'markdown') {
      return await marked(markdown, { async: true })
    }
    return editor?.getHTML() ?? ''
  }, [mode, editor, markdown])

  return { mode, switchMode, markdown, setMarkdown, editor, uploading, setUploading, getHTML, mdRef }
}

export default function BlogEditor({
  userId,
  hook,
}: {
  userId: string
  hook: ReturnType<typeof useBlogEditor>
}) {
  const { mode, switchMode, markdown, setMarkdown, editor, uploading, setUploading, mdRef } = hook

  // 粘贴图片（富文本模式）
  useEffect(() => {
    if (!editor) return
    const handlePaste = (event: ClipboardEvent) => {
      if (mode !== 'rich') return
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (!file || !userId) return
          setUploading(true)
          uploadImageToStorage(file, userId)
            .then((url) => {
              editor.chain().focus().setImage({ src: url }).run()
            })
            .catch((e) => alert(e instanceof Error ? e.message : '上传失败'))
            .finally(() => setUploading(false))
          return
        }
      }
    }

    const handleDrop = (event: DragEvent) => {
      if (mode !== 'rich') return
      const files = event.dataTransfer?.files
      if (!files?.length) return
      const file = files[0]
      if (!file.type.startsWith('image/')) return
      event.preventDefault()
      if (!userId) return
      setUploading(true)
      uploadImageToStorage(file, userId)
        .then((url) => {
          editor.chain().focus().setImage({ src: url }).run()
        })
        .catch((e) => alert(e instanceof Error ? e.message : '上传失败'))
        .finally(() => setUploading(false))
    }

    const dom = editor.view.dom
    dom.addEventListener('paste', handlePaste as EventListener)
    dom.addEventListener('drop', handleDrop as EventListener)
    return () => {
      dom.removeEventListener('paste', handlePaste as EventListener)
      dom.removeEventListener('drop', handleDrop as EventListener)
    }
  }, [editor, mode, userId, setUploading])

  // Markdown 模式下粘贴图片
  const handleMdPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file || !userId) return
        setUploading(true)
        try {
          const url = await uploadImageToStorage(file, userId)
          const ta = mdRef.current!
          const start = ta.selectionStart
          const insert = `![image](${url})`
          setMarkdown((prev) => prev.slice(0, start) + insert + prev.slice(ta.selectionEnd))
          // 移动光标到图片语法后面
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = start + insert.length
          })
        } catch (err) {
          alert(err instanceof Error ? err.message : '上传失败')
        } finally {
          setUploading(false)
        }
        return
      }
    }
  }

  return (
    <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
      <MenuBar
        editor={editor}
        userId={userId}
        onUploadStart={() => setUploading(true)}
        onUploadEnd={() => setUploading(false)}
        mode={mode}
        onModeChange={switchMode}
      />
      {uploading && (
        <div className="px-4 py-2 bg-[#ddf4ff] text-xs text-[#0969da] border-b border-[#b6e3ff]">
          图片上传中...
        </div>
      )}
      {mode === 'rich' ? (
        <EditorContent editor={editor!} />
      ) : (
        <textarea
          ref={mdRef}
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          onPaste={handleMdPaste}
          spellCheck={false}
          className="w-full min-h-[400px] p-4 font-mono text-sm text-[#1f2328] focus:outline-none resize-y"
          placeholder="在此输入 Markdown 内容..."
        />
      )}
    </div>
  )
}
