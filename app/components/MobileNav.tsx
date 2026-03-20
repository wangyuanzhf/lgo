'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type NavItem = {
  href: string
  label: string
  key: string
  icon: React.ReactNode
  badge?: number | null
}

type MobileNavProps = {
  navItems: NavItem[]
  activeSection: string
  isAdmin: boolean
  profile: { username: string; avatar_url: string | null } | null
}

// 底部 Tab Bar 固定显示的 5 个 key（最后一个始终是"更多"）
const TAB_KEYS = ['dashboard', 'blog', 'notes', 'mindmap']

export default function MobileNav({ navItems, activeSection, isAdmin, profile }: MobileNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setDrawerOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const tabItems = navItems.filter((item) => TAB_KEYS.includes(item.key))

  // 抽屉内：settings、comments、我的主页、管理后台
  const drawerNavItems = navItems.filter(
    (item) => !TAB_KEYS.includes(item.key)
  )

  return (
    <>
      {/* 底部 Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#d0d7de] flex md:hidden z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors ${
              activeSection === item.key
                ? 'text-[#1f2328]'
                : 'text-[#57606a]'
            }`}
          >
            <span className={`${activeSection === item.key ? 'opacity-100' : 'opacity-60'}`}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}

        {/* 更多按钮 */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs text-[#57606a]"
          aria-label="更多"
        >
          <span className="opacity-60">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM1.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>
            </svg>
          </span>
          <span>更多</span>
        </button>
      </nav>

      {/* 抽屉遮罩 */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* 抽屉面板（从底部滑入） */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-50 md:hidden bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ease-out ${
          drawerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* 拖拽指示条 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#d0d7de]" />
        </div>

        {/* 用户信息 */}
        {profile && (
          <div className="px-4 py-3 border-b border-[#d0d7de] flex items-center gap-3">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#57606a] flex items-center justify-center text-white text-sm font-bold select-none">
                {profile.username[0].toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-[#1f2328]">@{profile.username}</span>
          </div>
        )}

        {/* 抽屉导航项 */}
        <ul className="py-2">
          {drawerNavItems.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  activeSection === item.key
                    ? 'bg-[#eef1f4] text-[#1f2328] font-medium'
                    : 'text-[#57606a] hover:bg-[#eef1f4] hover:text-[#1f2328]'
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#cf222e] text-white leading-none">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}

          {/* 我的主页 */}
          {profile && (
            <li>
              <Link
                href={`/u/${profile.username}`}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-[#57606a] hover:bg-[#eef1f4] hover:text-[#1f2328] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"/>
                </svg>
                <span>我的主页</span>
              </Link>
            </li>
          )}

          {/* 管理后台（仅 isAdmin） */}
          {isAdmin && (
            <li>
              <Link
                href="/admin"
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  activeSection === 'admin'
                    ? 'bg-[#eef1f4] text-[#1f2328] font-medium'
                    : 'text-[#57606a] hover:bg-[#eef1f4] hover:text-[#1f2328]'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M7.467.133a1.748 1.748 0 0 1 1.066 0l5.25 1.68A1.75 1.75 0 0 1 15 3.48V7c0 1.566-.32 3.182-1.303 4.682-.983 1.498-2.585 2.813-5.032 3.855a1.697 1.697 0 0 1-1.33 0c-2.447-1.042-4.049-2.357-5.032-3.855C1.32 10.182 1 8.566 1 7V3.48a1.75 1.75 0 0 1 1.217-1.667Zm.61 1.429a.25.25 0 0 0-.153 0l-5.25 1.68a.25.25 0 0 0-.174.238V7c0 1.358.275 2.666 1.057 3.86.784 1.194 2.121 2.34 4.366 3.297a.196.196 0 0 0 .154 0c2.245-.956 3.582-2.104 4.366-3.298C13.225 9.666 13.5 8.36 13.5 7V3.48a.25.25 0 0 0-.174-.237Z"/>
                </svg>
                <span>管理后台</span>
              </Link>
            </li>
          )}

          {/* 分隔线 + 登出 */}
          <li className="pt-2 mt-2 border-t border-[#d0d7de]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#cf222e] hover:bg-[#fff5f5] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 0 1 0 1.5h-2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 2 13.25Zm10.44 4.5-1.97-1.97a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .744.215l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.97-1.97H6.75a.75.75 0 0 1 0-1.5Z"/>
              </svg>
              <span>登出</span>
            </button>
          </li>
        </ul>
      </div>
    </>
  )
}
