[Setup]
AppName=Tablacus Explorer (Fork)
AppVersion=1.0.1
AppPublisher=cdcdcd050
AppPublisherURL=https://github.com/cdcdcd050/TablacusExplorer
DefaultDirName={autopf}\Tablacus Explorer
DefaultGroupName=Tablacus Explorer (Fork)
OutputDir=Output
OutputBaseFilename=TablacusExplorer-Fork-v1.0.1-Setup
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
english.ReplaceExplorer=Set as default file manager (replace Windows Explorer for folders)
english.ShellHook=Deep Explorer replacement (intercepts Win+E, Start menu, etc.)
english.SystemIntegration=System integration:
english.LaunchApp=Launch Tablacus Explorer (Fork)
korean.DesktopIcon=바탕화면에 바로가기 만들기
korean.AdditionalIcons=추가 아이콘:
korean.ReplaceExplorer=기본 파일 관리자로 설정 (Windows 탐색기 대체)
korean.ShellHook=완전한 탐색기 대체 (Win+E, 시작메뉴 등 가로채기)
korean.SystemIntegration=시스템 통합:
korean.LaunchApp=Tablacus Explorer (Fork) 실행
japanese.DesktopIcon=デスクトップにショートカットを作成
japanese.AdditionalIcons=追加アイコン:
japanese.ReplaceExplorer=デフォルトのファイルマネージャーに設定（エクスプローラーを置換）
japanese.ShellHook=完全なエクスプローラー置換（Win+E、スタートメニュー等）
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
; Shell hook DLL to system32
Source: "Debug\addons\shellexecutehook\tshellexecutehook64.dll"; DestDir: "{sys}"; Flags: ignoreversion; Tasks: shellhook

[Icons]
Name: "{group}\Tablacus Explorer (Fork)"; Filename: "{app}\TE64.exe"
Name: "{group}\Uninstall Tablacus Explorer (Fork)"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Tablacus Explorer (Fork)"; Filename: "{app}\TE64.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "replaceexplorer"; Description: "{cm:ReplaceExplorer}"; GroupDescription: "{cm:SystemIntegration}"; Flags: checkablealone
Name: "shellhook"; Description: "{cm:ShellHook}"; GroupDescription: "{cm:SystemIntegration}"; Flags: checkablealone

[Registry]
; Directory open handler
Root: HKCU; Subkey: "Software\Classes\Directory\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\TE64.exe"" ""%1"""; Tasks: replaceexplorer; Flags: uninsdeletekey
; Drive open handler
Root: HKCU; Subkey: "Software\Classes\Drive\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\TE64.exe"" ""%1"""; Tasks: replaceexplorer; Flags: uninsdeletekey
; Folder open handler
Root: HKCU; Subkey: "Software\Classes\Folder\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\TE64.exe"" ""%1"""; Tasks: replaceexplorer; Flags: uninsdeletekey
; Shell execute hook
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Policies\Explorer"; ValueType: dword; ValueName: "EnableShellExecuteHooks"; ValueData: "1"; Tasks: shellhook; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Tablacus\ShellExecuteHook"; ValueType: string; ValueName: "ExePath"; ValueData: "{app}\TE64.exe"; Tasks: shellhook; Flags: uninsdeletekey

[Run]
; Register shell hook DLL
Filename: "{sys}\regsvr32.exe"; Parameters: "/s ""{sys}\tshellexecutehook64.dll"""; Tasks: shellhook; Flags: runhidden
; Restart explorer to apply shell hook
Filename: "powershell.exe"; Parameters: "-Command ""Stop-Process -Name explorer -Force; Start-Sleep -Seconds 2; Start-Process explorer.exe"""; Tasks: shellhook; Flags: runhidden
; Launch app
Filename: "{app}\TE64.exe"; Description: "{cm:LaunchApp}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Unregister shell hook DLL
Filename: "{sys}\regsvr32.exe"; Parameters: "/u /s ""{sys}\tshellexecutehook64.dll"""; Flags: runhidden
; Restart explorer to restore default
Filename: "powershell.exe"; Parameters: "-Command ""Stop-Process -Name explorer -Force; Start-Sleep -Seconds 2; Start-Process explorer.exe"""; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}\config"
Type: files; Name: "{sys}\tshellexecutehook64.dll"
