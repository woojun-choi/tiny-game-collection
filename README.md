# 초미니게임천국 (Tiny Game Heaven)

한글과 한국어 감성을 살린 작고 가벼운 웹 미니게임 모음. 설치나 가입 없이 브라우저에서 바로 플레이할 수 있다.

## 게임 라인업

| #   | 게임         | 한 줄 소개                                            | 주소                    |
| --- | ------------ | ----------------------------------------------------- | ----------------------- |
| 1   | 반갈죽       | 드래그로 물체를 정확히 반으로 가르는 정밀 게임        | bangaljuk.uzun-choi.com |
| 2   | ㄱㅅ         | 초성 두 글자에 맞는 단어를 계속 입력하는 생존 게임    | chosung.uzun-choi.com   |
| 3   | 천지인       | 키캡 글자를 드래그로 묶어 단어를 만드는 퍼즐          | cheonjiin.uzun-choi.com |
| 4   | 열공타자연습 | 내 자료로 암기 타자 연습과 빈칸 문제를 푸는 학습 도구 | yeolgong.uzun-choi.com  |

## 공통 원칙

- **서버 없음:** 모두 정적 사이트. 데이터는 브라우저(localStorage / IndexedDB)에만 저장한다.
- **플랫폼:** 모바일과 PC 모두 지원(반응형, 터치와 마우스). 열공타자연습은 PC 키보드 우선.
- **바로 플레이:** 튜토리얼 화면과 가입 없이 첫 화면에서 바로 시작.
- **공유:** Web Share API로 결과 공유, 미지원 환경에서는 클립보드 복사.
- **접근성:** `prefers-reduced-motion` 지원. 상태 변화는 색만이 아니라 텍스트나 모양으로도 알린다.

## 기술 스택

- Vite + TypeScript
- 렌더링: Canvas(반갈죽), DOM(나머지)
- 입력: Pointer Events, 한글 IME 조합 처리
- 사전 데이터: 국립국어원 사전 데이터를 빌드 시점에 가공 (ㄱㅅ, 천지인 공용)

## 저장소 구조

```
├── prds/                 # 게임별 기획서
├── games/
│   ├── bangaljuk/
│   ├── chosung/
│   ├── cheonjiin/
│   └── yeolgong/
└── packages/
    ├── hangul/           # 자모 분해/조합, 초성 추출 등 공용 유틸
    ├── dict-pipeline/    # 사전 데이터 가공 스크립트
    └── ui/               # 공용 컴포넌트
```

## 개발

Node 22.12 이상(`.nvmrc`: 24), npm workspaces를 쓴다.

```sh
npm install              # 루트에서 한 번
npm run dev:bangaljuk    # 게임 개발 서버
npm test                 # 전체 테스트 (Vitest)
npm run typecheck        # 전체 타입 검사
npm run build            # 전체 빌드
npm run format           # Prettier
```

- 게임은 `games/<이름>/`마다 독립된 Vite 앱이다. 공용 코드는 `@tgh/hangul`, `@tgh/ui`처럼 `packages/`에서 가져온다.
- 공용 패키지는 빌드 없이 TypeScript 소스를 그대로 내보내고, 각 게임의 Vite가 함께 번들한다.
- 게임마다 별도로 배포한다. 각 게임의 `vercel.json`은 해당 게임이나 공용 코드가 바뀌지 않았으면 빌드를 건너뛴다.
- 사전 데이터 처리 방식은 [`packages/dict-pipeline`](packages/dict-pipeline/README.md) 참고.

## 문서

- 게임별 기획서(영문): [`prds/`](prds/)
