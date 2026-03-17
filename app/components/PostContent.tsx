'use client'

import { useEffect, useRef } from 'react'
import katex from 'katex'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: 'default' })

function renderMath(el: HTMLElement) {
  // 收集所有不在 pre/code 内的文本节点
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let p = node.parentElement
      while (p && p !== el) {
        if (p.tagName === 'PRE' || p.tagName === 'CODE') return NodeFilter.FILTER_REJECT
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
    // 先处理 $$...$$，再处理 $...$
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
  // 把含有括号的节点标签加引号，避免 Mermaid 把 ( 解析为形状语法
  // 例: [O(n²) 注意力] → ["O(n²) 注意力"]
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

export default function PostContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    renderMath(ref.current)
    renderMermaid(ref.current)
  }, [html])

  return (
    <div
      ref={ref}
      className="p-6 prose max-w-none text-[#1f2328] prose-headings:text-[#1f2328] prose-a:text-[#0969da] prose-code:text-[#cf222e] prose-code:bg-[#f6f8fa] prose-code:px-1 prose-code:rounded prose-pre:bg-[#1f2328] [&_pre_code]:text-inherit [&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:rounded-none [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_th]:border-[#d0d7de] [&_th]:bg-[#f6f8fa] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-[#d0d7de] [&_td]:px-3 [&_td]:py-2"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
