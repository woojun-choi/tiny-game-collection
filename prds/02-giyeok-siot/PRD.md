# PRD — ㄱㅅ (Giyeok-Siot)

> Mini-game #2 of the 초미니게임천국 (Tiny Game Heaven) series
> Status: Draft v0.1 · Last updated: 2026-11-04

| Item | Value |
|---|---|
| Title | ㄱㅅ (logo shows the current chosung pair; the default/brand form is "ㄱㅅ") |
| URL | `chosung.uzun-choi.com` (see §9 — Hangul jamo can't be used in a subdomain) |
| Platforms | Mobile web + desktop web (responsive) |
| UI language | Korean |
| Session length | ~1–3 min (survival, ends when the timer runs out) |
| Backend | None (static site; dictionary bundled as static files; localStorage only) |

---

## 1. Overview

The game shows a two-letter chosung (initial consonant) pair, such as **ㄱㅅ**. The player keeps typing real Korean words that match it (감사, 가수, 기사, 고속, …) as fast as they can. Every valid word adds time back to a draining timer. When the timer hits zero, the game ends. The score is how many words the player found.

### 1.1 Goals
- A fast, addictive typing game that Korean speakers understand instantly.
- Clean, minimal presentation that shows off front-end polish (IME handling, micro-interactions).
- Every result reveals words the player didn't think of. That "아 이것도 있었네!" moment is the hook to replay.

### 1.2 Non-goals (v1)
- Online leaderboard or multiplayer.
- Three-letter chosung (candidate for v2).
- Dictionary definitions or learning features.

---

## 2. Core Gameplay

### 2.1 Core loop
1. **Start.** A random chosung pair is chosen from the eligible pool (§4.3), and the timer starts at 15 s.
2. **Type.** The player types a word and presses Enter (or the on-screen "입력" button).
3. **Validate.** The word is checked against the rules in §2.2.
   - Valid: the word is added to the found list, and **+3 s** goes back on the timer (capped at 15 s).
   - Invalid: the input shakes and shows the reason, and **−1 s** comes off the timer (anti-spam).
4. **Repeat** until the timer reaches 0. Then the result screen appears.

The chosung pair stays the same for the whole game.

### 2.2 Validation rules
A submitted word is accepted only if **all** of these are true:
1. **Exactly 2 Hangul syllables.** Whitespace is trimmed first.
2. **Chosung match.** The initial consonant of each syllable matches the pair, in order. Double consonants are distinct: ㄲ ≠ ㄱ.
3. **In the dictionary.** The word exists in the bundled word list (§4). Any part of speech counts.
4. **Not a duplicate.** The word hasn't already been entered in this game.

Invalid feedback is shown inline under the input, with a short reason:

| Case | Message |
|---|---|
| Chosung mismatch | "초성이 달라요" |
| Not in the dictionary | "사전에 없는 단어예요" |
| Duplicate | "이미 쓴 단어예요" |
| Not 2 syllables | "두 글자로 입력해 주세요" |

A wrong chosung only gets the message, with no time penalty. This keeps typos forgiving. The −1 s penalty applies to "not in dictionary" only, since that's the case random syllable spamming would hit.

### 2.3 Timer & difficulty curve
- Starts at 15.0 s. The timer is shown as a thin bar plus a number, and the bar pulses under 5 s. There's no red, because the game is monochrome (see §6.2).
- Each valid word adds +3 s, but the timer can't go above 15 s.
- **Drain speeds up** over the game: the drain rate is 1.0× for the first 10 words, then +0.1× for every 10 more words, up to 2.0×. This makes long runs end eventually.
- The timer starts on the first keystroke, not on page load, so mobile players have time to bring up the keyboard.

---

## 3. Scoring & Result

### 3.1 Score
- **Score** = number of valid words found.
- **Best record:** stored per pair (`giyeoksiot.best.ㄱㅅ`) and as an overall best (`giyeoksiot.best`).

### 3.2 Result screen
- The pair, the score, and "최고 기록" (with a "신기록!" badge when it improves).
- **Found words:** shown as chips in the order they were entered.
- **Missed words:** "이런 단어도 있었어요". Show up to 10 words the player didn't enter, picked from the most common words for that pair (§4.2).
- **Coverage:** "가능한 단어 312개 중 18개 발견". This is the total count of dictionary words for the pair.
- Buttons: "다시하기" (new random pair), "같은 초성으로" (same pair again), "공유", and "포트폴리오로".

### 3.3 Share
- Use the Web Share API on mobile, and fall back to the clipboard on desktop.
- Share text format:
  ```
  ㄱㅅ 초성게임 — 18단어 생존
  감사 가수 기사 고속 …
  chosung.uzun-choi.com
  ```
- Show only the first 5 found words in the share text, so it stays short.

---

## 4. Dictionary

### 4.1 Source
- **Primary:** National Institute of Korean Language (국립국어원) open dictionary data from 표준국어대사전 / 우리말샘 (bulk download). Check the license terms and add the required attribution in the footer before launch.
- **Include:** every headword that is exactly 2 Hangul syllables, in any part of speech, exactly as it appears in the dictionary. For example, 가다 (verb) and 갓난 (determiner) both count. Inflected forms that aren't headwords, like 갔다, don't count.
- **Exclude:** entries marked 옛말 (archaic), 방언 (dialect), or 북한어 (North Korean), and anything that isn't pure Hangul (e.g. words with hyphens or Hanja).
- A small, curated **denylist** filters out slurs and offensive words. They're never accepted as answers and never shown as missed words.

### 4.2 Commonness ranking
- The "missed words" reveal should show words people know, not obscure entries.
- Rank words by frequency using a public Korean frequency list (e.g., 국립국어원 "현대 국어 사용 빈도 조사"). Words not in the frequency list rank last.
- Store a rank number with each word, so the result screen can sort missed words by commonness.

### 4.3 Eligible pairs
- Precompute word counts for every chosung pair (19 × 19 = 361 pairs).
- A pair is **eligible** for random selection only if it has at least **40 common words**, meaning words in the top frequency tiers. This avoids unwinnable pairs like ㅃㅉ.

### 4.4 Delivery format
- Run a build-time script (Node) that turns the raw dictionary into per-pair JSON files: `/dict/ㄱㅅ.json` → `{ "words": [["감사", 12], ["가수", 30], …] }`. Each entry is a word and its rank.
- The client loads only the chosen pair's file, which is usually 1–20 KB. It also loads a small `/dict/index.json` with the eligible pairs and their counts.
- Prefetch the next random pair's file on the result screen, so "다시하기" starts instantly.

---

## 5. Screens & Flow

```
[Title] --시작--> [Game (pair X)] --timer 0--> [Result] --다시하기--> [Game (new pair)]
                                                   |--같은 초성으로--> [Game (pair X)]
                                                   \--공유--> share sheet / clipboard
```

### 5.1 Title
- A large "ㄱㅅ" logo, a one-line rule ("초성에 맞는 단어를 계속 입력하세요"), and a "시작" button.
- Best record, if there is one.

### 5.2 Game
- **Top:** timer bar and number.
- **Center:** a huge chosung pair (e.g., **ㄱㅅ**), and below it a count of words found.
- **Input:** a text field, auto-focused, with an "입력" button. On mobile, the input sits right above the keyboard.
- **Below the input:** found words as a wrapping list of chips, newest first.
- **Feedback:**
  - Valid: the word flies into the chip list, "+3s" floats up from the timer, and the input clears.
  - Invalid: the input shakes and briefly inverts, the reason appears, and the input text stays so the player can fix it.
  - The full motion spec is in §6.2.

### 5.3 Result
As described in §3.2.

---

## 6. Visual Direction

The concept is **strict monochrome, expressive motion**. The game uses only black and white, and animation does all the work that color would normally do.

### 6.1 Palette
- Only two colors: `#000` and `#FFF`. There are no grays, no accent color, and no colored states.
- Semantic states (valid, invalid, danger, new record) are shown by **motion, inversion, weight, and shape**, never by hue.
- **Dark mode** swaps the two colors (white on black) via `prefers-color-scheme`. The default is black on white.
- **Fonts:**
  - Pretendard for the UI.
  - The chosung pair is shown very large (about 30vw on mobile) in Pretendard Black or a heavy display face.

### 6.2 Motion language
- **Personality:** snappy and physical, using spring/overshoot easing such as `cubic-bezier(.34,1.56,.64,1)`. Most tweens take 150–350 ms.
- **Chosung pair:**
  - On game start, the two letters drop in one after the other and land with a squash-and-stretch.
  - While idle, they "breathe" with a subtle 1–2% scale pulse.
  - On a valid word, they do a quick bounce.
- **Typing:** each syllable committed in the input pops in with a slight scale-up.
- **Valid word:**
  - The word flies from the input into the chip list (a FLIP animation), and the chip lands with a small overshoot.
  - "+3s" floats up from the timer and fades out.
  - The timer bar visibly refills with a spring.
- **Invalid word:**
  - The input shakes horizontally.
  - The input box briefly **inverts** (black fill, white text) for 120 ms, then the reason line types in.
- **Duplicate word:** the existing chip for that word wiggles in the list, so the player sees where it is.
- **Timer danger (< 5 s):**
  - The bar starts to pulse, and the timer number ticks with a scale beat every second.
  - Under 3 s, the background flashes inverted (white ↔ black) on each tick, which replaces the "red" warning.
- **Game over:**
  - The screen wipes to inverted with a hard vertical wipe.
  - Found-word chips cascade in with staggered 30 ms delays.
  - The score counts up from 0.
- **New record:** a black stamp "신기록!" slams in with a scale and rotate effect and a brief screen shake.
- **Missed words:** they reveal one by one with a typewriter effect, drawing the eye to "아 이것도 있었네".

### 6.3 Accessibility
- Every state change also changes **text or shape**, not only motion. For example, invalid input always shows a reason line.
- Inverted flashes are limited to at most 1 per second, and never more than 3 per second, to stay within the WCAG flash threshold.
- With `prefers-reduced-motion`, turn off shake, bounce, wipe, and flash, and switch to instant state changes or short fades. Inversion stays as a static indicator (for example, the timer number is shown inverted while under 5 s).

### 6.4 Implementation notes
- Use CSS transforms and opacity only, so animations run on the compositor at 60 fps on mid-range phones.
- Use the Web Animations API (`element.animate`) for one-shot effects. Optionally use a small library like Motion One (~4 KB) for springs. There's no need for GSAP-level weight.

---

## 7. Technical Notes

- **Stack:** Vite + TypeScript, DOM-based UI (no canvas needed).
- **Korean IME handling (critical):**
  - Ignore Enter while `event.isComposing` is true (or `keyCode === 229`). Otherwise the last syllable can get dropped or submitted twice on some browsers.
  - Read `input.value` on submit, after composition ends, then normalize with `String.prototype.normalize('NFC')`.
  - Test on iOS Safari (Korean keyboard), Android Gboard and Samsung Keyboard, macOS Safari and Chrome, and Windows Chrome with Microsoft IME.
- **Chosung extraction:** for a syllable code point `c` in U+AC00–U+D7A3, the chosung index is `Math.floor((c − 0xAC00) / 588)`. Map that index to a list of 19 chosung jamo.
- **Validation:** keep the loaded pair's words in a `Set` for O(1) lookup.
- **Timer:** drive it from `requestAnimationFrame` using real elapsed time (`performance.now()`), not a `setInterval` count. Pause the timer when the tab is hidden (`visibilitychange`).
- **Mobile:**
  - Keep the input focused after every submit, so the keyboard doesn't close.
  - Use `enterkeyhint="send"` on the input.
  - Use `visualViewport` to keep the input above the keyboard.
- **Performance:** the initial bundle should be under 100 KB gzipped (excluding fonts), with dictionary files loaded on demand.

---

## 8. Acceptance Criteria

- [ ] A full game (title → play → result) works on iOS Safari, Android Chrome, and desktop Chrome, Safari, and Firefox with a Korean IME.
- [ ] Pressing Enter mid-composition never drops or duplicates the last syllable.
- [ ] For pair ㄱㅅ: 감사 and 가수 are accepted, 각사 is accepted only if it's in the dictionary, 까시 is rejected as a chosung mismatch, and entering 감사 twice is rejected as a duplicate.
- [ ] A valid word adds +3 s, capped at 15 s. "Not in dictionary" subtracts 1 s.
- [ ] Only eligible pairs (≥ 40 common words) are chosen at random.
- [ ] The result screen shows found words, up to 10 common missed words, and the coverage count.
- [ ] The best record persists across reloads.
- [ ] Denylisted words are never accepted and never revealed.
- [ ] The UI uses only `#000` and `#FFF` in both light and dark mode, and every animation in §6.2 has a reduced-motion fallback.
- [ ] The dictionary attribution is visible in the footer.

---

## 9. Open Questions / Future Ideas

- **Subdomain:** Hangul compatibility jamo (ㄱ, ㅅ) can't be used in domain names, so "ㄱㅅ" stays as the display title and the URL is `chosung.uzun-choi.com`. An alternative is `gs.uzun-choi.com`.
- Three-letter chosung mode, e.g. ㄱㅅㅎ → 감사함, 고속화.
- Daily pair: the same pair for everyone each day, which makes shared scores comparable.
- Bonus points for rare words, using the frequency rank.
- Should the pair change partway through a long run (e.g. every 20 words) to keep it fresh?
