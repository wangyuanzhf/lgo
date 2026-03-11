import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function BlogTagsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, tags, published')
    .eq('user_id', user.id)

  // count per tag
  const tagMap = new Map<string, { count: number; posts: { id: string; title: string; published: boolean }[] }>()
  for (const post of posts ?? []) {
    for (const tag of post.tags ?? []) {
      if (!tagMap.has(tag)) tagMap.set(tag, { count: 0, posts: [] })
      const entry = tagMap.get(tag)!
      entry.count++
      entry.posts.push({ id: post.id, title: post.title, published: post.published })
    }
  }

  const tags = Array.from(tagMap.entries())
    .sort((a, b) => b[1].count - a[1].count)

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/blog" className="text-sm text-[#57606a] hover:text-[#0969da]">← 我的博客</Link>
        <span className="text-[#d0d7de]">/</span>
        <span className="text-sm text-[#1f2328]">标签管理</span>
      </div>

      {tags.length === 0 ? (
        <div className="bg-white border border-[#d0d7de] rounded-md p-12 text-center">
          <p className="text-[#57606a] text-sm">还没有标签，在新建或编辑文章时添加吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tags.map(([tag, { count, posts: tagPosts }]) => (
            <div key={tag} className="bg-white border border-[#d0d7de] rounded-md">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#d0d7de]">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="text-sm font-medium text-[#0969da] hover:underline"
                  >
                    {tag}
                  </Link>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#f6f8fa] text-[#57606a] border border-[#d0d7de]">
                    {count} 篇
                  </span>
                </div>
              </div>
              <div className="divide-y divide-[#f6f8fa]">
                {tagPosts.map((post) => (
                  <div key={post.id} className="flex items-center gap-3 px-4 py-2">
                    <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full border ${
                      post.published
                        ? 'bg-[#dafbe1] text-[#1a7f37] border-[#82e19b]'
                        : 'bg-[#f6f8fa] text-[#57606a] border-[#d0d7de]'
                    }`}>
                      {post.published ? '已发布' : '草稿'}
                    </span>
                    <Link
                      href={`/blog/${post.id}`}
                      className="text-sm text-[#1f2328] hover:text-[#0969da] truncate"
                    >
                      {post.title}
                    </Link>
                    <Link
                      href={`/blog/${post.id}/edit`}
                      className="shrink-0 text-xs text-[#0969da] hover:underline ml-auto"
                    >
                      编辑
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
