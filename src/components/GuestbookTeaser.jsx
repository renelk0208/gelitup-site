import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'

const AVATAR_COLORS = [
  '#D43790', '#9333ea', '#0ea5e9', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6',
]
const colorFor = (str) =>
  AVATAR_COLORS[Math.abs([...str].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length]
const initials = (n) => {
  const parts = n.trim().split(/\s+/)
  return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : n.trim().slice(0, 2).toUpperCase()
}

const SAMPLE_ENTRIES = [
  { id: 1, name: 'Katia Sdr', country: 'Greece', role: 'Nail Technician', message: 'Υπέροχη εταιρία με υπέροχα προϊόντα 😍', anonymous: false },
  { id: 2, name: 'Jade M.', country: 'France', role: 'Salon Owner', message: "J'ai beaucoup aimé la texture et la facilité d'application du produit.", anonymous: false },
  { id: 3, name: 'Tsvetelina Trenova', country: 'Bulgaria', role: 'Educator', message: 'I am a trainer from Bulgaria with many years of experience in the manicure industry — GEL.IT.UP is my go-to brand.', anonymous: false },
]

export default function GuestbookTeaser() {
  const [entries, setEntries] = useState(SAMPLE_ENTRIES)

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return
    supabase
      .from('guestbook')
      .select('id, name, country, role, message, anonymous')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => { if (data && data.length > 0) setEntries(data) })
  }, [])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#D43790' }}>
            Verified professionals
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-slate-900">From the GEL.IT.UP Community</h2>
        </div>
        <Link
          to="/guestbook"
          className="hidden shrink-0 text-sm font-semibold transition hover:opacity-80 sm:block"
          style={{ color: '#D43790' }}
        >
          Read all entries →
        </Link>
      </div>

      {/* Entry cards */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {entries.slice(0, 3).map((entry) => {
          const displayName = entry.anonymous ? 'Anonymous' : (entry.name || '')
          const color = entry.anonymous ? '#94a3b8' : colorFor(displayName)
          const msg = entry.message || ''
          const preview = msg.length > 110 ? msg.slice(0, 110).trimEnd() + '…' : msg
          return (
            <div key={entry.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {entry.anonymous ? '🙈' : initials(displayName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{displayName}</p>
                  <p className="text-[11px] text-slate-400">{entry.role}{entry.country ? ` · ${entry.country}` : ''}</p>
                </div>
              </div>
              <p className="mt-3 text-sm italic leading-relaxed text-slate-600">"{preview}"</p>
            </div>
          )
        })}
      </div>

      {/* Mobile link */}
      <div className="mt-4 text-center sm:hidden">
        <Link to="/guestbook" className="text-sm font-semibold" style={{ color: '#D43790' }}>
          Read all entries →
        </Link>
      </div>

      {/* CTA */}
      <div className="mt-5 text-center">
        <Link
          to="/guestbook#sign-guestbook"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          style={{ backgroundColor: '#D43790' }}
        >
          🖊️ Add your entry
        </Link>
      </div>
    </div>
  )
}
