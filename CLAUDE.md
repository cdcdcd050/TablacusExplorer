# Tablacus Explorer Fork

## Project Overview
Tablacus Explorer의 포크 프로젝트. 원본: [tablacus/TablacusExplorer](https://github.com/tablacus/TablacusExplorer)
포크: [cdcdcd050/TablacusExplorer](https://github.com/cdcdcd050/TablacusExplorer)

## Architecture
- **Debug/**: 메인 실행 디렉토리
  - `script/`: 코어 스크립트 (sync.js, sync1.js, ui.js, index.html, index.css 등)
  - `addons/`: 애드온 디렉토리 (각 애드온은 config.xml, script.js, sync.js 구조)
  - `init/addons.xml`: 애드온 활성화/비활성화 설정 (한 줄 XML)
  - `config/`: 사용자 설정 저장 (window.xml, addons.xml 등)

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

## Key Customizations (from upstream)

### UI
- 배경색: 흰색 (#ffffff)
- ToolBar3~4 사이 4px 패딩, ToolBar5~탭 사이 7px 패딩
- 주소바/검색바: padding-top/bottom 3px, border 1px solid #ccc
- 검색바 좌측 margin 5px (주소바와 간격)
- 주소바 좌측 padding-left 5px

### Favorites Bar (favbar)
- 아이콘-텍스트 간 패딩: 3px (margin-left)
- 링크 간 간격: 5px (inline-block span)
- 드롭다운 메뉴: 기본 비활성화 (DD: false)

### Filter Bar (filterbar → 검색바)
- 아이콘: 필터 → 돋보기 (0xe71c → 0xe721)
- 돋보기 위치: left offset -(nSize+7) (우측 테두리에서 5px 여백)
- Placeholder: 정적 "Filter" → 동적 "{폴더명} 검색"
- padding-left: 5px

### Tree View (treeview)
- 싱글클릭으로 폴더 이동 (ItemClick 이벤트 추가, sync.js)
- NSTCS_SINGLECLICKEXPAND 플래그 추가 (sync1.js 기본 Tree_Style)

### Startup
- 탭 복원 비활성화: InitWindow에서 LoadXml(g_.xmlWindow) 주석처리
- 기본 새 탭: shell:MyComputerFolder (내 PC)

### Removed Addons
- clipboard: 삭제 (폴더 + addons.xml에서 제거)
- addfavorites, breadcrumbsaddressbar, favoritesbar: 이전 커밋에서 제거

### Init Defaults (초기값)
- `Debug/init/window.xml`: 전체 기본 설정 (탭, 뷰, 트리, 언어 등)
  - Tree: Align=3 (Left), Width=200, Style=33447
  - TabDefault=1, TreeDefault=1, ListDefault=1 (모든 탭에 적용)
  - Lang=ko
- `Debug/init/menus.xml`: 즐겨찾기 기본값 — 다운로드, 바탕 화면, 내 PC
- Config 로드 순서 (sync.js `ReadXmlFile`):
  1. `{DataFolder}/config/` — 사용자 설정 (우선)
  2. `{Installed}/config/` — 설치 폴더
  3. `init/` — 초기값 (위 두 곳에 없을 때만)
- Program Files 설치 시 DataFolder = `%AppData%/Tablacus/Explorer/`
- 초기값 테스트 시 `%AppData%/Tablacus/Explorer/config/` 폴더 삭제 필요

### Update Checker (CheckForkUpdate)
- 위치: `Debug/script/sync.js` CheckForkUpdate 함수
- GitHub API (`releases/latest`)로 최신 버전 확인
- tag_name에서 `v` 또는 `fork-v` 접두사 제거 후 버전 비교
- 현재 방식: 브라우저에서 릴리즈 페이지 열기 (`api.ShellExecute(json.html_url)`)
- **미해결**: `api.URLDownloadToFile`이 GitHub redirect에서 E_ABORT (0x80004004) 발생
  - GitHub download URL이 302 redirect → CDN으로 이동하는데 URLDownloadToFile이 처리 못함
  - Portable zip Extract 방식도 실패 (zipfldr.dll 비동기 추출 문제)
  - 향후 WinHttpRequest 또는 PowerShell 다운로드 방식 검토 필요

## Build & Release

### Installer (Inno Setup)
- 파일: `installer.iss`
- 빌드: `"C:\Users\CH00\AppData\Local\Programs\Inno Setup 6\ISCC.exe" installer.iss`
- 출력: `Output/TablacusExplorer-Fork-vX.Y.Z-Setup.exe`
- 버전 변경 시 수정 필요한 파일:
  - `Debug/script/consts.js` — `FORK_VERSION`
  - `installer.iss` — `AppVersion`, `OutputBaseFilename`

### GitHub Release
- `gh release create`가 workflow 파일(codeql-analysis.yml) 때문에 실패함
- 대신 `gh api`로 직접 릴리즈 생성:
  ```bash
  gh api repos/cdcdcd050/TablacusExplorer/releases -X POST \
    -f tag_name=vX.Y.Z -f name="vX.Y.Z title" -f body="description"
  ```
- asset 업로드:
  ```bash
  curl -s -X POST \
    -H "Authorization: token $(gh auth token)" \
    -H "Content-Type: application/octet-stream" \
    "https://uploads.github.com/repos/cdcdcd050/TablacusExplorer/releases/{RELEASE_ID}/assets?name=파일명" \
    --data-binary @"파일경로"
  ```

## Conventions
- 커밋 메시지: 영어, 변경 내용 요약
- 버전: vX.Y.Z (예: v1.0.0) — 포크 자체 버전 체계
- 언어: 사용자와 한국어로 소통
