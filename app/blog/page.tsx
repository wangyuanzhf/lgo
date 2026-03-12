import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import SearchInput from './SearchInput'
import DeleteButton from '@/app/components/DeleteButton'

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { q, tag } = await searchParams

  let query = supabase
    .from('posts')
    .select('id, title, content, published, created_at, updated_at, tags, view_count, is_public')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (q?.trim()) {
    query = query.or(`title.ilike.%${q.trim()}%,content.ilike.%${q.trim()}%`)
  }
  if (tag?.trim()) {
    query = query.contains('tags', [tag.trim()])
  }

  const { data: posts } = await query

  // collect all tags for the filter bar
  const { data: allPosts } = await supabase
    .from('posts').select('tags, view_count').eq('user_id', user.id)
  const allTags = Array.from(new Set((allPosts ?? []).flatMap((p: { tags: string[] }) => p.tags ?? [])))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[#1f2328]">我的博客</h1>
        <div className="flex items-center gap-3">
          <Link href="/blog/tags" className="text-sm text-[#57606a] hover:text-[#0969da]">标签管理</Link>
          <Suspense fallback={null}>
            <SearchInput />
          </Suspense>
          <Link
            href="/blog/new"
            className="px-3 py-1.5 text-sm bg-[#1f2328] text-white rounded-md hover:bg-[#2d3139] transition-colors"
          >
            + 新建文章
          </Link>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Link
            href="/blog"
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              !tag ? 'bg-[#1f2328] text-white border-[#1f2328]' : 'bg-white text-[#57606a] border-[#d0d7de] hover:border-[#1f2328]'
            }`}
          >
            全部
          </Link>
          {allTags.map((t) => (
            <Link
              key={t}
              href={`/blog?tag=${encodeURIComponent(t)}`}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                tag === t ? 'bg-[#0969da] text-white border-[#0969da]' : 'bg-white text-[#57606a] border-[#d0d7de] hover:border-[#0969da]'
              }`}
            >
              {t}
            </Link>
          ))}
        </div>
      )}

      {!posts || posts.length === 0 ? (
        <div className="bg-white border border-[#d0d7de] rounded-md p-12 text-center">
          <p className="text-[#57606a] text-sm mb-4">
            {tag?.trim()
              ? `没有找到标签为 "${tag.trim()}" 的文章`
              : q?.trim()
              ? `没有找到包含 "${q.trim()}" 的文章`
              : '还没有文章，写下你的第一篇吧'}
          </p>
          {!q?.trim() && !tag?.trim() && (
            <Link
              href="/blog/new"
              className="px-4 py-2 text-sm bg-[#0969da] text-white rounded-md hover:bg-[#0860c9] transition-colors"
            >
              新建文章
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            // 从 HTML 提取纯文本摘要
            const plainText = post.content?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? ''
            const excerpt = plainText.length > 120 ? plainText.slice(0, 120) + '...' : plainText
            return (
              <div
                key={post.id}
                className="bg-white border border-[#d0d7de] rounded-md p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${
                        post.published
                          ? 'bg-[#dafbe1] text-[#1a7f37] border-[#82e19b]'
                          : 'bg-[#f6f8fa] text-[#57606a] border-[#d0d7de]'
                      }`}>
                        {post.published ? '已发布' : '草稿'}
                      </span>
                      {!post.is_public && (
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full border bg-[#f6f8fa] text-[#57606a] border-[#d0d7de]">私密</span>
                      )}
                      {(post.tags ?? []).length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {(post.tags as string[]).map((t) => (
                            <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`}
                              className="text-xs px-1.5 py-0.5 rounded-full bg-[#ddf4ff] text-[#0969da] border border-[#b6e3ff] hover:bg-[#b6e3ff] transition-colors">
                              {t}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link href={`/blog/${post.id}`}
                      className="text-sm font-semibold text-[#1f2328] hover:text-[#0969da] leading-snug">
                      {post.title}
                    </Link>
                    {excerpt && (
                      <p className="text-xs text-[#57606a] mt-1 leading-relaxed line-clamp-2">{excerpt}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-[#57606a]">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z"/>
                        </svg>
                        {post.view_count ?? 0}
                      </span>
                      <span className="text-xs text-[#57606a]">
                        {new Date(post.updated_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/blog/${post.id}/edit`} className="text-xs text-[#0969da] hover:underline">编辑</Link>
                      <DeleteButton id={post.id} kind="post" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
