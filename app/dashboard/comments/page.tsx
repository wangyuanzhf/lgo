import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ApproveActions from './ApproveActions'

type Comment = {
  id: string
  post_id: string
  author_name: string
  body: string
  status: string
  created_at: string
  parent_id: string | null
  posts: { id: string; title: string } | null
}

export default async function CommentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all comments on the current user's posts
  const { data: comments } = await supabase
    .from('comments')
    .select('*, posts!inner(id, title, user_id)')
    .eq('posts.user_id', user.id)
    .order('created_at', { ascending: false }) as { data: (Comment & { posts: { id: string; title: string; user_id: string } | null })[] | null }

  const pending = (comments ?? []).filter((c) => c.status === 'pending')
  const others = (comments ?? []).filter((c) => c.status !== 'pending')

  function CommentRow({ c }: { c: Comment }) {
    return (
      <div className="border border-[#d0d7de] rounded-md bg-white p-4 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-[#1f2328]">{c.author_name}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded border ${
                  c.status === 'approved'
                    ? 'bg-[#dafbe1] text-[#1a7f37] border-[#82e19b]'
                    : c.status === 'pending'
                    ? 'bg-[#fff8c5] text-[#7d4e00] border-[#e3b341]'
                    : 'bg-[#ffebe9] text-[#cf222e] border-[#ff8182]'
                }`}
              >
                {c.status === 'approved' ? '已通过' : c.status === 'pending' ? '待审核' : '已拒绝'}
              </span>
              {c.parent_id && (
                <span className="text-xs text-[#57606a]">（回复）</span>
              )}
              <span className="text-xs text-[#57606a]">
                {new Date(c.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
            <p className="text-sm text-[#1f2328] whitespace-pre-wrap">{c.body}</p>
            {c.posts && (
              <Link
                href={`/blog/${c.posts.id}`}
                className="mt-1 inline-block text-xs text-[#0969da] hover:underline"
              >
                文章：{c.posts.title}
              </Link>
            )}
          </div>
          {c.status === 'pending' && <ApproveActions commentId={c.id} />}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-[#1f2328] mb-6">评论管理</h1>

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-[#57606a] mb-3">
            待审核 <span className="text-[#cf222e]">({pending.length})</span>
          </h2>
          <div className="space-y-3">
            {pending.map((c) => (
              <CommentRow key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-[#57606a] mb-3">
          历史评论 ({others.length})
        </h2>
        {others.length === 0 ? (
          <p className="text-sm text-[#57606a]">暂无历史评论。</p>
        ) : (
          <div className="space-y-3">
            {others.map((c) => (
              <CommentRow key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>

      {(comments ?? []).length === 0 && (
        <p className="text-sm text-[#57606a]">你的文章还没有评论。</p>
      )}
    </div>
  )
}
