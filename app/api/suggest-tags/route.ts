import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { title, content, type } = body as { title?: string; content?: string; type?: string }
  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const prompt = type === 'mindmap'
    ? `你是一个标签生成助手。根据思维导图标题，生成最多3个简洁的中文标签，用于分类和检索。
标题：${title.trim()}
要求：每个标签2-6个字，只返回标签列表，用逗号分隔，不要其他内容。`
    : `你是一个标签生成助手。根据博客文章的标题和正文内容，生成最多3个简洁的中文标签，用于分类和检索。
标题：${title.trim()}
正文摘要：${(content ?? '').replace(/<[^>]+>/g, '').slice(0, 500)}
要求：每个标签2-6个字，只返回标签列表，用逗号分隔，不要其他内容。`

  const apiKey = process.env.ARK_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: '大模型不可用' }, { status: 503 })
  }

  try {
    const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'ep-m-20260305214148-kttmf',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        thinking: { type: 'disabled' },
      }),
      signal: AbortSignal.timeout(25000),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Ark API error:', res.status, errText)
      return NextResponse.json({ error: `大模型不可用: ${res.status}` }, { status: 503 })
    }

    const data = await res.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ''
    const tags = text
      .split(/[,，、\n]/)
      .map((t: string) => t.trim().replace(/^[#\s]+/, ''))
      .filter((t: string) => t.length > 0 && t.length <= 20)
      .slice(0, 3)

    return NextResponse.json({ tags })
  } catch {
    return NextResponse.json({ error: '大模型不可用' }, { status: 503 })
  }
}
