; Single source of truth for the installer version. Keep in sync with FORK_VERSION in
; Debug\script\consts.js (see docs/build-release.md).
#define MyAppVersion "1.1.25"
#define MyAppName "Tablacus Explorer (Fork)"
; The ShellExecuteHook is no longer installed: it swallowed the window that a browser's "open
; containing folder" waits for (see docs/architecture.md). The CLSID and file name stay behind
; only so an upgrade can unregister and delete what v1.1.22 and older left on the machine.
#define HookDllName "tshellexecutehook64.dll"
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
; Setup with /SILENT, so this must not need a dialog). Only TE's own binaries are listed, so
; Setup never closes anything else - the hook DLL earlier versions installed was loaded by every
; process that called ShellExecute, and naming it here would have closed the user's browser.
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
; an HKCU overlay. InitializeSetup refuses to run when the elevated account differs from the
; signed-in user so these land in the right hive.
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

[Run]
; shell32 caches the hook list per process, so explorer.exe has to be restarted once to drop a
; hook this upgrade turned off. Gated on having actually changed something, not on the task: an
; upgrade with nothing left over leaves the user's Explorer windows alone.
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM explorer.exe"; Flags: runhidden; Check: NeedExplorerRestart
Filename: "{cmd}"; Parameters: "/c ping -n 3 127.0.0.1 >nul"; Flags: runhidden; Check: NeedExplorerRestart
; Restart explorer as original (non-elevated) user so it becomes the shell
Filename: "{win}\explorer.exe"; Flags: runasoriginaluser nowait; Check: NeedExplorerRestart
; Launch app - always as the signed-in user, never elevated. Interactive setups get the
; checkbox; silent ones (the in-app updater) relaunch unconditionally since Setup closed TE.
Filename: "{app}\TE64.exe"; Description: "{cm:LaunchApp}"; Flags: nowait postinstall skipifsilent runasoriginaluser
Filename: "{app}\TE64.exe"; Flags: nowait skipifnotsilent runasoriginaluser

[UninstallDelete]
Type: filesandordirs; Name: "{app}\config"

[Code]
var
  GHookChanged: Boolean;
  GHookLocked: Boolean;

{ Where the hook CLSID is currently registered, or '' when it is not. Wow64 selects the 32-bit
  view, which the addon's options page can register separately from the 64-bit one. }
function RegisteredHookPath(Wow64: Boolean): String;
var
  Key: String;
begin
  Result := '';
  if Wow64 then
    Key := 'SOFTWARE\Classes\Wow6432Node\CLSID\{#HookCLSID}\InprocServer32'
  else
    Key := 'SOFTWARE\Classes\CLSID\{#HookCLSID}\InprocServer32';
  if not RegQueryStringValue(HKEY_LOCAL_MACHINE, Key, '', Result) then
    Result := '';
end;

{ v1.1.23 stopped installing a ShellExecuteHook, and takes back the ones earlier versions left.

  The hook cancelled the Explorer window that SHOpenFolderAndSelectItems waits for - that call is
  a browser's "open containing folder" - so it sat for 20 seconds, failed with E_ABORT, and TE
  meanwhile opened the folder in a background tab with nothing selected. To the user: nothing
  happened. The openinstead addon already performs every takeover the hook did, and it gets the
  path, the selected file and the foreground right, so nothing is lost by dropping the hook.

  EnableShellExecuteHooks is the per-user switch that lets ShellExecuteHooks run at all; Windows
  ships it off and setting it was ours, so take it back out. That also keeps a hook another app
  left behind - an uninstalled QTTabBar, say - from being loaded into every process that calls
  ShellExecute, which is its own way to hang Explorer, Win+E and browser downloads at once. }
procedure RemoveLegacyHook();
var
  Dll, Registered: String;
  ResultCode: Integer;
begin
  { The CLSID is Tablacus' own, so unregister it wherever it points: Setup put the DLL in the
    application folder, while the addon's options page installs its copy into system32. }
  Registered := RegisteredHookPath(False);
  if Registered <> '' then
  begin
    Exec(ExpandConstant('{sys}\regsvr32.exe'), '/u /s "' + Registered + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    GHookChanged := True;
  end;
  Registered := RegisteredHookPath(True);
  if Registered <> '' then
  begin
    Exec(ExpandConstant('{syswow64}\regsvr32.exe'), '/u /s "' + Registered + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    GHookChanged := True;
  end;
  Dll := ExpandConstant('{app}\{#HookDllName}');
  if RegValueExists(HKEY_CURRENT_USER, 'Software\Microsoft\Windows\CurrentVersion\Policies\Explorer', 'EnableShellExecuteHooks') then
  begin
    RegDeleteValue(HKEY_CURRENT_USER, 'Software\Microsoft\Windows\CurrentVersion\Policies\Explorer', 'EnableShellExecuteHooks');
    GHookChanged := True;
  end;
  if RegKeyExists(HKEY_CURRENT_USER, 'Software\Tablacus\ShellExecuteHook') then
  begin
    RegDeleteKeyIncludingSubkeys(HKEY_CURRENT_USER, 'Software\Tablacus\ShellExecuteHook');
    GHookChanged := True;
  end;
  RegDeleteKeyIfEmpty(HKEY_CURRENT_USER, 'Software\Tablacus');
  if FileExists(Dll) and (not DeleteFile(Dll)) then
  begin
    { A browser that called ShellExecute still has it mapped; drop it at the next restart. }
    RestartReplace(Dll, '');
    GHookLocked := True;
  end;
end;

function NeedExplorerRestart(): Boolean;
begin
  Result := GHookChanged;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssInstall then
    RemoveLegacyHook()
  else if (CurStep = ssPostInstall) and GHookLocked and (not WizardSilent) then
    MsgBox(CustomMessage('HookInUse'), mbInformation, MB_OK);
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
    { Safety net for a machine uninstalled before the reboot that drops a still-mapped DLL }
    if FileExists(ExpandConstant('{app}\{#HookDllName}')) and not UninstallSilent then
      MsgBox(CustomMessage('HookInUse'), mbInformation, MB_OK);
  end;
end;
