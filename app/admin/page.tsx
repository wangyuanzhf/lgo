import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'

export default async function AdminPage() {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { count: userCount },
    { count: postCount },
    { count: noteCount },
    { count: bannedCount },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('posts').select('*', { count: 'exact', head: true }),
    admin.from('notes').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
  ])

  // Today's registrations
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count: todayCount } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  const stats = [
    { label: '用户总数', value: userCount ?? 0 },
    { label: '文章总数', value: postCount ?? 0 },
    { label: '随笔总数', value: noteCount ?? 0 },
    { label: '今日注册', value: todayCount ?? 0 },
    { label: '被禁言用户', value: bannedCount ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-xl font-semibold text-[#1f2328] mb-6">概览</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-[#d0d7de] rounded-md p-4 text-center">
            <div className="text-2xl font-bold text-[#1f2328]">{s.value}</div>
            <div className="text-xs text-[#57606a] mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        <Link href="/admin/users"
          className="px-4 py-2 text-sm bg-[#1f2328] text-white rounded-md hover:bg-[#2d3139] transition-colors">
          用户管理 →
        </Link>
      </div>
    </div>
  )
}
