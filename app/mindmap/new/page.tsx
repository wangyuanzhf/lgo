'use client'

import 'mind-elixir/style.css'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MindElixirInstance, MindElixirData } from 'mind-elixir'
import VisibilityToggle from '@/app/components/VisibilityToggle'
import TagInput from '@/app/components/TagInput'

export default function NewMindmapPage() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const mindRef = useRef<MindElixirInstance | null>(null)
  const [title, setTitle] = useState('未命名导图')
  const [tags, setTags] = useState<string[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('mindmaps').select('tags').eq('user_id', user.id)
      const all = Array.from(new Set((data ?? []).flatMap((m: { tags: string[] }) => m.tags ?? [])))
      setTagSuggestions(all)
    })
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false
    const init = async () => {
      const MindElixirLib = (await import('mind-elixir')).default
      if (cancelled || !containerRef.current) return
      const instance = new MindElixirLib({
        el: containerRef.current,
        direction: MindElixirLib.SIDE,
        draggable: true, contextMenu: true, toolBar: true, keypress: true,
      }) as unknown as MindElixirInstance
      instance.init({
        nodeData: {
          id: 'root', topic: '中心主题',
          children: [
            { id: 'child1', topic: '分支 1', children: [] },
            { id: 'child2', topic: '分支 2', children: [] },
          ],
        },
      })
      mindRef.current = instance
    }
    init()
    return () => { cancelled = true; mindRef.current = null }
  }, [])

  const save = async () => {
    if (!mindRef.current) return
    if (!title.trim()) { setError('请输入标题'); return }
    setSaving(true); setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('is_banned').eq('id', user.id).single()
      if (profile?.is_banned) { setError('账号已被禁言，无法发布内容'); setSaving(false); return }
      const data = mindRef.current.getData()
      const { data: saved, error: err } = await supabase.from('mindmaps')
        .insert({ user_id: user.id, title: title.trim(), data: data as unknown as Record<string, unknown>, is_public: isPublic, tags })
        .select('id').single()
      if (err) throw err
      router.push(`/mindmap/${saved.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally { setSaving(false) }
  }

  const suggestTags = async () => {
    setSuggesting(true)
    try {
      const res = await fetch('/api/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type: 'mindmap' }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? '大模型不可用'); return }
      const newTags = (data.tags as string[]).filter((t) => !tags.includes(t))
      setTags((prev) => [...prev, ...newTags].slice(0, 10))
    } catch {
      alert('大模型不可用')
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
      <div className="flex items-center gap-4 mb-2 shrink-0">
        <button onClick={() => router.push('/mindmap')} className="text-sm text-[#57606a] hover:text-[#0969da]">← 返回列表</button>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          className="flex-1 text-base font-semibold text-[#1f2328] border border-[#d0d7de] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#0969da]" />
        {error && <span className="text-sm text-red-600">{error}</span>}
        <VisibilityToggle value={isPublic} onChange={setIsPublic} />
        <button onClick={save} disabled={saving}
          className="px-4 py-1.5 text-sm bg-[#1f2328] text-white rounded-md hover:bg-[#2d3139] transition-colors disabled:opacity-50">
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
      <div className="mb-3 shrink-0">
        <TagInput
          tags={tags}
          onChange={setTags}
          suggestions={tagSuggestions}
          onSuggest={suggestTags}
          suggesting={suggesting}
          type="mindmap"
        />
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}
        className="bg-white border border-[#d0d7de] rounded-md overflow-hidden" />
    </div>
  )
}
