'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import katex from 'katex'
import mermaid from 'mermaid'
import { common, createLowlight } from 'lowlight'
import { toHtml } from 'hast-util-to-html'

mermaid.initialize({ startOnLoad: false, theme: 'default' })

const lowlight = createLowlight(common)

function highlightCode(el: HTMLElement) {
  const blocks = el.querySelectorAll<HTMLElement>('pre code')
  for (const block of blocks) {
    // skip if already highlighted or is a mermaid block
    if (block.dataset.highlighted) continue
    const cls = block.className ?? ''
    const match = cls.match(/language-(\S+)/)
    const lang = match?.[1]
    if (!lang || lang === 'mermaid' || lang === 'plaintext') continue
    try {
      const tree = lowlight.highlight(lang, block.textContent ?? '')
      block.innerHTML = toHtml(tree as Parameters<typeof toHtml>[0])
      block.dataset.highlighted = '1'
    } catch {
      // unsupported language — leave as-is
    }
  }
}

/**
 * 从 innerHTML 中还原被 marked 破坏的 LaTeX：
 * marked 把 _..._  转成了 <em>...</em>，导致下划线丢失。
 * 把 <em>X</em> → _X_、<strong>X</strong> → __X__ 之后再去掉剩余标签。
 */
function recoverLatexFromHtml(html: string): string {
  return html
    .replace(/<em>([\s\S]*?)<\/em>/gi, '_$1_')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '__$1__')
    .replace(/<[^>]+>/g, '')      // 去掉其余 HTML 标签
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function renderMath(el: HTMLElement) {
  // ── 1. Block math：处理 <p>/<li>/<div> 等整段都是 $$...$$ 的元素 ──
  //
  // marked 有时会把公式内的 _..._  转成 <em>，用 textContent 就丢失了 _。
  // 改用 innerHTML 还原 <em> → _..._，再送给 KaTeX。
  const blockCandidates = Array.from(
    el.querySelectorAll<HTMLElement>('p, li, td, th')
  )
  for (const node of blockCandidates) {
    // 跳过包含子块元素（嵌套 p/ul/pre 等）的节点
    if (node.querySelector('p, ul, ol, pre, blockquote, table')) continue

    // 用 innerHTML 做匹配：允许内部有 <em>/<strong> 等标签
    const raw = node.innerHTML.trim()
    // 整段都是 $$...$$（可能含 HTML 标签）
    const blockMatch = raw.match(/^\$\$([\s\S]+?)\$\$$/)
    if (!blockMatch) continue

    const latex = recoverLatexFromHtml(blockMatch[1])
    try {
      const rendered = katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
      })
      const wrapper = document.createElement('div')
      wrapper.className = 'katex-block my-4 text-center overflow-x-auto'
      wrapper.innerHTML = rendered
      node.replaceWith(wrapper)
    } catch { /* 保留原始节点 */ }
  }

  // ── 2. Inline math：文本节点遍历处理 $...$ ────────────────────────
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let p = node.parentElement
      while (p && p !== el) {
        if (['PRE', 'CODE', 'SCRIPT', 'STYLE'].includes(p.tagName))
          return NodeFilter.FILTER_REJECT
        // 跳过已渲染的 KaTeX 节点
        if (p.classList.contains('katex') || p.classList.contains('katex-block'))
          return NodeFilter.FILTER_REJECT
        p = p.parentElement
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)

  for (const node of nodes) {
    const text = node.textContent ?? ''
    if (!text.includes('$')) continue

    const span = document.createElement('span')
    span.innerHTML = text
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
        try { return katex.renderToString(math, { displayMode: true, throwOnError: false }) }
        catch { return `$$${math}$$` }
      })
      .replace(/\$([^$\n]+?)\$/g, (_, math) => {
        try { return katex.renderToString(math, { displayMode: false, throwOnError: false }) }
        catch { return `$${math}$` }
      })

    if (span.innerHTML !== text) node.replaceWith(span)
  }
}

function fixMermaidLabels(code: string): string {
  return code.replace(/\[([^\]"[\n]*\([^\]"[\n]*)\]/g, '["$1"]')
}

async function renderMermaid(el: HTMLElement) {
  const MERMAID_KEYWORDS = /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline|journey)\b/

  const blocks = el.querySelectorAll<HTMLElement>('pre code')
  for (const block of blocks) {
    const cls = block.className ?? ''
    const code = block.textContent ?? ''
    const isMermaid = cls.includes('language-mermaid') || MERMAID_KEYWORDS.test(code)
    if (!isMermaid) continue

    const id = `mermaid-${Math.random().toString(36).slice(2)}`
    try {
      const { svg } = await mermaid.render(id, fixMermaidLabels(code.trim()))
      const wrapper = document.createElement('div')
      wrapper.className = 'mermaid-diagram my-4 overflow-x-auto'
      wrapper.innerHTML = svg
      block.closest('pre')!.replaceWith(wrapper)
    } catch { /* 保留原始代码块 */ }
  }
}

const MIN_SCALE = 1
const MAX_SCALE = 8

export default function PostContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  // lightbox state
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  // 'zoom-in' | 'zoom-out' | 'grabbing'
  const [cursor, setCursor] = useState<'zoom-in' | 'zoom-out' | 'grabbing'>('zoom-in')

  const dragRef = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 })
  const hasDragged = useRef(false)

  // ── open / close ────────────────────────────────────────────
  const openLightbox = useCallback((src: string) => {
    setLightboxSrc(src)
    setScale(1)
    setOffset({ x: 0, y: 0 })
    setCursor('zoom-in')
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxSrc(null)
    setScale(1)
    setOffset({ x: 0, y: 0 })
    setCursor('zoom-in')
  }, [])

  // ── render math / mermaid ───────────────────────────────────
  useEffect(() => {
    if (!ref.current) return
    renderMath(ref.current)
    renderMermaid(ref.current).then(() => {
      // highlight after mermaid (mermaid replaces some pre blocks)
      if (ref.current) highlightCode(ref.current)
    })
    highlightCode(ref.current)
  }, [html])

  // ── event delegation: click on any <img> inside content ─────
  // Attached to the React-managed container, never lost on re-render.
  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'IMG') {
      openLightbox((target as HTMLImageElement).src)
    }
  }, [openLightbox])

  // ── ESC to close ────────────────────────────────────────────
  useEffect(() => {
    if (!lightboxSrc) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxSrc, closeLightbox])

  // ── keep cursor in sync with scale ──────────────────────────
  useEffect(() => {
    if (!lightboxSrc) return
    setCursor(scale > 1 ? 'zoom-out' : 'zoom-in')
  }, [scale, lightboxSrc])

  // ── wheel zoom (attached as non-passive so we can preventDefault) ──
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.12 : 0.9
      setScale(s => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor))
        // if clamped back to 1, reset offset
        if (next === MIN_SCALE) setOffset({ x: 0, y: 0 })
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [lightboxSrc])

  // ── drag to pan ─────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return
    e.preventDefault()
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y }
    hasDragged.current = false
    setCursor('grabbing')
  }, [scale, offset])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.active) return
    hasDragged.current = true
    setOffset({
      x: dragRef.current.ox + e.clientX - dragRef.current.startX,
      y: dragRef.current.oy + e.clientY - dragRef.current.startY,
    })
  }, [])

  const onMouseUp = useCallback(() => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    setCursor(scale > 1 ? 'zoom-out' : 'zoom-in')
  }, [scale])

  // ── click image to toggle zoom ───────────────────────────────
  const onImgClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasDragged.current) return   // drag-end, not a real click
    if (scale > 1) {
      setScale(1)
      setOffset({ x: 0, y: 0 })
    } else {
      setScale(2.5)
    }
  }, [scale])

  return (
    <>
      {/* [&_img]:cursor-zoom-in ensures the cursor is always applied via CSS */}
      <div
        ref={ref}
        onClick={handleContentClick}
        className="p-6 prose max-w-none text-[#1f2328] prose-headings:text-[#1f2328] prose-a:text-[#0969da] prose-code:text-[#cf222e] prose-code:bg-[#f6f8fa] prose-code:px-1 prose-code:rounded prose-pre:bg-[#1f2328] [&_pre_code]:text-inherit [&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:rounded-none [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_th]:border-[#d0d7de] [&_th]:bg-[#f6f8fa] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-[#d0d7de] [&_td]:px-3 [&_td]:py-2 [&_img]:cursor-zoom-in"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {lightboxSrc && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm select-none"
          onClick={closeLightbox}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt=""
            draggable={false}
            style={{
              cursor,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transition: dragRef.current.active ? 'none' : 'transform 0.15s ease',
            }}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-md shadow-2xl"
            onClick={onImgClick}
            onMouseDown={onMouseDown}
          />

          {/* 缩放比例提示 */}
          {scale !== 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white/80 text-xs pointer-events-none">
              {Math.round(scale * 100)}%
            </div>
          )}

          {/* 操作说明 */}
          <div className="absolute bottom-4 right-4 text-white/40 text-xs pointer-events-none text-right leading-relaxed">
            滚轮缩放 · 点击{scale > 1 ? '还原' : '放大'} · ESC 关闭
          </div>

          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="关闭"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
