# Customizations (from upstream)

## UI
- 배경색: 흰색 (#ffffff)
- ToolBar3~4 사이 4px 패딩, ToolBar5~탭 사이 7px 패딩
- 주소바/검색바: padding-top/bottom 3px, border 1px solid #ccc
- 검색바 좌측 margin 5px (주소바와 간격)
- 주소바 좌측 padding-left 5px

## Favorites Bar (favbar)
- 아이콘-텍스트 간 패딩: 3px (margin-left)
- 링크 간 간격: 5px (inline-block span)
- 드롭다운 메뉴: 기본 비활성화 (DD: false)

## Filter Bar (filterbar → 검색바)
- 아이콘: 필터 → 돋보기 (0xe71c → 0xe721)
- 돋보기 위치: left offset -(nSize+7) (우측 테두리에서 5px 여백)
- Placeholder: 정적 "Filter" → 동적 "{폴더명} 검색"
- padding-left: 5px

## Tree View (treeview)
- 싱글클릭으로 폴더 이동 (ItemClick 이벤트 추가, sync.js)
- NSTCS_SINGLECLICKEXPAND 플래그 추가 (sync1.js 기본 Tree_Style)

## Startup Behavior
- 탭 복원 비활성화: InitWindow에서 LoadXml(g_.xmlWindow) 주석처리
- 기본 새 탭: shell:MyComputerFolder (내 PC)

## Split Pane Focus Styling
- 활성 패널: 회색 배경 (`#e0e0e0`, `.activecaption`)
- 비활성 패널: 흰색 배경 (`#fff`, `.inactivecaption`)
- `tabplus/script.js` `SetActiveColor`: 포커스 이동 시 이전 패널에 `inactivecaption` 적용
- TabPlus 기본 옵션 (`init/addons.xml`): `Active="1" New="1" Drive="1" Icon="1"`

## New Window (새 창)
- 위치: `sync1.js` g_basic.Tools.Exec의 `"New window"` 명령
- 방식: `wsh.Run`으로 TE64.exe `/open script\index.html` 실행
- 메뉴: `init/menus.xml` File 메뉴 `Pos="0"`으로 기본 항목 앞에 배치
- `/open` 인자 필수 — 없으면 기존 창 활성화만 됨 (단일 인스턴스 동작)
- `/open`에 폴더 경로 전달 불가 — HTML 파일만 동작 확인됨
- `OpenNewProcess` 함수 (`sync.js`): `sha.ShellExecute` 사용, 반환값 undefined

## View 메뉴 (보기)
- "Show hidden files" (숨김 파일 표시) 토글 항목 추가 — ko.xml에 전용 키 추가 (옵션의 "Show all files" 키와 별개)
- 위치: `sync.js` GetBaseMenuEx의 `nBase == 6` 블록 (verb 0x4022, "Hide Explorer Panes"는 0x4021)
- 동작: `sync1.js` `ToggleShowAllFiles` — 모든 탭의 `FV.ViewFlags`에서 `CDB2GVF_SHOWALLFILES`(0x1) 토글 후 Refresh, `te.Data.View_ViewFlags`(새 탭 기본값)도 함께 갱신
- 체크 표시: 현재 탭의 ViewFlags 기준 (MF_CHECKED)

## Init Defaults (초기값)
- `Debug/init/window.xml`: 전체 기본 설정 (탭, 뷰, 트리, 언어 등)
  - Tree: Align=3 (Left), Width=200, Style=33447
  - TabDefault=1, TreeDefault=1, ListDefault=1 (모든 탭에 적용)
  - Lang=ko
- `Debug/init/menus.xml`: 메뉴 기본값
  - File 메뉴 (Pos=0): 새 창, Close Application
  - Favorites: 다운로드, 바탕 화면, 내 PC

## Removed Addons
- clipboard: 삭제 (폴더 + addons.xml에서 제거)
- addfavorites, breadcrumbsaddressbar, favoritesbar: 이전 커밋에서 제거
