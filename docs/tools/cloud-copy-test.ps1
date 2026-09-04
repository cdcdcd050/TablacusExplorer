# Reproduce "copy an online-only (Dropbox/OneDrive placeholder) folder and paste it into
# another TE tab" against the Debug instance, measuring UI responsiveness and copy progress.
# Clicks use window-relative coordinates that match the default Debug layout (see
# docs/troubleshooting.md); adjust -RowY / -FavX if the layout differs.
param(
  [string]$Src = 'C:\Users\CH00\Dropbox\개인\02 동영상',
  [string]$Folder = '2013.10.14 윤식형 결혼',
  [long]$Expected = 296583168,
  [string]$DstDir = "$env:USERPROFILE\Desktop",
  [int]$RowY = 296,          # y of the source folder row in the list
  [int]$FavX = 120,          # x of the "Desktop" favorites-bar item
  [string]$Out = $PSScriptRoot
)
$ErrorActionPreference = 'Continue'
$root = Split-Path (Split-Path $PSScriptRoot)
$te = "$root\Debug\TE64.exe"
$copy = Join-Path $DstDir $Folder
$log = "$Out\cloud-copy-test.log"
"" | Set-Content $log
function L($m) { $line = "{0:HH:mm:ss.fff} {1}" -f (Get-Date), $m; Add-Content $log $line; Write-Host $line }

Add-Type @'
using System; using System.Runtime.InteropServices;
public static class U {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, int dx, int dy, uint d, UIntPtr e);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr SendMessageTimeout(IntPtr h, uint msg, IntPtr w, IntPtr l, uint flags, uint timeout, out IntPtr result);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  public static void Click(IntPtr h, int x, int y) { RECT r; GetWindowRect(h, out r); SetCursorPos(r.L + x, r.T + y); System.Threading.Thread.Sleep(80); mouse_event(2, 0, 0, 0, UIntPtr.Zero); mouse_event(4, 0, 0, 0, UIntPtr.Zero); }
  public static void Ctrl(byte vk) { keybd_event(0x11, 0, 0, UIntPtr.Zero); keybd_event(vk, 0, 0, UIntPtr.Zero); keybd_event(vk, 0, 2, UIntPtr.Zero); keybd_event(0x11, 0, 2, UIntPtr.Zero); }
  public static bool Responsive(IntPtr h, uint ms) { IntPtr r; return SendMessageTimeout(h, 0, IntPtr.Zero, IntPtr.Zero, 2, ms, out r) != IntPtr.Zero; }
}
'@
[U]::SetProcessDPIAware() | Out-Null

Get-Process TE64 | Where-Object { $_.Path -eq $te } | Stop-Process -Force -ErrorAction SilentlyContinue
if (Test-Path $copy) { Remove-Item $copy -Recurse -Force }
Start-Process $te -ArgumentList '/open','script\index.html',"`"$Src`""
Start-Sleep 7
$p = Get-Process TE64 | Where-Object { $_.Path -eq $te } | Select-Object -First 1
$h = $p.MainWindowHandle
L "TE pid=$($p.Id) hwnd=$h"
[U]::SetForegroundWindow($h) | Out-Null; Start-Sleep -Milliseconds 500
[U]::Click($h, 105, $RowY); Start-Sleep -Milliseconds 700
& "$PSScriptRoot\shot.ps1" -Exe $te -Out "$Out\cloud-copy-sel.png" | Out-Null
[U]::Ctrl(0x43)   # Ctrl+C
L "Ctrl+C sent"
Start-Sleep 1
[U]::Click($h, $FavX, 96); Start-Sleep 4          # favorites bar > Desktop (new tab)
[U]::Click($h, 900, 850); Start-Sleep -Milliseconds 700   # empty list area
L ("TE64 procs before paste: " + ((Get-Process TE64 | % Id) -join ','))
$t0 = Get-Date
[U]::Ctrl(0x56)   # Ctrl+V
L "Ctrl+V sent"
$lastHung = $null; $hungSince = $null; $totalHung = 0.0
while (((Get-Date) - $t0).TotalSeconds -lt 150) {
  $ok = [U]::Responsive($h, 300)
  $size = 0; try { $size = (Get-ChildItem $copy -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum } catch {}
  if (-not $size) { $size = 0 }
  $procs = (Get-Process TE64 -ErrorAction SilentlyContinue).Count
  if ($ok -ne $lastHung) {
    L ("responsive=$ok copied=" + [math]::Round($size/1MB,1) + "MB TE64procs=$procs")
    $lastHung = $ok
    if (-not $ok) { $hungSince = Get-Date } elseif ($hungSince) { $totalHung += ((Get-Date) - $hungSince).TotalSeconds; $hungSince = $null }
  }
  if ($size -ge $Expected) { L ("done copied=" + [math]::Round($size/1MB,1) + "MB elapsed=" + [math]::Round(((Get-Date)-$t0).TotalSeconds,1) + "s"); break }
  Start-Sleep -Milliseconds 250
}
if ($hungSince) { $totalHung += ((Get-Date) - $hungSince).TotalSeconds }
L ("total unresponsive seconds: " + [math]::Round($totalHung,1))
L ("source attrs after: " + ((Get-ChildItem "$Src\$Folder" -File | % { '{0}={1}' -f $_.Name, [int]$_.Attributes }) -join ' '))
Start-Sleep 3
[U]::Click($h, 60, 172); Start-Sleep 2            # back to the source tab
& "$PSScriptRoot\shot.ps1" -Exe $te -Out "$Out\cloud-copy-after.png" | Out-Null
