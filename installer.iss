[Setup]
AppName=Tablacus Explorer (Fork)
AppVersion=1.1.17
AppPublisher=cdcdcd050
AppPublisherURL=https://github.com/cdcdcd050/TablacusExplorer
DefaultDirName={autopf}\Tablacus Explorer
DefaultGroupName=Tablacus Explorer (Fork)
OutputDir=Output
OutputBaseFilename=TablacusExplorer-Fork-v1.1.17-Setup
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayName=Tablacus Explorer (Fork)
LicenseFile=LICENSE.TXT
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"
Name: "japanese"; MessagesFile: "compiler:Languages\Japanese.isl"

[CustomMessages]
english.DesktopIcon=Create a desktop shortcut
english.AdditionalIcons=Additional icons:
english.ReplaceExplorer=Replace Windows Explorer (required - folder open, Win+E, browser integration)
english.SystemIntegration=System integration:
english.LaunchApp=Launch Tablacus Explorer (Fork)
korean.DesktopIcon=바탕화면에 바로가기 만들기
korean.AdditionalIcons=추가 아이콘:
korean.ReplaceExplorer=Windows 탐색기 대체 (필수 - 폴더 열기, Win+E, 브라우저 연동)
korean.SystemIntegration=시스템 통합:
korean.LaunchApp=Tablacus Explorer (Fork) 실행
japanese.DesktopIcon=デスクトップにショートカットを作成
japanese.AdditionalIcons=追加アイコン:
japanese.ReplaceExplorer=Windowsエクスプローラーを置換（必須 - フォルダ、Win+E、ブラウザ連携）
japanese.SystemIntegration=システム統合:
japanese.LaunchApp=Tablacus Explorer (Fork) を起動

[Files]
Source: "Debug\TE64.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "Debug\TE32.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "Debug\lib\te64.dll"; DestDir: "{app}\lib"; Flags: ignoreversion
Source: "Debug\lib\te32.dll"; DestDir: "{app}\lib"; Flags: ignoreversion
Source: "Debug\lib\tewv64.dll"; DestDir: "{app}\lib"; Flags: ignoreversion
Source: "Debug\lib\tewv32.dll"; DestDir: "{app}\lib"; Flags: ignoreversion
Source: "Debug\script\*"; DestDir: "{app}\script"; Flags: ignoreversion recursesubdirs
Source: "Debug\addons\*"; DestDir: "{app}\addons"; Flags: ignoreversion recursesubdirs
Source: "Debug\init\*"; DestDir: "{app}\init"; Flags: ignoreversion recursesubdirs
Source: "Debug\lang\*"; DestDir: "{app}\lang"; Flags: ignoreversion recursesubdirs
Source: "LICENSE.TXT"; DestDir: "{app}"; Flags: ignoreversion
; Shell hook DLL to app directory
Source: "Debug\addons\shellexecutehook\tshellexecutehook64.dll"; DestDir: "{app}"; Flags: ignoreversion; Tasks: replaceexplorer

[Icons]
Name: "{group}\Tablacus Explorer (Fork)"; Filename: "{app}\TE64.exe"
Name: "{group}\Uninstall Tablacus Explorer (Fork)"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Tablacus Explorer (Fork)"; Filename: "{app}\TE64.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "replaceexplorer"; Description: "{cm:ReplaceExplorer}"; GroupDescription: "{cm:SystemIntegration}"

[Registry]
; Startup registration
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "Tablacus Explorer"; ValueData: """{app}\TE64.exe"""; Tasks: replaceexplorer; Flags: uninsdeletevalue
; Directory/Drive/Folder open handlers.
; IMPORTANT (uninstall correctness): uninsdeletekey on the leaf \command key alone leaves the
; parent HKCU ...\shell\open and ...\shell keys behind as EMPTY keys. Those empty keys SHADOW the
; HKLM class defaults and break the default "open" verb resolution (folder double-click does
; nothing, drives fall back to the BitLocker verb). To clean them up we add uninsdeletekeyifempty
; on the parents. Inno processes uninstall entries in REVERSE of install order, so the parents
; MUST be listed BEFORE the \command entry: on uninstall the \command leaf is deleted first, then
; each now-empty parent is removed, falling back cleanly to the HKLM defaults.
; Directory open handler
Root: HKCU; Subkey: "Software\Classes\Directory\shell"; Tasks: replaceexplorer; Flags: uninsdeletekeyifempty
Root: HKCU; Subkey: "Software\Classes\Directory\shell\open"; Tasks: replaceexplorer; Flags: uninsdeletekeyifempty
Root: HKCU; Subkey: "Software\Classes\Directory\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\TE64.exe"" ""%1"""; Tasks: replaceexplorer; Flags: uninsdeletekey
; Drive open handler
Root: HKCU; Subkey: "Software\Classes\Drive\shell"; Tasks: replaceexplorer; Flags: uninsdeletekeyifempty
Root: HKCU; Subkey: "Software\Classes\Drive\shell\open"; Tasks: replaceexplorer; Flags: uninsdeletekeyifempty
Root: HKCU; Subkey: "Software\Classes\Drive\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\TE64.exe"" ""%1"""; Tasks: replaceexplorer; Flags: uninsdeletekey
; Folder open handler
Root: HKCU; Subkey: "Software\Classes\Folder\shell"; Tasks: replaceexplorer; Flags: uninsdeletekeyifempty
Root: HKCU; Subkey: "Software\Classes\Folder\shell\open"; Tasks: replaceexplorer; Flags: uninsdeletekeyifempty
Root: HKCU; Subkey: "Software\Classes\Folder\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\TE64.exe"" ""%1"""; Tasks: replaceexplorer; Flags: uninsdeletekey
; Shell execute hook
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Policies\Explorer"; ValueType: dword; ValueName: "EnableShellExecuteHooks"; ValueData: "1"; Tasks: replaceexplorer; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Tablacus\ShellExecuteHook"; ValueType: string; ValueName: "ExePath"; ValueData: "{app}\TE64.exe"; Tasks: replaceexplorer; Flags: uninsdeletekey

[Run]
; Register shell hook DLL
Filename: "{sys}\regsvr32.exe"; Parameters: "/s ""{app}\tshellexecutehook64.dll"""; Tasks: replaceexplorer; Flags: runhidden
; Kill explorer to apply shell hook
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM explorer.exe"; Tasks: replaceexplorer; Flags: runhidden
; Wait for explorer to fully terminate
Filename: "{cmd}"; Parameters: "/c ping -n 3 127.0.0.1 >nul"; Tasks: replaceexplorer; Flags: runhidden
; Restart explorer as original (non-elevated) user so it becomes the shell
Filename: "{win}\explorer.exe"; Tasks: replaceexplorer; Flags: runasoriginaluser nowait
; Launch app
Filename: "{app}\TE64.exe"; Description: "{cm:LaunchApp}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Unregister shell hook DLL
Filename: "{sys}\regsvr32.exe"; Parameters: "/u /s ""{app}\tshellexecutehook64.dll"""; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}\config"
Type: files; Name: "{app}\tshellexecutehook64.dll"

[Code]
{ Safety net: after the standard uninstall removes the \command leaf keys, make sure no empty
  HKCU ...\Classes\<class>\shell\open and ...\shell keys are left behind. Empty leftovers shadow
  the HKLM class defaults and break the default "open" verb (folder double-click no-op, drives
  fall back to BitLocker). RegDeleteKeyIfEmpty only deletes a key that has no values/subkeys, so
  this never touches user-added verbs. Runs at usPostUninstall, i.e. after [Registry] cleanup. }
procedure CleanupEmptyShellKeys();
var
  Classes: array[0..2] of String;
  I: Integer;
begin
  Classes[0] := 'Software\Classes\Directory';
  Classes[1] := 'Software\Classes\Drive';
  Classes[2] := 'Software\Classes\Folder';
  for I := 0 to 2 do
  begin
    RegDeleteKeyIfEmpty(HKEY_CURRENT_USER, Classes[I] + '\shell\open');
    RegDeleteKeyIfEmpty(HKEY_CURRENT_USER, Classes[I] + '\shell');
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
    CleanupEmptyShellKeys();
end;
