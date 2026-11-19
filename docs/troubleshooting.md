# Troubleshooting

## 메뉴/설정이 업데이트되지 않음
**증상**: 새 버전 설치했는데 메뉴 항목이 추가되지 않음

**원인**: `config/menus.xml`이 존재하면 `init/menus.xml` 기본값을 무시함

**해결**:
- `%AppData%/Tablacus/Explorer/config/menus.xml` 삭제
- 일반화: 초기값 테스트 시 `%AppData%/Tablacus/Explorer/config/` 폴더 삭제 필요

## [해결됨 v1.1.23] 브라우저 "폴더 열기"가 무반응 / 빈 창
**증상**: 브라우저에서 다운로드 후 "폴더 열기"를 눌러도 **아무 일도 안 일어난다**. (v1.1.23 이전의 다른 형태: Tablacus가 빈 창으로 열림)

**원인**: 브라우저의 "폴더 열기"는 `SHOpenFolderAndSelectItems`를 호출한다. `tshellexecutehook64.dll`(ShellExecuteHook)이 그 창 생성을 가로채면 셸은 등록될 Explorer 창을 **20초간 기다리다 `E_ABORT`로 포기**한다. 그동안 TE는 폴더를 열긴 하지만 포그라운드로 나오지도, 파일을 선택하지도 않는다 → 사용자 눈엔 무반응.

같은 훅의 옛 증상이 "빈 창"이었다 — 가로챌 때 원본 경로를 안 넘겼기 때문.

**측정** (동일 파일, 동일 PC):

| | HRESULT | 소요 |
|---|---|---|
| 훅 활성 | `E_ABORT` (0x80004004) | 20,132 ms |
| 훅 무력화 | `S_OK` | 393 ms |

**해결**: v1.1.23에서 ShellExecuteHook을 아예 설치하지 않는다. openinstead가 이 경로를 전부 처리하며 경로·선택 파일·포그라운드 전환이 모두 맞는다. 인스톨러가 업그레이드 시 예전 등록을 되돌린다(`RemoveLegacyHook`)
- **전제**: Tablacus 상시 실행. 인스톨러 `replaceexplorer` 태스크에 시작프로그램 등록 포함(기본 체크). 확인: `tasklist | grep TE64`
- **TE가 안 떠 있으면 기본 탐색기 창이 그대로 열리고 남는다** — 훅이 TE를 띄워 주던 역할이 사라졌기 때문. Win+E도 마찬가지. 설치 직후 explorer 재시작과 TE 재실행 사이에 짧은 공백이 있으니 그 사이에 눌러 보고 판단하지 말 것

### 왜 매번 기본 탐색기 창이 먼저 뜨나 (구조상 한계)
`TE/TE.cpp`의 `pSW->Register(..., SWC_3RDPARTY, ...)` — TE는 ShellWindows에 **3rd party**로 등록한다. `SHOpenFolderAndSelectItems`는 기존 창을 재사용할 때 **`SWC_EXPLORER`로 등록된 창만** 후보로 본다. 그래서 TE는 매칭에서 빠지고 **셸이 항상 진짜 Explorer 창을 새로 만든다**. openinstead는 그 창을 사후에 흡수할 뿐이라, 창 자체가 생기는 것은 막을 수 없다 — v1.1.25는 그 창을 사용자가 보기 전에 화면 밖으로 치워 보이지 않게 할 뿐이다(아래 실측).

창이 **아예 생기지 않게** 하려면 `SWC_EXPLORER`로 등록해 셸이 TE를 직접 재사용하게 해야 하는데, 그 순간부터 셸이 TE를 Explorer 창으로 간주하고 여태 부르지 않던 인터페이스를 호출한다(C++ 코어 변경 + te64.dll 재빌드 필요). 영향 범위가 넓고, v1.1.25로 체감상 차이가 없어져서 하지 않았다.

**잔상 실측** (50ms 간격, 같은 PC. `SHOpenFolderAndSelectItems` 반환 ~250ms → Explorer 창 등장 ~290ms → TE 탭 반영 ~800ms):

| 방식 | 화면에 보이는 시간 | 파일 선택 |
|---|---|---|
| v1.1.23 (500ms 후 첫 검사, 250ms 재시도) | ~300ms | 정확 |
| v1.1.24 (즉시 검사 + 초반 8회 60ms 재시도) | ~200ms | 정확 |
| `Busy` 게이트 제거 | 37ms | ❌ **틀린 파일** |
| `Busy` 중 창을 **숨김** | 0~40ms | ❌ **틀린 파일** |
| **v1.1.25: `Busy` 중 창을 화면 밖으로 이동** | **0ms** (3회 중 2회는 한 번도 안 그려짐, 최악 ~37ms) | 정확 |

핵심은 **숨기면 안 되고 치워야 한다**는 것이다. 셸은 창을 다 띄우는 과정에서 `/select` 항목을 적용하는데, `Visible = false`로 숨기면 그 과정이 끊겨 `doc.FocusedItem`이 폴더의 첫 항목을 돌려준다(실측: `Receipt`를 요청했는데 `Invoice-…(2)`가 선택됨). `Left/Top`을 `-32000`으로 옮기면 셸에겐 창이 정상적으로 살아 있어 선택이 완료되고, 사용자 눈에만 안 보인다.

- 파킹은 `Busy`인 동안에만 하고, 판단(`Document`·경로·`FocusedItem`)은 `Busy`가 풀린 뒤 그대로 한다 — 즉 **치우는 시점만 앞당기고 결정 시점은 그대로**
- 창을 옮기기 전 COM 왕복 하나하나가 창이 화면에 남는 시간이다. `Visible`·`Busy`·`Document`·`FullName`·`Left`·`Top`·`HWND`를 **한 번의 `Promise.all`로** 읽는다(왕복 4회 → 1회). 이 배칭만으로 ~100ms → ~0ms
- `Hidden[hwnd] = {t, left, top}`에 원래 위치를 기억하고, 가로채지 않기로 결정하면 `Release`가 위치와 `Visible`을 되돌린다. `HoldMax`(5초)는 끝내 읽히지 않는 창의 백스톱이고, 목록에서 사라진 창은 항목만 지운다. **`Hidden`에 아무것도 남으면 안 된다** — 화면 밖에 방치된 창은 숨겨진 창만큼이나 못 찾는다
- 재시도가 끝나도 `Hidden`이 비어 있지 않으면 폴링을 계속한다(`Retry = oi.FastRetry`)

**재현/검증 방법** — 브라우저가 쓰는 API를 그대로 호출한다. 훅이 걸리면 20초를 기다리므로 **반드시 자식 프로세스 + 타임아웃**으로 감쌀 것:
```powershell
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public static class Sh {
  [DllImport("shell32.dll", CharSet=CharSet.Unicode, PreserveSig=false)]
  public static extern void SHParseDisplayName(string n, IntPtr b, out IntPtr p, uint i, out uint o);
  [DllImport("shell32.dll")]
  public static extern int SHOpenFolderAndSelectItems(IntPtr f, uint c, IntPtr[] a, uint g);
}
'@
$f = "$env:USERPROFILE\Downloads\some.pdf"
$d = [IntPtr]::Zero; $c = [IntPtr]::Zero; $o = 0
[Sh]::SHParseDisplayName((Split-Path $f -Parent), [IntPtr]::Zero, [ref]$d, 0, [ref]$o)
[Sh]::SHParseDisplayName($f, [IntPtr]::Zero, [ref]$c, 0, [ref]$o)
"0x{0:X8}" -f [Sh]::SHOpenFolderAndSelectItems($d, 1, @($c), 0)   # S_OK 면 정상, 0x80004004 면 훅이 살아 있음
```
- openinstead 자체가 멀쩡한지 따로 보려면 훅을 우회해 진짜 Explorer 창을 띄운다 — TE 제목이 해당 폴더로 바뀌고 `CabinetWClass` 창이 남지 않으면 정상:
  `$p=[Diagnostics.Process]::new(); $p.StartInfo.FileName='C:\Windows\explorer.exe'; $p.StartInfo.Arguments='C:\Windows\Fonts'; $p.StartInfo.UseShellExecute=$false; $p.Start()`

## 탐색기 / Win+E / 브라우저 다운로드가 한꺼번에 먹통 (ShellExecute 무한 대기)
**증상** (2026-09-11 발생):
- 브라우저에서 "폴더 열기" 클릭 → 무반응
- 그 뒤로 브라우저에서 새로 다운로드해도 파일이 생기지 않음
- 작업표시줄 탐색기, Win+E를 눌러도 창이 안 뜸
- explorer.exe / TE64는 살아 있고 `Responding`도 true라 언뜻 멀쩡해 보임

**확인된 사실**:
1. 폴더에 대한 `ShellExecuteEx`가 **무기한 블록**된다. 반면 `CreateProcess`로 `explorer.exe <경로>`를 직접 띄우면 247ms만에 정상 동작 → 셸이나 explorer 자체가 아니라 **호출자 프로세스에 로드되는 ShellExecuteHook**이 멈추는 것
2. 멈춘 프로세스의 모듈을 보면 **`QTTabBar.ni.dll`**(QTTabBar `ExplorerProcessCaptor`)만 로드돼 있고 Tablacus의 `tshellexecutehook64.dll`은 **아예 없다**. `HKLM\...\Explorer\ShellExecuteHooks`는 CLSID 순으로 도는데 QTTabBar `{D2BF470E-…}`가 Tablacus `{E840AAD2-…}`보다 앞이라, QTTabBar 훅이 먼저 걸려 멈추면 Tablacus 훅은 실행조차 안 된다
3. **explorer.exe 재시작으로 즉시 해소**된다(폴더 `ShellExecute`가 ~0.4초로 복귀, 반복 실행도 안정). 즉 훅이 기다리던 상대는 explorer.exe 안에 있다 — QTTabBar는 explorer 내부 인스턴스와 IPC로 통신한다
4. 브라우저 다운로드까지 죽는 이유: Chromium은 `SHOpenFolderAndSelectItems`와 다운로드 격리(`IAttachmentExecute`)를 **같은 COM STA 스레드**에서 돌린다. "폴더 열기" 한 번으로 그 스레드가 막히면 이후 모든 다운로드가 완료 단계에서 멈춘다

**Tablacus 쪽 관련성 (정황, 미증명)**: 고장 상태의 explorer.exe엔 **보이지 않는 Explorer 창**(`CabinetWClass`, 제목 "Claude", `Visible=False`)이 남아 있었다. `openinstead`가 창을 숨긴 뒤 닫기에 실패했을 때 나오는 흔적이다(아래 수정). QTTabBar가 관리하던 Explorer 창을 밑에서 숨기고 Quit해 버리면 QTTabBar 내부 상태가 꼬일 수 있다는 건 그럴듯하지만 **이 인과는 확인하지 못했다**

**진단 (핵심 격리 실험)** — 두 경로를 갈라 보면 훅 문제인지 셸 문제인지 바로 갈린다:
```powershell
# (1) ShellExecute 경로: 훅이 로드된다. 여기서만 멈추면 훅 문제
$p=[Diagnostics.Process]::new(); $p.StartInfo.FileName='C:\Windows\Fonts'
$p.StartInfo.UseShellExecute=$true; $p.Start()

# (2) CreateProcess 경로: 훅을 우회한다. 이게 정상이면 셸/explorer 자체는 멀쩡
$p=[Diagnostics.Process]::new(); $p.StartInfo.FileName='C:\Windows\explorer.exe'
$p.StartInfo.Arguments='C:\Windows\Fonts'; $p.StartInfo.UseShellExecute=$false; $p.Start()
```
- 어떤 훅에 물렸나: 멈춘 프로세스에 대해 `(Get-Process -Id <pid>).Modules | ? ModuleName -match 'tshellexecutehook|QTTab'`
- 남은 숨김 창: `EnumWindows`로 `CabinetWClass` 중 `IsWindowVisible`이 false인 것을 찾는다
- ⚠️ `Start-Process`는 기본이 ShellExecute라 **진단 셸까지 같이 멈춘다**. 반드시 자식 프로세스 + 타임아웃으로 감쌀 것
- ⚠️ `Shell.Application.Windows()`에 `HWND`/`LocationName`이 전부 빈 값인 항목이 하나 보이는데, 이건 **TE64 자신의 등록**이다(TE64를 닫으면 `Count`가 0이 되고 다시 띄우면 1이 된다). 좀비로 오해하지 말 것

**즉시 복구**: `explorer.exe` 재시작. 이미 막힌 브라우저는 한 번 재시작 권장

**재발 방지 (v1.1.23)**: 인스톨러가 `EnableShellExecuteHooks`(HKCU 정책 값)를 삭제한다. 이 값은 ShellExecuteHook 메커니즘 자체의 on/off 스위치이고 Windows 기본은 꺼짐인데 켠 건 우리 인스톨러였다. 지우면 우리 훅뿐 아니라 **다른 앱이 남긴 훅도 로드되지 않는다** — QTTabBar를 지웠는데 훅 등록만 남은 PC가 이 경우다. 대신 QTTabBar의 탐색기 가로채기 기능도 같이 꺼진다

**수정 (fork 쪽)**: `addons/openinstead/script.js` — `exp.Quit()`이 await 없이 불리고 `bQuit = true`가 곧바로 세팅돼서, 닫기가 실패해도 아무도 모르게 **보이지 않는 Explorer 창이 남았다**(`bQuit`가 true라 `finally`의 `exp.Visible = true` 복구도 안 걸림). `await exp.Quit()`으로 바꾸고, 숨기기 **전에** 읽어 둔 HWND로 `api.IsWindow()`가 false가 될 때까지(최대 2초) 확인한 뒤에만 `bQuit`를 세운다. 끝내 안 닫히면 창을 다시 보이게 되돌린다

## "내 PC" 더블클릭 시 기본 탐색기 열림
**증상**: 바탕화면 "내 PC" 아이콘 더블클릭 시 Windows 탐색기가 열림

**원인**: 
- "내 PC"는 특수 CLSID `{20D04FE0-3AEA-1069-A2D8-08002B30309D}` — 일반 폴더가 아님
- `Folder\shell\open\command` 레지스트리 미적용

**해결**: openinstead 애드온이 Explorer 창을 감지하여 Tablacus로 대체. Tablacus 상시 실행 필요.

**확인**: explorer.exe가 비정상 상태면 가로채기 실패할 수 있음
```bash
taskkill //F //IM explorer.exe && sleep 2 && explorer.exe &
```

## 디버깅: openinstead 동작 확인
1. [DebugView64](https://learn.microsoft.com/en-us/sysinternals/downloads/debugview) 관리자 권한 실행
2. **Capture > Capture Win32** 체크
3. `api.OutputDebugString()` 호출로 로그 출력
4. 로그 패턴: `[OpenInstead]`, `[WindowRegistered]`

체크 포인트:
- `[WindowRegistered] fired` 안 찍힘 → COM 이벤트 자체가 안 옴 (shellexecutehook 충돌 가능)
- `CANCELLED` → CancelWindowRegistered가 호출됨 (Tablacus 자체 창 열기)
- `Worker called` 후 `Windows count` → Explorer 창 감지 여부
- `path=` 값 → 경로 파싱 실패 여부

## CheckForkUpdate 다운로드 실패
**사용 불가 방식**:
- `api.URLDownloadToFile` — GitHub redirect에서 E_ABORT (0x80004004)
- PowerShell `Invoke-WebRequest` — wsh.Run 동기 실행 시 UI 블로킹, wsh.Exec 폴링 문제
- Portable zip Extract — zipfldr.dll 비동기 추출 문제

**현재 방식**: WinHttp.WinHttpRequest.5.1 + ADODB.Stream + wsh.Run

## [해결됨 v1.1.17] 탭을 다른 TE 창에 드롭하면 원래 창에 열림
**원인**: `tabplus/sync.js` `DropTab`이 대상 창 `w.NavigateFV(destFV || te.Ctrl(CTRL_FV), …)`에 **원본 창의** `te`를 폴백으로 넘김 → 탭 컨트롤 영역 밖(툴바·상태바)에 드롭하면 원본 창에 열림. 또 `FV.FolderItem.Path`는 별칭 pidl("내 PC > 다운로드")에서 표시명이라 잘못된 폴더로 감.
**해결**: `w.te.Ctrl(CTRL_FV)` 폴백, 경로는 `GetDisplayNameOf(FORPARSING|FORPARSINGEX)` 사용 (`OpenInNewWindow`와 동일).

## [해결됨 v1.1.17] favbar 우클릭 시 브라우저 기본 메뉴가 함께 뜸
**원인**: 인라인 핸들러 `oncontextmenu="return Addons.FavBar.Popup(...); return false;"` — `Popup`이 async라 Promise(truthy)를 반환하고 뒤의 `return false`는 실행되지 않음.
**일반화**: async 함수를 인라인 이벤트 핸들러에서 `return`하지 말 것. `X(); return false;` 형태로.

## [해결됨] 탭 드래그 드롭 시 새 창 열기
**증상**: 탭을 창 밖(바탕화면 등)으로 드래그 드롭하면 기본 Windows 탐색기가 열림. 새 Tablacus 창으로 열려야 함.

**해결 (v1.1.3)**:
- `OpenInNewWindow` 함수 신규 정의 (`script/sync.js`) — 커맨드라인 arg[3]에 경로를 직접 전달하여 `/open` 모드로 새 창 생성
- `ui.js`: arg[3]이 경로 패턴이면 uid 조회 건너뛰기 (독립 창으로 초기화)
- `sync1.js` InitWindow: arg[3]에서 경로 직접 읽어 Navigate, RunCommandLine 건너뛰기 (중복 탭 방지)
- `tabplus/sync.js` DropTab: 자기 창 드롭 방지 조건 수정 + `OpenInNewWindow` 호출

**핵심 난관과 해결 과정**:
- TE64.exe 싱글 인스턴스 → `/open` 플래그로 새 창 생성
- Exchange 메커니즘 시도 → ui.js(브라우저)와 sync1.js(COM)의 window 컨텍스트가 달라 변수 전달 불가
- 최종: Exchange 제거, 커맨드라인으로 경로 직접 전달하여 양쪽 컨텍스트 문제 해결

## [해결됨 v1.1.5] 언인스톨 후 기본 탐색기 폴더/드라이브 더블클릭 고장
**증상**: TE 언인스톨 후 Windows 기본 탐색기에서
- 폴더 더블클릭 → 무반응
- "내 PC"에서 C/D 드라이브 더블클릭 → BitLocker 암호화/잠금해제 화면이 뜸
- 좌측 폴더트리 클릭은 정상 (별도 코드 경로)

**원인 (근본)**: 인스톨러가 `HKCU\Software\Classes\{Directory,Drive,Folder}\shell\open\command`를 생성하는데, 언인스톨 시 `uninsdeletekey`가 **맨 끝 `\command` 키만 삭제**하고 부모인 빈 `...\shell\open`·`...\shell` 키를 HKCU에 **잔재로 남김**. 이 빈 키가 HKLM의 정상 클래스 등록을 가려서(shadow) **기본 동사 "open" 해석이 깨짐** → 폴더 무반응, 드라이브는 BitLocker 동사로 폴백.
- 진단 결정타: `Shell.Application`에서 폴더에 빈 동사 `InvokeVerb()` 호출 → 예외 없이 창 안 열림(더블클릭 재현). 명시적 `InvokeVerb('open')`은 정상 → 등록은 살아있고 "기본 동사 선택"만 깨진 상태.
- SFC/DISM 깨끗, DLL/CLSID/정책 전부 정상 → 레지스트리 잔재가 원인.

**즉시 복구 (이미 깨진 PC)**: 기본 동사를 명시 지정.
```powershell
foreach($cls in 'Folder','Directory','Drive'){
  $k = "Registry::HKEY_CURRENT_USER\SOFTWARE\Classes\$cls\shell"   # 전체적용은 HKEY_LOCAL_MACHINE
  New-Item $k -Force | Out-Null
  Set-ItemProperty $k -Name '(default)' -Value 'open'
}
Stop-Process -Name explorer -Force
```

**근본 수정 (v1.1.5 installer.iss)**:
1. `[Registry]`에서 각 클래스의 부모 키(`...\shell`, `...\shell\open`)에 `uninsdeletekeyifempty` 추가. **부모를 `\command` 항목보다 먼저 나열** — Inno는 언인스톨을 설치 역순으로 처리하므로, `\command` 삭제 후 빈 부모가 차례로 정리되어 HKLM 정상값으로 깔끔히 폴백됨.
2. `[Code]` `CurUninstallStepChanged(usPostUninstall)`에서 `RegDeleteKeyIfEmpty`로 빈 `...\shell\open`·`...\shell` 강제 정리 (안전망, 빈 경우만 삭제하므로 사용자 추가 동사 미손상).

## [해결됨] localStorage가 재시작 시 사라짐 (추가 즐겨찾기바 미저장)
**증상**: 두 번째 즐겨찾기바(추가 행)에 드래그로 등록한 항목이 앱 재시작 후 사라짐

**원인**: TE의 MSHTML(IE WebBrowser) 호스트는 `localStorage`를 디스크에 flush하지 않음 — `%LOCALAPPDATA%\Microsoft\Internet Explorer\DOMStore`가 비어 있음. localStorage는 **세션 내에서만 유효**하고 재시작 시 소멸. `favbar_extra_rows`, `favbar_wrap`, `favbar_fontDelta` 모두 해당.

**해결**: favbar 설정을 `config\favbar.json` (`%AppData%\Tablacus\Explorer\config\`) 파일로 저장. UI 컨텍스트에서 `ReadTextFile`/`WriteTextFile` 프록시 사용 (경로는 `te.Data.DataFolder` 기준 상대 경로). Load 이벤트에서 `LoadConfig()` 후 렌더링, 변경 시마다 `SaveConfig()`.

**일반화**: 이 프로젝트에서 영속 설정은 localStorage 금지 — 항상 DataFolder의 config 파일 사용.

## [해결됨 v1.1.14] 다운로드 임시파일이 남고 크기가 안 바뀜
**증상**: 다운로드 폴더 탭을 열어 둔 채 브라우저(Whale/Chromium)로 내려받으면
- 다운로드 중 임시파일(`<GUID>.tmp` → `미확인 NNNNNN.crdownload`)의 크기가 갱신되지 않음
- 완료 후 최종 파일이 나타나도 **임시파일 행이 그대로 남음** → F5 눌러야 사라짐

**원인 (계측으로 확인)**: 셸 변경 알림(`SHChangeNotifyRegister`, InterruptLevel)이 이 시나리오에서 불완전하다.
`docs/tools/shmon.ps1`로 다운로드 폴더의 알림을 기록한 결과:
```
CREATE      ...\46daca31-....tmp
UPDATEITEM  ...\46daca31-....tmp                 ← 5초 뒤 한 번
UPDATEITEM  ...\미확인 828934.crdownload          ← 이미 없어진 뒤에 도착
UPDATEITEM  ...\100Mb.dat                        ← 최종 파일
```
- 이름 변경 두 번(`.tmp`→`.crdownload`→최종)이 `RENAMEITEM`이 아니라 **새 이름의 `UPDATEITEM`으로만** 오고, `.tmp`가 사라졌다는 알림은 아예 없다 → DefView가 `.tmp` 행을 지울 계기가 없음
- 파일에 쓰는 동안(핸들 열린 상태)은 **알림이 전혀 없다** — 디렉터리상 크기(`FindFirstFile`)는 실시간으로 커지는데도 닫힐 때 한 번만 `UPDATEITEM`이 온다
- 알림은 1~5초 배치로 지연 전달되며, pidl에 든 크기는 이벤트 생성 시점 값이라 DefView가 그대로 쓰면 옛 크기가 보임
- PowerShell로 `.crdownload` 생성→쓰기→이름 변경을 흉내 내면(`docs/tools/sim-download.ps1`) `RENAMEITEM`이 정상적으로 와서 재현되지 않음 — 실제 브라우저(빠른 소량 쓰기 수천 회)로만 재현됨
- **"다른 이름으로 저장"** (이미지 우클릭 → 저장, 대화상자가 뜬 순간 `<GUID>.tmp` 생성)도 같은 부류: 저장하면 `CREATE`·`DELETE`·`UPDATEITEM`이 전부 **새 파일 이름**으로만 오고 `.tmp`에 대한 알림은 없음. 취소하면 `DELETE(.tmp)`가 제대로 와서 문제 없음

**해결**: 알림에 의존하지 않고 폴더를 다시 열거해 뷰와 대조하는 `FV.SyncItems()` + 변경이 멈출 때까지 1초 폴링. 상세는 [customizations.md](customizations.md#폴더-뷰-실시간-동기화--syncitems-v1114).

**함정 (첫 구현에서 놓친 것)**: 트리거를 JS `ChangeNotifyFV`의 `bChild`(`FV.FolderItem.Path` 비교)에 걸면 **즐겨찾기 `shell:Downloads`로 연 탭("내 PC > 다운로드")에서는 동작하지 않는다** — 별칭 pidl의 `FolderItem.Path`가 `C:\Users\…\Downloads`가 아니라 `"다운로드"`다. 경로로 연 탭(`C:\Users\…\Downloads`)만 테스트하면 통과해 버리므로, **재현·검증은 반드시 즐겨찾기/내 PC 경유 탭으로** 할 것. 트리거는 `SFVM_FSNOTIFY`(C++)에 두어 해결.

**검증 방법**:
```powershell
# 1) 셸 알림 계측 (백그라운드, 30초)
Start-Process pwsh -ArgumentList '-File','docs\tools\shmon.ps1','-Seconds','30','-Log','shmon.log' -WindowStyle Hidden
# 2) 다운로드 흉내 (chrome | firefox 스타일)
docs\tools\sim-download.ps1 -Style chrome -Seconds 6
# 3) 실제 재현은 기본 브라우저로 테스트 파일 다운로드
Start-Process whale.exe 'https://proof.ovh.net/files/100Mb.dat'
# 4) "다른 이름으로 저장" 흐름 자동화 (Whale에 이미지 URL 열고 Ctrl+S → 8초 뒤 Enter/Esc, 계측+스크린샷 포함)
docs\tools\saveas-test.ps1 -Action save     # 또는 -Action cancel
```
- `docs\tools\shot.ps1`: Debug 인스턴스 창을 PNG로 캡처(`PrintWindow`, 포커스 안 뺏음). 위 스크립트들이 같은 폴더의 `shmon.ps1`/`shot.ps1`을 부른다
- Debug 빌드 실행은 설치본과 별개 인스턴스로 뜬다(단일 인스턴스 판정이 exe 경로 해시 기준). **별칭 탭으로 여는 법**:
  `Debug\TE64.exe /open script\index.html "::{20D04FE0-3AEA-1069-A2D8-08002B30309D}\::{374DE290-123F-4565-9164-39C4925E467B}"`
  (경로 탭은 `"C:\Users\<이름>\Downloads"`)

## [재현 안 됨 2026-09-04] Dropbox 온라인 전용 폴더 복사 시 프리징·상태 열 미갱신
**보고된 증상**: `C:\Users\CH00\Dropbox\개인\02 동영상`에서 용량 큰 온라인 전용 폴더를 Ctrl+C → 바탕화면에 붙여넣기 하면 다운로드되는 동안 TE가 멈춘 것처럼 보이고, 완료 후 원본 폴더의 상태 열이 구름 그대로라 F5가 필요함.

**재현 시도** (`docs/tools/cloud-copy-test.ps1`, Debug 인스턴스 v1.1.21, 283MB 폴더, 파일 특성 0x501420 = RECALL_ON_DATA_ACCESS|UNPINNED|OFFLINE|REPARSE_POINT):
- 복사 7.2초, UI 무응답 0초 (0.3초 간격 `SendMessageTimeout`)
- 복사는 `multiprocess` 애드온(기본 켬)이 별도 TE64 워커 프로세스에서 수행 → 하이드레이션이 UI 스레드를 막지 않음. 이 애드온이 꺼져 있으면 셸 컨텍스트 메뉴 `paste` 동사가 UI 스레드에서 `IDropTarget::Drop`을 실행하므로 프리징 가능성 있음
- 원본 폴더 탭(백그라운드)의 상태 열은 새로고침 없이 구름 → 체크로 바뀜. 하이드레이션으로 파일 특성이 0x420으로 바뀌면 `SyncItems`(v1.1.18)가 `dwFileAttributes` 차이를 잡아 `UpdateObject`로 새 pidl을 넣기 때문
- 사용자 설치본은 v1.1.19, `%AppData%` config에 addons.xml 없음(기본값 = multiprocess 켬)

**미확인 조건**: 붙여넣기 대상이 TE 탭인지 실제 바탕화면(탐색기)인지, Ctrl+V인지 우클릭 메뉴인지, 진행률 대화상자 유무, v1.1.19 이전 관찰인지. 다시 겪으면 이 네 가지와 함께 `tasklist`로 TE64 프로세스 수(워커가 떴는지)를 확인할 것.

**부작용**: 테스트로 `2013.10.14 윤식형 결혼` 2개 파일(283MB)이 로컬로 하이드레이션됨. `attrib +U -P`는 Dropbox가 반영하지 않음 — 되돌리려면 Dropbox 메뉴 "온라인 전용으로 설정".

## Dropbox 사진 폴더 썸네일이 느림 (2026-11-20, TE 코드 문제 아님)
**증상**: `Dropbox\카메라 업로드`(1081개, 대부분 온라인 전용)를 썸네일 보기로 열면 미리보기가 느림.

**확인 결과**:
- 썸네일은 TE가 아니라 DefView(셸)가 만들고, Windows 썸네일 캐시(`%LocalAppData%\Microsoft\Windows\Explorer\thumbcache_96.db` 등)에 저장되어 재사용됨. 온라인 전용 파일도 Dropbox 제공 썸네일이 캐시되며 **하이드레이션은 일어나지 않음**
- 캐시 상태: 1081개 중 760개 캐시됨, 321개 미캐시 — 미캐시분은 2025-08~11 구간에 몰려 있었음(안 본 구간 또는 정리됨). 미캐시 항목은 Dropbox가 서버에서 썸네일을 받아야 해서 느림
- `HKLM\...\Explorer\VolumeCaches\Thumbnail Cache\Autorun`이 0이 아니면(3이었음) SilentCleanup/저장소 센스가 썸네일 캐시를 지울 수 있음 → 이후 전체 재생성

**조치**:
- `IShellItemImageFactory::GetImage(96, SIIGBF_THUMBNAILONLY)`로 미캐시 320개 미리 생성(40초, 하이드레이션 0). 캐시 여부는 `SIIGBF_INCACHEONLY`(0x10)로 확인
- `Autorun` = 0으로 변경(관리자). Windows 기능 업데이트 후 원복될 수 있음
- v1.1.27: 미리 생성에서 클라우드 파일 제외 — 크게 키우면 일부가 기본 아이콘으로 남고 F5로만 보이던 현상 대응
- ⚠️ 테스트 함정: Debug 창이 모니터(3440×1440) 아래로 삐져나가 있으면 `PrintWindow` 캡처의 화면 밖 부분이 비거나 예전 화면으로 남는다(목록 DC의 `GetClipBox`가 화면 끝에서 잘림). 다시 그리기 버그로 오인하지 말고 창을 화면 안으로 옮긴 뒤 캡처할 것
- v1.1.26: 썸네일 백그라운드 미리 생성 + Ctrl+휠 크기 조절 추가 ([customizations.md](customizations.md#썸네일-백그라운드-미리-생성-v1126-옵션-conf_thumbprefetch-기본-켬))
- TE 쪽 잠재 비용(미검증): `sizestatus`(FileSize 켬)는 선택 없을 때 전 항목 `ExtendedProperty("Size")`를 개별 await, `SyncItems`는 클라우드 특성 변화에도 `UpdateObject`(썸네일 재추출 유발 가능)

## Inno Setup 빌드 실패
- `Flags: checked` → `checked`는 Tasks에 없는 플래그. 기본 체크는 플래그 없이 두면 됨
- `Flags: checkablealone checked` → 두 플래그 동시 사용 불가
- `gh release create` 실패 → workflow 파일 권한 문제. `gh api`로 직접 호출
