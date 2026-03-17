'use client'

import { useRef, useCallback } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
}

/**
 * 类 Mubu 大纲编辑器
 * - Enter：在当前行下方插入同级节点（同缩进）
 * - Tab：当前行增加一级缩进
 * - Shift+Tab：当前行减少一级缩进
 * - Backspace 在行首空白时：减少缩进（类 Mubu 行为）
 */
export default function OutlineEditor({ value, onChange }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = taRef.current!
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = ta.value

    // 找到当前行范围
    const lineStart = text.lastIndexOf('\n', start - 1) + 1
    const lineEnd = text.indexOf('\n', start)
    const lineEndActual = lineEnd === -1 ? text.length : lineEnd
    const currentLine = text.slice(lineStart, lineEndActual)
    const indent = currentLine.match(/^\t*/)?.[0] ?? ''

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // 在行尾插入换行 + 同缩进
      const insert = '\n' + indent
      const newText = text.slice(0, lineEndActual) + insert + text.slice(lineEndActual)
      onChange(newText)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = lineEndActual + insert.length
      })
      return
    }

    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      if (start === end) {
        // 光标在行内某处 → 给整行增加一个 Tab
        const newText = text.slice(0, lineStart) + '\t' + text.slice(lineStart)
        onChange(newText)
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 1
        })
      } else {
        // 选中多行 → 每行加 Tab
        const selText = text.slice(start, end)
        const indented = selText.replace(/^/gm, '\t')
        const newText = text.slice(0, start) + indented + text.slice(end)
        onChange(newText)
        requestAnimationFrame(() => {
          ta.selectionStart = start
          ta.selectionEnd = start + indented.length
        })
      }
      return
    }

    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      if (start === end) {
        // 光标在行内 → 整行减少一个 Tab
        if (currentLine.startsWith('\t')) {
          const newText = text.slice(0, lineStart) + text.slice(lineStart + 1)
          onChange(newText)
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = Math.max(lineStart, start - 1)
          })
        }
      } else {
        const selText = text.slice(start, end)
        const dedented = selText.replace(/^\t/gm, '')
        const newText = text.slice(0, start) + dedented + text.slice(end)
        onChange(newText)
        requestAnimationFrame(() => {
          ta.selectionStart = start
          ta.selectionEnd = start + dedented.length
        })
      }
      return
    }

    // Backspace 在行首只有缩进时：减少一级
    if (e.key === 'Backspace' && start === end) {
      const beforeCursor = text.slice(lineStart, start)
      if (beforeCursor.length > 0 && /^\t+$/.test(beforeCursor)) {
        e.preventDefault()
        const newText = text.slice(0, start - 1) + text.slice(start)
        onChange(newText)
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start - 1
        })
      }
    }
  }, [onChange])

  return (
    <textarea
      ref={taRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      spellCheck={false}
      className="w-full h-full min-h-[500px] p-4 font-mono text-sm text-[#1f2328] focus:outline-none resize-none leading-7 bg-white"
      placeholder={`中心主题\n\t分支 A\n\t\t子节点 1\n\t\t子节点 2\n\t分支 B\n\n用 Tab 缩进，Enter 新建同级，Shift+Tab 减少缩进`}
    />
  )
}
