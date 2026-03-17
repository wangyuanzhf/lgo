'use client'

import 'mind-elixir/style.css'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MindElixirInstance, MindElixirData } from 'mind-elixir'
import { use } from 'react'
import VisibilityToggle from '@/app/components/VisibilityToggle'
import TagInput from '@/app/components/TagInput'
import OutlineEditor from '../OutlineEditor'
import { outlineToMind, mindToOutline } from '../outlineUtils'

type ViewMode = 'outline' | 'mindmap'

export default function MindmapEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const mindRef = useRef<MindElixirInstance | null>(null)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mapData, setMapData] = useState<MindElixirData | null>(null)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('outline')
  const [outline, setOutline] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: map } = await supabase.from('mindmaps').select('*')
        .eq('id', id).eq('user_id', user.id).single()
      if (!map) { router.push('/mindmap'); return }
      setTitle(map.title)
      setIsPublic(map.is_public)
      setTags(map.tags ?? [])
      const data = map.data as unknown as MindElixirData
      setMapData(data)
      setOutline(mindToOutline(data))
      const { data: allMaps } = await supabase.from('mindmaps').select('tags').eq('user_id', user.id)
      const all = Array.from(new Set((allMaps ?? []).flatMap((m: { tags: string[] }) => m.tags ?? [])))
      setTagSuggestions(all)
    }
    load()
  }, [id, router])

  const initMind = useCallback(async (data: MindElixirData) => {
    if (!containerRef.current) return
    const MindElixirLib = (await import('mind-elixir')).default
    if (mindRef.current) {
      mindRef.current.init(data)
      return
    }
    const instance = new MindElixirLib({
      el: containerRef.current,
      direction: MindElixirLib.SIDE,
      draggable: true, contextMenu: true, toolBar: true, keypress: true,
    }) as unknown as MindElixirInstance
    instance.init(data)
    mindRef.current = instance
  }, [])

  const switchToMindmap = useCallback(async () => {
    setViewMode('mindmap')
    const data = outlineToMind(outline)
    requestAnimationFrame(() => initMind(data))
  }, [outline, initMind])

  const switchToOutline = useCallback(() => {
    if (mindRef.current) {
      setOutline(mindToOutline(mindRef.current.getData()))
    }
    setViewMode('outline')
  }, [])

  const getData = useCallback((): MindElixirData => {
    if (viewMode === 'mindmap' && mindRef.current) return mindRef.current.getData()
    return outlineToMind(outline)
  }, [viewMode, outline])

  const exportPdf = async () => {
    if (!mindRef.current) return
    const blob = mindRef.current.exportSvg(false)
    const svgText = await blob.text()
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title || '思维导图'}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff}
      svg{max-width:100%;height:auto;display:block}
      @media print{body{min-height:unset}@page{size:auto;margin:10mm}}
    </style></head><body>${svgText}</body></html>`)
    win.document.close()
    win.onload = () => { win.print() }
  }

  const save = async () => {
    if (!title.trim()) { setError('请输入标题'); return }
    setSaving(true); setError('')
    try {
      const supabase = createClient()
      const data = getData()
      const { error: err } = await supabase.from('mindmaps').update({
        title: title.trim(),
        data: data as unknown as Record<string, unknown>,
        is_public: isPublic,
        tags,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      if (err) throw err
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
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="导图标题"
          className="flex-1 text-base font-semibold text-[#1f2328] border border-[#d0d7de] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#0969da]" />
        {error && <span className="text-sm text-red-600">{error}</span>}

        <div className="flex rounded-md border border-[#d0d7de] overflow-hidden text-xs shrink-0">
          <button type="button" onClick={() => viewMode === 'mindmap' && switchToOutline()}
            className={`px-3 py-1.5 transition-colors ${viewMode === 'outline' ? 'bg-[#1f2328] text-white' : 'bg-white text-[#57606a] hover:bg-[#f6f8fa]'}`}>
            ☰ 大纲
          </button>
          <button type="button" onClick={() => viewMode === 'outline' && switchToMindmap()}
            className={`px-3 py-1.5 transition-colors border-l border-[#d0d7de] ${viewMode === 'mindmap' ? 'bg-[#1f2328] text-white' : 'bg-white text-[#57606a] hover:bg-[#f6f8fa]'}`}>
            ✦ 导图
          </button>
        </div>

        <VisibilityToggle value={isPublic} onChange={setIsPublic} />
        <button onClick={exportPdf} disabled={viewMode !== 'mindmap'}
          className="px-4 py-1.5 text-sm border border-[#d0d7de] text-[#57606a] rounded-md hover:bg-[#f6f8fa] transition-colors disabled:opacity-50">
          导出 PDF
        </button>
        <button onClick={save} disabled={saving || !mapData}
          className="px-4 py-1.5 text-sm bg-[#1f2328] text-white rounded-md hover:bg-[#2d3139] transition-colors disabled:opacity-50">
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      <div className="mb-3 shrink-0">
        <TagInput tags={tags} onChange={setTags} suggestions={tagSuggestions} onSuggest={suggestTags} suggesting={suggesting} type="mindmap" />
      </div>

      <div className="flex-1 min-h-0 bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        {!mapData ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-[#57606a]">加载中...</span>
          </div>
        ) : viewMode === 'outline' ? (
          <OutlineEditor value={outline} onChange={setOutline} />
        ) : null}
        <div ref={containerRef} style={{ width: '100%', height: '100%', display: viewMode === 'mindmap' && mapData ? 'block' : 'none' }} />
      </div>
    </div>
  )
}
