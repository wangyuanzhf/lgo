'use client'

import { useEditor, EditorContent, useEditorState, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Mathematics from '@tiptap/extension-mathematics'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { useState, useEffect, useRef, useCallback } from 'react'
import { markedWithMath } from '@/lib/markedWithMath'
import TurndownService from 'turndown'
import { uploadImageToStorage } from '@/app/blog/[id]/hooks/useImageUpload'

const lowlight = createLowlight(common)

// ── CodeBlock NodeView：每个代码块内嵌独立语言栏 ─────────────────────────────
function CodeBlockNodeView({
  node,
  updateAttributes,
}: {
  node: { attrs: { language: string | null }; textContent: string }
  updateAttributes: (attrs: Record<string, unknown>) => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const lang = node.attrs.language ?? ''

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const setLang = (v: string) => { updateAttributes({ language: v }); setOpen(false); setSearch('') }

  const autoDetect = () => {
    const detected = detectLanguage(node.textContent)
    updateAttributes({ language: detected })
  }

  const filtered = search.trim()
    ? LANGUAGES.filter(l => l.label.toLowerCase().includes(search.toLowerCase()) || l.value.toLowerCase().includes(search.toLowerCase()))
    : LANGUAGES

  const displayLabel = LANGUAGES.find(l => l.value === lang)?.label ?? (lang || '未设置语言')

  return (
    <NodeViewWrapper className="relative my-4">
      {/* 语言操作栏 */}
      <div
        className="flex items-center gap-2 px-3 py-1 bg-[#2d333b] rounded-t-md border-b border-[#444c56] select-none"
        contentEditable={false}
      >
        {/* 语言选择按钮 */}
        <div ref={pickerRef} className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o) }}
            className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-[#444c56] text-[#adbac7] hover:bg-[#545d68] hover:text-white transition-colors"
          >
            <span>{displayLabel}</span>
            <span className="opacity-60">▾</span>
          </button>
          {open && (
            <div
              className="absolute left-0 top-full mt-1 z-50 bg-white border border-[#d0d7de] rounded-md shadow-xl p-2"
              style={{ minWidth: 232 }}
            >
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索语言..."
                className="w-full px-2 py-1 mb-2 text-xs border border-[#d0d7de] rounded focus:outline-none focus:border-[#0969da]"
                autoFocus
                onMouseDown={e => e.stopPropagation()}
              />
              <div className="grid grid-cols-3 gap-1 max-h-48 overflow-y-auto">
                {filtered.map(l => (
                  <button
                    key={l.value}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setLang(l.value) }}
                    className={`px-2 py-1 text-xs rounded border transition-colors text-left truncate ${
                      lang === l.value
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

        {/* 自动检测 */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); autoDetect() }}
          className="px-2 py-0.5 text-xs rounded bg-[#444c56] text-[#adbac7] hover:bg-[#545d68] hover:text-white transition-colors"
          title="根据代码内容自动识别语言"
        >
          ⚡ 自动检测
        </button>
      </div>

      {/* 代码内容 */}
      <pre className="!my-0 !rounded-t-none"><NodeViewContent as={"code" as "div"} className={lang ? `language-${lang}` : ''} /></pre>
    </NodeViewWrapper>
  )
}

// CodeBlock 扩展：基于 lowlight 实现语法高亮，并挂载自定义语言栏 NodeView
const CodeBlockWithLanguage = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView as unknown as Parameters<typeof ReactNodeViewRenderer>[0])
  },
}).configure({ lowlight })

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })

// ── 数学公式：TipTap Mathematics 生成的节点 → $...$ / $$...$$ ──────────────
// block math: <div data-type="math" data-latex="...">
turndown.addRule('mathBlock', {
  filter(node) {
    return node.nodeName === 'DIV' && (node as HTMLElement).dataset.type === 'math'
  },
  replacement(_content, node) {
    const latex = (node as HTMLElement).dataset.latex ?? ''
    return `\n\n$$\n${latex}\n$$\n\n`
  },
})
// inline math: <span data-type="inlineMath" data-latex="...">
turndown.addRule('mathInline', {
  filter(node) {
    return node.nodeName === 'SPAN' && (node as HTMLElement).dataset.type === 'inlineMath'
  },
  replacement(_content, node) {
    const latex = (node as HTMLElement).dataset.latex ?? ''
    return `$${latex}$`
  },
})
// KaTeX 已渲染的节点（<span class="katex">）→ 提取原始 LaTeX 并转回 $...$
// KaTeX block: 父元素是 <span class="katex-display">
turndown.addRule('katexDisplay', {
  filter(node) {
    return (
      node.nodeName === 'SPAN' &&
      (node as HTMLElement).classList.contains('katex-display')
    )
  },
  replacement(_content, node) {
    const annotation = (node as HTMLElement).querySelector('annotation[encoding="application/x-tex"]')
    const latex = annotation?.textContent?.trim() ?? ''
    return latex ? `\n\n$$\n${latex}\n$$\n\n` : ''
  },
})
turndown.addRule('katexInline', {
  filter(node) {
    return (
      node.nodeName === 'SPAN' &&
      (node as HTMLElement).classList.contains('katex') &&
      !(node as HTMLElement).closest('.katex-display')
    )
  },
  replacement(_content, node) {
    const annotation = (node as HTMLElement).querySelector('annotation[encoding="application/x-tex"]')
    const latex = annotation?.textContent?.trim() ?? ''
    return latex ? `$${latex}$` : ''
  },
})

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

// ── 超链接浮动弹框 ────────────────────────────────────────────────────────────
function LinkPopover({
  editor,
  wrapRef,
}: {
  editor: ReturnType<typeof useEditor>
  wrapRef: React.RefObject<HTMLDivElement | null>
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [popMode, setPopMode] = useState<'add' | 'edit' | null>(null)
  const [url, setUrl] = useState('')
  const [inputVal, setInputVal] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 监听选区变化
  useEffect(() => {
    if (!editor) return
    const update = () => {
      const { state, view } = editor
      const { from, empty } = state.selection
      const wrap = wrapRef.current
      if (!wrap) return
      const wrapRect = wrap.getBoundingClientRect()

      // 光标在链接上 → edit 模式
      if (empty && editor.isActive('link')) {
        const attrs = editor.getAttributes('link')
        const coords = view.coordsAtPos(from)
        setUrl(attrs.href ?? '')
        setInputVal(attrs.href ?? '')
        setPos({ top: coords.top - wrapRect.top - 44, left: coords.left - wrapRect.left })
        setPopMode('edit')
        return
      }

      // 有选中文字 → add 模式
      if (!empty) {
        const coords = view.coordsAtPos(from)
        setInputVal('')
        setPos({ top: coords.top - wrapRect.top - 44, left: coords.left - wrapRect.left })
        setPopMode('add')
        return
      }

      setPopMode(null)
      setPos(null)
    }

    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor, wrapRef])

  // 点击弹框外关闭
  useEffect(() => {
    if (!popMode) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPopMode(null)
        setPos(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popMode])

  // 弹出时自动聚焦
  useEffect(() => {
    if (popMode) setTimeout(() => inputRef.current?.focus(), 30)
  }, [popMode])

  if (!popMode || !pos || !editor) return null

  const confirm = () => {
    const val = inputVal.trim()
    if (!val) return
    const href = val.startsWith('http') ? val : `https://${val}`
    editor.chain().focus().setLink({ href }).run()
    setPopMode(null)
    setPos(null)
  }

  const remove = () => {
    editor.chain().focus().unsetLink().run()
    setPopMode(null)
    setPos(null)
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: Math.max(4, pos.top), left: Math.max(4, pos.left), zIndex: 50 }}
      className="flex items-center gap-1 bg-white border border-[#d0d7de] rounded-md shadow-lg px-2 py-1.5"
      onMouseDown={(e) => e.preventDefault()}
    >
      {popMode === 'edit' && (
        <span className="text-xs text-[#57606a] max-w-[140px] truncate mr-1">{url}</span>
      )}
      <input
        ref={inputRef}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirm()
          if (e.key === 'Escape') { setPopMode(null); setPos(null) }
        }}
        placeholder="输入链接地址"
        className="text-xs border border-[#d0d7de] rounded px-2 py-1 w-44 focus:outline-none focus:border-[#0969da]"
      />
      <button type="button" onClick={confirm} className="text-xs px-2 py-1 bg-[#0969da] text-white rounded hover:bg-[#0860ca]">
        {popMode === 'edit' ? '修改' : '添加'}
      </button>
      {popMode === 'edit' && (
        <button type="button" onClick={remove} className="text-xs px-2 py-1 bg-white border border-[#d0d7de] text-[#cf222e] rounded hover:bg-[#fff0ee]">
          删除
        </button>
      )}
    </div>
  )
}

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
    ['json',       () => { try { const t = c.trim(); JSON.parse(t); return t.startsWith('{') || t.startsWith('[') } catch { return false } }],
    ['mermaid',    /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline)\b/m],
    ['html',       /<(!DOCTYPE\s+html|html|head|body|div|span|h[1-6]\b|script|style|link|meta)[^>]*>/i],
    ['sql',        /^\s*(SELECT\s|INSERT\s+INTO\s|UPDATE\s+\w+\s+SET\s|DELETE\s+FROM\s|CREATE\s+(TABLE|DATABASE)\s|DROP\s+|ALTER\s+TABLE\s)/im],
    ['bash',       /^#!\/bin\/(bash|sh)\b|^\s*(echo\s+|export\s+\w+=|cd\s+|mkdir\s+|rm\s+|grep\s+|chmod\s+|apt-get\s|brew\s+install|pip\s+install|npm\s+install)/m],
    ['python',     /^\s*(def\s+\w+\s*\(|class\s+\w+[\s:(]|import\s+\w+|from\s+\w+\s+import\s|\bprint\s*\(|elif\b|lambda\s+\w)|#.*\bPython\b/m],
    ['typescript', /:\s*(string|number|boolean|void|any|never|unknown)\b|^\s*(interface|type)\s+\w+\s*[={<]|<[A-Z]\w*>/m],
    ['javascript', /\b(const|let|var)\s+\w+\s*=|=>\s*[{(]|console\.(log|error|warn)\s*\(|\brequire\s*\(|module\.exports/],
    ['go',         /^package\s+\w+|^\s*func\s+[\w*]*\s*\(|\w+\s*:=\s*/m],
    ['rust',       /^\s*(fn\s+\w+|let\s+mut\s|impl\s+\w+|use\s+std::|pub\s+(fn|struct|enum|impl)\s)/m],
    ['csharp',     /^\s*(namespace\s+[\w.]+|using\s+[\w.]+;)|Console\.(Write|Read)\w*\s*\(/m],
    ['java',       /^\s*(public|private|protected)\s+(class|interface|enum)\s+\w+|System\.out\.print|@Override/m],
    ['cpp',        /#include\s*<[\w.]+>|std::|cout\s*<<|cin\s*>>/],
    ['c',          /#include\s*<(stdio|stdlib|string|math)\.h>|int\s+main\s*\(/],
    ['swift',      /import\s+(Foundation|UIKit|SwiftUI|AppKit)|^\s*(func|class|struct)\s+\w+.*->/m],
    ['kotlin',     /fun\s+\w+\s*\(|println\s*\(|val\s+\w+\s*[:=]|data\s+class\s+\w+/],
    ['ruby',       /^\s*(def\s+\w+|class\s+\w+|require\s+'|puts\s|attr_accessor\s)/m],
    ['php',        /<\?php|\$\w+\s*=(?!=)|\becho\s+/],
    // CSS: must see selector { property: value } all on recognizable lines, no generic { } match
    ['css',        /^[.#]?[\w-]+[\s\w,>+~[\]:.-]*\s*\{[^}]*[\w-]+\s*:[^}]+\}/m],
    ['yaml',       /^---\s*$|^[\w-]+:\s+\S/m],
  ]
  for (const [lang, test] of tests) {
    if (typeof test === 'function' ? test() : test.test(code)) return lang
  }
  return 'plaintext'
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
  onModeChange: (m: Mode) => void | Promise<void>
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
      StarterKit.configure({ codeBlock: false }),
      CodeBlockWithLanguage,
      Image,
      Link.configure({ openOnClick: false }),
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

  // 切换模式时同步内容
  const switchMode = useCallback(async (newMode: Mode) => {
    if (newMode === mode) return
    if (newMode === 'markdown') {
      // 富文本 → Markdown
      setMarkdown(turndown.turndown(editor?.getHTML() ?? ''))
    } else {
      // Markdown → 富文本
      editor?.commands.setContent(await markedWithMath(markdown))
    }
    setMode(newMode)
  }, [mode, editor, markdown])

  const getHTML = useCallback(async (): Promise<string> => {
    if (mode === 'markdown') return await markedWithMath(markdown)
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
          {editor && <LinkPopover editor={editor} wrapRef={editorWrapRef} />}
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
