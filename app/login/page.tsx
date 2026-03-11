'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/app/components/Logo'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const passwordReset = searchParams.get('reset') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? '邮箱或密码不正确，请重试。'
        : error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-[340px]">
      <div className="bg-white border border-[#d0d7de] rounded-md px-8 py-6 mb-4">
        <h1 className="text-[20px] font-semibold text-[#1f2328] text-center mb-5">
          登录
        </h1>

        {passwordReset && (
          <div className="bg-[#dafbe1] border border-[#82e19b] rounded-md px-3 py-2 text-sm text-[#1a7f37] mb-4">
            密码已重置成功，请用新密码登录。
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-semibold text-[#1f2328]">
                密码
              </label>
              <a href="/forgot-password" className="text-xs text-[#0969da] hover:underline">
                忘记密码？
              </a>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>

      {/* Sign up box */}
      <div className="bg-white border border-[#d0d7de] rounded-md px-8 py-4 text-sm text-center text-[#1f2328]">
        没有账号？&nbsp;
        <a href="/register" className="text-[#0969da] font-semibold hover:underline">
          创建账号
        </a>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-6">
        <Logo size={48} />
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

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
