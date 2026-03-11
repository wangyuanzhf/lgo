'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/app/components/Logo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (err) { setError(err.message); return }
      setSent(true)
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
          {sent ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-[#dafbe1] flex items-center justify-center">
                  <svg viewBox="0 0 16 16" width="24" height="24" fill="#1f883d">
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
                  </svg>
                </div>
              </div>
              <h1 className="text-[20px] font-semibold text-[#1f2328] mb-3">邮件已发送</h1>
              <p className="text-sm text-[#57606a] leading-relaxed">
                重置密码链接已发送至 <span className="font-medium text-[#1f2328]">{email}</span>，请查收邮件并点击链接完成密码重置。
              </p>
              <p className="text-xs text-[#57606a] mt-3">没有收到？请检查垃圾邮件文件夹，或稍后重试。</p>
            </div>
          ) : (
            <>
              <h1 className="text-[20px] font-semibold text-[#1f2328] text-center mb-2">找回密码</h1>
              <p className="text-sm text-[#57606a] text-center mb-5">
                输入注册时使用的邮箱，我们将发送重置密码链接。
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-[#1f2328] mb-1">
                    电子邮件地址
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
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
                  {loading ? '发送中...' : '发送重置链接'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="bg-white border border-[#d0d7de] rounded-md px-8 py-4 text-sm text-center text-[#1f2328]">
          想起密码了？&nbsp;
          <a href="/login" className="text-[#0969da] font-semibold hover:underline">返回登录</a>
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
