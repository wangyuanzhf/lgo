'use client'

import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlock from '@tiptap/extension-code-block'
import Image from '@tiptap/extension-image'
import Mathematics from '@tiptap/extension-mathematics'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { useState, useEffect, useRef, useCallback } from 'react'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { uploadImageToStorage } from '@/app/blog/[id]/hooks/useImageUpload'

// CodeBlock 扩展：将 language 属性渲染为 class="language-xxx"
const CodeBlockWithLanguage = CodeBlock.extend({
  addAttributes() {
    return {
      language: {
        default: null,
        parseHTML: (element) => {
          const cls = element.firstElementChild?.className ?? ''
          const match = cls.match(/language-(\S+)/)
          return match ? match[1] : null
        },
        renderHTML: (attributes) => {
          if (!attributes.language) return {}
          return { 'data-language': attributes.language }
        },
      },
    }
  },
  renderHTML({ node, HTMLAttributes }) {
    const lang = node.attrs.language
    return [
      'pre',
      HTMLAttributes,
      ['code', lang ? { class: `language-${lang}` } : {}, 0],
    ]
  },
})

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

// ── Code block language support ──────────────────────────────────────────────
const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python',     label: 'Python'     },
  { value: 'java',       label: 'Java'       },
  { value: 'go',         label: 'Go'         },
  { value: 'rust',       label: 'Rust'       },
  { value: 'c',          label: 'C'          },
  { value: 'cpp',        label: 'C++'        },
  { value: 'csharp',     label: 'C#'         },
  { value: 'php',        label: 'PHP'        },
  { value: 'ruby',       label: 'Ruby'       },
  { value: 'swift',      label: 'Swift'      },
  { value: 'kotlin',     label: 'Kotlin'     },
  { value: 'bash',       label: 'Shell/Bash' },
  { value: 'sql',        label: 'SQL'        },
  { value: 'html',       label: 'HTML'       },
  { value: 'css',        label: 'CSS'        },
  { value: 'json',       label: 'JSON'       },
  { value: 'yaml',       label: 'YAML'       },
  { value: 'markdown',   label: 'Markdown'   },
  { value: 'mermaid',    label: 'Mermaid'    },
  { value: 'plaintext',  label: '纯文本'      },
]

function detectLanguage(code: string): string {
  const c = code
  const tests: [string, RegExp | (() => boolean)][] = [
    ['json', () => { try { const t = c.trim(); JSON.parse(t); return t.startsWith('{') || t.startsWith('[') } catch { return false } }],
    ['mermaid', /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline)\b/m],
    ['html', /<(!DOCTYPE\s+html|html|head|body|div|span|h[1-6]\b|script|style|link|meta)[^>]*>/i],
    ['css', /[.#]?[\w-]+\s*\{[\s\S]*?[\w-]+\s*:[\s\S]*?\}/],
    ['sql', /^\s*(SELECT\s|INSERT\s+INTO\s|UPDATE\s+\w+\s+SET\s|DELETE\s+FROM\s|CREATE\s+(TABLE|DATABASE)\s|DROP\s+|ALTER\s+TABLE\s)/im],
    ['bash', /^#!\/bin\/(bash|sh)\b|^\s*(echo\s|export\s|cd\s|mkdir\s|rm\s|grep\s|chmod\s|apt-get\s|brew\s|pip\s|npm\s|yarn\s)/m],
    ['python', /^\s*(def\s+\w+\s*\(|class\s+\w+[\s:(]|import\s+\w+|from\s+\w+\s+import\s|\bprint\s*\(|elif\b)/m],
    ['typescript', /:\s*(string|number|boolean|void|any|never|unknown)\b|^\s*(interface|type)\s+\w+\s*[={<]|<[A-Z]\w*>/m],
    ['javascript', /\b(const|let|var)\s+\w+\s*=|=>\s*[{(]|console\.(log|error|warn)\s*\(|\brequire\s*\(|module\.exports/],
    ['go', /^package\s+\w+|^\s*func\s+[\w*]*\s*\(|\w+\s*:=\s*/m],
    ['rust', /^\s*(fn\s+\w+|let\s+mut\s|impl\s+\w+|use\s+std::|pub\s+(fn|struct|enum|impl)\s)/m],
    ['csharp', /^\s*(namespace\s+[\w.]+|using\s+[\w.]+;)|Console\.(Write|Read)\w*\s*\(/m],
    ['java', /^\s*(public|private|protected)\s+(class|interface|enum)\s+\w+|System\.out\.print|@Override/m],
    ['cpp', /#include\s*<[\w.]+>|std::|cout\s*<<|cin\s*>>/],
    ['c', /#include\s*<(stdio|stdlib|string|math)\.h>|int\s+main\s*\(/],
    ['swift', /import\s+(Foundation|UIKit|SwiftUI|AppKit)|^\s*(func|class|struct)\s+\w+.*->/m],
    ['kotlin', /fun\s+\w+\s*\(|println\s*\(|val\s+\w+\s*[:=]|data\s+class\s+\w+/],
    ['ruby', /^\s*(def\s+\w+|class\s+\w+|require\s+'|puts\s|attr_accessor\s)/m],
    ['php', /<\?php|\$\w+\s*=(?!=)|\becho\s+/],
    ['yaml', /^---\s*$|^[\w-]+:\s+\S/m],
  ]
  for (const [lang, test] of tests) {
    if (typeof test === 'function' ? test() : test.test(code)) return lang
  }
  return 'plaintext'
}

function getCodeBlockContent(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return ''
  const { state } = editor
  const resolved = state.doc.resolve(state.selection.from)
  for (let d = resolved.depth; d >= 0; d--) {
    const node = resolved.node(d)
    if (node.type.name === 'codeBlock') return node.textContent
  }
  return ''
}

// ── CodeBlockPicker ──────────────────────────────────────────────────────────
function CodeBlockPicker({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const { isActive, currentLanguage } = useEditorState({
    editor,
    selector: (ctx) => ({
      isActive: ctx.editor.isActive('codeBlock'),
      currentLanguage: (ctx.editor.getAttributes('codeBlock').language as string) ?? '',
    }),
  })

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const applyLanguage = (lang: string) => {
    if (!editor) return
    if (isActive) {
      editor.chain().focus().updateAttributes('codeBlock', { language: lang }).run()
    } else {
      editor.chain().focus().setCodeBlock({ language: lang }).run()
    }
    setOpen(false)
    setSearch('')
  }

  const filtered = search.trim()
    ? LANGUAGES.filter(l =>
        l.label.toLowerCase().includes(search.toLowerCase()) ||
        l.value.toLowerCase().includes(search.toLowerCase()))
    : LANGUAGES

  const base = 'px-2 py-1 text-xs border transition-colors'
  const cls = isActive
    ? `${base} bg-[#1f2328] text-white border-[#1f2328]`
    : `${base} bg-white text-[#57606a] border-[#d0d7de] hover:bg-[#f6f8fa]`

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleCodeBlock().run() }}
        className={`${cls} rounded-l rounded-r-none border-r-0`}
        title={isActive ? '退出代码块' : '插入代码块'}
      >
        {'<>'} 代码块
      </button>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o) }}
        className={`${cls} rounded-r rounded-l-none px-1.5`}
        title="选择语言"
      >
        ▾
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-[#d0d7de] rounded-md shadow-lg p-2" style={{ minWidth: 244 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索语言..."
            className="w-full px-2 py-1 mb-2 text-xs border border-[#d0d7de] rounded focus:outline-none focus:border-[#0969da]"
            autoFocus
          />
          <div className="grid grid-cols-3 gap-1 max-h-52 overflow-y-auto">
            {filtered.map((l) => (
              <button
                key={l.value}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyLanguage(l.value) }}
                className={`px-2 py-1 text-xs rounded border transition-colors text-left truncate ${
                  currentLanguage === l.value
                    ? 'bg-[#0969da] text-white border-[#0969da]'
                    : 'bg-white text-[#57606a] border-[#d0d7de] hover:bg-[#f0f6ff] hover:border-[#0969da]'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── CodeBlockFloatBar ────────────────────────────────────────────────────────
function CodeBlockFloatBar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const { isInCodeBlock, currentLanguage } = useEditorState({
    editor,
    selector: (ctx) => ({
      isInCodeBlock: ctx.editor.isActive('codeBlock'),
      currentLanguage: (ctx.editor.getAttributes('codeBlock').language as string) ?? '',
    }),
  })

  if (!isInCodeBlock) return null

  const autoDetect = () => {
    if (!editor) return
    const detected = detectLanguage(getCodeBlockContent(editor))
    editor.chain().focus().updateAttributes('codeBlock', { language: detected }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-[#fff8e1] border-b border-[#ffe082] text-xs">
      <span className="text-[#7d4e00] font-medium shrink-0">代码语言:</span>
      <select
        value={currentLanguage}
        onChange={(e) =>
          editor?.chain().focus().updateAttributes('codeBlock', { language: e.target.value }).run()
        }
        className="px-1.5 py-0.5 text-xs border border-[#d0d7de] rounded bg-white text-[#1f2328] focus:outline-none focus:border-[#0969da] cursor-pointer"
      >
        <option value="">-- 未设置 --</option>
        {LANGUAGES.map((l) => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); autoDetect() }}
        className="px-2 py-0.5 rounded border border-[#ffe082] bg-white text-[#7d4e00] hover:bg-[#fff3cd] hover:border-[#d4a72c] transition-colors"
        title="根据代码内容自动识别语言"
      >
        ⚡ 自动检测
      </button>
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
            <CodeBlockPicker editor={editor} />
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
      {/* 代码块浮动操作条：光标在代码块内时自动出现 */}
      {mode === 'rich' && editor && <CodeBlockFloatBar editor={editor} />}
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
      StarterKit.configure({ codeBlock: false }),
      CodeBlockWithLanguage,
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
  const editorWrapRef = useRef<HTMLDivElement>(null)

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


  // 行高拖拽 —— 用 overlay 层，不碰 TipTap DOM
  useEffect(() => {
    if (!editor || mode !== 'rich' || !editorWrapRef.current) return
    const wrap = editorWrapRef.current
    const editorDom = editor.view.dom as HTMLElement

    // overlay 容器：绝对定位覆盖在编辑器上，pointer-events:none 默认透传
    let overlay = wrap.querySelector<HTMLDivElement>('.row-resize-overlay')
    if (!overlay) {
      overlay = document.createElement('div')
      overlay.className = 'row-resize-overlay'
      overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:20'
      wrap.appendChild(overlay)
    }
    const ov = overlay

    const syncHandles = () => {
      if (!wrap || !ov) return
      // 清除旧手柄
      ov.innerHTML = ''
      const wrapRect = wrap.getBoundingClientRect()

      editorDom.querySelectorAll<HTMLTableRowElement>('table tr').forEach((tr) => {
        const trRect = tr.getBoundingClientRect()
        const handle = document.createElement('div')
        handle.style.cssText = `
          position:absolute;
          left:${trRect.left - wrapRect.left}px;
          top:${trRect.bottom - wrapRect.top - 3}px;
          width:${trRect.width}px;
          height:6px;
          cursor:row-resize;
          pointer-events:all;
          background:transparent;
          transition:background 0.1s;
          z-index:20;
        `
        handle.addEventListener('mouseenter', () => {
          handle.style.background = 'linear-gradient(transparent 2px,#0969da 2px,#0969da 4px,transparent 4px)'
        })
        handle.addEventListener('mouseleave', () => {
          if (!handle.dataset.dragging) handle.style.background = 'transparent'
        })
        handle.addEventListener('mousedown', (e: MouseEvent) => {
          e.preventDefault()
          handle.dataset.dragging = '1'
          handle.style.background = 'linear-gradient(transparent 2px,#0969da 2px,#0969da 4px,transparent 4px)'
          const startY = e.clientY
          const cells = Array.from(tr.querySelectorAll<HTMLElement>('td, th'))
          const startHeights = cells.map((c) => c.getBoundingClientRect().height)

          const onMove = (ev: MouseEvent) => {
            const delta = ev.clientY - startY
            cells.forEach((c, i) => {
              c.style.height = `${Math.max(28, startHeights[i] + delta)}px`
            })
            syncHandles()
          }
          const onUp = () => {
            delete handle.dataset.dragging
            handle.style.background = 'transparent'
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
            syncHandles()
          }
          document.addEventListener('mousemove', onMove)
          document.addEventListener('mouseup', onUp)
        })
        ov.appendChild(handle)
      })
    }

    syncHandles()
    const observer = new MutationObserver(syncHandles)
    observer.observe(editorDom, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] })
    window.addEventListener('resize', syncHandles)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncHandles)
      ov.innerHTML = ''
    }
  }, [editor, mode])
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
    <div className="bg-white border border-[#d0d7de] rounded-md">
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
        <div ref={editorWrapRef} style={{ position: 'relative' }}>
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
            .tiptap table {
              position: relative;
            }
            .tiptap table td,
            .tiptap table th {
              position: relative;
            }
            .tiptap table td.selectedCell,
            .tiptap table th.selectedCell {
              background-color: #ddf4ff !important;
            }
            .tiptap table td > *,
            .tiptap table th > * {
              margin-top: 0 !important;
              margin-bottom: 0 !important;
            }
          `}</style>
          <EditorContent editor={editor!} />
        </div>
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
