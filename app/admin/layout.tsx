import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const OWNER_ID = process.env.LGO_OWNER_USER_ID

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== OWNER_ID) {
    notFound()
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#d0d7de]">
        <Link href="/admin" className="text-sm font-semibold text-[#1f2328] hover:text-[#0969da]">管理后台</Link>
        <span className="text-[#d0d7de]">/</span>
        <Link href="/admin/users" className="text-sm text-[#57606a] hover:text-[#0969da]">用户管理</Link>
      </div>
      {children}
    </div>
  )
}
