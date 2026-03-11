'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ApproveActions({ commentId }: { commentId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function updateStatus(status: 'approved' | 'rejected') {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('comments').update({ status }).eq('id', commentId)
    if (error) {
      alert('操作失败：' + error.message)
      setLoading(false)
      return
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => updateStatus('approved')}
        disabled={loading}
        className="px-3 py-1 text-xs bg-[#dafbe1] text-[#1a7f37] border border-[#82e19b] rounded-md hover:bg-[#aceebb] disabled:opacity-50 transition-colors"
      >
        通过
      </button>
      <button
        onClick={() => updateStatus('rejected')}
        disabled={loading}
        className="px-3 py-1 text-xs bg-[#ffebe9] text-[#cf222e] border border-[#ff8182] rounded-md hover:bg-[#ffc1be] disabled:opacity-50 transition-colors"
      >
        拒绝
      </button>
    </div>
  )
}
