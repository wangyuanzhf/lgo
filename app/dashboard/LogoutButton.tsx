'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1 text-sm text-white border border-[#30363d] rounded-md hover:bg-[#30363d] transition-colors cursor-pointer"
    >
      退出登录
    </button>
  )
}
