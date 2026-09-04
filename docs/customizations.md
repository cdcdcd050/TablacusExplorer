# Customizations (from upstream)

## UI
- 배경색: 흰색 (#ffffff)
- ToolBar3~4 사이 4px 패딩, ToolBar5~탭 사이 7px 패딩
- 주소바/검색바: padding-top/bottom 3px, border 1px solid #ccc
- 검색바 좌측 margin 5px (주소바와 간격)
- 주소바 좌측 padding-left 5px

## Favorites Bar (favbar)
- 설정 파일 `config\favbar.json`(추가 행·줄바꿈·폰트) — `favbar.json.tmp`에 쓴 뒤 `MoveFileEx(REPLACE_EXISTING)`로 교체(원자적). 파싱 실패 시 `favbar.json.broken`으로 이름을 바꿔 보존하고 기본값으로 시작, 사용자에게 한 번 알림 (v1.1.20). 이전엔 손상된 파일 위에 다음 저장이 빈 설정을 덮어썼음
- 창 두 개(별도 프로세스)가 각자 저장하면 나중 것이 덮어씀 — 알려진 한계
- Ctrl+W(탭 닫기, 마지막 탭이면 창 닫기)는 v1.1.20부터 `script/sync1.js`의 `KeyMessage` 핸들러 — favbar를 꺼도 동작. Ctrl+Shift+W·AltGr+W는 제외. `init/key.xml`의 `<List Key="Ctrl+W">Close tab</List>`(업스트림)과 겹치지만 KeyMessage가 `S_OK`를 돌려 먼저 처리
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
  - ⚠️ `NSTCECT_LBUTTON/MBUTTON/RBUTTON`(1/2/3)은 **2비트 열거값**이라 `Flags & NSTCECT_LBUTTON`은 우클릭(3)에도 참 → `(Flags & NSTCECT_BUTTON) == NSTCECT_LBUTTON`으로 비교. 확장 화살표·들여쓰기 영역 클릭은 `HitTest & NSTCEHT_ONITEM`으로 제외
  - 업스트림 `List` 옵션의 `SetGestureExec("Tree","1")` 핸들러와 같은 클릭에 둘 다 발화하므로 `Sync.TreeView.NavigateOnce`(같은 pidl 500ms 내 중복 무시)로 합침
- NSTCS_SINGLECLICKEXPAND 플래그 추가 (sync1.js 기본 Tree_Style)

## Startup Behavior
- 탭 복원 비활성화: InitWindow에서 LoadXml(g_.xmlWindow) 주석처리
- 기본 새 탭: shell:MyComputerFolder (내 PC)

## Split Pane Focus Styling
- 활성 패널: 회색 배경 (`#e0e0e0`, `.activecaption`)
- 비활성 패널: 흰색 배경 (`#fff`, `.inactivecaption`)
- `tabplus/script.js` `SetActiveColor`: 포커스 이동 시 이전 패널에 `inactivecaption` 적용
- TabPlus 기본 옵션 (`init/addons.xml`): `Active="1" New="1" Drive="1" Icon="1"`

## Reset Settings (설정 초기화, 도구 메뉴)
- `sync1.js` g_basic.Tools.Exec `"Reset settings"` → 확인(`confirmYN`) 후 `g_.bResetSettings = true`와 `WM_CLOSE`만 보냄
- 실제 삭제는 `FinalizeEx` 맨 끝의 `ResetSettings()` — `SaveConfig`·애드온 `Finalize` 핸들러(remember.xml 등)가 **모두 파일을 쓴 뒤**에 config 폴더를 지워야 함. 종료 전에 지우면 종료 경로가 메모리의 설정을 다시 써서 초기화가 되돌려짐 (v1.1.17 이전 버그)
- 보존: `te.Data.xmlMenus`의 `<Favorites>` 노드(`.xml`)를 `init/menus.xml`에 치환해 `config/menus.xml`로 저장, `favbar.json`(추가 즐겨찾기 행)도 그대로 복원
- 치환은 함수 replacement 사용 — 즐겨찾기 경로에 `$&` 같은 문자가 있으면 문자열 replacement가 깨짐
- 마지막에 `TE64.exe /open script\index.html`로 새 인스턴스 실행
- 다른 TE 창(별도 프로세스)이 떠 있으면 그 창이 종료 시 자기 설정을 다시 씀 — 알려진 한계

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
- `sync1.js` `ApplyDragMetrics`(InitWindow에서 호출)가 `api.SystemParametersInfo(SPI_SETDRAGWIDTH/HEIGHT, DRAG_THRESHOLD=10)`로 적용
- 세션 전역(다른 앱에도 적용) → `FinalizeEx`의 `RestoreDragMetrics`가 **마지막 TE 창이 닫힐 때** 원래 값으로 되돌림 (v1.1.20). 원래 값은 `GetSystemMetrics`가 아니라 레지스트리 `HKCU\Control Panel\Desktop\DragWidth/Height`에서 읽음 — 다른 TE 창이 이미 10을 적용해 둔 상태일 수 있기 때문. 다른 TE 창(별도 프로세스)이 `sha.Windows()`에 남아 있으면 복원하지 않음
- favbar/tabplus는 별도 로컬 10px 임계값 사용 (v1.1.8, `DragThreshold`/`IsDragT`)
- `sync.js`의 `IsDrag` 헬퍼도 같은 메트릭을 읽으므로 함께 10px이 됨

## 폴더 뷰 실시간 동기화 — SyncItems (v1.1.14)
브라우저 다운로드처럼 **파일이 쓰이는 중인 폴더**에서 셸 변경 알림이 불완전해 생기던 문제(임시파일 잔재, 크기 미갱신 → F5 필요)를 뷰↔디스크 대조로 해결. 원인 분석은 [troubleshooting.md](troubleshooting.md#해결됨-v1114-다운로드-임시파일이-남고-크기가-안-바뀜) 참조.

- **C++ `CteShellBrowser::SyncItems()`** (`TE.cpp`, 스크립트에서 `FV.SyncItems()`)
  - 현재 폴더를 `EnumObjects`로 열거해 뷰의 항목(`IFolderView::Item`)과 **파일명(대소문자 무시)** 으로 대조 — 비교는 `CompareStringOrdinal(…, TRUE)`(NTFS와 같은 ordinal 대소문자 무시, `std::map<…, teOrdinalNoCaseLess>`). `CharUpper`는 로케일 의존이라 서로 다른 두 파일명이 한 키로 접히면 삭제↔갱신이 1초마다 영원히 반복됨 (v1.1.18에서 교체)
  - 사전 스캔에서 같은 이름의 행이 둘이면(셸이 늦게 보낸 `CREATE`를 DefView가 믿고 중복 추가한 경우) 뒤의 행을 즉시 `RemoveObject`
  - 디스크에 없는 항목 → `IShellFolderView::RemoveObject`, 새 항목 → `AddObject`(`IncludeObject2` 필터 통과 시), 크기·수정시각·속성이 바뀐 항목 → `UpdateObject`(새 pidl로 교체되어 크기 열이 갱신됨)
  - 전체 Refresh와 달리 선택·포커스·스크롤 유지, 깜빡임 없음
  - 반환값: `S_OK` 변경 있음 / `S_FALSE` 변경 없음 / `E_FAIL` 항목 20,000개 초과(뷰 개수뿐 아니라 **디스크 열거 개수**도 셈 — 필터로 적게 보이는 거대 폴더 방지) 또는 한 패스가 1초 넘게 걸림 / `E_NOTIMPL` 로컬 디렉터리가 아님
  - 로컬 판정: 드라이브 문자 경로이고 `GetDriveType`이 FIXED·RAMDISK·REMOVABLE, 디렉터리에 `FILE_ATTRIBUTE_OFFLINE` 없음. UNC·URL·`\\?\`·CD-ROM은 제외. 정션이 네트워크를 가리키는 경우 등은 위 1초 비용 상한이 잡음
  - 열거가 끝까지 완료된 경우에만 "없어진 항목" 삭제. 이름 바꾸기 편집 중(`ListView_GetEditControl`)이면 아무것도 안 하고 `S_FALSE`(조용한 패스로 세어 폴링이 자연히 멈춤, 이름 변경 자체가 다시 깨움)
  - `IncludeObject2`는 스크립트(`OnIncludeObject`)를 부를 수 있어 그 안에서 탐색이 일어나면 `m_pSF2`가 해제됨 → 패스 동안 `m_pSF2`를 로컬로 AddRef하고, `m_pShellView`가 바뀌면 행을 건드리지 않고 중단
  - `UpdateObject`(크기·날짜 변경)는 정렬 기준이 크기·날짜·특성일 때만 재정렬(`IsSortByFindData`). 이름 정렬에서 다운로드 중 파일이 커질 때마다 재정렬하지 않음
  - 변경이 있으면 `TET_Status` 타이머로 상태 표시줄 갱신
- **트리거·폴링은 C++** — `MessageSFVCB`의 `SFVM_FSNOTIFY`(DefView가 자기 폴더의 변경 알림을 받는 콜백)에서 디스크 이벤트(`SHCNE_DISKEVENTS|SHCNE_ATTRIBUTES`)마다 `ScheduleSync(200)` → `teTimerProcSync`(`SetTimer(m_hwnd, &m_nSyncQuiet, …)`, `SBfromhwnd`로 복원)가 `SyncItems()` 실행
  - 변경이 발견되면(`S_OK`) **1초 간격으로 반복**, 변경 없음(`S_FALSE`) 3회 연속이면 중단, `E_*`면 즉시 중단. 간격은 `max(1000, 직전 패스 비용(ms)×10)` — 큰 폴더에서 UI 스레드의 10% 이상을 쓰지 않음
  - 트리거 이벤트는 `CREATE|MKDIR|DELETE|RMDIR|RENAMEITEM|RENAMEFOLDER|UPDATEITEM`만. 처음(v1.1.14~17)엔 `SHCNE_DISKEVENTS` 전체라 `UPDATEDIR`·`ATTRIBUTES`·미디어 이벤트(인덱서·백신이 계속 발생시킴)에도 모든 로컬 폴더에서 200ms+3×1s 전체 열거가 돌았음. `UPDATEITEM`은 브라우저 임시파일 이름 변경이 이것으로만 오기 때문에 유지. 이벤트 pidl의 자식 판정(`ILIsParent`)은 **하지 않음** — 별칭 탭에서는 pidl 형태가 달라 실패함
  - 셸은 쓰기 중인 파일에 대해 알림을 보내지 않으므로, 이 폴링이 다운로드 중 파일 크기를 1초 단위로 갱신하고 완료 시점의 이름 변경(임시→최종)도 1초 내 반영
  - ⚠️ JS `ChangeNotifyFV`의 `bChild`(`FV.FolderItem.Path` 비교)에 걸지 **않는다** — "내 PC > 다운로드"처럼 별칭 pidl(`::{20D04FE0-…}\::{374DE290-…}`)로 연 탭은 `FolderItem.Path`가 `C:\…\Downloads`가 아니라 **"다운로드"** 라서(`GetDisplayNameOf(FORADDRESSBAR|FORPARSING)`) 자식 판정이 실패한다. 즐겨찾기의 `shell:Downloads`가 바로 이 경우. `SFVM_FSNOTIFY`는 셸이 별칭까지 맞춰서 라우팅해 주므로 pidl 형태와 무관
- **상태 표시줄 합계** (`addons/sizestatus`) — `경로+필터+항목수` 해시로 캐시하므로 임시→최종 교체처럼 항목 수가 같으면 재계산을 건너뛰었음. `SyncItems`가 뷰를 바꿀 때마다 올라가는 읽기 전용 속성 `FV.SyncGen`(C++ `m_nSyncGen`)을 해시에 포함해 무효화
- **Chromium GUID 임시파일 숨김 (v1.1.15, 옵션 `Conf_HideDownloadTemp` 기본 켬)** — 옵션 → 목록 → 숨김 탭의 체크박스 "브라우저 다운로드 임시파일(GUID.tmp) 숨기기". 켜져 있으면 `sync1.js` `InitCode`가 `te.HiddenFilter`에 사용자 숨김 필터(`Conf_HiddenFilter`) 뒤에 `????????-????-????-????-????????????.tmp`를 덧붙인다(적용은 재시작 시). Whale/Edge/Chrome은 다운로드 대상이 정해지기 전(Safe Browsing 판정 대기, "다른 이름으로 저장" 대화상자 열린 동안)에 다운로드 폴더에 `<GUID>.tmp`를 만들었다가 이름을 바꾸는데, 이 행은 아무 정보도 없다. `IncludeObject2`는 DefView가 알림으로 항목을 추가할 때와 `SyncItems`의 추가 양쪽에 다 적용되므로 **잠깐도 안 보인다**. 이 단계엔 아무것도 안 보이지만, Whale은 대용량 전송 대부분을 그 다음 `미확인 N.crdownload` 단계에서 하므로 진행 크기는 거기서 보인다
  - `*.crdownload`까지 숨기고 싶으면 옵션 → 목록 → 숨김(`Conf_HiddenFilter`)에 `*.crdownload`를 넣으면 된다(그러면 완료될 때까지 아무것도 안 보임). 옵션 창의 텍스트에는 GUID 패턴이 보이지 않는다(코드에서 덧붙임)
- **새 항목 자동 재정렬 (v1.1.16, `ResortView`)** — 클래식 리스트뷰 DefView는 변경 알림으로 생긴 항목을 **목록 맨 끝에 덧붙이기만** 한다(최신 탐색기의 ItemsView는 정렬 위치에 삽입). `SFVM_FSNOTIFY`의 `CREATE|MKDIR|RENAME` 이벤트에서 `m_bSyncSort`를 세우고, 다음 `SyncItems` 패스가 추가/갱신을 반영한 뒤 `ResortView()`로 현재 정렬을 재적용해 새 파일이 정렬 위치로 들어간다. 스크롤 뷰포트는 그대로(위쪽 삽입 시 한 줄 밀림 — 기본 탐색기와 동일), 선택·포커스 유지
  - ⚠️ **`SetSortColumns`에 같은 정렬 열을 다시 넣으면 아무 일도 안 일어난다** — DefView가 정렬을 비동기로 적용하며 "바뀐 게 없으면" 생략. 심지어 연속 두 번 호출(A→B→A)도 두 번째가 낡은 현재값과 비교돼 무시된다(실측). 그래서 현재 정렬 뒤에 `System.Search.Rank` 열을 붙였다 뗐다 토글 — 일반 폴더에선 전 항목이 빈 값이라 순서 불변, 비교는 항상 불일치라 재정렬이 강제됨
  - 토글로 생긴 지저분한 정렬 상태는 150ms 타이머(`teTimerProcSortRestore`)가 원래 열로 되돌린다(그 시점엔 비동기 상태가 정착해 되돌리기가 적용되고, 순서 동일이라 화면 변화 없음). 타이머를 놓쳐도 다음 `ResortView`의 strip 분기가 정리 — `remember.xml`의 `SortColumns`에 Search.Rank가 새지 않음
  - 뷰 모드 판정은 창 스타일이 아니라 `GetCurrentViewMode`로 — **comctl32 v6는 뷰 모드를 `LVM_SETVIEW`로 바꿔서 `LVS_TYPEMASK` 스타일 비트가 세부 정보 뷰에서도 `LVS_ICON`(0)으로 남는다**. 세부 정보/목록은 항상 재정렬, 아이콘 계열은 `FWF_AUTOARRANGE`일 때만. `System.Null` 의사 정렬(첫 열이 `Search_Rank`)은 의도적 무정렬로 보고 건드리지 않음
- **알려진 잔여 현상**: 셸이 1~5초 지연으로 보낸 `CREATE`를 DefView가 그대로 믿고 이미 이름이 바뀐 임시 항목을 추가하는 일이 있음 → 다음 폴링(≤1초)에서 제거됨
- **타이머 수명 (v1.1.17)**: ExplorerBrowser 모드에서 `m_hwnd`는 호스트 창이라 탐색 후에도 살아 있음. 기존 `KillTimer(m_hwnd, (UINT_PTR)this)`는 새 타이머 두 개(`&m_nSyncQuiet`, `&m_nColRestore`)를 안 죽여서, 다운로드 중 폴더에서 뒤로 가기를 누르면 150ms 뒤 복원 타이머가 **이전 폴더의 정렬 열을 새 폴더에 적용**하고 폴링도 새 폴더에서 이어졌음. `KillSyncTimers()`를 `BrowseObject`·`DestroyView`에서 호출해 두 타이머와 `m_bSyncSort`를 함께 정리

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
