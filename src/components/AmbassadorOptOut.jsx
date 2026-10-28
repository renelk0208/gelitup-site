import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Bottom of the ambassador profile: "Pause or end my collaboration".
// Pause (1 month / 3 months / until I'm ready) or End, with an optional reason.
// She can resume a pause herself. Nothing is emailed to her; GEL.IT.UP sees it
// in the 08:00 email and in the Shipments view.

const fmt = (v) => {
  if (!v) return ''
  const d = new Date(String(v).length === 10 ? `${v}T12:00:00Z` : v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// preview: admin preview (read-only).
export default function AmbassadorOptOut({ preview = false } = {}) {
  const [state, setState] = useState(null) // { opt_out_type, opt_out_until, paused_by } | {}
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState('pause-1')
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    if (preview) { Promise.resolve().then(() => { if (alive) setState({}) }); return () => { alive = false } }
    if (!supabase) return undefined
    supabase.rpc('get_my_ambassador_opt_out').then(({ data, error: err }) => {
      if (!alive) return
      if (err) { setState({}); return }
      setState((Array.isArray(data) ? data[0] : data) || {})
    })
    return () => { alive = false }
  }, [preview])

  if (state === null) return null

  const submit = async () => {
    if (preview) { setError('Preview only — nothing is saved.'); return }
    setBusy(true)
    setError('')
    const type = choice === 'end' ? 'end' : 'pause'
    const months = choice === 'pause-1' ? 1 : choice === 'pause-3' ? 3 : null
    const { data, error: err } = await supabase.rpc('ambassador_opt_out', { p_type: type, p_months: months, p_reason: reason })
    setBusy(false)
    if (err || data !== 'ok') { setError('This could not be saved. Please try again, or write to ambassadors@gelitup.com.'); return }
    const until = months ? new Date(Date.now() + months * 30.5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null
    setState({ opt_out_type: type, opt_out_until: until, paused_by: 'ambassador' })
    setOpen(false)
    setConfirming(false)
  }

  const resume = async () => {
    setBusy(true)
    setError('')
    const { data, error: err } = await supabase.rpc('ambassador_resume')
    setBusy(false)
    if (err || data !== 'ok') { setError('This could not be saved. Please try again, or write to ambassadors@gelitup.com.'); return }
    setState({})
  }

  // Already paused or ended by her.
  if (state.opt_out_type === 'pause') {
    return (
      <div className="mt-3 rounded-xl border border-slate-300 bg-white p-4 text-[13px] text-slate-700">
        <p className="font-semibold text-slate-900">⏸ Your collaboration is paused{state.opt_out_until ? ` until ${fmt(state.opt_out_until)}` : ''}.</p>
        <p className="mt-1">No PR packages are sent while you're paused. Ready to come back? Resume any time.</p>
        <button type="button" onClick={resume} disabled={busy} className="mt-3 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-60">
          {busy ? 'Saving…' : 'Resume my collaboration'}
        </button>
        {error && <p className="mt-2 text-[12px] text-rose-700">{error}</p>}
      </div>
    )
  }
  if (state.opt_out_type === 'end') {
    return (
      <div className="mt-3 rounded-xl border border-slate-300 bg-white p-4 text-[13px] text-slate-700">
        <p className="font-semibold text-slate-900">You've asked to end your collaboration.</p>
        <p className="mt-1">Thank you for everything you've shared with us. If you change your mind, write to ambassadors@gelitup.com.</p>
      </div>
    )
  }

  return (
    <div className="mt-4 text-center">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-[12px] text-slate-500 underline hover:text-slate-700">
          Pause or end my collaboration
        </button>
      ) : (
        <div className="rounded-xl border border-slate-300 bg-white p-4 text-left text-[13px] text-slate-700">
          <p className="font-semibold text-slate-900">Pause or end my collaboration</p>
          <p className="mt-1">Life gets busy, and we understand. While paused, no PR packages are sent and you won't get reminders. You can resume yourself at any time.</p>
          <fieldset className="mt-3 space-y-2">
            <legend className="sr-only">What would you like to do?</legend>
            {[
              ['pause-1', 'Pause for 1 month'],
              ['pause-3', 'Pause for 3 months'],
              ['pause-open', "Pause until I'm ready"],
              ['end', 'End my collaboration'],
            ].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="opt-out-choice" id={`opt-out-${value}`} value={value} checked={choice === value} onChange={() => { setChoice(value); setConfirming(false) }} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <label className="mt-3 block text-[12px] font-semibold text-slate-800" htmlFor="opt-out-reason">
            Anything you'd like to tell us? (optional)
          </label>
          <textarea id="opt-out-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px]" />
          {confirming ? (
            <div className="mt-3 rounded-lg bg-amber-50 p-3 text-[12px] text-amber-900">
              <p className="font-semibold">{choice === 'end' ? 'End your collaboration with GEL.IT.UP?' : 'Pause your collaboration?'}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={submit} disabled={busy} className="rounded-full bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60">
                  {busy ? 'Saving…' : choice === 'end' ? 'Yes, end it' : 'Yes, pause'}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600">Go back</button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setConfirming(true)} className="rounded-full bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700">Continue</button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
            </div>
          )}
          {error && <p className="mt-2 text-[12px] text-rose-700">{error}</p>}
        </div>
      )}
    </div>
  )
}
