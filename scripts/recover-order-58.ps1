##############################################################################
# recover-order-58.ps1
# Restores the missing items + sets distributor_tier for Order #58.
# Items recovered from the Resend email log (full order email sent at checkout).
#
# Requires:
#   - VITE_SUPABASE_URL  in .env.local  (auto-read)
#   - Supabase service_role key         (prompted — never stored)
#
# Usage:  .\scripts\recover-order-58.ps1
##############################################################################
$ErrorActionPreference = "Stop"

$scriptRoot   = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot  = Resolve-Path (Join-Path $scriptRoot "..")
$envLocalPath = Join-Path $projectRoot ".env.local"

function Get-EnvValue([string]$path, [string]$key) {
    if (-not (Test-Path $path)) { return $null }
    $match = Select-String -Path $path -Pattern "^$key=" | Select-Object -First 1
    if (-not $match) { return $null }
    return ($match.Line -replace "^$key=", "").Trim()
}

$supabaseUrl = Get-EnvValue -path $envLocalPath -key "VITE_SUPABASE_URL"
if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
    $supabaseUrl = Read-Host "Supabase project URL (e.g. https://xxxx.supabase.co)"
}
$supabaseUrl = $supabaseUrl.TrimEnd('/')

$serviceKeySecure = Read-Host "Supabase service_role key (Settings → API → service_role)" -AsSecureString
$serviceKeyPtr    = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($serviceKeySecure)
$serviceKey       = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($serviceKeyPtr)

$headers = @{
    "apikey"        = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
}

# ── Full item list recovered from Resend email log ───────────────────────────
# Format: { sku, name, qty }  (same as catalogue_checkout stores)
# Items with no proper SKU at checkout time use a derived/descriptive code.
$items = @(
    # GIUP gel polishes
    @{ sku="GIUP 20";   name="GIUP 20";   qty=2  }
    @{ sku="GIUP 20A";  name="GIUP 20A";  qty=2  }
    @{ sku="GIUP 20B";  name="GIUP 20B";  qty=4  }
    @{ sku="GIUP 20C";  name="GIUP 20C";  qty=4  }
    @{ sku="GIUP 2B";   name="GIUP 2B";   qty=2  }
    @{ sku="GIUP 2C";   name="GIUP 2C";   qty=2  }
    @{ sku="GIUP 2F";   name="GIUP 2F";   qty=2  }
    @{ sku="GIUP 04";   name="GIUP 04";   qty=15 }
    @{ sku="GIUP 7B";   name="GIUP 7B";   qty=5  }
    @{ sku="GIUP 9B";   name="GIUP 9B";   qty=7  }
    @{ sku="FR01";      name="GIUP FR01"; qty=1  }
    @{ sku="FR03";      name="GIUP FR03"; qty=1  }
    @{ sku="FR05";      name="GIUP FR05"; qty=7  }
    @{ sku="FR06";      name="GIUP FR06"; qty=15 }
    @{ sku="FR08";      name="GIUP FR08"; qty=8  }
    @{ sku="GIUP 15";   name="GIUP 15";   qty=17 }
    @{ sku="GIUP 51";   name="GIUP 51";   qty=3  }
    @{ sku="GIUP 51A";  name="GIUP 51A";  qty=5  }
    @{ sku="GIUP 53";   name="GIUP 53";   qty=3  }
    @{ sku="GIUP 59";   name="GIUP 59";   qty=8  }
    @{ sku="GIUP 105";  name="GIUP 105";  qty=3  }
    @{ sku="GIUP 116";  name="GIUP 116";  qty=3  }
    @{ sku="GIUP 117";  name="GIUP 117";  qty=2  }
    @{ sku="GIUP 209";  name="GIUP 209";  qty=2  }
    @{ sku="GIUP 227";  name="GIUP 227";  qty=8  }
    @{ sku="GIUP 254";  name="GIUP 254";  qty=1  }
    @{ sku="GIUP 256";  name="GIUP 256";  qty=1  }
    @{ sku="GIUP 257";  name="GIUP 257";  qty=1  }
    @{ sku="GIUP 1801"; name="GIUP 1801"; qty=8  }
    @{ sku="GIUP 1900"; name="GIUP 1900"; qty=2  }
    @{ sku="GIUP 1908"; name="GIUP 1908"; qty=3  }
    @{ sku="GIUP 1943"; name="GIUP 1943"; qty=8  }
    @{ sku="GIUP 2026"; name="GIUP 2026"; qty=2  }
    @{ sku="GIUP 2035"; name="GIUP 2035"; qty=3  }
    @{ sku="GIUP 2039"; name="GIUP 2039"; qty=1  }
    @{ sku="GIUP 2041"; name="GIUP 2041"; qty=5  }
    @{ sku="GIUP 2042"; name="GIUP 2042"; qty=2  }
    @{ sku="GIUP 2043"; name="GIUP 2043"; qty=2  }
    @{ sku="GIUP 2050"; name="GIUP 2050"; qty=1  }
    @{ sku="GIUP 2103"; name="GIUP 2103"; qty=2  }
    @{ sku="GIUP 2202"; name="GIUP 2202"; qty=1  }
    @{ sku="GIUP 2203"; name="GIUP 2203"; qty=2  }
    @{ sku="GIUP 2204"; name="GIUP 2204"; qty=4  }
    @{ sku="GIUP 2205"; name="GIUP 2205"; qty=12 }
    @{ sku="GIUP 2206"; name="GIUP 2206"; qty=4  }
    @{ sku="GIUP 2211"; name="GIUP 2211"; qty=1  }
    @{ sku="GIUP 2301"; name="GIUP 2301"; qty=6  }
    @{ sku="GIUP 2303"; name="GIUP 2303"; qty=1  }
    @{ sku="GIUP 2304"; name="GIUP 2304"; qty=2  }
    @{ sku="GIUP 2306"; name="GIUP 2306"; qty=6  }
    @{ sku="GIUP 2307"; name="GIUP 2307"; qty=2  }
    @{ sku="GIUP 2308"; name="GIUP 2308"; qty=2  }
    @{ sku="GIUP 2316"; name="GIUP 2316"; qty=12 }
    @{ sku="GIUP 2320"; name="GIUP 2320"; qty=1  }
    @{ sku="GIUP 2400"; name="GIUP 2400"; qty=4  }
    @{ sku="GIUP 2401"; name="GIUP 2401"; qty=12 }
    @{ sku="GIUP 2402"; name="GIUP 2402"; qty=6  }
    @{ sku="GIUP 2403"; name="GIUP 2403"; qty=4  }
    @{ sku="GIUP 2404"; name="GIUP 2404"; qty=3  }
    @{ sku="GIUP 2405"; name="GIUP 2405"; qty=4  }
    @{ sku="GIUP 2406"; name="GIUP 2406"; qty=3  }
    @{ sku="GIUP 2409"; name="GIUP 2409"; qty=5  }
    @{ sku="GIUP 2410"; name="GIUP 2410"; qty=3  }
    @{ sku="GIUP 2411"; name="GIUP 2411"; qty=2  }
    @{ sku="GIUP 2412"; name="GIUP 2412"; qty=3  }
    @{ sku="GIUP 2413"; name="GIUP 2413"; qty=3  }
    @{ sku="GIUP 2414"; name="GIUP 2414"; qty=6  }
    @{ sku="GIUP 2415"; name="GIUP 2415"; qty=2  }
    @{ sku="GIUP 2419"; name="GIUP 2419"; qty=1  }
    @{ sku="GIUP 2420"; name="GIUP 2420"; qty=6  }
    @{ sku="GIUP 2421"; name="GIUP 2421"; qty=8  }
    @{ sku="GIUP 2423"; name="GIUP 2423"; qty=3  }
    @{ sku="GIUP 2425"; name="GIUP 2425"; qty=2  }
    @{ sku="GIUP 2426"; name="GIUP 2426"; qty=8  }
    @{ sku="GIUP 2428"; name="GIUP 2428"; qty=1  }
    @{ sku="GIUP 2432"; name="GIUP 2432"; qty=9  }
    @{ sku="GIUP 2433"; name="GIUP 2433"; qty=7  }
    @{ sku="GIUP 2435"; name="GIUP 2435"; qty=1  }
    @{ sku="GIUP 2439"; name="GIUP 2439"; qty=2  }
    @{ sku="GIUP 2441"; name="GIUP 2441"; qty=1  }
    @{ sku="GIUP 2502"; name="GIUP 2502"; qty=2  }
    @{ sku="GIUP 2503"; name="GIUP 2503"; qty=2  }
    @{ sku="GIUP 2504"; name="GIUP 2504"; qty=1  }
    @{ sku="GIUP 2505"; name="GIUP 2505"; qty=1  }
    @{ sku="GIUP 2506"; name="GIUP 2506"; qty=2  }
    @{ sku="GIUP 2508"; name="GIUP 2508"; qty=3  }
    @{ sku="GIUP 2509"; name="GIUP 2509"; qty=8  }
    @{ sku="GIUP 2510"; name="GIUP 2510"; qty=6  }
    @{ sku="GIUP 2511"; name="GIUP 2511"; qty=2  }
    @{ sku="GIUP 2521"; name="GIUP 2521"; qty=2  }
    @{ sku="GIUP 2600"; name="GIUP 2600"; qty=1  }
    @{ sku="GIUP 2601"; name="GIUP 2601"; qty=5  }
    @{ sku="GIUP 2602"; name="GIUP 2602"; qty=1  }
    @{ sku="GIUP 2603"; name="GIUP 2603"; qty=5  }
    @{ sku="GIUP 2604"; name="GIUP 2604"; qty=1  }
    @{ sku="GIUP 2606"; name="GIUP 2606"; qty=2  }
    @{ sku="GIUP 2607"; name="GIUP 2607"; qty=2  }
    @{ sku="GIUP 2608"; name="GIUP 2608"; qty=2  }
    @{ sku="GIUP 2611"; name="GIUP 2611"; qty=11 }
    @{ sku="GIUP 2612"; name="GIUP 2612"; qty=7  }
    @{ sku="GIUP 2613"; name="GIUP 2613"; qty=11 }
    @{ sku="GIUP 2614"; name="GIUP 2614"; qty=6  }
    @{ sku="GIUP 2615"; name="GIUP 2615"; qty=6  }
    @{ sku="GIUP 01";   name="GIUP 01 FFF"; qty=5 }
    @{ sku="GIUP 8E";   name="GIUP 8E";   qty=6  }
    @{ sku="GIUP 09";   name="GIUP 09";   qty=3  }
    # GIUP N-series (SKU not captured at checkout — derived from product name)
    @{ sku="GIUPN008";  name="GIUP N008"; qty=3  }
    @{ sku="GIUPN009";  name="GIUP N009"; qty=1  }
    @{ sku="GIUPN010";  name="GIUP N010"; qty=1  }
    @{ sku="GIUPN025";  name="GIUP N025"; qty=4  }
    # GIUP SB / FB series (SKU derived from product name)
    @{ sku="GIUPSBPS";  name="GIUP SBPS";  qty=4  }
    @{ sku="GIUPSBBLUE";name="GIUP SBBlue";qty=1  }
    @{ sku="GIUPSBLS";  name="GIUP SBLS";  qty=1  }
    @{ sku="GIUPSBMS";  name="GIUP SBMS";  qty=1  }
    @{ sku="GIUPSBPURS";name="GIUP SBPURS";qty=1  }
    @{ sku="GIUPSBCCLR";name="GIUP SBCCLR";qty=15 }
    @{ sku="GIUPSBCBP"; name="GIUP SBCBP"; qty=4  }
    @{ sku="GIUPSBCN";  name="GIUP SBCN";  qty=4  }
    @{ sku="GIUPSB";    name="GIUP SB";    qty=10 }
    @{ sku="GIUPFBCLR"; name="GIUP FBCLR"; qty=1  }
    # VCE series
    @{ sku="VCE 01"; name="GIUP VCE 01"; qty=1 }
    @{ sku="VCE 03"; name="GIUP VCE 03"; qty=1 }
    @{ sku="VCE 04"; name="GIUP VCE 04"; qty=2 }
    @{ sku="VCE 07"; name="GIUP VCE 07"; qty=2 }
    @{ sku="VCE 08"; name="GIUP VCE 08"; qty=1 }
    # GCE / DCE / BTO series
    @{ sku="GCE01"; name="GCE01"; qty=2 }
    @{ sku="GCE02"; name="GCE02"; qty=6 }
    @{ sku="GCE04"; name="GCE04"; qty=2 }
    @{ sku="GCE05"; name="GCE05"; qty=1 }
    @{ sku="GCE06"; name="GCE06"; qty=2 }
    @{ sku="DCE1";  name="DCE1";  qty=2 }
    @{ sku="BTO01"; name="GIUP BTO01"; qty=2 }
    @{ sku="BTO02"; name="GIUP BTO02"; qty=3 }
    @{ sku="BTO04"; name="GIUP BTO04"; qty=2 }
    @{ sku="BTO06"; name="GIUP BTO06"; qty=2 }
    # B2B colour series
    @{ sku="BRED0001";    name="GIUP B2BRed0001";    qty=10 }
    @{ sku="BYELLOW0002"; name="GIUP B2BYellow0002"; qty=2  }
    # Gel tips / soak-off tips (SKU not captured — derived from product name)
    @{ sku="SGTLA";  name="Soak off Gel tips LONG ALMOND";     qty=10 }
    @{ sku="SGTLC";  name="Soak off gel tips LONG COFFIN";     qty=12 }
    @{ sku="SGTMS";  name="Soak off gel tips MEDIUM SQUARE";   qty=3  }
    @{ sku="SGTSA";  name="Soak off gel tips SHORT ALMOND";    qty=2  }
    @{ sku="DFLA";   name="Dual forms LONG ALMOND";            qty=2  }
    # Glitter / pigments
    @{ sku="GLITTER 01"; name="sugary glitter 01"; qty=2 }
    @{ sku="GLITTER 02"; name="sugary glitter 02"; qty=4 }
    @{ sku="GLITTER 03"; name="sugary glitter 03"; qty=3 }
    @{ sku="GLITTER 04"; name="sugary glitter 04"; qty=4 }
    @{ sku="GLITTER 05"; name="sugary glitter 05"; qty=2 }
    @{ sku="GLITTER 06"; name="sugary glitter 06"; qty=3 }
    @{ sku="GLITTER 07"; name="sugary glitter 07"; qty=4 }
    @{ sku="MIRRORCLEAR";   name="MIRROR CLEAR";    qty=18 }
    @{ sku="MIRRORTOPCOAT"; name="Mirror Top Coat"; qty=3  }
    # Nail tools / accessories
    @{ sku="SH07";     name="SH07";    qty=3 }
    @{ sku="SH08";     name="SH08";    qty=3 }
    @{ sku="SH09";     name="SH09";    qty=3 }
    @{ sku="SH10";     name="SH10";    qty=3 }
    @{ sku="SH11";     name="SH11";    qty=3 }
    @{ sku="SH12";     name="SH12";    qty=3 }
    @{ sku="NWMT15";   name="NWMT15";  qty=3 }
    @{ sku="NAILWIPES";name="nail wipes"; qty=16 }
    @{ sku="CLEANSER"; name="CLEANSER"; qty=6 }
    # Polygel / builder gels
    @{ sku="POLYGEL 2"; name="polygel 2";        qty=5 }
    @{ sku="POLYGELCLR";name="clear polygel";    qty=4 }
    @{ sku="MMSSPC";    name="multimix super soft pink color"; qty=6 }
    @{ sku="MMLNC";     name="multimix light nude color";      qty=6 }
    @{ sku="IN 1";      name="3 in 1 premium builder gel blush"; qty=2 }
    @{ sku="IN 1";      name="3 in 1 premium builder gel nude";  qty=4 }
    @{ sku="IN 1";      name="3 in 1 premium builder gels pink"; qty=2 }
    # Cuticle oils
    @{ sku="COILCOCO";  name="cuticle oil coconut";           qty=6 }
    @{ sku="COILMELON"; name="cuticle oil melon";             qty=6 }
    @{ sku="COILPEACH"; name="cuticle oil peach";             qty=6 }
    @{ sku="WSCOILM";   name="white satin cuticle oil melon"; qty=4 }
    @{ sku="WSCOILP";   name="white satin cuticle oil peach"; qty=4 }
    # Liners / base coats / other
    @{ sku="LINER 9";   name="skinny liner 9 11";        qty=10 }
    @{ sku="STF01";     name="STF01";                    qty=3  }
    @{ sku="UP 0002";   name="line it UP 0002 White";    qty=7  }
    @{ sku="CLASSICBC"; name="CLASSIC Base Coat Image";  qty=8  }
)

# ── Confirm item count before writing ────────────────────────────────────────
$totalUnits = ($items | Measure-Object -Property qty -Sum).Sum
Write-Host ""
Write-Host "Items to write: $($items.Count) line items, $totalUnits total units" -ForegroundColor Cyan
Write-Host "Order total from email: EUR 6895.40  |  Original DB total_units: 733"
Write-Host ""
$confirm = Read-Host "Proceed with updating Order #58? (yes/no)"
if ($confirm -notmatch '^y') { Write-Host "Aborted."; exit 0 }

# ── Serialise to JSON ─────────────────────────────────────────────────────────
$itemsJson = $items | ConvertTo-Json -Compress -Depth 5

$body = [ordered]@{
    items            = $items
    distributor_tier = "professional"
} | ConvertTo-Json -Compress -Depth 10

# ── PATCH Order #58 ───────────────────────────────────────────────────────────
$endpoint = "$supabaseUrl/rest/v1/b2b_orders?id=eq.58"

Write-Host "Sending PATCH to $endpoint ..."

try {
    $response = Invoke-RestMethod `
        -Uri $endpoint `
        -Method Patch `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json"

    Write-Host ""
    Write-Host "✓ Order #58 updated successfully." -ForegroundColor Green
    Write-Host "  Items written : $($items.Count) line items"
    Write-Host "  Total units   : $totalUnits"
    Write-Host "  Tier set to   : professional"
    Write-Host ""
    Write-Host "NOTE: $($items | Where-Object { $_.sku -match '^(SGTLA|SGTLC|SGTMS|SGTSA|DFLA|MIRRORCLEAR|MIRRORTOPCOAT|NAILWIPES|CLEANSER|POLYGELCLR|MMSSPC|MMLNC|COIL|WSCOI|CLASSICBC|GIUPN|GIUPSB|GIUPFB)' } | Measure-Object).Count items used derived SKU codes — review in Admin Dashboard and correct any that differ from your Zoho item codes." -ForegroundColor Yellow
}
catch {
    Write-Host ""
    Write-Host "✗ Update failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message }
}
