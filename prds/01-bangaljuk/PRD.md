# PRD — 반갈죽 (Bangaljuk)

> Mini-game #1 of the 초미니게임천국 (Tiny Game Heaven) series
> Status: Draft v0.1 · Last updated: 2026-11-04

| Item | Value |
|---|---|
| Working title | 반갈죽 (Bangaljuk, "cut it right in half") |
| URL | `bangaljuk.uzun-choi.com` |
| Platforms | Mobile web + desktop web (responsive, touch + mouse) |
| UI language | Korean |
| Session length | ~1–2 min (5 rounds, no timer) |
| Backend | None (static site, localStorage only) |

---

## 1. Overview

Bangaljuk is a one-gesture precision game. Each round shows an object, and the player drags a single straight line across it to cut it into two pieces. The game measures how close the two pieces are to an exact 50:50 split and grades the cut. Five rounds make one game, and the final result can be shared.

### 1.1 Goals
- Ship a small, polished game with satisfying interaction and visual craft.
- Be playable in under 10 seconds from landing: no tutorial screen, no sign-up.
- Be shareable: a result someone wants to paste into a group chat.

### 1.2 Non-goals (v1)
- Online leaderboard, accounts, or any server.
- Daily challenge or seeded puzzles (candidate for v2).
- Multi-cut rounds (cutting into 3+ pieces).

---

## 2. Core Gameplay

### 2.1 Core loop
1. A round starts and an object drops into the center of the play area.
2. The player presses, drags, and releases to draw a straight cut line.
3. The object splits along the line, and the two pieces slide apart.
4. The split ratio (for example `48.3 : 51.7`) and a grade (S/A/B/C) appear with a comic reaction.
5. The player taps to go to the next round. After round 5, the result screen appears.

### 2.2 Cut rules
- The cut is the straight line through the press point and the release point, extended across the whole play area.
- The object's area is divided by **which side of the line** it falls on. If a concave shape breaks into several fragments, all fragments on the same side count as one piece.
- **Invalid cut:** if the line doesn't intersect the object, or one side has less than 1% of the area, the round isn't consumed. Show a miss reaction (e.g., "허공을 갈랐다!") and let the player try again.
- **Minimum drag length:** 24 px. Anything shorter is treated as a tap and ignored.
- While dragging, show a dashed preview line extended across the play area. There is no live percentage preview, because that would remove the challenge.

### 2.3 Round types
Each round picks one type at random. A single game should contain at least 2 different types.

| Type | What's on screen | What's measured |
|---|---|---|
| **Shape** | Geometric or irregular shape: circle, star, heart, blob, L-shape, etc. | Area on each side of the line |
| **Stick** | A bar, baguette, or chocolate stick (long thin object) | Area on each side, which is effectively length |
| **Food** | Cute illustrated food: cake, pizza, sandwich, watermelon, sushi roll | Area on each side, based on the illustration's silhouette |

All types use the same drag-to-cut input and the same area-ratio measurement. They differ in art and in how hard the shape is to judge by eye.

### 2.4 Difficulty
Each round gets a random difficulty: Easy, Normal, or Hard. It's shown as a small badge (쉬움/보통/어려움).

| Factor | Easy | Normal | Hard |
|---|---|---|---|
| Symmetry | Symmetric, axis-aligned | Mild asymmetry | Strongly asymmetric or concave |
| Rotation | 0° | ±20° | Any angle |
| Size | Large | Medium | Small or very elongated |

Difficulty affects only the visuals. Grading thresholds are the same at every difficulty.

---

## 3. Scoring

### 3.1 Round grade
`error = |smallerPiece% − 50|`, in percentage points.

| Grade | Error | Example ratio | Reaction copy (examples) |
|---|---|---|---|
| **S** | ≤ 1.0 | 49.4 : 50.6 | "완벽한 반갈죽!", "자로 잰 줄" |
| **A** | ≤ 3.0 | 47.8 : 52.2 | "거의 장인", "오 좀 치는데?" |
| **B** | ≤ 7.0 | 44.5 : 55.5 | "형이 더 먹는다", "애매~하다" |
| **C** | > 7.0 | 38 : 62 | "이건 싸움 난다", "칼 처음 잡아봄?" |

Show the ratio with one decimal place, and always put the smaller piece first.

### 3.2 Final result
- **Final score** = average error across the 5 rounds, e.g. `평균 오차 2.4%`. Lower is better.
- **Overall grade** comes from the average error, using the same thresholds.
- Show all five round grades in a row (e.g. `S A B S A`).
- **Best record** is the lowest average error, stored in `localStorage` (`bangaljuk.best`). When the player beats it, show "신기록!".

---

## 4. Sharing

- A "결과 공유" button on the result screen.
  - On mobile, use the Web Share API when it's available.
  - Otherwise, copy to the clipboard and show a "복사됨" toast.
- Share text format:
  ```
  반갈죽 🔪 평균 오차 2.4% (A)
  🟩🟨🟩🟧🟨
  bangaljuk.uzun-choi.com
  ```
  Emoji per grade: S 🟩 · A 🟨 · B 🟧 · C 🟥
- Nice-to-have (v1.1): an Open Graph preview image for the URL.

---

## 5. Screens & Flow

```
[Title] --tap 시작--> [Round 1..5] --after round 5--> [Result] --다시하기--> [Round 1]
                                                          \--공유--> share sheet / clipboard
```

### 5.1 Title
- Logo "반갈죽" with an idle animation (a knife wobbling, or a cake bouncing).
- "시작" button and the best record (if one exists).
- One-line hint: "드래그해서 정확히 반으로 갈라보세요".
- A small link back to the portfolio (`uzun-choi.com`).

### 5.2 Round
- Top: round counter `3 / 5` and a difficulty badge.
- Center: the object.
- After the cut: split animation, ratio, grade stamp, reaction line, and a "다음" button. Tapping anywhere also advances.

### 5.3 Result
- Overall grade (large stamp), average error, the five round grades, and the best record.
- "다시하기", "결과 공유", and "포트폴리오로" buttons.

---

## 6. Visual & Audio Direction

- **Tone:** cute and comic. Rounded shapes, thick outlines, pastel palette with one punchy accent color, and a chunky rounded Korean font (e.g. Jua or Do Hyeon).
- **Cut feedback:** a white slash streak along the line, a brief screen shake, then the pieces slide and tilt apart. Food pieces can show a cross-section (cake layers, pizza cheese strings).
- **Grade stamp:** pops in with a squash-and-stretch effect. S also gets a confetti burst.
- **Sound (optional, muted by default on first load):** a slice "swish", a stamp "thunk", and a fanfare for S. Include a mute toggle.
- Respect `prefers-reduced-motion`: no shake or confetti, shorter tweens.

---

## 7. Technical Notes

- **Stack:** Vite + TypeScript, rendered on a single `<canvas>`. No game engine is needed.
- **Input:** Pointer Events, so one code path handles mouse, touch, and pen. Set `touch-action: none` on the canvas to block scroll and zoom while dragging.
- **Area measurement (recommended): pixel counting.**
  1. Render the object's silhouette to an offscreen canvas at a fixed resolution (e.g. 512×512).
  2. For each opaque pixel, take the sign of the cross product with the cut line, and count pixels per side.
  3. This handles concave shapes, holes, and illustrations without polygon math. Accuracy is about ±0.1% at 512², which is plenty for 1-decimal display.
  - Alternative: represent objects as polygons and clip with a half-plane (Sutherland–Hodgman). This is exact, but harder for curved illustrations.
- **Splitting visuals:** draw the object twice, each clipped to one side of the line with canvas `clip()`, then animate each half's transform.
- **Responsiveness:** a square play area of `min(90vw, 70vh)`, with `devicePixelRatio` scaling for crisp rendering.
- **Performance target:** 60 fps on mid-range phones, and the initial bundle under 300 KB gzipped (excluding fonts).

---

## 8. Content Requirements (v1)

| Type | Minimum count | Examples |
|---|---|---|
| Shape | 8 | circle, star, heart, triangle, blob, L-shape, crescent, cross |
| Stick | 4 | baguette, chocolate stick, pencil, sausage |
| Food | 6 | round cake, pizza, sandwich, watermelon slice, sushi roll, donut |

Each object needs a silhouette mask (used for measurement) and a display art layer. They can be the same asset for simple shapes.

---

## 9. Acceptance Criteria

- [ ] A full game (title → 5 rounds → result) works with mouse on desktop and touch on iOS Safari and Android Chrome.
- [ ] A cut that misses the object doesn't consume a round.
- [ ] A cut exactly through the center of a symmetric shape reads 50.0 : 50.0 (±0.2).
- [ ] Grades match the thresholds in §3.1.
- [ ] The best record persists across reloads, and "신기록!" appears only when it improves.
- [ ] Sharing works through the Web Share API on mobile and the clipboard on desktop.
- [ ] The page doesn't scroll or zoom while cutting on mobile.

---

## 10. Open Questions / Future Ideas

- Daily challenge mode: the same 5 objects for everyone each day, which makes shared results comparable.
- "Ruler mode" unlock after an S-rank game: harder, smaller objects.
- An OG image generated per result.
- Should the subdomain be `bangaljuk` (current choice) or something shorter like `half`?
