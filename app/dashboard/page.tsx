import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      {/* Header */}
      <header className="bg-[#1f2328] border-b border-[#30363d]">
        <div className="max-w-[1280px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="10" fill="white" fillOpacity="0.12"/>
              <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="white" fontFamily="Georgia, 'Times New Roman', serif" fontSize="17" fontWeight="700" letterSpacing="-0.5">mem</text>
            </svg>
            <span className="text-white font-semibold text-sm">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#8d96a0] text-sm">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1280px] mx-auto px-4 py-8">
        <div className="bg-white border border-[#d0d7de] rounded-md p-6">
          <h2 className="text-xl font-semibold text-[#1f2328] mb-4">欢迎回来</h2>
          <div className="space-y-2 text-sm text-[#57606a]">
            <p><span className="font-medium text-[#1f2328]">用户 ID：</span>{user.id}</p>
            <p><span className="font-medium text-[#1f2328]">邮箱：</span>{user.email}</p>
            <p><span className="font-medium text-[#1f2328]">上次登录：</span>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : '-'}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
