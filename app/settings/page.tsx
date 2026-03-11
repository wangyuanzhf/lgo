'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  username: string
  bio: string | null
  gender: 'male' | 'female' | 'other' | null
  age: number | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [age, setAge] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, bio, gender, age')
        .eq('id', user.id)
        .single()
      if (profile) {
        setUsername((profile as Profile).username ?? '')
        setBio((profile as Profile).bio ?? '')
        setGender(((profile as Profile).gender ?? '') as typeof gender)
        setAge((profile as Profile).age != null ? String((profile as Profile).age) : '')
      }
      setLoading(false)
    }
    load()
  }, [router])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const trimmedUsername = username.trim()
    if (!trimmedUsername) { setError('用户名不能为空'); return }
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(trimmedUsername)) {
      setError('用户名只能包含字母、数字、下划线和连字符，长度 3–32 位')
      return
    }
    const parsedAge = age ? parseInt(age, 10) : null
    if (age && (isNaN(parsedAge!) || parsedAge! < 1 || parsedAge! > 149)) {
      setError('年龄请填写 1–149 之间的整数')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { error: err } = await supabase
        .from('profiles')
        .update({
          username: trimmedUsername,
          bio: bio.trim() || null,
          gender: gender || null,
          age: parsedAge,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (err) {
        if (err.message.includes('duplicate') || err.message.includes('unique')) {
          setError('该用户名已被使用，请换一个')
        } else {
          setError(err.message)
        }
        return
      }
      setSuccess('保存成功')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-sm text-[#57606a]">加载中...</span>
      </div>
    )
  }

  return (
    <div className="max-w-[560px]">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1f2328]">账号设置</h1>
        <p className="text-sm text-[#57606a] mt-1">管理你的个人资料和账号信息</p>
      </div>

      <form onSubmit={save} className="space-y-5">
        {/* 基本信息卡片 */}
        <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
          <div className="px-5 py-3 border-b border-[#d0d7de] bg-[#f6f8fa]">
            <h2 className="text-sm font-semibold text-[#1f2328]">基本信息</h2>
          </div>
          <div className="p-5 space-y-4">
            {/* 用户名 */}
            <div>
              <label className="block text-sm font-medium text-[#1f2328] mb-1">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="w-full px-3 py-[5px] text-sm border border-[#d0d7de] rounded-md bg-white text-[#1f2328] placeholder-[#8c959f] focus:outline-none focus:border-[#0969da] focus:ring-[3px] focus:ring-[#0969da]/30 transition-shadow"
              />
              <p className="mt-1 text-xs text-[#57606a]">
                字母、数字、下划线、连字符，3–32 位。主页链接将随用户名变更。
              </p>
            </div>

            {/* 个人简介 */}
            <div>
              <label className="block text-sm font-medium text-[#1f2328] mb-1">
                个人简介
              </label>
              <textarea
                value={bio}
                onChange={(e) => { if (e.target.value.length <= 200) setBio(e.target.value) }}
                rows={3}
                placeholder="介绍一下自己..."
                className="w-full px-3 py-2 text-sm border border-[#d0d7de] rounded-md bg-white text-[#1f2328] placeholder-[#8c959f] focus:outline-none focus:border-[#0969da] focus:ring-[3px] focus:ring-[#0969da]/30 transition-shadow resize-none"
              />
              <p className="mt-1 text-xs text-[#57606a] text-right">{bio.length}/200</p>
            </div>

            {/* 性别 + 年龄 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1f2328] mb-1">
                  性别
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as typeof gender)}
                  className="w-full px-3 py-[5px] text-sm border border-[#d0d7de] rounded-md bg-white text-[#1f2328] focus:outline-none focus:border-[#0969da] focus:ring-[3px] focus:ring-[#0969da]/30 transition-shadow"
                >
                  <option value="">不填写</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1f2328] mb-1">
                  年龄
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min={1}
                  max={149}
                  placeholder="–"
                  className="w-full px-3 py-[5px] text-sm border border-[#d0d7de] rounded-md bg-white text-[#1f2328] placeholder-[#8c959f] focus:outline-none focus:border-[#0969da] focus:ring-[3px] focus:ring-[#0969da]/30 transition-shadow"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 账号信息卡片（只读） */}
        <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
          <div className="px-5 py-3 border-b border-[#d0d7de] bg-[#f6f8fa]">
            <h2 className="text-sm font-semibold text-[#1f2328]">账号信息</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1f2328] mb-1">
                邮箱地址
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-[5px] text-sm border border-[#d0d7de] rounded-md bg-[#f6f8fa] text-[#57606a] cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-[#57606a]">邮箱地址不可修改</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[#1f2328] mb-1">密码</p>
              <a
                href="/forgot-password"
                className="inline-flex items-center gap-1.5 text-sm text-[#0969da] hover:underline"
              >
                修改密码（通过邮件重置）
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* 反馈 */}
        {error && (
          <div className="bg-[#fff8c5] border border-[#d4a72c] rounded-md px-4 py-2.5 text-sm text-[#6e4c08]">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-[#dafbe1] border border-[#82e19b] rounded-md px-4 py-2.5 text-sm text-[#1a7f37]">
            {success}
          </div>
        )}

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-[5px] text-sm font-semibold text-white bg-[#1f883d] hover:bg-[#1a7f37] border border-[rgba(31,35,40,0.15)] rounded-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '保存中...' : '保存更改'}
          </button>
        </div>
      </form>
    </div>
  )
}
