# Architecture

## Project Structure
- **Debug/**: 메인 실행 디렉토리
  - `script/`: 코어 스크립트 (sync.js, sync1.js, ui.js, index.html, index.css 등)
  - `addons/`: 애드온 디렉토리 (각 애드온은 config.xml, script.js, sync.js 구조)
  - `init/`: 초기값 (addons.xml, window.xml, menus.xml 등)
  - `config/`: 사용자 설정 저장 (window.xml, addons.xml 등)
- **TE/**: C++ 소스 (윈도우 클래스, COM 진입점) — 원본 유지, 수정 비추천
- **installer.iss**: Inno Setup 인스톨러 정의

## Layout Structure (ToolBar)
```
ToolBar1: 메인메뉴 (Left), 분할 (Right)
ToolBar2: 도구모음-뒤로/앞으로/위로/트리뷰/즐겨찾기/툴바 (Left) + 주소바 (Center) + 검색바 (Right)
ToolBar3: (비어있음)
  4px 패딩
ToolBar4: 즐겨찾기바, 링크바 (Center)
ToolBar5: (비어있음)
  7px 패딩
탭 + 컨텐츠
```

## Explorer Hijacking System
2개 메커니즘으로 Windows 탐색기를 가로챔 (v1.1.23에서 ShellExecuteHook 제거):

### 1. 레지스트리 (`Folder/Directory/Drive\shell\open\command`)
- 폴더 더블클릭 → `TE64.exe "%1"` 직접 실행
- 인스톨러 `replaceexplorer` 태스크가 등록
- 한계: 일반 폴더만 적용. 특수 CLSID(내 PC 등)는 미적용

### 2. openinstead 애드온
- `Debug/addons/openinstead/script.js`
- `WindowRegistered` COM 이벤트로 새 Explorer 창 감지
- 이벤트 후 `sha.Windows()`를 0.5초 뒤부터 250ms 간격, 최대 `MaxRetry`(16)회 검사 — 상시 폴링이 아님. `Busy`인 창(네트워크 공유, 부팅 직후)은 다음 회차에 다시 봄
- 파일 선택 정보(`/select`)도 보존 — `doc.FocusedItem`을 창을 숨기기 **전에**, `TakeOver` 옵션과 무관하게 읽어야 함 (v1.1.17 이전엔 `TakeOver`가 꺼진 기본 설정에서 선택이 항상 무시됐음)
- 닫기는 `await exp.Quit()` 후 숨기기 전에 읽어 둔 HWND로 `api.IsWindow()`가 false가 될 때까지(최대 2초) 확인한 뒤에만 성공 처리(v1.1.22). 끝내 안 닫히면 `finally`가 `exp.Visible = true`로 되돌림 — 보이지 않는 Explorer 창을 남기지 않기 위해
- 특수 폴더(내 PC 등)와 브라우저의 "폴더 열기"까지 **이 경로 하나로 전부 처리**된다. 경로·선택 파일·포그라운드 전환이 모두 맞는 유일한 방법
- **전제 조건**: Tablacus가 항상 실행 중이어야 함 → `startup` 레지스트리 등록 필요

### 제거된 것: shellexecutehook DLL (`tshellexecutehook64.dll`) — v1.1.23
COM InProc Server, CLSID `{E840AAD2-1EF2-4F00-8BA8-CE7B57BF8878}`. 업스트림 바이너리(소스 없음, DllVersion 1.1.0.0)로 `HKLM\...\ShellExecuteHooks`에 등록해 쓰던 것. **더 이상 설치하지 않는다.**

- **왜 뺐나**: 브라우저의 "폴더 열기"는 `SHOpenFolderAndSelectItems`를 호출하는데, 훅이 그 창 생성을 가로채 버리면 셸은 등록될 Explorer 창을 **20초 기다리다 `E_ABORT`로 실패**한다. TE는 뒤에서 폴더를 열지만 포그라운드로 오지도, 파일을 선택하지도 않는다 → 사용자에겐 "아무 반응 없음". 측정: 훅 활성 `E_ABORT`/20,132ms vs 훅 무력화 `S_OK`/393ms
- 훅이 하던 일은 openinstead가 전부 커버하고, 인자 전달도 openinstead 쪽이 정확하다(훅은 원본 경로를 넘기지 않아 빈 창이 뜨는 한계가 원래 있었음)
- shell32는 **ShellExecute를 호출하는 모든 프로세스**에 훅 DLL을 로드한다(브라우저 포함). 파일이 잠기던 이유이자, 프로세스별 훅 목록 캐시 때문에 등록/해제 후 explorer 재시작이 필요한 이유
- `EnableShellExecuteHooks`(HKCU 정책 값)는 ShellExecuteHook 메커니즘 자체의 on/off 스위치다. Windows 기본은 꺼짐이고 켠 건 우리 인스톨러였으므로 같이 되돌린다. 부수효과로 **다른 앱이 남긴 훅**(제거한 QTTabBar 등)도 로드되지 않는다 — 그 훅이 멈추면 탐색기·Win+E·브라우저 다운로드가 한꺼번에 죽는다(troubleshooting 참조)
- 인스톨러는 업그레이드 시 `RemoveLegacyHook`에서 CLSID 등록 해제(64/32비트 양쪽), `EnableShellExecuteHooks` 삭제, `HKCU\Software\Tablacus\ShellExecuteHook` 삭제, DLL 삭제(잠겨 있으면 재시작 시 삭제)를 수행하고, 뭔가 실제로 지웠을 때만 explorer를 재시작한다
- `addons/shellexecutehook` 애드온은 등록 UI일 뿐 자동 등록은 하지 않지만, 재활성화 경로라서 `init/addons.xml`에서 `Enabled="0"`으로 바꿨다

## Config Load Order
`sync.js` `ReadXmlFile`:
1. `{DataFolder}/config/` — 사용자 설정 (우선)
2. `{Installed}/config/` — 설치 폴더
3. `init/` — 초기값 (위 두 곳에 없을 때만)

Program Files 설치 시 DataFolder = `%AppData%/Tablacus/Explorer/`

## Update Checker (CheckForkUpdate)
- 위치: `Debug/script/sync.js` `CheckForkUpdate` 함수
- GitHub API (`releases/latest`)로 최신 버전 확인
- tag_name에서 `v` 또는 `fork-v` 접두사 제거 후 버전 비교
- 다운로드: `WinHttp.WinHttpRequest.5.1` + `ADODB.Stream` → `%TEMP%`에 저장
  - `http.Option(6, true)` — GitHub 302 redirect 자동 follow
- 실행: `wsh.Run` (api.ShellExecute는 undefined 반환) — `/SILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS`로 실행. Setup이 Restart Manager로 TE를 닫고 끝나면 다시 띄움 (v1.1.19)
- 버전 비교는 `CompareVersions`(구성요소별). 이전의 `major*10000+minor*100+patch`는 1.1.100과 1.2.0이 충돌하고 2자리 태그에서 NaN
- `unins000.exe`가 없으면 포터블 → 릴리즈 페이지 열기
- `http.SetTimeouts(15s, 15s, 30s, 300s)` — 다운로드는 여전히 동기(UI 멈춤)지만 무한 대기는 없음
- 모든 메시지는 `GetText` 키(ko/en.xml)
