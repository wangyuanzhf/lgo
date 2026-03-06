'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('密码长度至少为 8 位。')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致，请重新确认。')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      const msg =
        error.message.includes('already registered') || error.message.includes('already been registered')
          ? '该邮箱已被注册，请直接登录或使用其他邮箱。'
          : error.message
      setError(msg)
      setLoading(false)
      return
    }

    router.push('/register/confirm')
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-6">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1f2328"/>
          <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="white" fontFamily="Georgia, 'Times New Roman', serif" fontSize="17" fontWeight="700" letterSpacing="-0.5">mem</text>
        </svg>
      </div>

      {/* Card */}
      <div className="w-full max-w-[340px]">
        <div className="bg-white border border-[#d0d7de] rounded-md px-8 py-6 mb-4">
          <h1 className="text-[20px] font-semibold text-[#1f2328] text-center mb-5">
            创建账号
          </h1>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#1f2328] mb-1">
                电子邮件地址
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-[5px] text-sm border border-[#d0d7de] rounded-md bg-white text-[#1f2328] placeholder-[#8c959f] focus:outline-none focus:border-[#0969da] focus:ring-[3px] focus:ring-[#0969da]/30 transition-shadow"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-[#1f2328] mb-1">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-[5px] text-sm border border-[#d0d7de] rounded-md bg-white text-[#1f2328] placeholder-[#8c959f] focus:outline-none focus:border-[#0969da] focus:ring-[3px] focus:ring-[#0969da]/30 transition-shadow"
              />
              <p className="mt-1 text-xs text-[#57606a]">密码至少 8 位</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#1f2328] mb-1">
                确认密码
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-[5px] text-sm border border-[#d0d7de] rounded-md bg-white text-[#1f2328] placeholder-[#8c959f] focus:outline-none focus:border-[#0969da] focus:ring-[3px] focus:ring-[#0969da]/30 transition-shadow"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-[#fff8c5] border border-[#d4a72c] rounded-md px-3 py-2 text-sm text-[#6e4c08]">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-[5px] px-4 text-sm font-semibold text-white bg-[#1f883d] hover:bg-[#1a7f37] border border-[rgba(31,35,40,0.15)] rounded-md focus:outline-none focus:ring-[3px] focus:ring-[#1f883d]/40 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading ? '注册中...' : '创建账号'}
            </button>
          </form>
        </div>

        {/* Sign in box */}
        <div className="bg-white border border-[#d0d7de] rounded-md px-8 py-4 text-sm text-center text-[#1f2328]">
          已有账号？&nbsp;
          <a href="/login" className="text-[#0969da] font-semibold hover:underline">
            登录
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[#57606a]">
        {['服务条款', '隐私政策', '安全', '联系我们'].map(item => (
          <a key={item} href="#" className="hover:text-[#0969da] hover:underline">
            {item}
          </a>
        ))}
      </footer>
    </div>
  )
}
