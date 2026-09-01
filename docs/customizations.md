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
- 우클릭 메뉴: 항목 위 + 빈 영역 모두 지원
  - 빈 영역은 `td.oncontextmenu`(메인) / `tdCenter.oncontextmenu`(추가 행)에서 `Popup(ev, items.length)` 호출 → 맨 뒤에 삽입
  - 이 경우 편집/삭제 항목은 숨김 (`bAppend`), 구분선 추가·줄바꿈·폰트·행 삭제는 표시
  - 항목/구분선 위 클릭은 인라인 핸들러가 처리 → `_findItemEl()`로 걸러 중복 팝업 방지

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
- 종료 시 유지: `ToggleShowAllFiles` 마지막에 `te.Data.bSaveConfig = true` 설정 → `Finalize`→`SaveConfig`→`SaveConfigXML`이 `View_ViewFlags`를 `config\window.xml`에 저장, 재실행 시 `LoadConfig`가 복원 (v1.1.12)

## Drag Threshold (드래그 시작 거리)
- 파일 뷰(셸 뷰) 드래그는 시스템 메트릭 `SM_CXDRAG/SM_CYDRAG`(기본 4px)를 따름 — 뷰 내부 처리라 개별 후킹 불가
- `sync1.js` `InitWindow`에서 `api.SystemParametersInfo(SPI_SETDRAGWIDTH/HEIGHT, 10, 0, 0)`로 10px 적용
- 세션 전역(다른 앱에도 적용), 로그오프 시 레지스트리 기본값으로 리셋 → TE 시작 시마다 재적용
- favbar/tabplus는 별도 로컬 10px 임계값 사용 (v1.1.8, `DragThreshold`/`IsDragT`)
- `sync.js`의 `IsDrag` 헬퍼도 같은 메트릭을 읽으므로 함께 10px이 됨

## 폴더 뷰 실시간 동기화 — SyncItems (v1.1.14)
브라우저 다운로드처럼 **파일이 쓰이는 중인 폴더**에서 셸 변경 알림이 불완전해 생기던 문제(임시파일 잔재, 크기 미갱신 → F5 필요)를 뷰↔디스크 대조로 해결. 원인 분석은 [troubleshooting.md](troubleshooting.md#해결됨-v1114-다운로드-임시파일이-남고-크기가-안-바뀜) 참조.

- **C++ `CteShellBrowser::SyncItems()`** (`TE.cpp`, 스크립트에서 `FV.SyncItems()`)
  - 현재 폴더를 `EnumObjects`로 열거해 뷰의 항목(`IFolderView::Item`)과 **파일명(대소문자 무시)** 으로 대조
  - 디스크에 없는 항목 → `IShellFolderView::RemoveObject`, 새 항목 → `AddObject`(`IncludeObject2` 필터 통과 시), 크기·수정시각·속성이 바뀐 항목 → `UpdateObject`(새 pidl로 교체되어 크기 열이 갱신됨)
  - 전체 Refresh와 달리 선택·포커스·스크롤 유지, 깜빡임 없음
  - 반환값: `S_OK` 변경 있음 / `S_FALSE` 변경 없음 / `E_FAIL` 항목 20,000개 초과 / `E_NOTIMPL` 로컬 디렉터리가 아님(가상 폴더·네트워크·검색 결과 제외)
  - 열거가 끝까지 완료된 경우에만 "없어진 항목" 삭제. 이름 바꾸기 편집 중(`ListView_GetEditControl`)이면 아무것도 안 하고 `S_OK`(다음 폴링에서 재시도)
  - 변경이 있으면 `TET_Status` 타이머로 상태 표시줄 갱신
- **JS `SyncItemsFV(FV)`** (`sync1.js`) — `ChangeNotifyFV`에서 현재 폴더의 **자식** 이벤트(`bChild`)마다 호출
  - 200ms 뒤 1회 실행 → 변경이 발견되면(`S_OK`) **1초 간격으로 반복**, 변경 없음(`S_FALSE`) 3회 연속이면 중단
  - 셸은 쓰기 중인 파일에 대해 알림을 보내지 않으므로, 이 폴링이 다운로드 중 파일 크기를 1초 단위로 갱신하고 완료 시점의 이름 변경(임시→최종)도 1초 내 반영
- **상태 표시줄 합계** (`addons/sizestatus`) — `경로+필터+항목수` 해시로 캐시하므로 임시→최종 교체처럼 항목 수가 같으면 재계산을 건너뛰었음. 동기화로 뷰가 바뀔 때마다 `FV.Data.SyncGen`을 +1 하고 이를 해시에 포함해 무효화
- **의도적으로 안 한 것**: 임시파일(`*.tmp`, `*.crdownload`) 자체를 숨기지 않음 — 숨기면 진행 중 크기를 볼 수 없다. 숨기고 싶으면 옵션의 숨김 필터(`Conf_HiddenFilter`, 예: `*.crdownload;*.tmp`)를 쓰면 된다
- **알려진 잔여 현상**: 셸이 1~5초 지연으로 보낸 `CREATE`를 DefView가 그대로 믿고 이미 이름이 바뀐 임시 항목을 추가하는 일이 있음 → 다음 폴링(≤1초)에서 제거됨

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
