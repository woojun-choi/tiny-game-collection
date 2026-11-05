# PRD — 천지인 (Cheonjiin)

> Mini-game #3 of the 초미니게임천국 (Tiny Game Heaven) series (working name in planning: "자모 사과게임")
> Status: Draft v0.1 · Last updated: 2026-11-04

| Item | Value |
|---|---|
| Title | 천지인 (Cheonjiin). The name has two meanings: the heaven-earth-human (·, ㅡ, ㅣ) principle behind Hangul vowels, and the classic 천지인 phone keypad. Both fit the Hangul keyboard concept. |
| URL | `cheonjiin.uzun-choi.com` |
| Platforms | Mobile web + desktop web (responsive, touch + mouse) |
| UI language | Korean |
| Session length | 2 minutes (fixed timer) |
| Backend | None (static site, bundled dictionary, localStorage only) |

---

## 1. Overview

A grid of keycap tiles fills the screen. Each tile shows one Hangul syllable. The player drags a rectangle over tiles. If the selected syllables, read in order, spell a real dictionary word (2–4 syllables, e.g. 사 + 과 → **사과**), those keys pop out and disappear. The player has 2 minutes to clear as many keys as possible.

This is an original take on the drag-a-rectangle grid genre. The win condition is spelling a real Korean word, and the look is a Hangul keyboard. It doesn't reuse any existing game's name, art, or layout.

### 1.1 Goals
- A satisfying "find the hidden words" puzzle that rewards Korean vocabulary and spatial planning.
- A distinctive keycap and Hangul visual identity.
- Reuse the dictionary pipeline from game #2 (ㄱㅅ).

### 1.2 Non-goals (v1)
- Online leaderboard or multiplayer.
- Jamo-level tiles (single consonant/vowel keys). Tiles are full syllables in v1. See §10.
- Board refill or endless mode.

---

## 2. Core Gameplay

### 2.1 Core loop
1. **Start.** A freshly generated board appears (§5), and the 2:00 timer starts.
2. **Drag.** The player presses on the board and drags. A rectangle selection box follows the pointer, and keys inside it light up as "pressed".
3. **Release.** The game reads the selected non-empty keys **in reading order**: left to right, then top to bottom.
   - Real 2–4 syllable word: the keys pop out, the word flashes above the board, and points are added.
   - Not a word: the keys spring back up with a dull "clack". There's no penalty, except the time spent.
4. **Repeat** until the timer hits 0, or until the player taps "그만하기".

### 2.2 Selection rules
- The selection is an axis-aligned rectangle of grid cells. A key counts as selected if the rectangle covers its **center**.
- **Empty cells are ignored.** Keys that were already cleared leave holes, and a rectangle can span holes to connect keys that weren't adjacent before. This is where the strategy comes from: clearing the right words first opens up longer combos.
- **Reading order:** row by row, top to bottom, and left to right within a row.
  - A horizontal strip reads left → right.
  - A vertical strip reads top → bottom.
  - A 2×2 block reads top-left, top-right, bottom-left, bottom-right.
- **Valid length:** 2–4 non-empty keys. A selection with 1 key, or with 5 or more, is never valid.
- **Live hint while dragging:** show the currently read string (e.g. "사과") in a small label above the board. It doesn't say whether the string is a word until release.

### 2.3 Timer
- 2:00, counting down. The last 10 seconds get a ticking animation.
- The timer starts on the first drag, so the player can look at the board before starting.

---

## 3. Scoring

| Word length | Points | Example |
|---|---|---|
| 2 syllables | 2 | 사과 |
| 3 syllables | 6 | 자동차 |
| 4 syllables | 12 | 대한민국 |

- Longer words are worth much more per key, which encourages planning over spamming 2-letter words.
- **Combo:** clearing words within 3 seconds of each other builds a combo multiplier: ×1.0, ×1.2, ×1.5, up to a maximum of ×2.0. Any 3-second gap resets it.
- **Board clear bonus:** +30 if every key is cleared. This is rare and only possible if the generator allows it.
- **Best score** is stored in `localStorage` (`cheonjiin.best`).

---

## 4. Dictionary

- **Shared pipeline with game #2:** 국립국어원 표준국어대사전 headwords, with 옛말, 방언, and 북한어 excluded, plus the same profanity denylist.
- **Accepted:** words of 2–4 Hangul syllables, in any part of speech.
- **Client payload:**
  - Ship one compact list of all 2–4 syllable words (a sorted, newline-separated file, gzipped), loaded in the background while the title screen is up.
  - Target: ≤ 1.5 MB gzipped. If it's bigger, restrict 3–4 syllable words to nouns, or use a succinct trie/DAWG encoding.
  - At runtime, keep the words in a `Set` for O(1) checks.
- **Board-generation list:** a separate, smaller list of the top ~5,000 **common** 2–4 syllable words, ranked by frequency. The generator (§5) builds boards from these, so the words hidden on the board are familiar ones.
- **Any valid word counts,** not only the planted ones. If the player finds an obscure word that happens to be on the board, they still get the points.

---

## 5. Board Generation

The board has to contain plenty of findable words. A random grid of syllables almost never does, so the generator **plants** words.

- **Grid size:**
  - Mobile portrait: 7 columns × 10 rows.
  - Desktop / landscape: 12 columns × 7 rows.
  - The grid size is fixed for each orientation when a game starts.
- **Algorithm (v1):**
  1. Fill the grid by placing common words (from the board-generation list) one at a time, in random empty spots.
     - Each word goes horizontally, vertically, or (for 4-syllable words) as a 2×2 block, so that it reads correctly in reading order.
     - Mix of lengths: about 50% 2-syllable, 35% 3-syllable, 15% 4-syllable.
  2. Stop when no planted word fits. Fill any leftover cells with syllables from planted words, chosen by frequency, so the leftovers still form "near misses".
  3. **Seeded:** the board comes from a seed (`seed → PRNG`), so a board can be reproduced and shared (§10 daily mode).
- **Quality check:** the board must contain at least 25 planted words. If it doesn't, regenerate. Generation should take under 50 ms on a mid-range phone, so run it in a Web Worker if needed.

---

## 6. Screens & Flow

```
[Title] --시작--> [Board, 2:00] --time up / 그만하기--> [Result] --다시하기--> [Board (new)]
                                                           \--공유--> share sheet / clipboard
```

### 6.1 Title
- The logo "천지인" is set in three keycaps that press down one at a time. Each keycap also carries its ·, ㅡ, or ㅣ symbol as a sub-legend.
- One-line rule: "드래그로 키를 묶어 단어를 만드세요".
- A tiny animated demo: 사 + 과 gets selected and pops.
- "시작" button and the best score.

### 6.2 Board
- **Top bar:** score (rolling counter), timer, and combo indicator.
- **Center:** the keycap grid.
- **Above the grid:** the read-string label while dragging, and found words flashing in on success.
- **Bottom (collapsible):** "찾은 단어" list.

### 6.3 Result
- Final score, best score (with a "신기록!" badge when it improves), number of words, and the longest word found.
- The found words list, grouped by length.
- "남은 단어 예시": up to 8 planted words the player didn't find.
- Buttons: "다시하기", "공유", and "포트폴리오로".

### 6.4 Share format
```
천지인 ⌨️ 148점 · 23단어
최장 단어: 대한민국
cheonjiin.uzun-choi.com
```

---

## 7. Visual & Audio Direction

**Concept: a Hangul mechanical keyboard.** Every tile is a keycap, and the game board is the keyboard plate.

### 7.1 Keycaps
- Square keys with rounded corners and a visible **side wall** (bottom/darker edge), which gives a slight 3D, DSA/XDA-profile look.
- **Legend:** the syllable is centered, in a crisp Hangul typeface. Use Pretendard SemiBold, or a typeface with a print or 활자 (movable type) feel for character. Add a small **jamo sub-legend** in the corner (e.g. 사 shows "ㅅㅏ" tiny in the top-left), like secondary legends on real keycaps. This ties back to the original 자모 idea.
- **Colorway:** inspired by classic keyboard sets:
  - Plate: deep charcoal.
  - Alpha keys: warm off-white (e.g. `#EDE6D6`) with charcoal legends.
  - Accent keys: about 1 in 10 keys, purely decorative, in a muted modifier color such as a dusty red or 남색 (navy), drawing on traditional Korean 오방색 tones.
- The board sits on a "case" with a subtle shadow, as if a keyboard were lying on a desk.

### 7.2 Motion
- **Hover/drag:** selected keys **press down**. They translate 2–3 px, lose their side wall, and their shadow shrinks. The selection rectangle is a thin dashed outline.
- **Valid word:**
  - Keys pop up and fly off with a slight spin, one after another, in reading order (40 ms stagger).
  - The word appears above the board in large type, then flies into the score.
- **Invalid word:** keys spring back up with a small vertical wobble. The read-string label shakes once.
- **Combo:** the combo indicator scales up at each step, and the keycap accent color briefly flashes across the plate.
- **Time warning (last 10 s):** the timer bounces each second.
- With `prefers-reduced-motion`: no fly-off or spin. Keys fade out, and press states are shown statically.

### 7.3 Sound (muted by default, with a toggle)
- Mechanical key "thock" on press, a lighter "clack" on release, and a satisfying chime sequence for a valid word (pitch rises with word length).
- Small audio sprites, ≤ 60 KB total.

---

## 8. Technical Notes

- **Stack:** Vite + TypeScript. Render the grid as DOM elements (CSS Grid). Use CSS 3D-ish keycap styling, and transforms for motion. Canvas isn't required at this grid size.
- **Input:**
  - Pointer Events on the board container. Map pointer coordinates to grid cells.
  - Set `touch-action: none` on the board.
  - Use `setPointerCapture` so drags that leave the board still end cleanly.
- **Validation:** collect selected non-empty cells in row-major order, join their syllables, check `length` 2–4, then `dict.has(word)`.
- **Dictionary loading:**
  - Fetch the gzipped word list on the title screen. Show "사전 불러오는 중…" if the player taps "시작" before it's ready.
  - Cache it with the Cache API, or rely on HTTP caching, so repeat visits load instantly.
- **Board generator:** a pure function `(seed, cols, rows, commonWords) → Board`, unit-tested for word count and placement validity.
- **Performance:** 60 fps while dragging on mid-range phones. Only toggle classes on cells whose selection state changed.

---

## 9. Acceptance Criteria

- [ ] A full game (title → 2:00 board → result) works with mouse on desktop and touch on iOS Safari and Android Chrome.
- [ ] Selecting 사 then 과 (horizontally or vertically adjacent, in reading order) clears both keys and scores 2.
- [ ] Selecting 과 then 사 (reading order "과사") does **not** clear, unless 과사 is a dictionary word.
- [ ] A rectangle spanning empty holes reads only the remaining keys, in reading order.
- [ ] Selections of 1 key, or 5+ keys, never clear.
- [ ] 3- and 4-syllable dictionary words clear and score 6 and 12 points.
- [ ] Every generated board has at least 25 planted words. Generation takes < 50 ms (or runs in a worker).
- [ ] Denylisted words never clear and are never revealed.
- [ ] The best score persists across reloads.
- [ ] The dictionary attribution is shown.

---

## 10. Open Questions / Future Ideas

- **Brand motif:** use the three 천지인 strokes (·, ㅡ, ㅣ) as recurring graphic elements: the favicon, loading indicator, and combo indicator (·→ㅡ→ㅣ as the combo builds).
- **Jamo mode (v2):** tiles are single jamo (ㅅ, ㅏ, ㄱ, ㅘ …), and a selection must compose into a word (ㅅㅏㄱㅘ → 사과). It's much harder, and it brings back the original "자모" concept.
- **Daily board:** a date-based seed, so everyone plays the same board and can compare scores.
- **Hint button:** briefly highlights one planted word and costs 10 seconds.
- **Board refill mode:** cleared columns drop down and new keys fall in from the top.
