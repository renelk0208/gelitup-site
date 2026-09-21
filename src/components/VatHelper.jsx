/**
 * VatHelper — optional VAT number input with inline format hint.
 * Props:
 *   value         string    current VAT value
 *   onChange      fn        called with new string value
 *   country       string    selected invoice country (for placeholder prefix)
 *   onVerify      fn?       optional verify handler (receives vatNumber)
 *   verifying     bool?     true while VIES check is in progress
 *   verifyResult  object?   { valid: bool, name?: string }
 *   verifyError   string?   error message from VIES
 */
const COUNTRY_VAT_PREFIX = {
  Austria: 'AT', Belgium: 'BE', Bulgaria: 'BG', Croatia: 'HR', Cyprus: 'CY',
  'Czech Republic': 'CZ', Denmark: 'DK', Estonia: 'EE', Finland: 'FI', France: 'FR',
  Germany: 'DE', Greece: 'EL', Hungary: 'HU', Ireland: 'IE', Italy: 'IT',
  Latvia: 'LV', Lithuania: 'LT', Luxembourg: 'LU', Malta: 'MT', Netherlands: 'NL',
  Poland: 'PL', Portugal: 'PT', Romania: 'RO', Slovakia: 'SK', Slovenia: 'SI',
  Spain: 'ES', Sweden: 'SE',
}

export default function VatHelper({
  value = '',
  onChange,
  country = '',
  onVerify,
  verifying = false,
  verifyResult = null,
  verifyError = '',
}) {
  const prefix = COUNTRY_VAT_PREFIX[country] || 'EU'
  const placeholder = `${prefix}123456789`

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        VAT Number{' '}
        <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
          optional
        </span>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-fuchsia-500/20 focus:ring"
          />
          {onVerify && (
            <button
              type="button"
              onClick={() => onVerify(value)}
              disabled={verifying || !value.trim()}
              className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
            >
              {verifying ? 'Checking…' : 'Verify'}
            </button>
          )}
        </div>
      </label>
      {verifyResult?.valid && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px]">✓</span>
          VAT verified{verifyResult.name ? ` — ${verifyResult.name}` : ''}
        </p>
      )}
      {verifyError && <p className="mt-1.5 text-xs text-rose-600">{verifyError}</p>}
      <p className="mt-1 text-[11px] text-slate-400">
        VAT is optional — add it to appear on your pro forma invoices.
      </p>
    </div>
  )
}
