param(
  [ValidateSet('chrome','firefox')][string]$Style = 'chrome',
  [string]$Dir = "$env:USERPROFILE\Downloads",
  [string]$Name = 'te-test.bin',
  [int]$Seconds = 6,
  [int]$ChunkKB = 256,
  [int]$IntervalMs = 250
)
function Log($m) { Write-Host ("{0:HH:mm:ss.fff} {1}" -f (Get-Date), $m) }
$buf = New-Object byte[] ($ChunkKB * 1024)
$final = Join-Path $Dir $Name
if (Test-Path $final) { Remove-Item $final -Force }

if ($Style -eq 'chrome') {
  # Chromium: "Unconfirmed NNNNNN.crdownload" -> "<name>.crdownload" -> "<name>"
  $unconf = Join-Path $Dir ("Unconfirmed {0}.crdownload" -f (Get-Random -Minimum 100000 -Maximum 999999))
  $tmp = Join-Path $Dir ($Name + '.crdownload')
  if (Test-Path $tmp) { Remove-Item $tmp -Force }
  $fs = [IO.File]::Open($unconf, 'CreateNew', 'ReadWrite', 'ReadWrite')
  Log "created  $unconf"
  Start-Sleep -Milliseconds 400
  $fs.Close()
  Rename-Item $unconf $tmp
  Log "renamed  -> $tmp"
  $fs = [IO.File]::Open($tmp, 'Open', 'ReadWrite', 'ReadWrite')
  $fs.Seek(0, 'End') | Out-Null
  $end = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $end) {
    $fs.Write($buf, 0, $buf.Length); $fs.Flush()
    Start-Sleep -Milliseconds $IntervalMs
  }
  $fs.Close()
  Log "data done size=$((Get-Item $tmp).Length)"
  Rename-Item $tmp $final
  Log "renamed  -> $final"
  # Chromium then writes Zone.Identifier (mark of the web)
  Set-Content -Path "$final`:Zone.Identifier" -Value "[ZoneTransfer]`r`nZoneId=3`r`n" -NoNewline
  Log "MOTW written"
} else {
  # Firefox: 0-byte "<name>" placeholder + "<name>.part" growing, then .part moved over placeholder
  $part = Join-Path $Dir ($Name + '.part')
  if (Test-Path $part) { Remove-Item $part -Force }
  [IO.File]::WriteAllBytes($final, [byte[]]@())
  Log "placeholder $final"
  $fs = [IO.File]::Open($part, 'CreateNew', 'ReadWrite', 'ReadWrite')
  Log "created  $part"
  $end = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $end) {
    $fs.Write($buf, 0, $buf.Length); $fs.Flush()
    Start-Sleep -Milliseconds $IntervalMs
  }
  $fs.Close()
  Log "data done size=$((Get-Item $part).Length)"
  Move-Item $part $final -Force
  Log "moved    -> $final"
}
