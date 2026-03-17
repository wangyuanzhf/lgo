import type { MindElixirData, NodeObj } from 'mind-elixir'
import type { OutlineNode } from './OutlineEditor'

// ─── OutlineNode[] ↔ MindElixirData ──────────────────────────────────────────

export function outlineToMind(nodes: OutlineNode[]): MindElixirData {
  if (nodes.length === 0) {
    return { nodeData: { id: 'root', topic: '中心主题', children: [] } }
  }

  const root: NodeObj = {
    id: 'root',
    topic: nodes[0]?.text || '中心主题',
    children: [],
    ...(buildStyle(nodes[0]) && { style: buildStyle(nodes[0]) }),
  }

  const stack: Array<{ node: NodeObj; depth: number }> = [{ node: root, depth: -1 }]

  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i]
    if (!n.text.trim()) continue
    const style = buildStyle(n)
    const newNode: NodeObj = {
      id: `n-${n.id}`,
      topic: n.text,
      children: [],
      ...(style && { style }),
    }
    while (stack.length > 1 && stack[stack.length - 1].depth >= n.depth) {
      stack.pop()
    }
    const parent = stack[stack.length - 1].node
    parent.children = parent.children ?? []
    parent.children.push(newNode)
    stack.push({ node: newNode, depth: n.depth })
  }

  return { nodeData: root }
}

export function mindToOutline(data: MindElixirData): OutlineNode[] {
  const nodes: OutlineNode[] = []
  function walk(node: NodeObj, depth: number) {
    const n: OutlineNode = { id: genId(), depth, text: node.topic || '' }
    if (node.style) {
      const s = node.style as Record<string, string>
      if (s.fontSize) n.fontSize = fontSizeFromPx(s.fontSize)
      if (s.color) n.color = s.color
      if (s.fontWeight === 'bold') n.bold = true
    }
    nodes.push(n)
    for (const child of node.children ?? []) walk(child, depth + 1)
  }
  walk(data.nodeData, 0)
  return nodes
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function genId() {
  return Math.random().toString(36).slice(2, 10)
}

const PX_MAP: Record<string, OutlineNode['fontSize']> = {
  '12px': 'xs', '14px': 'sm', '16px': 'md', '18px': 'lg', '22px': 'xl',
}
const FONT_PX: Record<string, string> = {
  xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '22px',
}

function fontSizeFromPx(px: string): OutlineNode['fontSize'] {
  return PX_MAP[px]
}

function buildStyle(node: OutlineNode): Record<string, string> | undefined {
  const s: Record<string, string> = {}
  if (node.fontSize) s.fontSize = FONT_PX[node.fontSize]
  if (node.color) s.color = node.color
  if (node.bold) s.fontWeight = 'bold'
  return Object.keys(s).length ? s : undefined
}

export function defaultNodes(): OutlineNode[] {
  return [
    { id: genId(), depth: 0, text: '中心主题' },
    { id: genId(), depth: 1, text: '分支 1' },
    { id: genId(), depth: 1, text: '分支 2' },
  ]
}
