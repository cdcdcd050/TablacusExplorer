# Build & Release

## Release Checklist
릴리즈 시 반드시 아래 순서를 따를 것:

1. **버전 업데이트** — 아래 3곳 모두 수정
   - `Debug/script/consts.js` → `FORK_VERSION`
   - `installer.iss` → `AppVersion`, `OutputBaseFilename`
2. **커밋 & 푸시** — 버전 변경 포함하여 master에 push
3. **인스톨러 빌드** — Inno Setup으로 Setup.exe 생성
4. **GitHub Release 생성** — `gh api`로 릴리즈 생성
5. **인스톨러 업로드** — Setup.exe를 릴리즈 asset으로 첨부

> **주의**: 인스톨러 없는 릴리즈는 불완전함. 반드시 Setup.exe를 첨부할 것.

## Version Bump
버전 변경 시 수정 필요한 파일:
- `Debug/script/consts.js` — `FORK_VERSION`
- `installer.iss` — `AppVersion`, `OutputBaseFilename`

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
- 빌드: `"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss`
- 출력: `Output/TablacusExplorer-Fork-vX.Y.Z-Setup.exe`

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
