import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// An on/off switch stored in app_settings (admins only).
export default function AdminSettingSwitch({ settingKey, label, onText, offText, confirmOn, confirmOff, adminLabel = 'admin' }) {
  const [value, setValue] = useState(null) // null = loading
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    supabase.from('app_settings').select('value').eq('key', settingKey).maybeSingle()
      .then(({ data }) => { if (alive) setValue(data?.value === true) })
    return () => { alive = false }
  }, [settingKey])
  const flip = async () => {
    const next = !value
    if (!window.confirm(next ? confirmOn : confirmOff)) return
    setBusy(true)
    const { error } = await supabase.from('app_settings')
      .upsert({ key: settingKey, value: next, updated_at: new Date().toISOString(), updated_by: adminLabel })
    setBusy(false)
    if (error) { alert(`Not changed: ${error.message}`); return }
    setValue(next)
  }
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs">
      <span className="font-semibold text-slate-800">{label}</span>
      {value === null ? <span className="text-slate-400">…</span> : (
        <>
          <span className={`rounded-full px-2 py-0.5 font-bold ${value ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{value ? 'ON' : 'OFF'}</span>
          <button type="button" disabled={busy} onClick={flip} className={`rounded-full px-3 py-1 font-semibold text-white disabled:opacity-60 ${value ? 'bg-slate-600 hover:bg-slate-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
            {value ? 'Turn off' : 'Turn on'}
          </button>
          <span className="text-slate-500">{value ? onText : offText}</span>
        </>
      )}
    </div>
  )
}
