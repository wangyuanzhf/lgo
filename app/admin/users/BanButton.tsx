'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function BanButton({ userId, isBanned }: { userId: string; isBanned: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    try {
      await fetch('/api/admin/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, banned: !isBanned }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-2 py-1 rounded border transition-colors disabled:opacity-50 ${
        isBanned
          ? 'bg-[#ddf4ff] text-[#0969da] border-[#b6e3ff] hover:bg-[#b6e3ff]'
          : 'bg-[#fff0ee] text-[#cf222e] border-[#ffcecb] hover:bg-[#ffcecb]'
      }`}
    >
      {loading ? '...' : isBanned ? '解除禁言' : '禁言'}
    </button>
  )
}
