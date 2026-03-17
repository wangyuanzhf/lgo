'use client'

import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
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

// ── 表格网格选择器 ─────────────────────────────────────────────────────────────
const MAX_ROWS = 8
const MAX_COLS = 8

function TablePicker({ onInsert }: { onInsert: (rows: number, cols: number) => void }) {
  const [hovered, setHovered] = useState<{ r: number; c: number } | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const rows = hovered?.r ?? 0
  const cols = hovered?.c ?? 0

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o) }}
        className="px-2 py-1 text-xs rounded border transition-colors bg-white text-[#57606a] border-[#d0d7de] hover:bg-[#f6f8fa] flex items-center gap-1"
      >
        ⊞ 表格
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 bg-white border border-[#d0d7de] rounded-md shadow-lg p-3 select-none"
          style={{ minWidth: 220 }}
        >
          <p className="text-xs text-[#57606a] mb-2 text-center">
            {rows > 0 && cols > 0 ? `${rows} × ${cols}` : '移动选择行列数'}
          </p>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)` }}>
            {Array.from({ length: MAX_ROWS }).map((_, r) =>
              Array.from({ length: MAX_COLS }).map((_, c) => {
                const active = rows > 0 && cols > 0 && r < rows && c < cols
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`w-5 h-5 border rounded-sm cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#0969da] border-[#0969da]'
                        : 'bg-white border-[#d0d7de] hover:bg-[#ddf4ff] hover:border-[#0969da]'
                    }`}
                    onMouseEnter={() => setHovered({ r: r + 1, c: c + 1 })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => { onInsert(r + 1, c + 1); setOpen(false); setHovered(null) }}
                  />
                )
              })
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-[#d0d7de] flex items-center gap-2">
            <span className="text-xs text-[#57606a]">自定义:</span>
            <CustomTableInput onInsert={(r, c) => { onInsert(r, c); setOpen(false) }} />
          </div>
        </div>
      )}
    </div>
  )
}

function CustomTableInput({ onInsert }: { onInsert: (rows: number, cols: number) => void }) {
  const [r, setR] = useState('3')
  const [c, setC] = useState('3')
  const inputCls = "w-10 px-1.5 py-0.5 text-xs border border-[#d0d7de] rounded text-center focus:outline-none focus:border-[#0969da]"
  return (
    <div className="flex items-center gap-1">
      <input type="number" min={1} max={20} value={r} onChange={(e) => setR(e.target.value)} className={inputCls} />
      <span className="text-xs text-[#57606a]">×</span>
      <input type="number" min={1} max={20} value={c} onChange={(e) => setC(e.target.value)} className={inputCls} />
      <button
        type="button"
        onClick={() => {
          const rows = Math.max(1, Math.min(20, parseInt(r) || 3))
          const cols = Math.max(1, Math.min(20, parseInt(c) || 3))
          onInsert(rows, cols)
        }}
        className="px-2 py-0.5 text-xs bg-[#0969da] text-white rounded hover:bg-[#0860c9] transition-colors"
      >
        插入
      </button>
    </div>
  )
}

// ── 表格浮动操作条（用 useEditorState 响应式驱动）────────────────────────────
function TableFloatBar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  // useEditorState 订阅光标状态，任何 selectionUpdate / transaction 都会重渲染
  const { isInTable } = useEditorState({
    editor,
    selector: (ctx) => ({
      isInTable: ctx.editor.isActive('table'),
    }),
  })

  if (!isInTable) return null

  const b = "px-2 py-1 text-xs border border-[#d0d7de] rounded bg-white text-[#57606a] hover:bg-[#f0f6ff] hover:border-[#0969da] transition-colors whitespace-nowrap"
  const danger = "px-2 py-1 text-xs border border-[#cf222e] rounded bg-white text-[#cf222e] hover:bg-[#fff0f0] transition-colors whitespace-nowrap"
  const sep = <div className="w-px bg-[#d0d7de] self-stretch" />

  return (
    <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 bg-[#f0f6ff] border-b border-[#b6d4fb] text-xs">
      <span className="text-[#0969da] font-medium mr-0.5 shrink-0">行:</span>
      <button type="button" className={b} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowBefore().run() }}>↑ 上方插入</button>
      <button type="button" className={b} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run() }}>↓ 下方插入</button>
      <button type="button" className={b} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run() }}>删除行</button>
      {sep}
      <span className="text-[#0969da] font-medium mr-0.5 shrink-0">列:</span>
      <button type="button" className={b} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnBefore().run() }}>← 左侧插入</button>
      <button type="button" className={b} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run() }}>→ 右侧插入</button>
      <button type="button" className={b} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run() }}>删除列</button>
      {sep}
      <button type="button" className={danger} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run() }}>删除表格</button>
    </div>
  )
}

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
    <div className="border-b border-[#d0d7de]">
      {/* 主工具栏 */}
      <div className="flex flex-wrap gap-1 p-2 bg-[#f6f8fa]">
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
            <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))} type="button">&quot; 引用</button>
            <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btn(editor.isActive('codeBlock'))} type="button">{'<>'} 代码块</button>
            <div className="w-px bg-[#d0d7de] mx-1" />
            <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)} type="button">— 分割线</button>
            <TablePicker
              onInsert={(rows, cols) =>
                editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
              }
            />
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
      {/* 表格浮动操作条：响应式，光标在表格内时自动出现 */}
      {mode === 'rich' && editor && <TableFloatBar editor={editor} />}
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
      Table.configure({ resizable: true, cellMinWidth: 60 }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: 'prose max-w-none p-4 min-h-[400px] focus:outline-none text-[#1f2328] [&_table]:border-collapse [&_table]:w-auto [&_table]:table-fixed [&_th]:border [&_th]:border-[#d0d7de] [&_th]:bg-[#f6f8fa] [&_th]:px-4 [&_th]:py-1.5 [&_th]:text-left [&_th]:cursor-text [&_th]:align-top [&_th]:overflow-hidden [&_td]:border [&_td]:border-[#d0d7de] [&_td]:px-4 [&_td]:py-1.5 [&_td]:cursor-text [&_td]:align-top [&_td]:overflow-hidden [&_table_p]:my-0 [&_table_p]:leading-normal',
      },
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
      const html = editor?.getHTML() ?? ''
      setMarkdown(turndown.turndown(html))
    } else {
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

  // 粘贴/拖拽图片（富文本模式）
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
            .then((url) => editor.chain().focus().setImage({ src: url }).run())
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
        .then((url) => editor.chain().focus().setImage({ src: url }).run())
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

  // 行高拖拽
  useEffect(() => {
    if (!editor || mode !== 'rich') return
    const dom = editor.view.dom as HTMLElement

    // 给所有 tr 注入拖拽手柄（用 MutationObserver 监听表格变化）
    const injectHandles = () => {
      dom.querySelectorAll<HTMLTableRowElement>('table tr').forEach((tr) => {
        if (tr.querySelector('.row-resize-handle')) return
        const handle = document.createElement('div')
        handle.className = 'row-resize-handle'
        tr.appendChild(handle)

        handle.addEventListener('mousedown', (e: MouseEvent) => {
          e.preventDefault()
          handle.classList.add('dragging')
          const startY = e.clientY
          const cells = Array.from(tr.querySelectorAll<HTMLElement>('td, th'))
          const startHeights = cells.map((c) => c.getBoundingClientRect().height)

          const onMove = (ev: MouseEvent) => {
            const delta = ev.clientY - startY
            cells.forEach((c, i) => {
              const newH = Math.max(28, startHeights[i] + delta)
              c.style.height = `${newH}px`
            })
          }
          const onUp = () => {
            handle.classList.remove('dragging')
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
          }
          document.addEventListener('mousemove', onMove)
          document.addEventListener('mouseup', onUp)
        })
      })
    }

    injectHandles()
    const observer = new MutationObserver(injectHandles)
    observer.observe(dom, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [editor, mode])

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
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + insert.length })
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
        <>
          <style>{`
            /* 列宽拖拽手柄（TipTap resizable 内置） */
            .tiptap .column-resize-handle {
              position: absolute;
              right: -2px;
              top: 0;
              bottom: 0;
              width: 4px;
              background-color: #0969da;
              opacity: 0;
              cursor: col-resize;
              transition: opacity 0.15s;
              z-index: 10;
            }
            .tiptap table:hover .column-resize-handle,
            .tiptap .column-resize-handle:hover {
              opacity: 0.5;
            }
            .tiptap .column-resize-handle:active,
            .tiptap.resize-cursor .column-resize-handle {
              opacity: 1;
            }
            .tiptap.resize-cursor {
              cursor: col-resize;
            }

            /* 表格整体 */
            .tiptap table {
              position: relative;
            }
            .tiptap table td,
            .tiptap table th {
              position: relative;
            }

            /* 选中单元格高亮 */
            .tiptap table td.selectedCell,
            .tiptap table th.selectedCell {
              background-color: #ddf4ff !important;
            }

            /* 消除 prose p margin */
            .tiptap table td > *,
            .tiptap table th > * {
              margin-top: 0 !important;
              margin-bottom: 0 !important;
            }

            /* 行高拖拽手柄 */
            .tiptap table tr {
              position: relative;
            }
            .row-resize-handle {
              position: absolute;
              left: 0;
              right: 0;
              bottom: -3px;
              height: 6px;
              cursor: row-resize;
              z-index: 10;
              background: transparent;
            }
            .row-resize-handle:hover,
            .row-resize-handle.dragging {
              background: linear-gradient(transparent 2px, #0969da 2px, #0969da 4px, transparent 4px);
            }
          `}</style>
          <EditorContent editor={editor!} />
        </>
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
