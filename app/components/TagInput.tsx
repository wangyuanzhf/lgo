'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
  onSuggest?: () => void
  suggesting?: boolean
  type: 'post' | 'mindmap'
}

export default function TagInput({ tags, onChange, suggestions, onSuggest, suggesting, type }: TagInputProps) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = input.trim()
    ? suggestions.filter(
        (s) => s.toLowerCase().includes(input.trim().toLowerCase()) && !tags.includes(s)
      )
    : suggestions.filter((s) => !tags.includes(s))

  const addTag = useCallback(
    (tag: string) => {
      const t = tag.trim()
      if (!t || tags.includes(t) || tags.length >= 10) return
      onChange([...tags, t])
      setInput('')
      setOpen(false)
      inputRef.current?.focus()
    },
    [tags, onChange]
  )

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (filtered.length > 0 && input.trim()) {
        addTag(filtered[0])
      } else {
        addTag(input)
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const showDropdown = open && filtered.length > 0

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#57606a] shrink-0">标签</span>
        {onSuggest && (
          <button
            type="button"
            onClick={onSuggest}
            disabled={suggesting}
            className="text-xs text-[#0969da] hover:underline disabled:opacity-50 shrink-0"
          >
            {suggesting ? 'AI 生成中...' : '✦ AI 生成'}
          </button>
        )}
      </div>

      <div ref={containerRef} className="relative">
        <div
          className="flex flex-wrap gap-1.5 min-h-[36px] px-2 py-1.5 border border-[#d0d7de] rounded-md bg-white cursor-text focus-within:border-[#0969da]"
          onClick={() => inputRef.current?.focus()}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-[#ddf4ff] text-[#0969da] border border-[#b6e3ff] rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
                className="hover:text-[#0550ae] leading-none"
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? '输入标签，回车确认' : ''}
            className="flex-1 min-w-[120px] text-xs text-[#1f2328] placeholder-[#8d96a0] focus:outline-none bg-transparent"
          />
        </div>

        {showDropdown && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[#d0d7de] rounded-md shadow-sm max-h-40 overflow-y-auto">
            {filtered.slice(0, 8).map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addTag(s) }}
                className="w-full text-left px-3 py-1.5 text-xs text-[#1f2328] hover:bg-[#f6f8fa] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-[#8d96a0]">最多 10 个标签，每个标签最长 20 字</p>
    </div>
  )
}
