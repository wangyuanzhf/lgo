'use client'

import { useEffect, useState } from 'react'

export function useAnonToken(): string {
  const [token, setToken] = useState('')

  useEffect(() => {
    let t = localStorage.getItem('lgo_anon_token')
    if (!t) {
      t = crypto.randomUUID()
      localStorage.setItem('lgo_anon_token', t)
    }
    setToken(t)
  }, [])

  return token
}

export function getStoredName(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('lgo_commenter_name') ?? ''
}

export function setStoredName(name: string) {
  localStorage.setItem('lgo_commenter_name', name)
}
