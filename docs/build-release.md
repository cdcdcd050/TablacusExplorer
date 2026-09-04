# Build & Release

## Release Checklist
릴리즈 시 반드시 아래 순서를 따를 것:

1. **버전 업데이트** — 아래 2곳 수정
   - `Debug/script/consts.js` → `FORK_VERSION`
   - `installer.iss` → 맨 위 `#define MyAppVersion` (AppVersion·OutputBaseFilename·VersionInfoVersion이 여기서 파생)
2. **커밋 & 푸시** — 버전 변경 포함하여 master에 push
3. **인스톨러 빌드** — Inno Setup으로 Setup.exe 생성
4. **GitHub Release 생성** — `gh api`로 릴리즈 생성
5. **인스톨러 업로드** — Setup.exe를 릴리즈 asset으로 첨부

> **주의**: 인스톨러 없는 릴리즈는 불완전함. 반드시 Setup.exe를 첨부할 것.

## Version Bump
버전 변경 시 수정 필요한 파일:
- `Debug/script/consts.js` — `FORK_VERSION`
- `installer.iss` — `#define MyAppVersion`

## C++ (te64.dll) 빌드
`TE\*.cpp`를 고쳤으면 `Debug\lib\te64.dll`을 다시 빌드해서 **함께 커밋**한다(exe `TE64.exe`는 이 dll을 로드하는 얇은 로더라 보통 다시 빌드할 필요 없음).
```powershell
& 'C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe' TE.sln /p:Configuration=Release /p:Platform=x64 /m /v:m
```
- 반드시 **`TE.sln`으로** 빌드할 것 — `TE\TE.vcxproj`를 직접 주면 `$(SolutionDir)`가 `TE\`로 잡혀 산출물이 `TE\Debug\lib\`에 떨어진다
- 빌드 전에 `Debug\TE64.exe`로 띄운 테스트 인스턴스를 닫을 것(dll 잠김). 설치본(`C:\Program Files\Tablacus Explorer`)은 별개 파일이라 영향 없음
- 32비트(`te32.dll`)는 포크에서 빌드하지 않는다(원본 그대로) — 인스톨러에는 들어가지만 포크 기능이 없음

## Installer (Inno Setup)
- 파일: `installer.iss`
- 빌드: `& "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe" /Q installer.iss` (PowerShell에서. Git Bash는 `/Q`를 경로로 바꿔 버림)
- 출력: `Output/TablacusExplorer-Fork-vX.Y.Z-Setup.exe`
- `AppId=Tablacus Explorer (Fork)`로 고정 — 지금까지 AppName에서 암묵적으로 파생되던 값과 같아 기존 설치본 위에 그대로 업그레이드됨. AppName을 바꿔도 제어판 항목이 둘로 갈라지지 않음
- `CloseApplications=yes` + `CloseApplicationsFilter`를 TE 바이너리만으로 제한 — 실행 중인 TE는 Restart Manager로 닫히고(`WM_CLOSE` → 설정 저장), 사일런트 설치 뒤 `skipifnotsilent` `[Run]` 항목이 `runasoriginaluser`로 다시 띄움. **훅 DLL은 필터에서 빼야 함** — 그 DLL은 `ShellExecute`를 호출한 모든 프로세스(브라우저 포함)에 로드되므로 필터에 들어가면 Setup이 사용자의 브라우저를 닫아 버림
- 훅 DLL은 `Check: HookDllChanged`(SHA1 비교)일 때만 복사, `restartreplace uninsrestartdelete` — 평소엔 브라우저가 잠고 있어 무조건 덮어쓰면 실패
- explorer.exe 재시작은 `Check: NeedExplorerRestart`(훅 미등록 또는 DLL 변경)일 때만 — shell32가 프로세스별로 훅 목록을 캐시하므로 첫 등록 때만 필요. 단순 버전 업그레이드는 사용자의 탐색기 창을 건드리지 않음
- 설치 후 TE 실행은 `runasoriginaluser` — 없으면 관리자 권한으로 뜸(드래그 앤 드롭 불가 등)
- `InitializeSetup`에서 승격 계정과 로그인 사용자를 비교(`ExecAsOriginalUser`로 `%USERNAME%` 확인) — 다르면 중단. 통합 키가 전부 HKCU라 다른 관리자 계정으로 UAC 승인하면 그 계정 하이브에 써져 아무것도 동작하지 않기 때문
- HKLM 대신 HKCU를 쓰는 이유: `HKLM\...\Folder\shell\open\command`에는 `DelegateExecute`가 있어 command 값을 덮어써도 무시됨. HKCU 오버레이 키가 유일한 깔끔한 방법이고, 훅 DLL도 `ExePath`를 HKCU에서 읽음
- 언인스톨: `regsvr32 /u` 후 DLL이 다른 프로세스에 로드돼 있으면 재부팅 시 삭제(`uninsrestartdelete`), 대화형이면 안내 메시지. explorer는 죽이지 않음(언인스톨러엔 `runasoriginaluser`가 없어 승격된 explorer를 띄우게 됨)
- 검증(v1.1.19): v1.1.16 위 사일런트 업그레이드 → TE 비승격 재실행, explorer PID 유지. 사일런트 언인스톨 → HKCU 클래스 키·Run·Tablacus 키·CLSID 모두 제거(다른 앱의 shell 동사는 보존). 사일런트 신규 설치 → explorer 재시작(비승격), 훅 등록

### Installer Tasks
- `desktopicon`: 바탕화면 바로가기 (선택)
- `replaceexplorer`: Windows 탐색기 대체 통합 (기본 체크)
  - Folder/Directory/Drive `shell\open\command` 등록
  - shellexecutehook DLL 등록 + explorer.exe 재시작
  - `HKCU\...\Run`에 시작프로그램 등록
  - **중요**: openinstead 상시 동작을 위해 시작프로그램 등록이 필수

### Inno Setup 주의사항
- `[Tasks]`의 `checked` 플래그는 존재하지 않음 — Tasks는 기본 체크 상태
- `checkablealone`과 `checked`는 같이 쓸 수 없음
- 기본 체크 해제하려면 `unchecked` 플래그 사용

## Portable
- `Debug/` 폴더 복사 후 `config/` 삭제 (사용자 설정 제거, `init/` 기본값 유지)
- 업데이트 확인 시 `unins000.exe`가 없으면 포터블로 판정 → 릴리즈 페이지만 열어 줌(인스톨러를 받으면 Program Files에 두 번째 복사본이 생기므로)
- 압축: `TablacusExplorer-Fork-vX.Y.Z-Portable.zip`

PowerShell 빌드:
```bash
rm -rf /tmp/tablacus-portable && cp -r Debug /tmp/tablacus-portable && rm -rf /tmp/tablacus-portable/config
powershell -Command "Compress-Archive -Path 'C:\...\tablacus-portable\*' -DestinationPath 'Output\TablacusExplorer-Fork-vX.Y.Z-Portable.zip' -Force"
```

## Release Assets
1. `TablacusExplorer-Fork-vX.Y.Z-Setup.exe` — 인스톨러
2. `TablacusExplorer-Fork-vX.Y.Z-Portable.zip` — 포터블

## GitHub Release
- `gh release create`가 workflow 파일(codeql-analysis.yml) 때문에 실패함
- 대신 `gh api`로 직접 릴리즈 생성:

```bash
gh api repos/cdcdcd050/TablacusExplorer/releases -X POST \
  -f tag_name=vX.Y.Z \
  -f target_commitish=master \
  -f name="vX.Y.Z title" \
  -f body="description"
```

Asset 업로드:
```bash
RELEASE_ID=<릴리즈ID>
curl -s -X POST \
  -H "Authorization: token $(gh auth token)" \
  -H "Content-Type: application/octet-stream" \
  "https://uploads.github.com/repos/cdcdcd050/TablacusExplorer/releases/${RELEASE_ID}/assets?name=파일명" \
  --data-binary @"파일경로"
```
