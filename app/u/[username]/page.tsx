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

  // 根据用户名生成固定的 banner 色
  const bannerColors = [
    'from-[#0969da] to-[#54aeff]',
    'from-[#1a7f37] to-[#4ac26b]',
    'from-[#7d4e00] to-[#d4a72c]',
    'from-[#6e40c9] to-[#b083f0]',
    'from-[#cf222e] to-[#ff8182]',
    'from-[#0969da] to-[#6e40c9]',
  ]
  const bannerColor = bannerColors[username.charCodeAt(0) % bannerColors.length]

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      {/* Header */}
      <header className="bg-[#1f2328] border-b border-[#30363d]">
        <div className="max-w-[860px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Logo size={28} />
            <span className="text-white font-semibold text-sm">lgo</span>
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
        {/* Banner + Profile */}
        <div className="mb-6">
          {/* Banner */}
          <div className={`h-28 rounded-b-md bg-gradient-to-r ${bannerColor}`} />
          {/* Profile card */}
          <div className="bg-white border border-[#d0d7de] border-t-0 rounded-b-md px-6 pb-5">
            <div className="flex items-end justify-between gap-4 -mt-8 mb-3">
              <div className="w-16 h-16 rounded-full bg-[#1f2328] border-4 border-white flex items-center justify-center text-white text-2xl font-bold select-none shadow-sm">
                {username[0].toUpperCase()}
              </div>
              {isSelf && (
                <Link href="/settings"
                  className="mb-1 px-3 py-1.5 text-sm border border-[#d0d7de] text-[#1f2328] rounded-md hover:bg-[#f6f8fa] transition-colors">
                  编辑资料
                </Link>
              )}
            </div>
            <h1 className="text-lg font-semibold text-[#1f2328]">@{username}</h1>
            {bio && <p className="text-sm text-[#57606a] mt-0.5">{bio}</p>}
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-[#57606a]">
                {isSelf
                  ? `${feed.length} 条内容，${totalPublic} 条公开`
                  : `${feed.length} 条公开内容`}
              </span>
              <span className="text-xs text-[#57606a] flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0ZM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>
                </svg>
                {posts.filter(p => (p as {published?: boolean}).published).length} 篇文章
              </span>
            </div>
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
