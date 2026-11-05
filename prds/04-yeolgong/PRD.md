# PRD — 열공타자연습 (Yeolgong Typing)

> Mini-game #4 of the 초미니게임천국 (Tiny Game Heaven) series
> Status: Draft v0.2 · Last updated: 2026-11-04
> v0.2 changes: the game now has two modes, 암기 (memorize by typing along) and 문제 (cloze quiz by typing). The separate practice mode, the L1–L5 levels, and the cross-day spaced repetition were removed.

| Item | Value |
|---|---|
| Title | 열공타자연습 |
| URL | `yeolgong.uzun-choi.com` |
| Platforms | Desktop web first (physical keyboard). Mobile web is usable but secondary. |
| UI language | Korean |
| Content languages | Korean, English, and mixed text |
| Backend | None. All materials and progress stay in the browser (IndexedDB). |

---

## 1. Overview

The player drops in their own study material: pasted text, a `.txt` or `.md` file, or a PDF. The game turns it into a **typing set**, and the player studies by typing it. There are two modes:

| Mode | What the player does | Purpose |
|---|---|---|
| **암기 모드 (Memorize)** | Types the material along, paragraph by paragraph, with the text fully visible. | Absorb the content through the hands. Builds familiarity. Measures 타수 and accuracy. |
| **문제 모드 (Quiz)** | Gets quiz sentences built from the material, with key words blanked out. They type the whole sentence, and when the caret reaches a blank, they must type the answer from memory. | Check what stuck. Turns recall into typing. |

The intended loop is **암기 → 문제 → (wrong ones again) → 암기**.

Everything runs locally, including question generation (rule-based, no AI or server). The material never leaves the player's device.

### 1.1 Goals
- Turn "reading notes again" into active, measurable study: type it to learn it, then type it to prove it.
- Handle real-world input well: messy PDFs, Markdown, and mixed Korean/English text.
- Show front-end depth: Korean IME composition handling, text processing, rule-based question generation, and IndexedDB persistence.

### 1.2 Non-goals (v1)
- AI-generated questions, or question types other than fill-in-the-blank (cloze).
- Accounts, cloud sync, or sharing materials.
- Cross-day spaced repetition or a wrong-answer notebook (§10).
- Web page URL import and OCR for scanned PDFs.

---

## 2. Material Library

### 2.1 Import sources
| Source | Handling |
|---|---|
| **Paste** | A plain textarea, with a title field (auto-filled from the first line). |
| **.txt** | Read with `FileReader`. Try UTF-8 first, and fall back to EUC-KR (common in older Korean files). |
| **.md** | Strip the Markdown syntax but keep the text: headings become plain lines, emphasis and link syntax are removed, list markers are removed, code blocks are kept as-is and can optionally be excluded, and images and HTML are dropped. Headings become paragraph titles (§2.3). |
| **PDF** | Extract text in the browser with `pdfjs-dist`, loaded only when it's needed, then clean it up (§2.2). If a PDF has almost no text layer (< 20 characters per page on average), show "스캔된 PDF는 지원하지 않아요". |

- Accept files up to **10 MB**, and up to **200,000 characters** after extraction. Show a clear message when a file is over the limit.
- Drag-and-drop a file anywhere on the library screen to start an import.

### 2.2 Cleanup (PDF and text)
- Join lines broken mid-sentence. If a line doesn't end with sentence punctuation and the next line continues the sentence, merge them.
- Re-join English words hyphenated across a line break.
- Remove repeated headers and footers (lines on 50% or more of pages) and lines that are only a page number.
- Collapse whitespace. Normalize characters that can't be typed to typeable forms (e.g. `“` → `"`, `…` → `...`, `–` → `-`).

### 2.3 Review & edit step
After an import, the player sees a **preview** before saving:
- The text split into paragraphs, with a count (e.g. "문단 42개 · 12,345자").
- They can edit, delete, merge, or split paragraphs inline, and give a paragraph an optional title (Markdown headings fill this in automatically).
- "저장" adds the material to the library and builds both sets: the 암기 set from the paragraphs (§3), and the question pool (§4.2).

### 2.4 Paragraph segmentation (암기 set)
- Split on blank lines, or on single line breaks for sources without blank lines.
- **Long paragraph guard:** split paragraphs over 600 characters at the nearest sentence boundary, so each unit takes 1–3 minutes.
- **Very short paragraph guard:** a paragraph under 20 characters (for example, a lone heading) becomes the title of the next paragraph.

### 2.5 Library screen
- Cards for each material, showing the title, paragraph count, number of questions, last studied date, 암기 progress (paragraphs typed at least once / total), and the best 문제 score.
- Card actions: **"암기"**, **"문제"**, "편집", and "삭제" (delete asks for confirmation).
- **Sample materials**, preloaded and public domain:
  - 윤동주 「서시」
  - An excerpt from 훈민정음 서문 (modern translation)
  - The Gettysburg Address (English)

---

## 3. 암기 모드 (Memorize — type along)

### 3.1 Flow
1. Pick a material. The game resumes from the last paragraph, or the player can choose one from a paragraph list.
2. The paragraph is shown in full, and the player types over it.
3. When the paragraph is finished, a small inline summary appears (타수, accuracy, time), and the next paragraph slides in.
4. The player can stop at any time. The current position is saved.
5. At the end of the material, or on stop, the **session summary** appears, with a prompt to try 문제 모드: "이제 문제로 확인해볼까요?"

### 3.2 Typing behavior (shared with 문제 모드)
- **Overlay rendering:**
  - Untyped text is shown dim. Correct characters are in full ink.
  - Wrong characters are underlined in the error color, with the typed character shown small above the expected one.
- **Errors don't block progress.** Backspace fixes them. Accuracy counts every error made, including ones later fixed.
- **Hangul composition matching (critical):**
  - While a syllable is being composed, compare it as a **jamo prefix** of the target. For target 각, the sequence ㄱ → 가 → 각 is all "in progress", not errors.
  - Mark it wrong only once it can no longer lead to the target. For example, 간 for target 각.
- **Line breaks** inside a paragraph are typed as spaces. The end of a paragraph needs no Enter.
- **Caret:** a smooth sliding caret, with typewriter scrolling that keeps the current line vertically centered.

### 3.3 Metrics (shared with 문제 모드)
- **타수 (keystrokes per minute)** is the main number.
  - Each Hangul syllable is broken into its 두벌식 keystrokes. Compound vowels and consonant clusters count by their parts: ㅘ = 2, ㄳ = 2.
  - Double consonants (ㄲ, ㄸ, …) count as 1, ignoring Shift.
  - Latin letters, digits, punctuation, and spaces count as 1 each.
- **WPM** is shown as a secondary number when the text is 70% or more Latin: (correct characters / 5) / minutes.
- **Accuracy** = correct keystrokes / total keystrokes typed.
- Timing starts at the first keystroke and pauses after 10 seconds without input.
- **History:** each finished paragraph is stored with its 타수, accuracy, and date. The material's stats page shows a chart of daily average 타수.

---

## 4. 문제 모드 (Quiz — type the sentence, recall the blanks)

### 4.1 Flow
1. Pick a material, then tap "문제".
2. A **set of 10 questions** is drawn from the material's question pool. Questions the player hasn't seen recently, or has gotten wrong before, are picked first.
3. Each question is shown as one sentence with 1–2 blanks. The player types the **whole sentence** from the start:
   - Visible parts are typed along, just like 암기 모드.
   - When the caret reaches a blank, the blank's underline becomes active. The player types the answer from memory, with nothing shown.
   - The blank is graded when the player leaves it (§4.4).
4. After the sentence ends, a quick reveal shows ✓ or ✗ for each blank, with the correct answer under any wrong one. Then the next question follows.
5. **Questions with a wrong blank are requeued within the same session**, about 3 questions later. A question can come back at most 2 times. The session ends when the queue is empty.
6. The **result screen** appears (§4.6).

### 4.2 Question generation (rule-based)
The question pool is built when the material is saved. It's rebuilt when the material is edited.

1. **Split into sentences.** Use `Intl.Segmenter` (sentence granularity) when it's available, and fall back to splitting on sentence punctuation.
   - Keep only sentences of 15–200 characters.
   - Lines that look like headings are only used as context titles (§4.3), not as questions.
2. **Find answer candidates** in each sentence, scored with simple heuristics. Higher scores are better:
   - **Definition patterns** (strong bonus): the term in `A(이)란 …`, `A는 … 이다`, `… 를 A(이)라고 한다`, `A(B)`, and `A: …`.
   - Numbers, years, dates, and units (e.g. 1443년, 28자, 3.14).
   - English or technical terms embedded in Korean text.
   - Words that appear often across the material (likely key terms), excluding stop words.
   - Longer words: 3 or more syllables for Korean, 6 or more letters for English.
3. **Answer unit:**
   - For Korean, the answer is the word **without its trailing particle (조사)**. For example, in "세종대왕은", the blank is 세종대왕, and 은 stays visible after the blank. A small list of common particles and endings is used to strip it.
   - For English, the answer is the whole word, with surrounding punctuation left out.
4. **Blanks per question:** 1 blank. Add a 2nd blank only for sentences over 60 characters that have a second strong candidate at least 3 words away from the first.
5. **Filtering:**
   - Drop sentences with no candidate above a minimum score.
   - Avoid the same answer appearing in more than 3 questions.
   - Never blank stop words, or answers of 1 syllable or 2 letters.
6. **Pool size:** up to about 1 question per 2 sentences of material. If the pool ends up with fewer than 5 questions, show "문제를 만들기엔 자료가 너무 짧아요" on the 문제 button.

### 4.3 Question presentation
- Show the paragraph title (if there is one) above the sentence as context, e.g. "훈민정음 · 창제 배경".
- Each blank is an underline about as long as its answer, and the answer's character count is shown faintly under the underline (e.g. `4자`). This tells the player how long the answer is, without hinting at what it is.
- **Hint (Tab key)**, in two steps for the current blank:
  1. The first press shows the chosung (Korean) or first letter (English).
  2. The second press reveals the answer, and the blank is graded as wrong.
- **"이 문제 빼기" button:** a small, low-emphasis button (and the shortcut `Esc` then `X`) on every question. It covers cases where the heuristics picked a bad blank.
  - It marks the question `excluded`, so it's never drawn again, and a new question is pulled in to replace it in the set of 10.
  - Excluded questions don't count toward the score.
  - A short toast "문제를 뺐어요 · 되돌리기" allows an undo for 5 seconds.
  - The material's 편집 screen lists excluded questions, so they can be restored.

### 4.4 Answer grading
- A blank is graded when the player types past it: a space or punctuation after the blank, or the end of the sentence.
- **Normalization before comparing:**
  - NFC normalization, trimmed, and runs of several spaces collapsed to one.
  - English answers are case-insensitive.
  - Full-width and half-width characters are treated as the same.
- The answer is **correct** only if the normalized input exactly matches the normalized answer, **including spacing**. For example, "세종 대왕" is wrong when the answer is "세종대왕". This is a deliberate choice: the material's exact wording is what's being memorized. There's no partial credit.
- Typos in the **visible parts** of the sentence count against accuracy and 타수, but **not** against the blank's correctness. A question is right or wrong based only on its blanks.

### 4.5 Scoring
- **정답률:** correct blanks / total blanks, counting only the first attempt for each question. Retries in the requeue are shown separately.
- Also shown: average 타수 and accuracy, the same metrics as 암기 모드.
- **Best score** per material is the best first-try accuracy rate, kept in IndexedDB.

### 4.6 Result screen
- 정답률 shown large (e.g. `8 / 10 · 80%`), the best score, 타수, and accuracy.
- **"틀린 문제"** list: each wrong question shows the sentence with the correct answer highlighted, and what the player typed struck through.
- Buttons:
  - "다시 풀기": a new set of 10, with questions answered wrong this time picked first.
  - "틀린 문장 암기하기": opens 암기 모드 on the paragraphs that contain the missed questions.
  - "라이브러리로".

---

## 5. Data & Storage

- **IndexedDB** (via a tiny wrapper such as `idb`). localStorage is too small for materials.
  - `materials`: id, title, source type, created and updated dates.
  - `paragraphs`: id, materialId, index, title, text.
  - `questions`: id, materialId, paragraphId, sentence, blanks (answer, start/end offset), lastSeenAt, timesWrong.
  - `history`: per-paragraph 암기 results (타수, accuracy, date) and per-session 문제 results (score, date, wrong question ids).
- **Backup:** "내보내기" downloads all data as a JSON file, and "가져오기" restores it. This is the only way to move to another browser or device.
- **Privacy note** in the footer: "모든 자료는 이 브라우저에만 저장되며 어디에도 전송되지 않아요."
- Request `navigator.storage.persist()` after the first import.

---

## 6. Screens & Flow

```
[Library] --+ 자료 추가--> [Import] --> [Preview & Edit] --저장--> [Library]
    |--암기--> [Memorize: type along] --stop/end--> [암기 summary] --문제로 확인--> [Quiz]
    |--문제--> [Quiz: 10 questions + requeue] --> [Quiz result] --틀린 문장 암기하기--> [Memorize]
    \--통계--> [Material stats]
```

- **First visit (empty library, no saved data):** the library shows a hero card, "「서시」로 바로 체험하기", with two buttons, "암기" and "문제", so first-time visitors can try both modes in one click without importing anything.
  - Below it is a one-line pitch, "내 자료를 넣으면 타자 연습 세트와 문제가 만들어져요", and the "+ 자료 추가" button.
  - The other samples are listed below in smaller type.
  - After the visitor finishes a sample session, the result screen suggests "내 자료로 해보기".
- **Library (returning users):** material cards and "+ 자료 추가".
- **Typing screen (both modes):**
  - A single centered text column with a minimal top bar: material title, progress (`문단 12 / 42` or `문제 4 / 10`), a mode badge, and live 타수 and accuracy (these can be hidden).
  - **Focus mode:** after 2 seconds of typing, all chrome fades out and only the text remains. Moving the mouse brings it back.
- **Material stats:** a 타수 trend chart, 문제 scores over time, and the most-missed answers.

---

## 7. Visual Direction — calm focus mode

- **Feel:** a quiet desk with a good notebook. Calm, warm, and free of distractions.
- **Palette:**
  - Light mode: warm paper background (`#F7F3EA`), soft ink text (`#2B2A27`), and one muted accent (a deep green or ink blue) for the caret and progress.
  - Dark "밤 공부" mode: warm charcoal with sepia-tinted text. It follows the system setting and can be toggled.
  - Errors use a desaturated brick red, never a harsh red.
- **Typography:**
  - Study text: a readable serif (Noto Serif KR or MaruBuri) at 20–22 px, with 1.8 line height and a max width of about 680 px.
  - UI text: Pretendard.
- **Emphasis:** the current line is in full contrast, and other lines fade to about 40%. In 문제 모드, the active blank's underline thickens and glows softly in the accent color.
- **Motion:** minimal and gentle. The caret glides, ✓/✗ marks fade in over 150 ms, and a correct blank briefly shows its answer in the accent ink. There's no confetti, shaking, or sound by default. An optional soft keystroke sound can be turned on in settings.
- With `prefers-reduced-motion`, the caret jumps and fades are disabled.

---

## 8. Technical Notes

- **Stack:** Vite + TypeScript, DOM rendering. A light framework (Preact or Svelte) is fine for the library and stats screens. The typing surface should be a hand-written component, shared by both modes.
- **Input capture:** a hidden `<textarea>` keeps focus and receives IME input. On each `input` / `compositionupdate` / `compositionend`, diff the value against the target. Don't rely on `keydown` for Hangul (it reports `keyCode 229` during composition).
- **Shared typing engine:** takes a target made of segments, either `visible` text or `blank` (answer). It works the same in both modes; in 암기 모드, every segment is `visible`.
- **Jamo utilities:** decompose and compose syllables (U+AC00 arithmetic) and split compound jamo. These are used for prefix matching, keystroke counting, and chosung hints. Unit-test them.
- **Question generator:** a pure function `(paragraphs) → Question[]`, unit-tested on the sample materials and a few real study notes. Strip particles with a small handwritten list of common 조사 (은/는/이/가/을/를/의/에/에서/으로/로/와/과/도/만/까지/부터/이라고/라고/이란/란 …).
- **PDF:** load `pdfjs-dist` with a dynamic `import()` only when a PDF is chosen, and run extraction in its worker, showing progress per page.
- **Encoding detection:** `TextDecoder('utf-8', { fatal: true })`, falling back to `TextDecoder('euc-kr')`.
- **Performance:** keystroke-to-render under 16 ms for 600-character paragraphs, re-rendering only the spans that changed. The initial bundle should be under 150 KB gzipped, excluding pdf.js and fonts.
- **Mobile:** usable, but designed around a physical keyboard. Show a "키보드 사용을 추천해요" banner on touch-only devices.

---

## 9. Acceptance Criteria

- [ ] Paste, `.txt` (UTF-8 and EUC-KR), `.md`, and text-layer PDF imports produce clean paragraphs in the preview. Scanned PDFs show the "not supported" message.
- [ ] Paragraphs over 600 characters are split at sentence boundaries.
- [ ] **암기:** typing ㄱ → 가 → 각 toward target 각 is never shown as an error, and 간 is. 타수 follows the 두벌식 counting rules (ㅘ = 2, ㄲ = 1).
- [ ] **문제:** "훈민정음은 1443년 세종대왕이 창제하였다." produces a question that blanks 1443년 or 세종대왕, with any particle left visible.
- [ ] Definition-pattern sentences ("A란 …", "…를 A라고 한다") blank the term A.
- [ ] In a quiz, typos in the visible parts don't make a question wrong. A wrong blank does, and that question is requeued within the session (at most 2 times).
- [ ] Tab hint shows the chosung or first letter, then the answer. Revealing the answer marks the blank wrong.
- [ ] The result screen lists wrong questions with the correct answers, and "틀린 문장 암기하기" opens the matching paragraphs in 암기 모드.
- [ ] Materials with fewer than 5 possible questions show the "too short" message.
- [ ] "이 문제 빼기" removes the question from the current set and all future sets, pulls in a replacement, can be undone for 5 seconds, and can be restored from 편집.
- [ ] Answers are graded by exact match, including spacing ("세종 대왕" ≠ "세종대왕").
- [ ] A first-time visitor can start the 「서시」 sample in 암기 or 문제 mode with one click.
- [ ] All data survives a reload. Export and then import into a fresh browser profile restores everything.
- [ ] No network requests carry material content (verified in DevTools).

---

## 10. Open Questions / Future Ideas

- **Editing blanks:** let the player click words in a question preview to add or remove blanks. v1 only has "이 문제 빼기".
- **Wrong-answer notebook and cross-day review:** carry missed questions across sessions and bring them back on a schedule.
- **AI question mode (opt-in):** a "AI로 문제 만들기" button that calls the Claude API through a serverless function, for real question-and-answer items. This would need explicit consent, because the material would be sent to a server.
- **Question set size and difficulty options:** v1 is fixed at 10 questions. Later, offer 5 or 20 questions, plus an "all questions" exam run.
- **Answer leniency:** v1 grades exact matches only. Accepting spacing differences could become an option later.
- **URL import** through a serverless function, plus Readability.
