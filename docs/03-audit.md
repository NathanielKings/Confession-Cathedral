# Codebase Audit — Confession Cathedral

Hello! Think of this as a friendly checkup. Nothing here is a disaster — the
app works and React's defaults protect you from the worst mistakes. But every
codebase has rough edges, and the best time to smooth them is when the project
is still small. Let's look at what's here, what could go wrong, and how to fix
it — one issue at a time.

---

## 1. XSS (Cross-Site Scripting)

### 1.1 — User text is rendered directly into the page

**Where:** `src/App.tsx:76`

```tsx
<p className="confession-text">{c.text}</p>
```

**What's happening:** A user types text. That text is stored. Then it's injected
into a `<p>` tag via JSX.

**Is it safe right now?** Yes — and the reason matters.

React **automatically escapes** all values you put inside `{ }` in JSX. If
someone types `<script>alert('pwned')</script>`, React will render it as
literal text on the screen, not as an executable `<script>` tag. The browser
will show the angle brackets, not run them. This is one of React's best design
decisions.

**So why is this still worth mentioning?** Because safety depends on a
*convention*, not a *guarantee*. If a future developer (or future you) decides
to use `dangerouslySetInnerHTML` on that same text — perhaps to support
markdown formatting — the XSS floodgate opens instantly. The code would go
from safe to vulnerable with a one-line change and no compiler warning.

**The fix — defense in depth:** Add an explicit sanitization step before
rendering. This way, even if someone later reaches for
`dangerouslySetInnerHTML`, the content is already clean.

```tsx
// A tiny sanitizer that strips HTML tags from a string.
// Place this at the top of App.tsx (above the Confession interface).
function sanitize(raw: string): string {
  const div = document.createElement('div')
  div.textContent = raw
  return div.innerHTML
}
```

Then sanitize when storing the confession:

```tsx
// Inside handleSubmit, replace line 35:
setConfessions(prev => [
  { text: sanitize(trimmed), time: new Date() },
  ...prev,
])
```

What this does: `textContent` assignment tells the browser "treat this as
plain text, not HTML." Reading back `.innerHTML` gives you the
entity-escaped version. Any `<script>`, `<img onerror=...>`, or other
nastiness becomes harmless literal characters like `&lt;script&gt;`.

**Does React already do this?** Yes, for JSX interpolation. But sanitizing at
the *data layer* means the stored data itself is safe. If the data ever leaves
the app (an API, a share feature, an export), it won't carry a payload.

---

### 1.2 — localStorage is a trusted-but-tamperable data source

**Where:** `src/App.tsx:13-16`

```tsx
const raw = localStorage.getItem(STORAGE_KEY)
if (!raw) return []
const parsed: { text: string; time: string }[] = JSON.parse(raw)
return parsed.map(c => ({ text: c.text, time: new Date(c.time) }))
```

**What's happening:** On every page load, the app reads confessions from
localStorage and trusts the content completely.

**The risk:** A user can open their browser's DevTools, edit the localStorage
value, and inject arbitrary strings. In a *client-side-only* app like this
one, that's not a security vulnerability — users can only attack themselves.
But if this app ever grows a backend where confessions are synced between
users, suddenly user A could inject a script that renders in user B's browser.

**The fix:** Apply the same `sanitize()` function when *loading* from
localStorage, so even tampered data is harmless:

```tsx
function loadConfessions(): Confession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: { text: string; time: string }[] = JSON.parse(raw)
    return parsed.map(c => ({
      text: sanitize(c.text),     // ← sanitize on the way IN, too
      time: new Date(c.time),
    }))
  } catch {
    return []
  }
}
```

Now the data is cleaned at both entry points: when a user types it (the
`handleSubmit` sanitize) and when it's loaded from storage (the
`loadConfessions` sanitize). Two locks on the same door.

---

## 2. Accessibility

### 2.1 — The textarea has no label

**Where:** `src/App.tsx:52-58`

```tsx
<textarea
  className="confession-input"
  value={text}
  onChange={e => setText(e.target.value)}
  placeholder="Speak your confession..."
  rows={4}
/>
```

**The problem:** A screen reader user tabs into this field and hears...
nothing useful. The `placeholder` attribute is not a label. Placeholders
disappear as soon as the user starts typing, they have low contrast by
default, and some screen readers skip them entirely.

**The fix — add a proper `<label>`:**

```tsx
<label htmlFor="confession-input" className="visually-hidden">
  Your confession
</label>
<textarea
  id="confession-input"
  className="confession-input"
  value={text}
  onChange={e => setText(e.target.value)}
  placeholder="Speak your confession..."
  rows={4}
/>
```

And in `App.css`, add a utility class that hides the label visually but
keeps it available to screen readers:

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

This is the standard `.sr-only` / `.visually-hidden` pattern used by
bootstrap, Tailwind, and every major design system. The label is invisible
to sighted users (the placeholder handles that job) but screen readers
announce "Your confession, edit text" when the field receives focus.

---

### 2.2 — The character counter is invisible to screen readers

**Where:** `src/App.tsx:60-62`

```tsx
<span className={`char-counter ${remaining < 0 ? 'over' : ''}`}>
  {remaining}
</span>
```

**The problem:** As the user types, the number changes — but a screen reader
announces nothing. The user has no idea they're approaching or have exceeded
the 280-character limit until they try to submit and... nothing happens (the
guard clause silently swallows the submission).

**The fix — give the counter a `role="status"` and an `aria-label`:**

```tsx
<span
  role="status"
  aria-label={`${remaining} characters remaining`}
  aria-live="polite"
  className={`char-counter ${remaining < 0 ? 'over' : ''}`}
>
  {remaining}
</span>
```

- `role="status"` tells assistive tech "this region updates dynamically."
- `aria-live="polite"` means "announce changes, but wait until the user
  finishes what they're doing."
- `aria-label` gives a human-readable announcement instead of just a number.

Now connect the textarea to the counter with `aria-describedby`:

```tsx
<textarea
  id="confession-input"
  aria-describedby="char-counter-desc"
  ...
/>
<span
  id="char-counter-desc"
  role="status"
  aria-live="polite"
  ...
>
  {remaining}
</span>
```

Screen readers will now say: "Your confession, edit text. 280 characters
remaining." And on every keystroke: "279 characters remaining."

---

### 2.3 — New confessions appear without announcement

**Where:** `src/App.tsx:73-82`

```tsx
<div className="feed">
  {confessions.map((c, i) => (
    <div key={i} className="confession-card">
      ...
    </div>
  ))}
</div>
```

**The problem:** A screen reader user submits a confession, the card appears
at the top of the feed with a nice fade-in animation — and the user has no
idea anything happened. They might submit the same confession three times
thinking the button didn't work.

**The fix — add `aria-live` to the feed container:**

```tsx
<div className="feed" aria-label="Confession feed" aria-live="polite">
  {confessions.map((c, i) => (
    <div key={i} className="confession-card">
      ...
    </div>
  ))}
</div>
```

`aria-live="polite"` tells assistive tech: "when children are added or removed
from this container, announce it — but don't interrupt the user." The
screen reader will read the new confession's text automatically.

**A note on `aria-live` and `.map()`:** React's reconciliation means only
*changed* DOM nodes are touched. When a new confession is prepended, React
inserts one new `<div>` at the top. `aria-live` regions detect DOM additions
and announce them. Existing cards are left alone and not re-announced.

---

### 2.4 — The empty-state message appears/disappears silently

**Where:** `src/App.tsx:69-71`

```tsx
{confessions.length === 0 && (
  <p className="empty-message">No confessions yet. Be the first.</p>
)}
```

**The problem:** Same pattern — a chunk of text appears or vanishes based on
state, and no assistive tech is told about it.

**The fix — wrap it in a live region:**

```tsx
<div aria-live="polite">
  {confessions.length === 0 && (
    <p className="empty-message">No confessions yet. Be the first.</p>
  )}
</div>
```

Now when the first confession is posted and the empty message disappears,
the screen reader announces the new feed content (via the feed's
`aria-live` from 2.3). When the last confession is deleted (future feature),
the empty message re-appears and is announced.

---

### 2.5 — The focus indicator is removed without a replacement

**Where:** `src/App.css:65` and `src/App.css:69-71`

```css
.confession-input {
  outline: none;            /* ← removes the browser's default focus ring */
}
.confession-input:focus {
  border-color: var(--accent);   /* ← border color change as the ONLY focus cue */
}
```

**The problem:** `outline: none` disables the browser's built-in focus ring
(the dotted or glowing rectangle). The only remaining focus indicator is a
border color change from `#2a2a3a` to `#c084fc` — two dark, low-contrast
colors. This fails **WCAG Success Criterion 2.4.7 (Focus Visible)**:

> Any keyboard operable user interface has a mode of operation where the
> keyboard focus indicator is visible.

A color-only change does not satisfy this criterion because:
1. Users with color blindness may not perceive the difference.
2. Even for users who can see color, a 1px border color shift is subtle.
3. Windows High Contrast Mode strips CSS `border-color` but respects
   `outline`.

**The fix — replace `outline: none` with a deliberate, visible focus style:**

```css
.confession-input {
  /* Remove `outline: none;` — delete that line entirely */
  outline: 2px solid transparent;
  outline-offset: 2px;
}
.confession-input:focus {
  border-color: var(--accent);
  outline-color: var(--accent);  /* ← adds a visible ring, not just border */
}
```

This gives *two* focus indicators — the border changes color AND a 2px
outline ring appears around the textarea. The outline uses `var(--accent)`
(which is bright purple `#c084fc`), providing roughly a 4.5:1 contrast
ratio against the dark background, meeting WCAG AA requirements.

---

### 2.6 — Missing `maxlength` on the textarea

**Where:** `src/App.tsx:52-58`

**The problem:** The 280-character limit is enforced in JavaScript (the guard
clause discards long confessions and the counter turns red), but the HTML
`<textarea>` itself has no `maxlength` attribute. Screen readers don't
announce the limit, and some assistive technologies can't detect the
JavaScript-enforced constraint.

**The fix — add the attribute:**

```tsx
<textarea
  maxLength={280}
  ...
/>
```

This gives the browser a native way to cap input. Combined with
`aria-describedby` pointing to the counter, the screen reader experience
becomes: "Your confession, edit text. 280 characters remaining. Maximum
length 280 characters."

---

### 2.7 — No focus management after submission

**Where:** `src/App.tsx:32-37`

```tsx
const handleSubmit = useCallback(() => {
  const trimmed = text.trim()
  if (trimmed.length === 0) return
  setConfessions(prev => [{ text: trimmed, time: new Date() }, ...prev])
  setText('')
}, [text])
```

**The problem:** After the user submits a confession, focus stays on the
"Confess" button. To type another confession, they must manually navigate
back to the textarea. For keyboard-only users, this is friction on every
single submission.

**The fix — return focus to the textarea after submission:**

```tsx
const textareaRef = useRef<HTMLTextAreaElement>(null)

const handleSubmit = useCallback(() => {
  const trimmed = text.trim()
  if (trimmed.length === 0) return
  setConfessions(prev => [{ text: trimmed, time: new Date() }, ...prev])
  setText('')
  textareaRef.current?.focus()
}, [text])
```

And attach the ref to the textarea:

```tsx
<textarea
  ref={textareaRef}
  ...
/>
```

Now after every confession, the cursor returns to the textarea, ready for
the next one. (Don't forget to add `useRef` to the React import at line 1.)

---

## 3. Performance for Long Lists

### 3.1 — No virtualization: every confession lives in the DOM forever

**Where:** `src/App.tsx:74-81`

```tsx
{confessions.map((c, i) => (
  <div key={i} className="confession-card">
    ...
  </div>
))}
```

**The problem:** Every confession ever posted creates a permanent DOM node.
At 100 confessions, this is fine. At 1,000, the browser is managing ~4,000
DOM nodes (each card is a `<div>` > `<p>` > text + `<time>`). At 10,000,
you'll feel the lag on every keystroke because React's reconciliation walks
the entire list, and the browser's layout engine must account for every node.

Additionally, `localStorage` is capped at ~5MB per origin. At 280 characters
per confession (~300 bytes with JSON overhead), that's roughly 17,000
confessions before storage fails. The DOM will choke long before that.

**The fix — cap the stored confessions to a reasonable maximum:**

```tsx
const MAX_CONFESSIONS = 500

const handleSubmit = useCallback(() => {
  const trimmed = text.trim()
  if (trimmed.length === 0) return
  setConfessions(prev => {
    const next = [{ text: trimmed, time: new Date() }, ...prev]
    return next.length > MAX_CONFESSIONS
      ? next.slice(0, MAX_CONFESSIONS)
      : next
  })
  setText('')
}, [text])
```

This guarantees the DOM never exceeds 500 cards. At ~280 characters each
with markup, that's roughly 1,000 DOM nodes — comfortable for any browser.

**For true infinite scroll (future work):** If you want unlimited confessions,
swap `.map()` for a virtualized list library like `@tanstack/react-virtual`
or `react-window`. These libraries render only the ~10-20 cards currently
visible in the viewport and recycle DOM nodes as the user scrolls. But for a
confession wall that's primarily read top-to-bottom, a cap is simpler and
more honest.

---

### 3.2 — Index-as-key is a ticking time bomb

**Where:** `src/App.tsx:75`

```tsx
{confessions.map((c, i) => (
  <div key={i} className="confession-card">
```

**The problem:** Using the array index (`i`) as the `key` prop works
*correctly* only when the list is static — items never reorder, never delete,
and insertions always happen at the end. Right now, insertions happen at the
*beginning* (prepend), which means:

1. A new confession is added at index 0.
2. The previous index-0 card shifts to index 1, index-1 shifts to index 2, etc.
3. Every card's key changes.
4. React sees a new key at position 0 (new card), but also sees the key that
   *used* to be at position 1 is now at position 2 — it can't tell those are
   the same card, so it unmounts and remounts EVERY card.
5. All 500 cards re-trigger their `fadeIn` animation simultaneously.

**Wait — does this actually happen?** In React's current reconciliation
algorithm: when you prepend and use index keys, React *does* recognize that
`key=0` moved to `key=1` because the key values are sequential integers. It
will move the DOM nodes rather than destroy/recreate them. But this is an
*implementation detail*, not a guarantee. Future versions of React, or
different reconcilers, may behave differently.

The bigger problem is that `key={i}` prevents React from correctly preserving
component *state* if cards ever have their own state (e.g., an "expand" toggle,
a "like" button, or editing mode). The card for confession #3 might suddenly
inherit the state of what *used* to be confession #2.

**The fix — use a stable unique identifier:**

```tsx
interface Confession {
  id: string    // ← add this
  text: string
  time: Date
}
```

Generate an ID when creating the confession:

```tsx
setConfessions(prev => [
  { id: crypto.randomUUID(), text: trimmed, time: new Date() },
  ...prev,
])
```

Then use it as the key:

```tsx
{confessions.map(c => (
  <div key={c.id} className="confession-card">
```

Now every confession has a permanent identity. If the list is sorted,
filtered, or paginated, React always knows exactly which DOM node belongs
to which data item. The `fadeIn` animation plays only once — when a card
first enters the DOM.

---

### 3.3 — `useCallback` is providing zero benefit

**Where:** `src/App.tsx:32-37`

```tsx
const handleSubmit = useCallback(() => {
  const trimmed = text.trim()
  if (trimmed.length === 0) return
  setConfessions(prev => [{ text: trimmed, time: new Date() }, ...prev])
  setText('')
}, [text])
```

**The problem:** The dependency array is `[text]`. `text` changes on every
keystroke. That means `useCallback` re-creates the function on every keystroke
— exactly what it's supposed to prevent.

If `handleSubmit` were passed as a prop to a memoized child component, this
would still be useful (it would prevent recreation on renders caused by
`confessions` changes). But in a single-component app, there are no child
components. The `useCallback` wrapper is dead weight — it adds cognitive
overhead, an extra dependency array to maintain, and saves nothing.

**The fix — remove `useCallback`:**

```tsx
// Before:
const handleSubmit = useCallback(() => { ... }, [text])

// After — just a plain function:
function handleSubmit() {
  const trimmed = text.trim()
  if (trimmed.length === 0) return
  setConfessions(prev => [{ text: sanitize(trimmed), time: new Date() }, ...prev])
  setText('')
  textareaRef.current?.focus()
}
```

The function reads `text` from the closure, which is always the latest value
because the component re-renders on every `text` change anyway. No stale
closure problem. No dependency array to maintain.

**When would `useCallback` actually help here?** Only if `handleSubmit` were
passed as a prop to a child wrapped in `React.memo`. Then `useCallback` would
prevent the child from re-rendering when `confessions` changes but `text`
hasn't. For a single-component app, it's pure overhead.

(You'll also need to remove `useCallback` from the import at line 1 and add
`useRef` if implementing the focus-management fix from 2.7.)

---

## 4. Anti-Patterns

### 4.1 — The entire app is one giant component

**Where:** `src/App.tsx:22-85`

**The problem:** All state, all handlers, all JSX, all logic — one function.
As the app grows (moderation, filtering, routing, themes, user accounts),
this file becomes unmaintainable. Changes to the form risk breaking the feed.
Changes to the feed risk breaking localStorage logic. A new developer (or
future you) must understand the whole thing before touching any part.

**The fix — split into focused components:**

```
src/
├── App.tsx              ← state owner, localStorage, top-level layout
├── components/
│   ├── ConfessionForm.tsx
│   ├── ConfessionFeed.tsx
│   └── ConfessionCard.tsx
```

`App.tsx` keeps the state and passes it down:

```tsx
function App() {
  const [text, setText] = useState('')
  const [confessions, setConfessions] = useState<Confession[]>(loadConfessions)

  return (
    <div className="app">
      <header><h1>Confession Cathedral</h1></header>
      <ConfessionForm
        text={text}
        onTextChange={setText}
        onSubmit={handleSubmit}
      />
      <ConfessionFeed confessions={confessions} />
    </div>
  )
}
```

`ConfessionForm.tsx` owns only form-related markup:

```tsx
function ConfessionForm({
  text, onTextChange, onSubmit,
}: {
  text: string
  onTextChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit() }}>
      ...
    </form>
  )
}
```

`ConfessionCard.tsx` can be wrapped in `React.memo` so individual cards
don't re-render when a new confession is posted — only the new card renders.

This is the "lift state, pass props" pattern. The `principles` document
already touched on it — now it's time to actually do it.

---

### 4.2 — Inline arrow functions in JSX create new references every render

**Where:** `src/App.tsx:47-49,55`

```tsx
onSubmit={e => {
  e.preventDefault()
  handleSubmit()
}}
```

```tsx
onChange={e => setText(e.target.value)}
```

**The problem:** Every time `App` renders (every keystroke!), these arrow
functions are re-created. For `onChange`, this is unavoidable — it needs
the event object. For `onSubmit`, the `e.preventDefault()` wrapper could
live inside `handleSubmit` so the prop is just the function reference.

**The fix — move `preventDefault` into the handler:**

```tsx
function handleSubmit(e?: React.FormEvent) {
  e?.preventDefault()
  const trimmed = text.trim()
  if (trimmed.length === 0) return
  setConfessions(prev => [{ text: sanitize(trimmed), time: new Date() }, ...prev])
  setText('')
  textareaRef.current?.focus()
}
```

Now the JSX becomes:

```tsx
<form className="confession-form" onSubmit={handleSubmit}>
```

Cleaner, and React receives the same function reference across renders
instead of a brand-new arrow function each time.

---

### 4.3 — `word-break: break-word` is non-standard CSS

**Where:** `src/App.css:148`

```css
.confession-text {
  white-space: pre-wrap;
  word-break: break-word;    /* ← this value was never in the spec */
}
```

**The problem:** `word-break: break-word` was implemented by some browsers
(Chrome, Safari) but never standardized. It's deprecated in favor of the
`overflow-wrap` property.

**The fix:**

```css
.confession-text {
  white-space: pre-wrap;
  overflow-wrap: break-word;   /* standard property for breaking long words */
  word-break: break-word;      /* keep as legacy fallback for older browsers */
}
```

Or, if you want aggressive breaking (break anywhere, even mid-word at any
character, useful for very long unbroken strings like URLs):

```css
.confession-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;     /* breaks at any point if needed */
}
```

`overflow-wrap: break-word` is the standard, well-supported approach.
It only breaks words that would otherwise overflow — normal words stay intact.

---

### 4.4 — No error boundary: one crash whitescreens the whole app

**Where:** The entire app is unprotected (`src/App.tsx:22-85`)

**The problem:** If any render throws an uncaught error — a malformed Date
from corrupted localStorage, a third-party script injecting something
unexpected, a future feature with a bug — the entire React tree unmounts.
The user sees a blank white page with no explanation.

React 16+ provides **Error Boundaries** for exactly this. They catch render
errors and display a fallback UI instead of crashing the whole app.

**The fix — add an error boundary component:**

```tsx
// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app">
          <header>
            <h1>Confession Cathedral</h1>
          </header>
          <p className="empty-message">
            Something went wrong. Please refresh the page.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
```

Wrap the app in `main.tsx`:

```tsx
createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
```

Now a render crash shows a graceful message instead of a white void.

---

### 4.5 — localStorage writes on every `confessions` change with no debounce

**Where:** `src/App.tsx:26-28`

```tsx
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(confessions))
}, [confessions])
```

**The problem:** This writes to localStorage synchronously on every single
confession addition. `JSON.stringify` on a 500-item array every time is
cheap (~150KB of JSON), and `localStorage.setItem` is synchronous and fast.
In practice, this isn't a real bottleneck.

**But** — if the app ever adds features like batch import, edit, or delete
(which touch `confessions` multiple times in quick succession), this could
write to disk unnecessarily.

**The fix (optional, for future-proofing) — debounce the write:**

```tsx
useEffect(() => {
  const id = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(confessions))
  }, 300)
  return () => clearTimeout(id)   // cleanup: cancel if confessions changes again
}, [confessions])
```

Now rapid consecutive changes (e.g., importing 50 confessions at once) only
trigger one write, 300ms after the last change.

---

## Summary — What to Fix First

If you only have 30 minutes, fix these in order:

| Priority | Issue | Impact |
|---|---|---|
| **1** | Add visible focus indicator (2.5) | Keyboard users literally cannot see where they are |
| **2** | Add `<label>` for textarea (2.1) | Screen reader users cannot use the form |
| **3** | Add `aria-live` to feed (2.3) | Screen reader users don't know confessions were posted |
| **4** | Cap localStorage confessions (3.1) | Prevents DOM bloat and storage exhaustion |
| **5** | Add stable `key` with unique IDs (3.2) | Prevents subtle render bugs as features grow |
| **6** | Sanitize text on store + load (1.1, 1.2) | Defense in depth against XSS |
| **7** | Remove `useCallback` (3.3) | Removes dead code, simplifies mental model |
| **8** | Split into components (4.1) | Keeps the codebase maintainable as it grows |

Every fix above is 2–10 lines of code. None require new dependencies. None
change the app's visual design or behavior. They're invisible improvements
that make the app safer, more inclusive, and more maintainable.
