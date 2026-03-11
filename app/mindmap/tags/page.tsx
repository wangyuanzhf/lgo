import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MindmapTagsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: maps } = await supabase
    .from('mindmaps')
    .select('id, title, tags')
    .eq('user_id', user.id)

  const tagMap = new Map<string, { count: number; maps: { id: string; title: string }[] }>()
  for (const map of maps ?? []) {
    for (const tag of map.tags ?? []) {
      if (!tagMap.has(tag)) tagMap.set(tag, { count: 0, maps: [] })
      const entry = tagMap.get(tag)!
      entry.count++
      entry.maps.push({ id: map.id, title: map.title })
    }
  }

  const tags = Array.from(tagMap.entries())
    .sort((a, b) => b[1].count - a[1].count)

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/mindmap" className="text-sm text-[#57606a] hover:text-[#0969da]">← 思维导图</Link>
        <span className="text-[#d0d7de]">/</span>
        <span className="text-sm text-[#1f2328]">标签管理</span>
      </div>

      {tags.length === 0 ? (
        <div className="bg-white border border-[#d0d7de] rounded-md p-12 text-center">
          <p className="text-[#57606a] text-sm">还没有标签，在新建或编辑导图时添加吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tags.map(([tag, { count, maps: tagMaps }]) => (
            <div key={tag} className="bg-white border border-[#d0d7de] rounded-md">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#d0d7de]">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/mindmap?tag=${encodeURIComponent(tag)}`}
                    className="text-sm font-medium text-[#0969da] hover:underline"
                  >
                    {tag}
                  </Link>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#f6f8fa] text-[#57606a] border border-[#d0d7de]">
                    {count} 个
                  </span>
                </div>
              </div>
              <div className="divide-y divide-[#f6f8fa]">
                {tagMaps.map((map) => (
                  <div key={map.id} className="flex items-center gap-3 px-4 py-2">
                    <Link
                      href={`/mindmap/${map.id}`}
                      className="text-sm text-[#1f2328] hover:text-[#0969da] truncate"
                    >
                      {map.title}
                    </Link>
                    <Link
                      href={`/mindmap/${map.id}`}
                      className="shrink-0 text-xs text-[#0969da] hover:underline ml-auto"
                    >
                      打开
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
