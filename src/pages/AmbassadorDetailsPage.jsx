import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'

// Lets an existing ambassador applicant add/update the shipping details we need
// to send sample & PR boxes, without re-applying. Updates their existing record
// (matched by the email they applied with) via a SECURITY DEFINER RPC.
export default function AmbassadorDetailsPage() {
  const [form, setForm] = useState({
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
  })
  const [status, setStatus] = useState('idle') // idle | submitting | success | notfound | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    document.title = 'Update your shipping details | GEL.IT.UP by GIUP®'
  }, [])

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const requiredFilled =
    form.email.trim() && form.address.trim() && form.city.trim() && form.postalCode.trim() && form.country.trim() && form.phone.trim()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!requiredFilled) return
    setStatus('submitting')
    setErrorMsg('')
    try {
      if (!hasSupabaseConfig || !supabase) throw new Error('Not configured')
      const { data, error } = await supabase.rpc('set_ambassador_shipping', {
        p_email: form.email.trim().toLowerCase(),
        p_phone: form.phone.trim(),
        p_address: form.address.trim(),
        p_city: form.city.trim(),
        p_postal_code: form.postalCode.trim(),
        p_country: form.country.trim(),
      })
      if (error) throw error
      setStatus(data === true ? 'success' : 'notfound')
    } catch (err) {
      setErrorMsg(err?.message || 'Something went wrong.')
      setStatus('error')
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/20 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-[#D43790] focus:ring-2 focus:ring-[#D43790]/40'
  const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/60'

  return (
    <div className="-mx-3 -my-4 md:-mx-6 md:-my-10">
      <section
        className="px-5 py-14 sm:py-20"
        style={{ background: 'radial-gradient(120% 120% at 50% 0%, #2a1030 0%, #17111c 55%, #0e0b12 100%)' }}
      >
        <div className="mx-auto max-w-lg">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-[#e879c4]">
            GEL.IT.UP Ambassadors
          </p>
          <h1 className="heading-on-dark mt-3 text-center text-3xl font-black tracking-tight text-white sm:text-4xl">
            Where do we send your box?
          </h1>
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-white/70">
            You&apos;re already in — we just need your shipping details to get your sample &amp; PR boxes to you.
            Use the same email you applied with.
          </p>

          {status === 'success' ? (
            <div className="mt-8 rounded-2xl border border-[#D43790]/40 bg-white/[0.04] p-8 text-center">
              <div className="text-4xl">📦</div>
              <h2 className="mt-4 text-xl font-black text-white">Got it — thank you!</h2>
              <p className="mt-2 text-sm text-white/70">
                Your shipping details are saved. We&apos;ll be in touch when your box is on the way.
              </p>
              <NavLink to="/ambassadors" className="mt-6 inline-flex rounded-full bg-[#D43790] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#c22f82]">
                Back to the programme
              </NavLink>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className={labelClass}>Email you applied with *</label>
                <input type="email" required value={form.email} onChange={update('email')} placeholder="you@email.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone number *</label>
                <input type="tel" required value={form.phone} onChange={update('phone')} placeholder="+40 700 000000" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Street address *</label>
                <input type="text" required value={form.address} onChange={update('address')} placeholder="Street and number" className={inputClass} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>City *</label>
                  <input type="text" required value={form.city} onChange={update('city')} placeholder="City" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Postal code *</label>
                  <input type="text" required value={form.postalCode} onChange={update('postalCode')} placeholder="12345" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Country *</label>
                <input type="text" required value={form.country} onChange={update('country')} placeholder="Romania" className={inputClass} />
              </div>

              {status === 'notfound' && (
                <p className="text-sm text-amber-400">
                  We couldn&apos;t find an ambassador application with that email. Please use the exact email you applied with,
                  or <NavLink to="/ambassadors" className="underline">apply here</NavLink>.
                </p>
              )}
              {status === 'error' && (
                <p className="text-sm text-red-400">{errorMsg || 'Something went wrong.'} Please try again.</p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting' || !requiredFilled}
                className="w-full rounded-full bg-[#D43790] px-6 py-4 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[0_0_24px_rgba(212,55,144,0.4)] transition duration-300 hover:bg-[#c22f82] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'submitting' ? 'Saving…' : 'Save my shipping details'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
