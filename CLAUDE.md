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

## Build & Release

### GitHub Release
- `gh release create`가 workflow 파일(codeql-analysis.yml) 때문에 실패함
- 대신 `gh api`로 직접 릴리즈 생성:
  ```bash
  gh api repos/cdcdcd050/TablacusExplorer/releases -X POST \
    -f tag_name=vX.Y.Z -f name="vX.Y.Z title" -f body="description"
  ```

## Conventions
- 커밋 메시지: 영어, 변경 내용 요약
- 버전: vX.Y.Z (예: v26.4.5)
- 언어: 사용자와 한국어로 소통
