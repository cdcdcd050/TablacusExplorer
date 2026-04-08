# Tablacus Explorer (Fork)

[원본 Tablacus Explorer](https://github.com/tablacus/TablacusExplorer) 기반 커스텀 포크.

## 주요 변경사항

### UI
- 배경색 흰색, ToolBar 패딩 조정
- 주소바/검색바 스타일 개선
- 제목바에 포크 버전 표시

### 즐겨찾기바
- 드래그 앤 드롭 재정렬, 위치 표시
- 구분선 지원 (Black/Red)
- InputDialog 기반 이름 편집
- 컨텍스트 메뉴 (줄바꿈 토글, 삭제 확인)

### 검색바
- 돋보기 아이콘, 동적 Placeholder

### 트리뷰
- 싱글클릭 폴더 이동

### 탭
- Ctrl+W 탭 닫기
- 즐겨찾기바 클릭 시 기존 탭 전환

### Explorer 대체
- **openinstead** 애드온 (기본 활성화)
- **shellexecutehook** 애드온 (레지스트리 설정 필요)

### 제거 항목
- 애드온: clipboard, addfavorites, breadcrumbsaddressbar, favoritesbar, download
- Help 메뉴: 업데이트 확인, 애드온 다운로드

## 실행

`Debug/TE64.exe` 실행 (포터블, 설치 불필요)

## 빌드

```
MSBuild TE.sln -p:Configuration=Release -p:Platform=x64
```

출력: `Debug/lib/te64.dll`

## 라이선스

MIT License - Copyright (c) 2011 Gaku (원본), Fork by cdcdcd050
