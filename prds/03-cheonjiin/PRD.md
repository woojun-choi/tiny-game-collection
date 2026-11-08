# PRD — 천지인 (Cheonjiin)

> Mini-game #3 of the 초미니게임천국 (Tiny Game Heaven) series (working name in planning: "자모 사과게임")
> Status: v0.2, synced with the shipped build · Last updated: 2026-11-08
> v0.2 changes: grid size, 1-bit pixel visual direction, dictionary sources and word lists, daily puzzle, pause, settings, tap-to-select, iOS app (§11).

| Item | Value |
|---|---|
| Title | 천지인 (Cheonjiin). The name has two meanings: the heaven-earth-human (·, ㅡ, ㅣ) principle behind Hangul vowels, and the classic 천지인 phone keypad. Both fit the Hangul keyboard concept. |
| URL | `cheonjiin.uzun-choi.com` |
| Platforms | Mobile web + desktop web (responsive, touch + mouse), and an iOS app built from the same code (§11) |
| UI language | Korean |
| Session length | 2 minutes (fixed timer) |
| Backend | None (static site, bundled dictionary, on-device storage only) |

---

## 1. Overview

A grid of keycap tiles fills the screen. Each tile shows one Hangul syllable. The player drags a rectangle over tiles. If the selected syllables, read in order, spell a real dictionary word (2–4 syllables, e.g. 사 + 과 → **사과**), those keys pop out and disappear. The player has 2 minutes to clear as many keys as possible.

This is an original take on the drag-a-rectangle grid genre. The win condition is spelling a real Korean word, and the look is a Hangul keyboard. It doesn't reuse any existing game's name, art, or layout.

### 1.1 Goals
- A satisfying "find the hidden words" puzzle that rewards Korean vocabulary and spatial planning.
- A distinctive keycap and Hangul visual identity.
- Reuse the dictionary pipeline from game #2 (ㄱㅅ).
- A reason to come back every day (§6.5 daily puzzle).

### 1.2 Non-goals (v1)
- Online leaderboard or multiplayer.
- Jamo-level tiles (single consonant/vowel keys). Tiles are full syllables in v1. See §10.
- Board refill or endless mode.
- Accounts or cloud sync. Records stay on the device.

---

## 2. Core Gameplay

### 2.1 Core loop
1. **Start.** A freshly generated board appears (§5). The 2:00 timer starts on the first drag (§2.3).
2. **Select.** The player presses on the board and drags. A rectangle selection box follows the pointer, and keys inside it press down.
3. **Release.** The game reads the selected non-empty keys **in reading order**: left to right, then top to bottom.
   - Real 2–4 syllable word: the keys pop out, the word flashes above the board, and points are added.
   - Not a word: the keys spring back up with a dull "clack". There's no penalty, except the time spent.
4. **Repeat** until the timer hits 0, or until the player taps "그만하기".

### 2.2 Selection rules
- The selection is an axis-aligned rectangle of grid cells, with the press cell and the current cell as opposite corners. A pointer outside the board snaps to the nearest edge cell.
- **Empty cells are ignored.** Keys that were already cleared leave holes, and a rectangle can span holes to connect keys that weren't adjacent before. This is where the strategy comes from: clearing the right words first opens up longer combos.
- **Reading order:** row by row, top to bottom, and left to right within a row.
  - A horizontal strip reads left → right.
  - A vertical strip reads top → bottom.
  - A 2×2 block reads top-left, top-right, bottom-left, bottom-right.
- **Valid length:** 2–4 non-empty keys. A selection with 1 key, or with 5 or more, is never valid.
- **Live hint while selecting:** show the currently read string (e.g. "사과") in a label above the board. It doesn't say whether the string is a word until release.
- **Tap-to-select (accessibility):** dragging is hard for some players. A single tap on a key leaves it pressed as one corner ("다른 키를 누르면 묶여요"). The next tap (or drag) on another key completes the rectangle. Tapping the same key again cancels.

### 2.3 Timer
- 2:00, counting down. The last 10 seconds get a warning style.
- The timer starts on the first drag, so the player can look at the board before starting.
- **Pause:** leaving the app or tab, or opening settings, pauses the game. The board is covered while paused, so it can't be studied for free. "계속하기" resumes, and the combo window is shifted by the paused time.

---

## 3. Scoring

| Word length | Points | Example |
|---|---|---|
| 2 syllables | 2 | 사과 |
| 3 syllables | 6 | 자동차 |
| 4 syllables | 12 | 대한민국 |

- Longer words are worth much more per key, which encourages planning over spamming 2-letter words.
- **Combo:** clearing words within 3 seconds of each other builds a combo multiplier: ×1.0, ×1.2, ×1.5, up to a maximum of ×2.0. Any 3-second gap resets it. The indicator lights up ·, ㅡ, ㅣ as the combo builds.
- **Board clear bonus:** +30 if every key is cleared. This is rare.
- **Best score** is stored on the device (`cheonjiin.best`). The first game ever doesn't count as a "신기록".

---

## 4. Dictionary

Built by `packages/dict-pipeline` (`npm run build:cheonjiin -w @tgh/dict-pipeline`) from 국립국어원 open dictionaries (CC BY-SA 2.0 KR).

- **Accepted words (`words.txt`):** every 2–4 syllable headword in 표준국어대사전 and 한국어기초사전, in any part of speech, plus 2-syllable headwords from 우리말샘 (the same rule as ㄱㅅ). Adding 3–4 syllable 우리말샘 words would more than double the file, so they're left out.
  - About 313,000 words, sorted and newline-separated. About 1 MB gzipped.
  - Loaded in the background while the title screen is up, then kept in a `Set` for O(1) checks.
- **Board-generation list (`common.json`):** 초급 and 중급 nouns from 한국어기초사전, about 6,350 words. The generator (§5) plants these, so the hidden words are familiar ones.
- **Any valid word counts,** not only the planted ones. If the player finds an obscure word that happens to be on the board, they still get the points.
- **Word lists** (shared with ㄱㅅ, one word per line, `*` prefix = match anywhere in the word):
  - `blocked.txt`: slurs, profanity, and sexual terms. Never accepted, never planted, never shown.
  - `no-seed.txt`: ordinary dictionary words that shouldn't greet a young player on a fresh board (alcohol, tobacco, drugs, violence, underwear, insults like 바보). Still accepted when found, but never planted.

---

## 5. Board Generation

The board has to contain plenty of findable words. A random grid of syllables almost never does, so the generator **plants** words.

- **Grid size:**
  - Portrait (or narrower than 700 px): 9 columns × 13 rows.
  - Wide landscape: 18 columns × 9 rows.
  - The daily puzzle is always 9 × 13, so everyone gets the same board.
  - The grid size is fixed when a game starts.
- **Algorithm:**
  1. Fill the grid by placing common words one at a time, in random empty spots.
     - Each word goes horizontally, vertically, or (for 4-syllable words) as a 2×2 block, so that it reads correctly in reading order.
  2. Stop when no planted word fits. Fill any leftover cells with syllables from planted words, so the leftovers still form "near misses".
  3. **Seeded:** a pure function `(seed, cols, rows, commonWords) → Board` with a seeded PRNG (mulberry32). The same seed always gives the same board, which the daily puzzle relies on. Any change to how the generator consumes random numbers changes every daily board, so keep the sequence stable.
- **Quality check:** aim for at least one planted word per 3 cells (39 on 9 × 13). Try up to 8 times and keep the best board.

---

## 6. Screens & Flow

```
[Title] --시작--------> [Board, 2:00] --time up / 그만하기--> [Result] --다시하기--> [Board (new)]
   \----오늘의 퍼즐--> [Board, daily]  ------------------->  [Result, daily] --일반 게임--> [Board (new)]
                                                              \--공유--> share sheet / clipboard
[Any screen] --설정--> [Settings sheet]
```

### 6.1 Title
- "천지인" in the pixel typeface, over three pixel illustrations of heaven (·), earth (ㅡ), and human (ㅣ).
- One-line rule: "드래그로 키를 묶어 단어를 만드세요", and a short note that two taps also work.
- A tiny animated demo: 사 + 과 gets selected and pops.
- Point table (2 / 6 / 12), combo and time rule.
- "시작" and "오늘의 퍼즐 #N" buttons, the best score, and today's daily status (score if played, current streak).
- If "시작" is tapped before the dictionary is ready: "사전 불러오는 중…".

### 6.2 Board
- **Top bar:** score (rolling counter), combo indicator (· ㅡ ㅣ ×N), and the timer.
- **Above the grid:** the read-string label while selecting, and found words flashing in on success.
- **Center:** the keycap grid, vertically centered in the free space on tall screens.
- **Bottom:** "찾은 단어" list (collapsible) and "그만하기".

### 6.3 Result
- Final score, best score (with a "신기록!" badge when it improves), number of words, and the longest word found.
- The found words list, grouped by length.
- "남은 단어 예시": up to 8 planted words the player didn't find.
- Buttons: "다시하기", "공유", and "포트폴리오로" (web only).

### 6.4 Share format
```
천지인 ⌨️ 148점 · 23단어
최장 단어: 대한민국
cheonjiin.uzun-choi.com
```
Daily:
```
천지인 오늘의 퍼즐 #12 ⌨️ 148점 · 23단어
최장 단어: 대한민국
연속 5일째
cheonjiin.uzun-choi.com
```
- Web: Web Share API, or copy to clipboard. iOS app: the system share sheet.

### 6.5 Daily puzzle (오늘의 퍼즐)
- One board per day, the same for everyone: the seed is a hash (FNV-1a) of the date in **KST**, so it changes at midnight Korean time.
- Numbered from #1 on 2026-11-07.
- Only the first game of the day is recorded (`cheonjiin.daily`). Playing again shows the first result.
- **Streak** (`cheonjiin.streak`): consecutive days with a recorded daily game, plus the best streak. Missing a day resets it.
- Result screen: kicker "오늘의 퍼즐 #N", "연속 N일 · 최고 M일 · 내일 새 퍼즐", and the main button becomes "일반 게임".

### 6.6 Settings
A sheet opened from the top bar. Opening it pauses the game.
- Toggles: sound, and haptics (app only).
- About: version, maker (uzun-choi.com), contact (GitHub issues).
- Links: 도움말 (`support.html`), 개인정보 처리방침 (`privacy.html`).
- Licenses: dictionary (CC BY-SA 2.0 KR), fonts (SIL OFL 1.1), and Capacitor (MIT, app only).

---

## 7. Visual & Audio Direction

**Concept: a Hangul mechanical keyboard, drawn in 1-bit pixels.**

### 7.1 Keycaps
- Square keys with a 2 px ink outline and a hard **side wall** (a solid block shadow under the key). No gradients, no rounded corners.
- **Legend:** the syllable, centered, in Galmuri11 (pixel typeface). UI text uses Pretendard. Both are bundled, so the game works offline.
- **Colorway:** pure black and white. Light mode: white keys, black ink. Dark mode follows the system and inverts everything.
- All keys look the same. Only a pressed key inverts, so a black key always means "selected".
- The board sits on a gray case with a hard shadow, as if a keyboard were lying on a desk.

### 7.2 Motion
- **Selecting:** selected keys **press down**. They drop by the wall height, lose the wall, and invert. The selection rectangle is a dashed outline.
- **Valid word:** keys pop up and fly off with a slight spin, one after another, in reading order. The word appears above the board.
- **Invalid word:** keys spring back up with a small wobble.
- **Combo:** the combo indicator scales up at each step.
- **Time warning (last 10 s):** the timer switches to a warning style.
- With `prefers-reduced-motion`: no fly-off or spin. Keys fade out, and press states are shown statically.

### 7.3 Sound (muted by default, with a toggle)
- Mechanical key "thock" on press, a lighter "clack" on release, and a chime for a valid word (pitch rises with word length).
- Synthesized with Web Audio at runtime, so there are no audio files.

### 7.4 Haptics (iOS app only, on by default, with a toggle)
- Light tap on key press, a medium or heavy (4 syllables) hit on a valid word, and a success pattern on a board clear.

---

## 8. Technical Notes

- **Stack:** Vite + TypeScript. The grid is DOM elements (CSS Grid). Canvas isn't needed at this grid size.
- **Input:**
  - Pointer Events on the board container. Map pointer coordinates to grid cells.
  - `touch-action: none` on the board, and `setPointerCapture` so drags that leave the board still end cleanly.
- **Validation:** collect selected non-empty cells in row-major order, join their syllables, check `length` 2–4, then `dict.has(word)`.
- **Storage:** all keys are prefixed `cheonjiin.` (best, daily, streak, sound, haptics). Read and written synchronously through `persist.ts`. In the iOS app, every write is mirrored to native storage and restored on launch (§11).
- **Performance:** 60 fps while dragging on mid-range phones. Only toggle classes on cells whose selection state changed.
- **Accessibility:** tap-to-select (§2.2); keys have their syllable as an accessible name; the board has an instruction label; the timer is a `timer` role; the paused screen moves focus to "계속하기"; reduced motion is respected.

---

## 9. Acceptance Criteria

Covered by unit tests (`games/cheonjiin/src/*.test.ts`):
- [x] Selecting 사 then 과 (horizontally or vertically adjacent, in reading order) reads "사과". Selecting 과 then 사 reads "과사".
- [x] A rectangle spanning empty holes reads only the remaining keys, in reading order.
- [x] Selections of 1 key, or 5+ keys, are never valid.
- [x] 2-, 3-, and 4-syllable words score 2, 6, and 12 points, with the combo multiplier applied.
- [x] Planted words read correctly on the board and every cell is filled.
- [x] The same seed gives the same board, and a pinned board snapshot guards the daily puzzle against generator changes.
- [x] Daily seed, numbering, and streak rules.

Checked by hand:
- [x] A full game (title → 2:00 board → result) works with mouse on desktop and with touch emulation in Chrome.
- [x] Tap-to-select clears a word, and tapping the same key twice cancels.
- [x] Denylisted words are not in the dictionary files.
- [x] The best score persists across reloads.
- [x] The dictionary attribution is shown.
- [ ] Touch on real iOS Safari and Android Chrome.
- [ ] iOS app on a real device: haptics, share sheet, pause on background, records restored after the web view data is cleared.

---

## 10. Open Questions / Future Ideas

- **Jamo mode (v2):** tiles are single jamo (ㅅ, ㅏ, ㄱ, ㅘ …), and a selection must compose into a word (ㅅㅏㄱㅘ → 사과). It's much harder, and it brings back the original "자모" concept.
- **Hint button:** briefly highlights one planted word and costs 10 seconds.
- **Board refill mode:** cleared columns drop down and new keys fall in from the top.
- **Game Center:** a leaderboard for the daily puzzle in the iOS app.

Done since v0.1: daily board (§6.5), combo indicator built from the ·, ㅡ, ㅣ strokes (§3).

---

## 11. iOS App

- **Shell:** `apps/cheonjiin-ios`, a Capacitor project whose web content is the regular web build (`games/cheonjiin/dist`). `npm run build -w cheonjiin-ios` builds the web game and syncs it into the Xcode project. Plugins: haptics, share, preferences.
- **Same code, small differences:** `native.ts` and `persist.ts` check `Capacitor.isNativePlatform()`. In the app the page gets an `app` class, which:
  - hides web-only parts (the breadcrumb, "포트폴리오로"),
  - pads for the safe areas (notch, home indicator),
  - turns off text selection,
  - shows app-only settings (haptics) and licenses (Capacitor).
- **Storage:** iOS can clear web view data when the device runs low on space, so records are mirrored to native storage (`@capacitor/preferences`) on every write and restored before the game starts (`boot.ts`).
- **Device:** iPhone only, portrait only, iOS 15+.
- **Icon:** the word "천지인" on three keycaps, with the middle one pressed. Light, dark, and tinted variants for the iOS home screen. The launch screen shows the same three keycaps in light and dark.
- **Web pages for the store:** `privacy.html` (privacy policy) and `support.html` (help and contact) ship with the game, so they work on the web and inside the app.
