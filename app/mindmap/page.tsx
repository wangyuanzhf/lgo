import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DeleteButton from '@/app/components/DeleteButton'

export default async function MindmapListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: maps } = await supabase
    .from('mindmaps')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1f2328]">思维导图</h1>
        <Link
          href="/mindmap/new"
          className="px-3 py-1.5 text-sm bg-[#1f2328] text-white rounded-md hover:bg-[#2d3139] transition-colors"
        >
          + 新建导图
        </Link>
      </div>

      {!maps || maps.length === 0 ? (
        <div className="bg-white border border-[#d0d7de] rounded-md p-12 text-center">
          <p className="text-[#57606a] text-sm mb-4">还没有思维导图，创建第一个吧</p>
          <Link
            href="/mindmap/new"
            className="px-4 py-2 text-sm bg-[#0969da] text-white rounded-md hover:bg-[#0860c9] transition-colors"
          >
            新建导图
          </Link>
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
