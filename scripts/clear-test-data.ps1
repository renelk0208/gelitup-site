##############################################################################
# clear-test-data.ps1
# Deletes all rows from b2b_registrations + b2b_orders, then deletes all
# non-admin auth users from Supabase.
#
# Requires:
#   - VITE_SUPABASE_URL  in .env.local  (auto-read)
#   - Supabase service_role key         (prompted — never stored)
#
# Usage:  .\scripts\clear-test-data.ps1
##############################################################################
$ErrorActionPreference = "Stop"

$scriptRoot   = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot  = Resolve-Path (Join-Path $scriptRoot "..")
$envLocalPath = Join-Path $projectRoot ".env.local"

# ── Read VITE_SUPABASE_URL from .env.local ────────────────────────────────────
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

# ── Prompt for service_role key (never stored) ────────────────────────────────
$serviceKeySecure = Read-Host "Supabase service_role key (Settings → API → service_role)" -AsSecureString
$serviceKeyPtr    = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($serviceKeySecure)
$serviceKey       = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($serviceKeyPtr)

$headers = @{
    "apikey"        = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type"  = "application/json"
}

# ── Confirm before proceeding ─────────────────────────────────────────────────
Write-Host ""
Write-Host "=== THIS WILL PERMANENTLY DELETE ===" -ForegroundColor Yellow
Write-Host "  • All rows in public.b2b_registrations" -ForegroundColor Yellow
Write-Host "  • All rows in public.b2b_orders" -ForegroundColor Yellow
Write-Host "  • All non-admin auth users" -ForegroundColor Yellow
Write-Host "  Project: $supabaseUrl" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Type YES to continue"
if ($confirm -ne "YES") {
    Write-Host "Aborted." -ForegroundColor Cyan
    exit 0
}

try {
    # ── 1. Delete all registrations via REST ──────────────────────────────────
    Write-Host "`n[1/3] Deleting b2b_registrations..." -ForegroundColor Cyan
    $regResp = Invoke-RestMethod `
        -Uri "$supabaseUrl/rest/v1/b2b_registrations?id=neq.00000000-0000-0000-0000-000000000000" `
        -Method Delete `
        -Headers $headers
    Write-Host "      Done." -ForegroundColor Green

    # ── 2. Delete all orders via REST ─────────────────────────────────────────
    Write-Host "[2/3] Deleting b2b_orders..." -ForegroundColor Cyan
    $ordResp = Invoke-RestMethod `
        -Uri "$supabaseUrl/rest/v1/b2b_orders?id=neq.00000000-0000-0000-0000-000000000000" `
        -Method Delete `
        -Headers $headers
    Write-Host "      Done." -ForegroundColor Green

    # ── 3. Delete auth users (skip b2b_admins emails) ─────────────────────────
    Write-Host "[3/3] Fetching auth users..." -ForegroundColor Cyan

    # Fetch admin emails from DB to skip them
    $adminsResp = Invoke-RestMethod `
        -Uri "$supabaseUrl/rest/v1/b2b_admins?select=email" `
        -Method Get `
        -Headers $headers
    $adminEmails = @($adminsResp | ForEach-Object { $_.email.Trim().ToLower() })
    if ($adminEmails.Count -gt 0) {
        Write-Host "      Preserving admin accounts: $($adminEmails -join ', ')" -ForegroundColor Cyan
    }

    # Paginate through all auth users
    $page       = 1
    $perPage    = 1000
    $deleted    = 0
    $preserved  = 0

    do {
        $usersResp = Invoke-RestMethod `
            -Uri "$supabaseUrl/auth/v1/admin/users?page=$page&per_page=$perPage" `
            -Method Get `
            -Headers $headers

        $users = @($usersResp.users)
        if ($users.Count -eq 0) { break }

        foreach ($user in $users) {
            $email = $user.email.Trim().ToLower()
            if ($adminEmails -contains $email) {
                Write-Host "      Skipping admin: $email" -ForegroundColor DarkGray
                $preserved++
                continue
            }

            try {
                Invoke-RestMethod `
                    -Uri "$supabaseUrl/auth/v1/admin/users/$($user.id)" `
                    -Method Delete `
                    -Headers $headers | Out-Null
                Write-Host "      Deleted user: $email" -ForegroundColor DarkGray
                $deleted++
            } catch {
                Write-Host "      Failed to delete $email`: $_" -ForegroundColor Red
            }
        }

        # If we got fewer than perPage, we're on the last page
        if ($users.Count -lt $perPage) { break }
        $page++
    } while ($true)

    Write-Host "      Auth users deleted: $deleted  |  Preserved (admins): $preserved" -ForegroundColor Green

    Write-Host "`nAll test data cleared successfully." -ForegroundColor Green
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($serviceKeyPtr)
    $serviceKey = $null
}
