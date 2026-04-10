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
3개 메커니즘이 동시에 동작하여 Windows 탐색기를 가로챔:

### 1. 레지스트리 (`Folder/Directory/Drive\shell\open\command`)
- 폴더 더블클릭 → `TE64.exe "%1"` 직접 실행
- 인스톨러 `replaceexplorer` 태스크가 등록
- 한계: 일반 폴더만 적용. 특수 CLSID(내 PC 등)는 미적용

### 2. shellexecutehook DLL (`tshellexecutehook64.dll`)
- COM InProc Server, CLSID `{E840AAD2-1EF2-4F00-8BA8-CE7B57BF8878}`
- `HKLM\...\ShellExecuteHooks`에 등록되어 explorer.exe 내부 ShellExecute 가로채기
- Win+E, 시작메뉴 폴더 등 가로채기
- **한계**: 가로챌 때 원본 인자(경로) 전달 안 함 → 빈 창 열림

### 3. openinstead 애드온
- `Debug/addons/openinstead/script.js`
- `WindowRegistered` COM 이벤트로 새 Explorer 창 감지
- `sha.Windows()` 폴링하여 Explorer 창 발견 시 Tablacus로 대체
- 파일 선택 정보(`/select`)도 보존
- **전제 조건**: Tablacus가 항상 실행 중이어야 함 → `startup` 레지스트리 등록 필요

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
- 실행: `wsh.Run` (api.ShellExecute는 undefined 반환)
