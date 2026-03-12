import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/app/components/Logo'
import ProfileFeed from './ProfileFeed'

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  // 当前登录用户（可能为空）
  const { data: { user: viewer } } = await supabase.auth.getUser()

  // 查主页所属用户
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, bio, gender, age')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const isSelf = viewer?.id === profile.id

  // 并行查三张表
  let postsQuery = supabase
    .from('posts')
    .select('id, title, content, created_at, is_public, published')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
  let notesQuery = supabase
    .from('notes')
    .select('id, content, created_at, is_public')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
  let mindmapsQuery = supabase
    .from('mindmaps')
    .select('id, title, created_at, is_public')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  if (!isSelf) {
    postsQuery = postsQuery.eq('is_public', true).eq('published', true)
    notesQuery = notesQuery.eq('is_public', true)
    mindmapsQuery = mindmapsQuery.eq('is_public', true)
  }

  const [postsRes, notesRes, mindmapsRes] = await Promise.all([postsQuery, notesQuery, mindmapsQuery])

  const posts    = (postsRes.data    ?? []).map(p => ({ kind: 'post'    as const, ...p }))
  const notes    = (notesRes.data    ?? []).map(n => ({ kind: 'note'    as const, ...n }))
  const mindmaps = (mindmapsRes.data ?? []).map(m => ({ kind: 'mindmap' as const, ...m }))

  // 按时间倒序合并
  const feed = [...posts, ...notes, ...mindmaps].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const totalPublic = posts.filter(p => p.is_public).length
    + notes.filter(n => n.is_public).length
    + mindmaps.filter(m => m.is_public).length

  const bio = (profile as { bio?: string | null }).bio

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      {/* Header */}
      <header className="bg-[#1f2328] border-b border-[#30363d]">
        <div className="max-w-[860px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center">
            <Logo size={36} />
          </Link>
          {viewer ? (
            <Link href="/dashboard" className="text-sm text-[#8d96a0] hover:text-white transition-colors">
              我的主页
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-[#8d96a0] hover:text-white transition-colors">
              登录
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-[860px] mx-auto px-4 pb-8">
        {/* Profile card */}
        <div className="bg-white border border-[#d0d7de] rounded-md px-6 py-5 mb-6 mt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1f2328] flex items-center justify-center text-white text-2xl font-bold select-none">
                {username[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#1f2328]">@{username}</h1>
                {bio && <p className="text-sm text-[#57606a] mt-0.5">{bio}</p>}
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-[#57606a]">
                    {isSelf
                      ? `${feed.length} 条内容，${totalPublic} 条公开`
                      : `${feed.length} 条公开内容`}
                  </span>
                  <span className="text-xs text-[#57606a]">
                    {posts.filter(p => (p as {published?: boolean}).published).length} 篇文章
                  </span>
                </div>
              </div>
            </div>
            {isSelf && (
              <Link href="/settings"
                className="shrink-0 px-3 py-1.5 text-sm border border-[#d0d7de] text-[#1f2328] rounded-md hover:bg-[#f6f8fa] transition-colors">
                编辑资料
              </Link>
            )}
          </div>
        </div>
        <ProfileFeed
          feed={feed}
          isSelf={isSelf}
          emptyMessage={isSelf ? '还没有任何内容，去创建吧' : '该用户暂无公开内容'}
        />
      </div>
    </div>
  )
}
