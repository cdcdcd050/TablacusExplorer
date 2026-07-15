# Troubleshooting

## 메뉴/설정이 업데이트되지 않음
**증상**: 새 버전 설치했는데 메뉴 항목이 추가되지 않음

**원인**: `config/menus.xml`이 존재하면 `init/menus.xml` 기본값을 무시함

**해결**:
- `%AppData%/Tablacus/Explorer/config/menus.xml` 삭제
- 일반화: 초기값 테스트 시 `%AppData%/Tablacus/Explorer/config/` 폴더 삭제 필요

## 브라우저 "폴더 열기" 시 빈 창
**증상**: 크롬/웨일에서 다운로드 후 "폴더 열기" 클릭 시 Tablacus가 빈 창으로 열림

**원인**: shellexecutehook DLL이 explorer.exe ShellExecute를 가로채지만 **원본 인자(경로) 전달 안 함**

**해결**: openinstead 애드온이 Tablacus 상시 실행 시 정상 동작
- 인스톨러 `replaceexplorer` 태스크에 시작프로그램 등록 포함됨 (기본 체크)
- 부팅 후 Tablacus 실행 확인: `tasklist | grep TE64`

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

## Inno Setup 빌드 실패
- `Flags: checked` → `checked`는 Tasks에 없는 플래그. 기본 체크는 플래그 없이 두면 됨
- `Flags: checkablealone checked` → 두 플래그 동시 사용 불가
- `gh release create` 실패 → workflow 파일 권한 문제. `gh api`로 직접 호출
