'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/app/components/Logo'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase 从 URL hash 恢复 session（PASSWORD_RECOVERY 事件）
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('密码长度至少 8 位'); return }
    if (password !== confirmPassword) { setError('两次输入的密码不一致'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) { setError(err.message); return }
      router.push('/login?reset=1')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-6">
        <Logo size={48} />
      </div>

      <div className="w-full max-w-[340px]">
        <div className="bg-white border border-[#d0d7de] rounded-md px-8 py-6 mb-4">
          <h1 className="text-[20px] font-semibold text-[#1f2328] text-center mb-2">设置新密码</h1>

          {!ready ? (
            <p className="text-sm text-[#57606a] text-center mt-4">正在验证链接...</p>
          ) : (
            <>
              <p className="text-sm text-[#57606a] text-center mb-5">请输入你的新密码。</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-[#1f2328] mb-1">
                    新密码
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3 py-[5px] text-sm border border-[#d0d7de] rounded-md bg-white text-[#1f2328] placeholder-[#8c959f] focus:outline-none focus:border-[#0969da] focus:ring-[3px] focus:ring-[#0969da]/30 transition-shadow"
                  />
                  <p className="mt-1 text-xs text-[#57606a]">至少 8 位</p>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#1f2328] mb-1">
                    确认新密码
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-[5px] text-sm border border-[#d0d7de] rounded-md bg-white text-[#1f2328] placeholder-[#8c959f] focus:outline-none focus:border-[#0969da] focus:ring-[3px] focus:ring-[#0969da]/30 transition-shadow"
                  />
                </div>
                {error && (
                  <div className="bg-[#fff8c5] border border-[#d4a72c] rounded-md px-3 py-2 text-sm text-[#6e4c08]">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-[5px] px-4 text-sm font-semibold text-white bg-[#1f883d] hover:bg-[#1a7f37] border border-[rgba(31,35,40,0.15)] rounded-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {loading ? '保存中...' : '保存新密码'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <footer className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[#57606a]">
        {['服务条款', '隐私政策', '安全', '联系我们'].map(item => (
          <a key={item} href="#" className="hover:text-[#0969da] hover:underline">{item}</a>
        ))}
      </footer>
    </div>
  )
}
