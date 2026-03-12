'use client'

import { useEffect, useRef } from 'react'
import katex from 'katex'

function renderMath(el: HTMLElement) {
  const text = el.innerHTML

  // display math: $$...$$
  const result = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: true, throwOnError: false })
    } catch { return _ }
  })
  // inline math: $...$
  .replace(/\$([^$\n]+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: false, throwOnError: false })
    } catch { return _ }
  })

  if (result !== text) el.innerHTML = result
}

export default function PostContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) renderMath(ref.current)
  }, [html])

  return (
    <div
      ref={ref}
      className="p-6 prose max-w-none text-[#1f2328] prose-headings:text-[#1f2328] prose-a:text-[#0969da] prose-code:text-[#cf222e] prose-code:bg-[#f6f8fa] prose-code:px-1 prose-code:rounded prose-pre:bg-[#1f2328]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
