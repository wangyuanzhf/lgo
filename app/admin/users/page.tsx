import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'
import BanButton from './BanButton'

type Profile = {
  id: string
  username: string
  created_at: string
  is_banned: boolean
  postCount: number
}

export default async function AdminUsersPage() {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, created_at, is_banned')
    .order('created_at', { ascending: false })

  // Fetch post counts per user
  const { data: postCounts } = await admin
    .from('posts')
    .select('user_id')

  const countMap = new Map<string, number>()
  for (const p of postCounts ?? []) {
    countMap.set(p.user_id, (countMap.get(p.user_id) ?? 0) + 1)
  }

  const users: Profile[] = (profiles ?? []).map((p) => ({
    ...p,
    postCount: countMap.get(p.id) ?? 0,
  }))

  return (
    <div>
      <h1 className="text-xl font-semibold text-[#1f2328] mb-6">用户管理</h1>
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#f6f8fa] border-b border-[#d0d7de]">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-[#57606a]">用户名</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-[#57606a]">注册时间</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-[#57606a]">文章数</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-[#57606a]">状态</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-[#57606a]">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[#d0d7de] last:border-0 hover:bg-[#f6f8fa]">
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${user.id}`} className="text-[#0969da] hover:underline font-medium">
                    @{user.username}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#57606a]">
                  {new Date(user.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-4 py-3 text-[#57606a]">{user.postCount}</td>
                <td className="px-4 py-3">
                  {user.is_banned ? (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#fff0ee] text-[#cf222e] border border-[#ffcecb]">已禁言</span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#dafbe1] text-[#1a7f37] border border-[#aceebb]">正常</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <BanButton userId={user.id} isBanned={user.is_banned} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
