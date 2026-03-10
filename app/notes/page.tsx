'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Note = { id: string; content: string; created_at: string; is_public: boolean }
type ViewMode = 'timeline' | 'archive'
type MonthGroup = { month: string; label: string; notes: Note[] }

function groupByMonth(notes: Note[]): MonthGroup[] {
  const map = new Map<string, Note[]>()
  for (const note of notes) {
    const d = new Date(note.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(note)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, notes]) => {
      const [y, m] = month.split('-')
      return { month, label: `${y} 年 ${parseInt(m)} 月`, notes }
    })
}

function VisibilityToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-colors ${
        value ? 'bg-[#ddf4ff] text-[#0969da] border-[#b6e3ff]' : 'bg-[#f6f8fa] text-[#57606a] border-[#d0d7de]'
      }`}>
      {value ? (
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.175 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.825 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z"/></svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M.143 2.31a.75.75 0 0 1 1.047-.167l14.5 10.5a.75.75 0 1 1-.88 1.214l-2.248-1.628C11.346 13.19 9.792 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.353-.533.995-1.407 1.868-2.264L.31 3.357A.75.75 0 0 1 .143 2.31Zm3.386 3.378L4.64 6.48a7.688 7.688 0 0 0-1.215 1.662.12.12 0 0 0 0 .136c.412.621 1.242 1.75 2.366 2.717C6.825 11.758 8.177 12.5 9.65 12.5c1.013 0 1.97-.33 2.836-.863l-1.108-.803a3.25 3.25 0 0 1-4.62-4.218l-.229-.166ZM6.557 8.52l2.437 1.763a1.75 1.75 0 0 1-2.437-1.763ZM8 3.5c-.574 0-1.131.086-1.662.244L4.894 2.56C5.9 2.183 7.012 2 8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798 12.9 12.9 0 0 1-.44.613l-1.36-.983c.24-.3.447-.594.616-.852a.12.12 0 0 0 0-.136C13.979 6.746 13.149 5.617 12.025 4.65 10.895 3.678 9.543 2.936 8.07 2.936h-.07Z"/></svg>
      )}
      {value ? '公开' : '私密'}
    </button>
  )
}

export default function NotesPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [content, setContent] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const MAX = 500

  const fetchNotes = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase
      .from('notes').select('id, content, created_at, is_public')
      .eq('user_id', user.id).order('created_at', { ascending: false })
    setNotes(data ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const submit = async () => {
    const text = content.trim()
    if (!text || submitting) return
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data, error } = await supabase
        .from('notes').insert({ user_id: user.id, content: text, is_public: isPublic })
        .select('id, content, created_at, is_public').single()
      if (error) throw error
      setNotes((prev) => [data, ...prev])
      setContent('')
    } finally { setSubmitting(false) }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit() }
  }

  const deleteNote = async (id: string) => {
    setDeletingId(id)
    try {
      const supabase = createClient()
      await supabase.from('notes').delete().eq('id', id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
    } finally { setDeletingId(null) }
  }

  const togglePublic = async (note: Note) => {
    setTogglingId(note.id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('notes')
        .update({ is_public: !note.is_public }).eq('id', note.id)
      if (!error) setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, is_public: !n.is_public } : n))
    } finally { setTogglingId(null) }
  }

  const NoteActions = ({ note }: { note: Note }) => (
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={() => togglePublic(note)}
        disabled={togglingId === note.id}
        className={`text-xs px-1.5 py-0.5 rounded border transition-colors disabled:opacity-50 ${
          note.is_public
            ? 'bg-[#ddf4ff] text-[#0969da] border-[#b6e3ff]'
            : 'bg-[#f6f8fa] text-[#57606a] border-[#d0d7de]'
        }`}
      >
        {note.is_public ? '公开' : '私密'}
      </button>
      <button onClick={() => deleteNote(note.id)} disabled={deletingId === note.id}
        className="text-xs text-[#cf222e] hover:underline disabled:opacity-50">
        删除
      </button>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1f2328]">随笔</h1>
        {!loading && notes.length > 0 && (
          <div className="flex items-center gap-1 bg-[#f6f8fa] border border-[#d0d7de] rounded-md p-0.5">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-white text-[#1f2328] shadow-sm border border-[#d0d7de]'
                  : 'text-[#57606a] hover:text-[#1f2328]'
              }`}
            >
              时间流
            </button>
            <button
              onClick={() => setViewMode('archive')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                viewMode === 'archive'
                  ? 'bg-white text-[#1f2328] shadow-sm border border-[#d0d7de]'
                  : 'text-[#57606a] hover:text-[#1f2328]'
              }`}
            >
              归档
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#d0d7de] rounded-md p-4 mb-6">
        <textarea
          value={content}
          onChange={(e) => { if (e.target.value.length <= MAX) setContent(e.target.value) }}
          onKeyDown={handleKeyDown}
          placeholder="写下你的想法... (Ctrl+Enter 发送)"
          className="w-full text-sm text-[#1f2328] placeholder-[#8d96a0] resize-none focus:outline-none"
          rows={4}
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${content.length >= MAX ? 'text-red-500' : 'text-[#57606a]'}`}>
            {content.length}/{MAX}
          </span>
          <div className="flex items-center gap-2">
            <VisibilityToggle value={isPublic} onChange={setIsPublic} />
            <button onClick={submit} disabled={!content.trim() || submitting}
              className="px-3 py-1.5 text-sm bg-[#1f2328] text-white rounded-md hover:bg-[#2d3139] transition-colors disabled:opacity-40">
              {submitting ? '发送中...' : '发送'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-[#57606a]">加载中...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 text-sm text-[#57606a]">还没有随笔，写下第一条吧</div>
      ) : viewMode === 'timeline' ? (
        <div className="columns-1 sm:columns-2 gap-4 space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="break-inside-avoid bg-white border border-[#d0d7de] rounded-md p-4 group">
              <p className="text-sm text-[#1f2328] whitespace-pre-wrap leading-relaxed">{note.content}</p>
              <div className="flex items-center justify-between mt-3 gap-2">
                <span className="text-xs text-[#57606a]">
                  {new Date(note.created_at).toLocaleString('zh-CN')}
                </span>
                <NoteActions note={note} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {groupByMonth(notes).map(({ month, label, notes: monthNotes }) => (
            <div key={month}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-[#1f2328]">{label}</h2>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#f6f8fa] text-[#57606a] border border-[#d0d7de]">
                  {monthNotes.length} 条
                </span>
                <div className="flex-1 h-px bg-[#d0d7de]" />
              </div>
              <div className="space-y-2">
                {monthNotes.map((note) => (
                  <div key={note.id} className="bg-white border border-[#d0d7de] rounded-md p-4 group">
                    <p className="text-sm text-[#1f2328] whitespace-pre-wrap leading-relaxed line-clamp-3">{note.content}</p>
                    <div className="flex items-center justify-between mt-3 gap-2">
                      <span className="text-xs text-[#57606a]">
                        {new Date(note.created_at).toLocaleString('zh-CN')}
                      </span>
                      <NoteActions note={note} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
