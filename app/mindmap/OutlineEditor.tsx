'use client'

import { useRef, useCallback, useState } from 'react'
import { genId } from './outlineUtils'

export interface OutlineNode {
  id: string
  depth: number
  text: string
  fontSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  bold?: boolean
  color?: string
}

const FONT_SIZE_CLASS: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}

const FONT_SIZE_LABEL: Record<string, string> = {
  xs: 'XS', sm: 'S', md: 'M', lg: 'L', xl: 'XL',
}

const INDENT_PX = 24
const BULLET_COLORS = [
  '#1f2328', '#0969da', '#1a7f37', '#cf222e', '#7d4e00', '#6e40c9', '#8d96a0',
]

interface Props {
  nodes: OutlineNode[]
  onChange: (nodes: OutlineNode[]) => void
}

export default function OutlineEditor({ nodes, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null

  // ── 更新节点文字 ──
  const updateText = useCallback((id: string, text: string) => {
    onChange(nodes.map((n) => (n.id === id ? { ...n, text } : n)))
  }, [nodes, onChange])

  // ── 更新节点样式 ──
  const updateStyle = useCallback((patch: Partial<OutlineNode>) => {
    if (!selectedId) return
    onChange(nodes.map((n) => (n.id === selectedId ? { ...n, ...patch } : n)))
  }, [nodes, onChange, selectedId])

  // ── 键盘处理 ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    const node = nodes[idx]

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // 非根节点：最小 depth 为 1（不能与中心主题同级）
      const newDepth = idx === 0 ? 1 : Math.max(1, node.depth)
      const newNode: OutlineNode = { id: genId(), depth: newDepth, text: '' }
      const next = [...nodes]
      next.splice(idx + 1, 0, newNode)
      onChange(next)
      requestAnimationFrame(() => inputRefs.current[newNode.id]?.focus())
      return
    }

    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      // 最大缩进：父节点的 depth + 1
      const parentDepth = idx > 0 ? nodes[idx - 1].depth : 0
      const maxDepth = parentDepth + 1
      if (node.depth < maxDepth) {
        onChange(nodes.map((n, i) => i === idx ? { ...n, depth: n.depth + 1 } : n))
      }
      return
    }

    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      // 非第一行最小 depth = 1，第一行保持 0
      const minDepth = idx === 0 ? 0 : 1
      if (node.depth > minDepth) {
        onChange(nodes.map((n, i) => i === idx ? { ...n, depth: n.depth - 1 } : n))
      }
      return
    }

    if (e.key === 'Backspace' && node.text === '' && nodes.length > 1 && idx !== 0) {
      e.preventDefault()
      const next = nodes.filter((_, i) => i !== idx)
      onChange(next)
      const focusIdx = Math.max(0, idx - 1)
      requestAnimationFrame(() => {
        const id = next[focusIdx]?.id
        if (id) inputRefs.current[id]?.focus()
      })
      return
    }

    if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault()
      inputRefs.current[nodes[idx - 1].id]?.focus()
      return
    }
    if (e.key === 'ArrowDown' && idx < nodes.length - 1) {
      e.preventDefault()
      inputRefs.current[nodes[idx + 1].id]?.focus()
    }
  }, [nodes, onChange])

  return (
    <div className="flex flex-col h-full">
      {/* ── 格式工具栏 ── */}
      <div className={`flex items-center gap-2 px-4 py-1.5 border-b border-[#d0d7de] bg-[#f6f8fa] transition-opacity ${selectedNode ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <span className="text-xs text-[#57606a] mr-1">格式:</span>

        {/* 字号 */}
        <div className="flex rounded border border-[#d0d7de] overflow-hidden">
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((fs) => (
            <button
              key={fs}
              type="button"
              onClick={() => updateStyle({ fontSize: fs })}
              className={`px-2 py-0.5 text-xs transition-colors border-r last:border-r-0 border-[#d0d7de] ${
                (selectedNode?.fontSize ?? 'md') === fs
                  ? 'bg-[#1f2328] text-white'
                  : 'bg-white text-[#57606a] hover:bg-[#f0f3f6]'
              }`}
            >
              {FONT_SIZE_LABEL[fs]}
            </button>
          ))}
        </div>

        {/* 加粗 */}
        <button
          type="button"
          onClick={() => updateStyle({ bold: !selectedNode?.bold })}
          className={`px-2.5 py-0.5 text-xs font-bold rounded border border-[#d0d7de] transition-colors ${
            selectedNode?.bold ? 'bg-[#1f2328] text-white' : 'bg-white text-[#57606a] hover:bg-[#f0f3f6]'
          }`}
        >
          B
        </button>

        {/* 颜色 */}
        <div className="flex items-center gap-1">
          {BULLET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => updateStyle({ color: c })}
              title={c}
              className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 ${
                (selectedNode?.color ?? '#1f2328') === c ? 'border-[#0969da] scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          {/* 自定义颜色 */}
          <label className="w-4 h-4 rounded-full border border-[#d0d7de] overflow-hidden cursor-pointer hover:scale-110 transition-transform" title="自定义颜色">
            <input
              type="color"
              className="w-6 h-6 -translate-x-1 -translate-y-1 cursor-pointer"
              value={selectedNode?.color ?? '#1f2328'}
              onChange={(e) => updateStyle({ color: e.target.value })}
            />
          </label>
        </div>

        {/* 清除格式 */}
        <button
          type="button"
          onClick={() => updateStyle({ fontSize: undefined, bold: undefined, color: undefined })}
          className="ml-1 px-2 py-0.5 text-xs text-[#57606a] rounded border border-[#d0d7de] bg-white hover:bg-[#f0f3f6] transition-colors"
        >
          清除
        </button>

        <span className="text-xs text-[#8d96a0] ml-auto">
          {selectedNode ? `已选: ${selectedNode.text.slice(0, 20) || '(空)'}` : '点击 · 选中节点'}
        </span>
      </div>

      {/* ── 大纲列表 ── */}
      <div
        className="flex-1 overflow-y-auto py-3 px-2"
        onClick={(e) => {
          // 点击空白取消选中
          if ((e.target as HTMLElement).closest('[data-outline-node]') === null) {
            setSelectedId(null)
          }
        }}
      >
        {nodes.map((node, idx) => {
          const isSelected = node.id === selectedId
          const fsClass = FONT_SIZE_CLASS[node.fontSize ?? 'md']
          const color = node.color ?? '#1f2328'
          const isRoot = node.depth === 0
          const hasChildren = nodes.some((n, i) => i > idx && n.depth > node.depth && !nodes.slice(idx + 1, i).some((m) => m.depth <= node.depth))

          return (
            <div
              key={node.id}
              data-outline-node={node.id}
              className={`flex items-center group rounded-md transition-colors ${isSelected ? 'bg-[#f0f6ff]' : 'hover:bg-[#f6f8fa]'}`}
              style={{ paddingLeft: node.depth * INDENT_PX + 4, paddingRight: 8, minHeight: 32 }}
            >
              {/* 小圆点 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedId(isSelected ? null : node.id)
                  inputRefs.current[node.id]?.focus()
                }}
                className={`shrink-0 mr-2 transition-all ${isSelected ? 'opacity-100' : 'opacity-30 group-hover:opacity-70'}`}
                title="点击选中节点"
              >
                {isRoot ? (
                  // 根节点：实心圆
                  <span
                    className="inline-block w-3 h-3 rounded-full border-2"
                    style={{ borderColor: color, backgroundColor: isSelected ? color : 'transparent' }}
                  />
                ) : hasChildren ? (
                  // 有子节点：空心圆
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full border-2"
                    style={{ borderColor: color, backgroundColor: isSelected ? color : 'transparent' }}
                  />
                ) : (
                  // 叶子节点：实心小点
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
              </button>

              {/* 文字输入 */}
              <input
                ref={(el) => { inputRefs.current[node.id] = el }}
                type="text"
                value={node.text}
                onChange={(e) => updateText(node.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onFocus={() => setSelectedId(node.id)}
                spellCheck={false}
                className={`flex-1 bg-transparent focus:outline-none ${fsClass}`}
                style={{
                  color,
                  fontWeight: node.bold ? 'bold' : 'normal',
                  lineHeight: '1.75',
                }}
                placeholder={idx === 0 ? '中心主题' : '节点内容...'}
              />
              {/* 第一行"中心"标签 */}
              {idx === 0 && (
                <span className="ml-2 shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-[#fff8c5] text-[#7d4e00] border border-[#d4a72c] leading-none select-none">
                  中心
                </span>
              )}
            </div>
          )
        })}

        {/* 底部添加按钮 */}
        <button
          type="button"
          onClick={() => {
            const last = nodes[nodes.length - 1]
            // 新节点至少 depth 1，不与中心主题同级
            const newDepth = Math.max(1, last?.depth ?? 1)
            const newNode: OutlineNode = { id: genId(), depth: newDepth, text: '' }
            const next = [...nodes, newNode]
            onChange(next)
            requestAnimationFrame(() => inputRefs.current[newNode.id]?.focus())
          }}
          className="mt-2 ml-2 text-xs text-[#8d96a0] hover:text-[#0969da] flex items-center gap-1 transition-colors"
        >
          <span className="text-base leading-none">+</span> 添加节点
        </button>
      </div>
    </div>
  )
}
