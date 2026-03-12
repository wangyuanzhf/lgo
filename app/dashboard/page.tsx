import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  const [
    { count: postCount },
    { count: noteCount },
    { count: mindmapCount },
    { data: viewData },
  ] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('published', true),
    supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('mindmaps').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('posts').select('view_count').eq('user_id', user.id),
  ])

  const totalViews = (viewData ?? []).reduce((sum, p) => sum + (p.view_count ?? 0), 0)

  const stats = [
    { label: '已发布文章', value: postCount ?? 0, color: 'text-[#0969da]', bg: 'bg-[#ddf4ff]' },
    { label: '随笔', value: noteCount ?? 0, color: 'text-[#1a7f37]', bg: 'bg-[#dafbe1]' },
    { label: '思维导图', value: mindmapCount ?? 0, color: 'text-[#7d4e00]', bg: 'bg-[#fff8c5]' },
    { label: '累计阅读', value: totalViews, color: 'text-[#6e40c9]', bg: 'bg-[#fbefff]' },
  ]

  const features = [
    {
      href: '/blog',
      title: '博客',
      description: '撰写和管理你的博客文章，支持富文本编辑、标题格式、代码块等。',
      icon: (
        <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 3.75A.75.75 0 0 1 .75 3h13.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 3.75Zm0 4A.75.75 0 0 1 .75 7h13.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 7.75Zm0 4A.75.75 0 0 1 .75 11h7.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75Z"/>
        </svg>
      ),
      color: 'text-[#0969da]',
      bg: 'bg-[#ddf4ff]',
      action: '写文章 →',
    },
    {
      href: '/notes',
      title: '随笔',
      description: '快速记录碎片化想法，简单纯粹，按时间倒序排列，随时翻阅。',
      icon: (
        <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"/>
        </svg>
      ),
      color: 'text-[#1a7f37]',
      bg: 'bg-[#dafbe1]',
      action: '记随笔 →',
    },
    {
      href: '/mindmap',
      title: '思维导图',
      description: '以可视化方式组织思路，创建交互式思维导图，支持拖拽和缩放。',
      icon: (
        <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.5 2.75a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0ZM2.75 0a2.75 2.75 0 1 0 0 5.5A2.75 2.75 0 0 0 2.75 0ZM13.5 2.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0ZM12.25 0a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5ZM1.5 13.25a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0ZM2.75 10.5a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5ZM9.5 8A1.25 1.25 0 1 1 12 8 1.25 1.25 0 0 1 9.5 8ZM10.75 5.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z"/>
        </svg>
      ),
      color: 'text-[#7d4e00]',
      bg: 'bg-[#fff8c5]',
      action: '新建导图 →',
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1f2328]">欢迎回来，@{profile?.username ?? user.email}</h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-[#57606a]">选择一个功能开始使用</p>
          {profile && (
            <>
              <span className="text-[#d0d7de]">·</span>
              <Link href={`/u/${profile.username}`} className="text-sm text-[#0969da] hover:underline">
                我的主页 @{profile.username}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 统计条 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-[#d0d7de] rounded-md px-4 py-3 flex items-center gap-3">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#57606a] leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 功能卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="block bg-white border border-[#d0d7de] rounded-md p-6 hover:border-[#0969da] hover:shadow-sm transition-all group"
          >
            <div className={`inline-flex p-2 rounded-md ${f.bg} ${f.color} mb-4`}>
              {f.icon}
            </div>
            <h2 className="text-base font-semibold text-[#1f2328] mb-2 group-hover:text-[#0969da]">{f.title}</h2>
            <p className="text-sm text-[#57606a] leading-relaxed mb-4">{f.description}</p>
            <span className={`text-xs font-medium ${f.color}`}>{f.action}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
