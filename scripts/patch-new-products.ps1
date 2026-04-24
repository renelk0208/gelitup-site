param()
Set-Location 'c:\DEV\Leeukopf-Website-Official\gelitup-app'

# Remove duplicate Serenity entries from all 3 alias blocks in App.jsx
# Each block currently has the 5 Serenity lines twice; delete the second occurrence in each.
# Duplicate positions (1-based):
#   Block 1: lines 1678-1682 (0-based 1677-1681)
#   Block 2: lines 3769-3773 (0-based 3768-3772)
#   Block 3: lines 11465-11469 (0-based 11464-11468)

$f = 'src\App.jsx'
$lines = [System.IO.File]::ReadAllLines($f)
Write-Host "Lines before: $($lines.Length)"

# Verify the lines we're about to delete
Write-Host "Block 1 dup (0-based 1677): $($lines[1677])"
Write-Host "Block 2 dup (0-based 3768): $($lines[3768])"
Write-Host "Block 3 dup (0-based 11464): $($lines[11464])"

# Work bottom to top to avoid index drift
# Delete block 3 duplicate (0-based 11464 to 11468 inclusive = 5 lines)
$lines = $lines[0..11463] + $lines[11469..($lines.Length-1)]
Write-Host "After block 3 delete: $($lines.Length)"

# Delete block 2 duplicate (0-based 3768 to 3772)
$lines = $lines[0..3767] + $lines[3773..($lines.Length-1)]
Write-Host "After block 2 delete: $($lines.Length)"

# Delete block 1 duplicate (0-based 1677 to 1681)
$lines = $lines[0..1676] + $lines[1682..($lines.Length-1)]
Write-Host "After block 1 delete: $($lines.Length)"

[System.IO.File]::WriteAllLines($f, $lines, [System.Text.UTF8Encoding]::new($false))
Write-Host "DONE. Final lines: $($lines.Length)"

# Verify all 3 blocks now have exactly one Serenity set after SBCSN
$sbcsnIdx = @(); for ($i=0;$i -lt $lines.Length;$i++){ if($lines[$i] -match 'GIUP SBCSN.*Soft Nude'){$sbcsnIdx+=$i} }
Write-Host "`nSBCSN at (0-based): $($sbcsnIdx -join ', ')"
foreach ($idx in $sbcsnIdx) {
  Write-Host "`n--- SBCSN block at line $($idx+1) ---"
  $lines[($idx)..($idx+7)] | ForEach-Object { Write-Host $_ }
}
