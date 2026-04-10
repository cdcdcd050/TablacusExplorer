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

## Inno Setup 빌드 실패
- `Flags: checked` → `checked`는 Tasks에 없는 플래그. 기본 체크는 플래그 없이 두면 됨
- `Flags: checkablealone checked` → 두 플래그 동시 사용 불가
- `gh release create` 실패 → workflow 파일 권한 문제. `gh api`로 직접 호출
