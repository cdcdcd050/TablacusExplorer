param(
  [string]$Url = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
  [ValidateSet('save','cancel')][string]$Action = 'save',
  [int]$DialogWait = 8,
  [string]$Tag = ''
)
$sp = $PSScriptRoot
$d = 'C:\Users\CH05\Downloads'
if (-not $Tag) { $Tag = $Action }
function Snap($n) { & "$sp\shot.ps1" -Out "$sp\sa-$Tag-$n.png" | Out-Null; ('{0} at +{1:N1}s: {2}' -f $n, ((Get-Date)-$script:t0).TotalSeconds, ((Get-ChildItem $d -Force | Where-Object Name -ne 'desktop.ini' | ForEach-Object { "$($_.Name)=$($_.Length)" }) -join ', ')) }
Start-Process pwsh -ArgumentList '-NoProfile','-File',"$sp\shmon.ps1",'-Seconds','45','-Log',"$sp\shmon-sa-$Tag.log" -WindowStyle Hidden
Start-Sleep 5
Start-Process 'C:\Program Files\Naver\Naver Whale\Application\whale.exe' -ArgumentList $Url
Start-Sleep 5
$wsh = New-Object -ComObject WScript.Shell
$p = Get-Process whale | Where-Object MainWindowTitle -ne '' | Select-Object -First 1
"whale window: $($p.MainWindowTitle)"
$wsh.AppActivate($p.Id) | Out-Null
Start-Sleep 1
$script:t0 = Get-Date
$wsh.SendKeys('^s')
Start-Sleep 2; Snap 1
Start-Sleep ($DialogWait - 2); Snap 2
if ($Action -eq 'save') { $wsh.SendKeys('{ENTER}') } else { $wsh.SendKeys('{ESC}') }
Start-Sleep 1.5; Snap 3
Start-Sleep 3; Snap 4
Start-Sleep 5; Snap 5
Start-Sleep 20
"---- events ----"
Get-Content "$sp\shmon-sa-$Tag.log"
