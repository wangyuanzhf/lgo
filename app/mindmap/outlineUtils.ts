import type { MindElixirData, NodeObj } from 'mind-elixir'

// ─── 大纲文本格式 ─────────────────────────────────────────────────────────────
// 每行一个节点，用 Tab（或 2 空格）缩进表示层级：
//   中心主题
//   \t分支 A
//   \t\t子节点 1
//   \t\t子节点 2
//   \t分支 B
// ─────────────────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

/** 大纲文本 → MindElixirData */
export function outlineToMind(text: string): MindElixirData {
  const lines = text.split('\n')
  const root: NodeObj = { id: 'root', topic: '', children: [] }

  // 找根节点（第一行非空、无缩进）
  let rootLine = ''
  const rest: string[] = []
  for (const line of lines) {
    if (!rootLine && line.trim()) {
      rootLine = line.trim()
    } else if (rootLine) {
      rest.push(line)
    }
  }
  root.topic = rootLine || '中心主题'

  // 解析后续行，按缩进层级建树
  // 用栈：[{ node, depth }]
  const stack: Array<{ node: NodeObj; depth: number }> = [{ node: root, depth: -1 }]

  for (const line of rest) {
    if (!line.trim()) continue
    const depth = getDepth(line)
    const topic = line.trim()
    const newNode: NodeObj = { id: genId(), topic, children: [] }

    // 弹出栈顶直到找到 depth > 栈顶 depth 的父节点
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop()
    }
    const parent = stack[stack.length - 1].node
    parent.children = parent.children ?? []
    parent.children.push(newNode)
    stack.push({ node: newNode, depth })
  }

  return { nodeData: root }
}

/** MindElixirData → 大纲文本 */
export function mindToOutline(data: MindElixirData): string {
  const lines: string[] = []
  function walk(node: NodeObj, depth: number) {
    lines.push('\t'.repeat(depth) + (node.topic || ''))
    for (const child of node.children ?? []) {
      walk(child, depth + 1)
    }
  }
  walk(data.nodeData, 0)
  return lines.join('\n')
}

function getDepth(line: string): number {
  let depth = 0
  for (const ch of line) {
    if (ch === '\t') depth++
    else break
  }
  return depth
}
