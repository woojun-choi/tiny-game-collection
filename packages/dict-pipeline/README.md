# dict-pipeline

국립국어원 사전 데이터를 게임용 사전 파일로 가공하는 빌드 스크립트 (ㄱㅅ, 천지인 공용).

- 원본 데이터는 `raw/`에 직접 내려받아 둔다. 저장소에는 올리지 않는다(`.gitignore`).
- 결과물은 각 게임의 `public/dict/`에 생성하고 커밋한다. 배포 환경에는 원본 데이터가 없으므로 Vercel 빌드에서는 이 스크립트를 실행하지 않는다.
  - ㄱㅅ: `games/chosung/public/dict/index.json`, `games/chosung/public/dict/<초성쌍>.json`
  - 천지인: `games/cheonjiin/public/dict/` (전체 단어 목록 + 판 생성용 상용어 목록)
