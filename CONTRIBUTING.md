# 커밋 메시지 규칙

[Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/) 형식을 따른다.

```
type(scope): 요약

본문 (선택)
```

- **type, scope는 영어**, 요약과 본문은 **한국어**로 쓴다.
- 요약은 50자 안팎, 마침표 없이 "~추가", "~수정"처럼 명사형으로 끝낸다.
- 본문에는 무엇을 했는지보다 **왜** 했는지를 쓴다.

## type

| type       | 용도                                    |
| ---------- | --------------------------------------- |
| `feat`     | 기능 추가                               |
| `fix`      | 버그 수정                               |
| `refactor` | 동작 변화 없는 코드 개선                |
| `style`    | 비주얼/CSS 변경 (코드 포맷팅은 `chore`) |
| `test`     | 테스트 추가·수정                        |
| `docs`     | 문서 (README, PRD 등)                   |
| `chore`    | 설정, 의존성, CI, 포맷팅 등 그 외 잡무  |
| `perf`     | 성능 개선                               |

## scope

| scope                                           | 대상                               |
| ----------------------------------------------- | ---------------------------------- |
| `bangaljuk`, `chosung`, `cheonjiin`, `yeolgong` | `games/` 아래 각 게임              |
| `hangul`, `ui`, `dict`                          | `packages/` 아래 공용 패키지       |
| `prds`                                          | 기획서                             |
| `repo`                                          | 루트 설정, CI, 여러 곳에 걸친 변경 |

여러 게임에 걸친 변경은 가능하면 게임별로 커밋을 나누고, 나누기 어려우면 `repo`를 쓴다.

## 예시

```
feat(bangaljuk): 드래그 컷 판정 추가
fix(chosung): 조합 중 Enter 입력 무시
test(hangul): 초성 추출 경계값 테스트 추가
docs(prds): 천지인 콤보 배율 단계 정리
chore(repo): CI 워크플로 추가
```
