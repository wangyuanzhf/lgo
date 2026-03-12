import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BanButton from '../BanButton'

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('id, username, created_at, is_banned, bio')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const { data: posts } = await admin
    .from('posts')
    .select('id, title, published, is_public, created_at, tags')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#1f2328]">@{profile.username}</h1>
            {profile.is_banned && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#fff0ee] text-[#cf222e] border border-[#ffcecb]">已禁言</span>
            )}
          </div>
          <p className="text-sm text-[#57606a] mt-1">
            注册于 {new Date(profile.created_at).toLocaleDateString('zh-CN')}
            {profile.bio && ` · ${profile.bio}`}
          </p>
        </div>
        <BanButton userId={profile.id} isBanned={profile.is_banned} />
      </div>

      <h2 className="text-sm font-semibold text-[#57606a] mb-3">文章列表（{posts?.length ?? 0} 篇）</h2>
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        {!posts || posts.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#57606a]">该用户暂无文章</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#f6f8fa] border-b border-[#d0d7de]">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-[#57606a]">标题</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-[#57606a]">状态</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-[#57606a]">可见性</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-[#57606a]">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-[#d0d7de] last:border-0 hover:bg-[#f6f8fa]">
                  <td className="px-4 py-3">
                    <Link href={`/blog/${post.id}`} className="text-[#0969da] hover:underline">
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#57606a]">
                    {post.published ? '已发布' : '草稿'}
                  </td>
                  <td className="px-4 py-3 text-[#57606a]">
                    {post.is_public ? '公开' : '私密'}
                  </td>
                  <td className="px-4 py-3 text-[#57606a]">
                    {new Date(post.created_at).toLocaleDateString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
