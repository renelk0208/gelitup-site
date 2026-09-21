$file = "c:\DEV\Leeukopf-Website-Official\gelitup-app\src\App.jsx"
$c = [System.IO.File]::ReadAllText($file)

# Find injection point: just before the mt-5 grid that starts the product tiles in catalog view
$hemaIdx = $c.IndexOf("HEMA & TPO-Free standards matter?")
$gridIdx = $c.IndexOf('<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3', $hemaIdx)

if ($gridIdx -lt 0) {
    Write-Error "Could not find grid div. Aborting."
    exit 1
}

Write-Host "Injecting colour chart before index $gridIdx"

$chart = @'
        {/* ── STICKY LIVE COLOUR CHART (catalog browsing) ── */}
        <div className="sticky top-0 z-20 -mx-4 mt-4 border-y border-slate-200 bg-white px-4 pb-3 pt-3 sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-900">
              {(selectedCodes.length + packageCartItems.length) > 0
                ? `Your Selection — ${selectedCodes.length + packageCartItems.length} items · ${totalUnits} units`
                : 'Your Selection — tap products below to add'}
            </p>
            <div className="flex items-center gap-3">
              {(selectedCodes.length > 0 || packageCartItems.length > 0) && (
                <button
                  onClick={() => { setSelectedCodes([]); setPackageCartItems([]); setGeneratedPackageTier('') }}
                  className="text-[11px] font-semibold text-rose-500 hover:underline"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => navigate('/portal/dashboard/products')}
                className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-fuchsia-500"
              >
                Checkout ({totalUnits})
              </button>
            </div>
          </div>
          {(selectedCodes.length === 0 && packageCartItems.length === 0)
            ? <p className="mt-1 text-[11px] italic text-slate-400">Nothing selected yet.</p>
            : (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {selectedProducts.map((product) => (
                  <div
                    key={product.code}
                    className="group relative flex w-[64px] flex-none flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                  >
                    <div
                      className="relative h-[64px] w-full flex-none"
                      style={{ backgroundColor: product.preview || '#e2e8f0' }}
                    >
                      {product.imageUrl
                        ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                        : null}
                      <button
                        onClick={() => toggleSelection(product.code)}
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[11px] font-bold text-slate-700 shadow opacity-0 transition group-hover:opacity-100"
                        aria-label={`Remove ${product.code}`}
                      >&times;</button>
                    </div>
                    <div className="p-1">
                      <p className="truncate text-[10px] font-semibold leading-tight text-slate-900">{product.code}</p>
                      <p className="truncate text-[9px] leading-tight text-slate-500">{product.name}</p>
                    </div>
                  </div>
                ))}
                {packageCartItems.map((item) => {
                  const resolvedImg = resolveCatalogImageUrl(item)
                  const itemPreview = item.preview || item.hex_color || '#e2e8f0'
                  return (
                    <div
                      key={`pkg-${item.sku}-${item.code}`}
                      className="relative flex w-[64px] flex-none flex-col overflow-hidden rounded-lg border border-fuchsia-300 bg-white shadow-sm"
                    >
                      <div
                        className="relative h-[64px] w-full flex-none"
                        style={{ backgroundColor: itemPreview }}
                      >
                        {resolvedImg
                          ? <img src={resolvedImg} alt={item.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                          : null}
                        <span className="absolute left-0.5 top-0.5 rounded-full bg-fuchsia-600 px-1 py-0.5 text-[9px] font-bold leading-none text-white">{item.qty}&times;</span>
                      </div>
                      <div className="p-1">
                        <p className="truncate text-[10px] font-semibold leading-tight text-slate-900">{item.code}</p>
                        <p className="truncate text-[9px] leading-tight text-fuchsia-700">{item.name}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </div>

'@

# Normalize chart to CRLF
$chartCrlf = $chart -replace "`r`n", "`n" -replace "`n", "`r`n"

$newContent = $c.Substring(0, $gridIdx) + $chartCrlf + $c.Substring($gridIdx)
[System.IO.File]::WriteAllText($file, $newContent)
Write-Host "Done. New file size: $($newContent.Length)"
