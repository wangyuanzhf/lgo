'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function SearchInput() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [value, setValue] = useState(searchParams.get('q') ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setValue(searchParams.get('q') ?? '')
  }, [searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setValue(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (v.trim()) {
        params.set('q', v.trim())
      } else {
        params.delete('q')
      }
      router.push(`/blog?${params.toString()}`)
    }, 300)
  }

  return (
    <div className="relative">
      <svg
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#57606a]"
        width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
      >
        <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="搜索文章..."
        className="pl-8 pr-3 py-1.5 text-sm border border-[#d0d7de] rounded-md bg-white text-[#1f2328] placeholder-[#8d96a0] focus:outline-none focus:border-[#0969da] w-48 transition-colors"
      />
    </div>
  )
}
