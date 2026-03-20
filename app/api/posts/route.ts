import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { markedWithMath } from '@/lib/markedWithMath'

// 使用 service_role key，绕过 RLS 直接写库
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function POST(request: NextRequest) {
  // 鉴权
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token || token !== process.env.LGO_API_KEY) {
    return unauthorized()
  }

  // 解析 body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  const { title, content, tags, published = true } = body as {
    title?: string
    content?: string
    tags?: string[]
    published?: boolean
  }

  if (!title?.trim()) return badRequest('title is required')
  if (!content?.trim()) return badRequest('content is required')

  // Markdown → HTML（数学公式先保护，再交给 marked）
  const html = await markedWithMath(content)

  // 查 API Key 对应的用户（用 service_role 查 profiles，取第一个匹配的管理员）
  // 实际上 API Key 只有一个所有者，直接从环境变量取 owner user_id
  const userId = process.env.LGO_OWNER_USER_ID
  if (!userId) {
    return NextResponse.json({ error: 'Server misconfigured: LGO_OWNER_USER_ID not set' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      title: title.trim(),
      content: html,
      tags: tags ?? [],
      published: published,
      is_public: true,
    })
    .select('id, title, published, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    post: {
      id: data.id,
      title: data.title,
      published: data.published,
      created_at: data.created_at,
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/blog/${data.id}`,
    },
  }, { status: 201 })
}
