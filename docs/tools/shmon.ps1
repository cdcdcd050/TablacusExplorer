param(
  [string]$Path = "$env:USERPROFILE\Downloads",
  [string]$Log = "$PSScriptRoot\shmon.log",
  [int]$Seconds = 30
)
Add-Type -AssemblyName System.Windows.Forms
$src = @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;
public class ShMon : NativeWindow {
  [StructLayout(LayoutKind.Sequential)] public struct Entry { public IntPtr pidl; public int fRecursive; }
  [DllImport("shell32.dll")] static extern uint SHChangeNotifyRegister(IntPtr hwnd, int fSources, int fEvents, uint wMsg, int cEntries, ref Entry e);
  [DllImport("shell32.dll")] static extern bool SHChangeNotifyDeregister(uint id);
  [DllImport("shell32.dll")] static extern IntPtr SHChangeNotification_Lock(IntPtr hChange, IntPtr pid, out IntPtr pppidl, out int lEvent);
  [DllImport("shell32.dll")] static extern bool SHChangeNotification_Unlock(IntPtr hLock);
  [DllImport("shell32.dll")] static extern int SHGetNameFromIDList(IntPtr pidl, uint sigdn, out IntPtr name);
  [DllImport("shell32.dll", CharSet=CharSet.Unicode)] static extern IntPtr ILCreateFromPath(string path);
  [DllImport("shell32.dll")] static extern void ILFree(IntPtr pidl);
  const uint WM_SHNOTIFY = 0x0401;
  uint id; StreamWriter w; DateTime t0 = DateTime.Now;
  public ShMon(string path, string log) {
    var cp = new CreateParams(); cp.Parent = (IntPtr)(-3); cp.Caption = "ShMon";
    CreateHandle(cp);
    w = new StreamWriter(log, false); w.AutoFlush = true;
    var e = new Entry(); e.pidl = ILCreateFromPath(path); e.fRecursive = 0;
    id = SHChangeNotifyRegister(Handle, 1 | 2 | 0x8000, 0x7FFFFFFF, WM_SHNOTIFY, 1, ref e);
    ILFree(e.pidl);
    w.WriteLine("registered id=" + id + " path=" + path);
  }
  static string Name(IntPtr pidl) {
    if (pidl == IntPtr.Zero) return "(null)";
    IntPtr p; if (SHGetNameFromIDList(pidl, 0x80028000, out p) != 0) return "(?)";
    string s = Marshal.PtrToStringUni(p); Marshal.FreeCoTaskMem(p); return s;
  }
  static string Ev(int e) {
    string[] n = {"RENAMEITEM","CREATE","DELETE","MKDIR","RMDIR","MEDIAINSERTED","MEDIAREMOVED","DRIVEREMOVED","DRIVEADD","NETSHARE","NETUNSHARE","ATTRIBUTES","UPDATEDIR","UPDATEITEM","SERVERDISCONNECT","UPDATEIMAGE","DRIVEADDGUI","RENAMEFOLDER","FREESPACE"};
    var sb = new System.Text.StringBuilder();
    for (int i = 0; i < n.Length; i++) if ((e & (1 << i)) != 0) sb.Append(n[i]).Append('|');
    if ((e & 0x04000000) != 0) sb.Append("EXTENDED|");
    if ((e & 0x08000000) != 0) sb.Append("ASSOCCHANGED|");
    if (sb.Length == 0) sb.Append("0x" + e.ToString("X"));
    return sb.ToString().TrimEnd('|');
  }
  protected override void WndProc(ref Message m) {
    if (m.Msg == WM_SHNOTIFY) {
      IntPtr pp; int ev;
      IntPtr h = SHChangeNotification_Lock(m.WParam, m.LParam, out pp, out ev);
      if (h != IntPtr.Zero) {
        IntPtr p1 = Marshal.ReadIntPtr(pp, 0), p2 = Marshal.ReadIntPtr(pp, IntPtr.Size);
        w.WriteLine(string.Format("{0:HH:mm:ss.fff} {1,-14} {2}  ->  {3}", DateTime.Now, Ev(ev), Name(p1), Name(p2)));
        SHChangeNotification_Unlock(h);
      }
      m.Result = IntPtr.Zero; return;
    }
    base.WndProc(ref m);
  }
  public void Close() { SHChangeNotifyDeregister(id); w.Close(); DestroyHandle(); }
}
'@
Add-Type -TypeDefinition $src -ReferencedAssemblies System.Windows.Forms,System.Windows.Forms.Primitives
$mon = New-Object ShMon($Path, $Log)
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = $Seconds * 1000
$timer.Add_Tick({ [System.Windows.Forms.Application]::Exit() })
$timer.Start()
[System.Windows.Forms.Application]::Run()
$mon.Close()
"done"
