import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import BackButton from './BackButton'
import LikeButton from './LikeButton'
import CommentSection from './CommentSection'
import PostContent from '@/app/components/PostContent'

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 先查文章（RLS 已允许 is_public=true 的条目被任何人读到）
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (!post) notFound()

  // 私密文章：必须登录且是本人
  if (!post.is_public) {
    if (!user) redirect('/login')
    if (user.id !== post.user_id) notFound()
  }

  const isOwner = user?.id === post.user_id

  // 增加阅读量
  await supabase.rpc('increment_post_view', { p_post_id: id })

  // 查点赞数
  const { count: likeCount } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', id)

  return (
    <div className="max-w-[860px] mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        {isOwner ? (
          <Link href="/blog" className="text-sm text-[#57606a] hover:text-[#0969da]">
            ← 我的博客
          </Link>
        ) : (
          <BackButton />
        )}
        <span className="text-[#d0d7de]">/</span>
        <span className="text-sm text-[#1f2328] truncate">{post.title}</span>
      </div>

      <div className="bg-white border border-[#d0d7de] rounded-md">
        <div className="p-6 border-b border-[#d0d7de] flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#1f2328]">{post.title}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  post.published
                    ? 'bg-[#dafbe1] text-[#1a7f37] border-[#82e19b]'
                    : 'bg-[#f6f8fa] text-[#57606a] border-[#d0d7de]'
                }`}
              >
                {post.published ? '已发布' : '草稿'}
              </span>
              {!post.is_public && (
                <span className="text-xs px-2 py-0.5 rounded-full border bg-[#f6f8fa] text-[#57606a] border-[#d0d7de]">
                  私密
                </span>
              )}
              <span className="text-xs text-[#57606a]">
                {new Date(post.created_at).toLocaleString('zh-CN')}
              </span>
              <span className="flex items-center gap-1 text-xs text-[#57606a]">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.175 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.825 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z" />
                </svg>
                {post.view_count ?? 0} 次阅读
              </span>
            </div>
          </div>
          {isOwner && (
            <Link
              href={`/blog/${post.id}/edit`}
              className="shrink-0 px-3 py-1.5 text-sm border border-[#d0d7de] text-[#1f2328] rounded-md hover:bg-[#f6f8fa] transition-colors"
            >
              编辑
            </Link>
          )}
        </div>
        <PostContent html={post.content} />
        <div className="px-6 py-4 border-t border-[#d0d7de]">
          <LikeButton postId={post.id} initialCount={likeCount ?? 0} />
        </div>
      </div>

      <CommentSection postId={post.id} />
    </div>
  )
}
