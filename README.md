# Tablacus Explorer (Fork)

[원본 Tablacus Explorer](https://github.com/tablacus/TablacusExplorer) 기반 커스텀 포크.

## 핵심 기능: 즐겨찾기바

이 포크의 핵심은 **강화된 즐겨찾기바**입니다.

- 드래그 앤 드롭 재정렬 (파란색 위치 표시)
- 구분선 지원 (Black 1px / Red 2px)
- InputDialog 기반 이름 편집
- 컨텍스트 메뉴 (줄바꿈 토글, 삭제 확인)
- 클릭 시 동일 경로 탭이 있으면 전환 (중복 탭 방지)
- 폰트 크기 조절 (우클릭 메뉴, 영구 저장)

## 기타 변경사항

### UI
- 배경색 흰색, ToolBar 패딩 조정
- 주소바/검색바 스타일 개선
- 제목바에 포크 버전 표시

### 검색바
- 돋보기 아이콘, 동적 Placeholder ("{폴더명} 검색")

### 트리뷰
- 싱글클릭 폴더 이동

### 탭
- Ctrl+W 탭 닫기

### Explorer 대체
- **openinstead** 애드온 (기본 활성화)
- **shellexecutehook** 애드온 (레지스트리 설정 필요)

### 제거 항목
- 애드온: clipboard, addfavorites, breadcrumbsaddressbar, favoritesbar, download
- Help 메뉴: 애드온 다운로드
- About 다이얼로그: 업데이트 확인 버튼

## 설치 및 실행

- **인스톨러**: `TablacusExplorer-Fork-vX.Y.Z-Setup.exe` 실행 (Program Files에 설치)
- **포터블**: `TablacusExplorer-Fork-vX.Y.Z-Portable.zip` 압축 해제 후 `TE64.exe` 실행

[Releases](https://github.com/cdcdcd050/TablacusExplorer/releases)에서 다운로드.

## 업데이트

메뉴 → 도움말 → 업데이트 확인 시 자동으로 최신 Setup.exe를 다운로드 및 실행.

## 빌드

```
MSBuild TE.sln -p:Configuration=Release -p:Platform=x64
```

출력: `Debug/lib/te64.dll`

## 라이선스

MIT License - Copyright (c) 2011 Gaku (원본), Fork by cdcdcd050
