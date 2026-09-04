; Single source of truth for the installer version. Keep in sync with FORK_VERSION in
; Debug\script\consts.js (see docs/build-release.md).
#define MyAppVersion "1.1.21"
#define MyAppName "Tablacus Explorer (Fork)"
#define HookDll "Debug\addons\shellexecutehook\tshellexecutehook64.dll"
#define HookDllSHA1 GetSHA1OfFile(HookDll)
#define HookCLSID "{E840AAD2-1EF2-4F00-8BA8-CE7B57BF8878}"

[Setup]
; Pin the identity Inno derived from AppName so far; renaming AppName must never create a
; second Add/Remove entry.
AppId=Tablacus Explorer (Fork)
AppName={#MyAppName}
AppVersion={#MyAppVersion}
VersionInfoVersion={#MyAppVersion}
AppPublisher=cdcdcd050
AppPublisherURL=https://github.com/cdcdcd050/TablacusExplorer
DefaultDirName={autopf}\Tablacus Explorer
DefaultGroupName={#MyAppName}
OutputDir=Output
OutputBaseFilename=TablacusExplorer-Fork-v{#MyAppVersion}-Setup
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayName={#MyAppName}
UninstallDisplayIcon={app}\TE64.exe
LicenseFile=LICENSE.TXT
PrivilegesRequired=admin
; Let Restart Manager close a running TE before files are replaced (the in-app updater runs
; Setup with /SILENT, so this must not need a dialog). Only TE's own binaries are checked:
; the shell hook DLL is loaded by every process that called ShellExecute (browsers included)
; and must never cause Setup to close those.
CloseApplications=yes
CloseApplicationsFilter=TE64.exe,TE32.exe,te64.dll,te32.dll,tewv64.dll,tewv32.dll
RestartApplications=no

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
english.UserMismatch=Setup is running as "%1" but you are signed in as "%2".%n%nThe Explorer integration is registered per user, so please run Setup while signed in as an administrator, or approve the UAC prompt with your own account.
english.HookInUse=The Explorer integration DLL is still loaded by a running program. It will be removed after you sign out or restart Windows.
korean.DesktopIcon=바탕화면에 바로가기 만들기
korean.AdditionalIcons=추가 아이콘:
korean.ReplaceExplorer=Windows 탐색기 대체 (필수 - 폴더 열기, Win+E, 브라우저 연동)
korean.SystemIntegration=시스템 통합:
korean.LaunchApp=Tablacus Explorer (Fork) 실행
korean.UserMismatch=설치 프로그램은 "%1" 계정으로 실행 중이지만 로그인한 사용자는 "%2"입니다.%n%n탐색기 통합은 사용자별로 등록되므로, 관리자 계정으로 로그인한 상태에서 설치하거나 UAC 창에서 본인 계정으로 승인해 주세요.
korean.HookInUse=탐색기 통합 DLL이 아직 실행 중인 프로그램에 로드되어 있습니다. 로그아웃 또는 재시작 후 제거됩니다.
japanese.DesktopIcon=デスクトップにショートカットを作成
japanese.AdditionalIcons=追加アイコン:
japanese.ReplaceExplorer=Windowsエクスプローラーを置換（必須 - フォルダ、Win+E、ブラウザ連携）
japanese.SystemIntegration=システム統合:
japanese.LaunchApp=Tablacus Explorer (Fork) を起動
japanese.UserMismatch=セットアップは "%1" として実行されていますが、サインインしているユーザーは "%2" です。%n%nエクスプローラー統合はユーザーごとに登録されるため、管理者アカウントでサインインした状態で実行するか、UACで自分のアカウントを使って承認してください。
japanese.HookInUse=エクスプローラー統合DLLはまだ実行中のプログラムに読み込まれています。サインアウトまたは再起動後に削除されます。

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
; Shell hook DLL to app directory. Copied only when it actually differs from the installed
; copy: shell32 loads it into every process that calls ShellExecute, so on an upgrade the
; file is usually locked by a browser and an unconditional overwrite fails.
Source: "{#HookDll}"; DestDir: "{app}"; Flags: ignoreversion restartreplace uninsrestartdelete; Tasks: replaceexplorer; Check: HookDllChanged

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\TE64.exe"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\TE64.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "replaceexplorer"; Description: "{cm:ReplaceExplorer}"; GroupDescription: "{cm:SystemIntegration}"

[Registry]
; Everything here is per user (HKCU) on purpose. HKLM\...\Folder\shell\open\command carries a
; DelegateExecute that overrides the command, so the only clean way to redirect folder opens is
; an HKCU overlay; the hook DLL reads its ExePath from HKCU as well. InitializeSetup refuses to
; run when the elevated account differs from the signed-in user so these land in the right hive.
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
Root: HKCU; Subkey: "Software\Tablacus"; Tasks: replaceexplorer; Flags: uninsdeletekeyifempty
Root: HKCU; Subkey: "Software\Tablacus\ShellExecuteHook"; ValueType: string; ValueName: "ExePath"; ValueData: "{app}\TE64.exe"; Tasks: replaceexplorer; Flags: uninsdeletekey

[Run]
; Register shell hook DLL (idempotent, so also refreshes the path after a move)
Filename: "{sys}\regsvr32.exe"; Parameters: "/s ""{app}\tshellexecutehook64.dll"""; Tasks: replaceexplorer; Flags: runhidden
; shell32 caches the hook list per process, so explorer.exe must be restarted once for the
; hook to take effect there - on the first registration or when the DLL changed. A plain
; version upgrade leaves the user's Explorer windows alone.
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM explorer.exe"; Tasks: replaceexplorer; Flags: runhidden; Check: NeedExplorerRestart
Filename: "{cmd}"; Parameters: "/c ping -n 3 127.0.0.1 >nul"; Tasks: replaceexplorer; Flags: runhidden; Check: NeedExplorerRestart
; Restart explorer as original (non-elevated) user so it becomes the shell
Filename: "{win}\explorer.exe"; Tasks: replaceexplorer; Flags: runasoriginaluser nowait; Check: NeedExplorerRestart
; Launch app - always as the signed-in user, never elevated. Interactive setups get the
; checkbox; silent ones (the in-app updater) relaunch unconditionally since Setup closed TE.
Filename: "{app}\TE64.exe"; Description: "{cm:LaunchApp}"; Flags: nowait postinstall skipifsilent runasoriginaluser
Filename: "{app}\TE64.exe"; Flags: nowait skipifnotsilent runasoriginaluser

[UninstallRun]
; Unregister shell hook DLL
Filename: "{sys}\regsvr32.exe"; Parameters: "/u /s ""{app}\tshellexecutehook64.dll"""; Flags: runhidden; RunOnceId: "UnregisterHook"

[UninstallDelete]
Type: filesandordirs; Name: "{app}\config"

[Code]
var
  GHookChecked: Boolean;
  GHookDllChanged: Boolean;
  GHookRegistered: Boolean;

{ Where the hook CLSID is currently registered, or '' when it is not. }
function RegisteredHookPath(): String;
begin
  Result := '';
  if not RegQueryStringValue(HKEY_LOCAL_MACHINE, 'SOFTWARE\Classes\CLSID\{#HookCLSID}\InprocServer32', '', Result) then
    Result := '';
end;

procedure CheckHookState();
var
  Dll: String;
begin
  if GHookChecked then
    exit;
  GHookChecked := True;
  Dll := ExpandConstant('{app}\tshellexecutehook64.dll');
  GHookDllChanged := (not FileExists(Dll)) or (CompareText(GetSHA1OfFile(Dll), '{#HookDllSHA1}') <> 0);
  GHookRegistered := CompareText(RegisteredHookPath(), Dll) = 0;
end;

function HookDllChanged(): Boolean;
begin
  CheckHookState();
  Result := GHookDllChanged;
end;

function NeedExplorerRestart(): Boolean;
begin
  CheckHookState();
  Result := GHookDllChanged or (not GHookRegistered);
end;

{ The integration lives in HKCU. When a standard user approves UAC with a different admin
  account, Setup's HKCU is that admin's hive and nothing would work for the signed-in user.
  Compare the elevated account with the original user's %USERNAME% and refuse to continue. }
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
  Elevated: String;
begin
  Result := True;
  if not IsAdminInstallMode then
    exit;
  Elevated := GetUserNameString();
  if ExecAsOriginalUser(ExpandConstant('{cmd}'), '/c if /i "%USERNAME%"=="' + Elevated + '" (exit 0) else (exit 1)', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if ResultCode <> 0 then
    begin
      MsgBox(FmtMessage(CustomMessage('UserMismatch'), [Elevated, GetEnv('USERNAME')]), mbCriticalError, MB_OK);
      Result := False;
    end;
  end;
end;

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
  begin
    CleanupEmptyShellKeys();
    { uninsrestartdelete left the DLL for the next restart if a process still has it loaded }
    if FileExists(ExpandConstant('{app}\tshellexecutehook64.dll')) and not UninstallSilent then
      MsgBox(CustomMessage('HookInUse'), mbInformation, MB_OK);
  end;
end;
