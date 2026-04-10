# Build & Release

## Version Bump
버전 변경 시 수정 필요한 파일:
- `Debug/script/consts.js` — `FORK_VERSION`
- `installer.iss` — `AppVersion`, `OutputBaseFilename`

## Installer (Inno Setup)
- 파일: `installer.iss`
- 빌드: `"C:\Users\CH00\AppData\Local\Programs\Inno Setup 6\ISCC.exe" installer.iss`
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
