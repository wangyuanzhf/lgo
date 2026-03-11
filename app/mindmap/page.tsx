import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DeleteButton from '@/app/components/DeleteButton'

export default async function MindmapListPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { tag } = await searchParams

  let query = supabase
    .from('mindmaps')
    .select('id, title, created_at, updated_at, tags')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (tag?.trim()) {
    query = query.contains('tags', [tag.trim()])
  }

  const { data: maps } = await query

  const { data: allMaps } = await supabase
    .from('mindmaps').select('tags').eq('user_id', user.id)
  const allTags = Array.from(new Set((allMaps ?? []).flatMap((m: { tags: string[] }) => m.tags ?? [])))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[#1f2328]">思维导图</h1>
        <div className="flex items-center gap-3">
          <Link href="/mindmap/tags" className="text-sm text-[#57606a] hover:text-[#0969da]">标签管理</Link>
          <Link
            href="/mindmap/new"
            className="px-3 py-1.5 text-sm bg-[#1f2328] text-white rounded-md hover:bg-[#2d3139] transition-colors"
          >
            + 新建导图
          </Link>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Link
            href="/mindmap"
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              !tag ? 'bg-[#1f2328] text-white border-[#1f2328]' : 'bg-white text-[#57606a] border-[#d0d7de] hover:border-[#1f2328]'
            }`}
          >
            全部
          </Link>
          {allTags.map((t) => (
            <Link
              key={t}
              href={`/mindmap?tag=${encodeURIComponent(t)}`}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                tag === t ? 'bg-[#0969da] text-white border-[#0969da]' : 'bg-white text-[#57606a] border-[#d0d7de] hover:border-[#0969da]'
              }`}
            >
              {t}
            </Link>
          ))}
        </div>
      )}

      {!maps || maps.length === 0 ? (
        <div className="bg-white border border-[#d0d7de] rounded-md p-12 text-center">
          <p className="text-[#57606a] text-sm mb-4">
            {tag?.trim() ? `没有找到标签为 "${tag.trim()}" 的导图` : '还没有思维导图，创建第一个吧'}
          </p>
          {!tag?.trim() && (
            <Link
              href="/mindmap/new"
              className="px-4 py-2 text-sm bg-[#0969da] text-white rounded-md hover:bg-[#0860c9] transition-colors"
            >
              新建导图
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map((map) => (
            <div
              key={map.id}
              className="bg-white border border-[#d0d7de] rounded-md p-4 hover:border-[#0969da] hover:shadow-sm transition-all group"
            >
              <Link href={`/mindmap/${map.id}`} className="block">
                <div className="flex items-center gap-2 mb-3">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[#7d4e00] shrink-0">
                    <path d="M1.5 2.75a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0ZM2.75 0a2.75 2.75 0 1 0 0 5.5A2.75 2.75 0 0 0 2.75 0ZM13.5 2.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0ZM12.25 0a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5ZM1.5 13.25a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0ZM2.75 10.5a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5ZM9.5 8A1.25 1.25 0 1 1 12 8 1.25 1.25 0 0 1 9.5 8ZM10.75 5.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z"/>
                  </svg>
                  <h2 className="text-sm font-medium text-[#1f2328] group-hover:text-[#0969da] truncate">{map.title}</h2>
                </div>
                <p className="text-xs text-[#57606a]">
                  更新于 {new Date(map.updated_at).toLocaleDateString('zh-CN')}
                </p>
              </Link>
              {(map.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(map.tags as string[]).map((t) => (
                    <Link
                      key={t}
                      href={`/mindmap?tag=${encodeURIComponent(t)}`}
                      className="text-xs px-1.5 py-0.5 rounded-full bg-[#ddf4ff] text-[#0969da] border border-[#b6e3ff] hover:bg-[#b6e3ff] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              )}
              <div className="flex justify-end mt-3">
                <DeleteButton id={map.id} kind="mindmap" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
