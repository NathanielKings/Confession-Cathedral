# Lie Detector — Confession Cathedral Quiz

## The Five Statements

1. The `sanitize` function defends against XSS by assigning user input to `textContent` rather than `innerHTML`.

2. `ConfessionCard` uses `React.memo`, so it only re-renders when its own `confession` prop changes.

3. The app writes to `localStorage` on every keystroke to prevent data loss.

4. When the confession list exceeds 500 entries, the oldest ones are dropped.

5. The `loadConfessions` function sanitizes every confession's text a second time when reading from `localStorage`.

## The Guess

Statement **3**.

## The Reveal

Statement 3 is indeed the lie. The app does **not** write to `localStorage` on every keystroke. It uses a 300ms debounce via `setTimeout` / `clearTimeout` inside a `useEffect` — so writes only happen after the user stops typing for 300 milliseconds. The other four statements are all true:

- **1** — `sanitize` creates a detached `<div>`, sets its `textContent` (which auto-escapes HTML entities), and reads back `innerHTML`. No injected markup ever executes.

- **2** — `ConfessionCard` is wrapped in `memo()`, which does a shallow prop comparison. Since each card gets a different `confession` object with a unique `id`, existing cards skip re-render when a new one is added.

- **4** — `handleSubmit` checks `next.length > MAX_CONFESSIONS` (500) and slices to keep only the first 500 items. Since new confessions are prepended, the oldest (at the end) get dropped.

- **5** — `loadConfessions` maps over parsed JSON and calls `sanitize(c.text)` on every entry, even though they were sanitized before storage. This is a defense-in-depth measure in case localStorage was tampered with directly.
