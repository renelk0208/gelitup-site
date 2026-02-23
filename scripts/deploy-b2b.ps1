$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptRoot "..")
Set-Location $projectRoot

Write-Host "Project root: $projectRoot"
Write-Host "Using Supabase CLI via npx (isolated, no project install)."

function Invoke-Supabase {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  npx --yes supabase@latest -- @Args
  if ($LASTEXITCODE -ne 0) {
    throw "supabase command failed: supabase $($Args -join ' ')"
  }
}

$PROJECT_REF = Read-Host "Supabase project ref"
$EMAIL_FROM = Read-Host "VITE_EMAIL_FROM (default distributors@gelitup.com)"
if ([string]::IsNullOrWhiteSpace($EMAIL_FROM)) { $EMAIL_FROM = "distributors@gelitup.com" }

$EMAIL_REPLY_TO = Read-Host "VITE_EMAIL_REPLY_TO (default distribution@gelitup.com)"
if ([string]::IsNullOrWhiteSpace($EMAIL_REPLY_TO)) { $EMAIL_REPLY_TO = "distribution@gelitup.com" }

$tokenSecure = Read-Host "Supabase access token (sbp_...)" -AsSecureString
$tokenPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($tokenSecure)
$SUPABASE_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPtr)

function Set-OrAddEnvVar([string]$path, [string]$key, [string]$value) {
  if (-not (Test-Path $path)) { New-Item -ItemType File -Path $path -Force | Out-Null }

  $content = Get-Content $path -ErrorAction SilentlyContinue
  if (-not $content) { $content = @() }

  $prefix = "$key="
  $found = $false

  for ($i = 0; $i -lt $content.Count; $i++) {
    if ($content[$i].StartsWith($prefix)) {
      $content[$i] = "$key=$value"
      $found = $true
      break
    }
  }

  if (-not $found) {
    $content += "$key=$value"
  }

  Set-Content -Path $path -Value $content
}

function Get-EnvValue([string]$path, [string]$key) {
  if (-not (Test-Path $path)) { return $null }

  $match = Select-String -Path $path -Pattern "^$key=" | Select-Object -First 1
  if (-not $match) { return $null }

  return ($match.Line -replace "^$key=", "").Trim()
}

try {
  $env:SUPABASE_ACCESS_TOKEN = $SUPABASE_TOKEN

  $envPath = Join-Path $projectRoot ".env"
  $RESEND_API_KEY = Get-EnvValue -path $envPath -key "RESEND_API_KEY"

  if ([string]::IsNullOrWhiteSpace($RESEND_API_KEY)) {
    $RESEND_API_KEY = Read-Host "RESEND_API_KEY"
  }

  Write-Host "Linking project..."
  Invoke-Supabase link --project-ref $PROJECT_REF

  Write-Host "Setting RESEND_API_KEY secret..."
  Invoke-Supabase secrets set "RESEND_API_KEY=$RESEND_API_KEY"

  Write-Host "Deploying b2b-email-notifications function..."
  Invoke-Supabase functions deploy b2b-email-notifications --project-ref $PROJECT_REF --use-api

  Set-OrAddEnvVar -path $envPath -key "VITE_EMAIL_WEBHOOK_URL" -value "https://$PROJECT_REF.functions.supabase.co/b2b-email-notifications"
  Set-OrAddEnvVar -path $envPath -key "VITE_EMAIL_FROM" -value $EMAIL_FROM
  Set-OrAddEnvVar -path $envPath -key "VITE_EMAIL_REPLY_TO" -value $EMAIL_REPLY_TO

  Write-Host "Success: linked, secret set, function deployed, and .env updated."
}
finally {
  Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPtr)
  $SUPABASE_TOKEN = $null
}
