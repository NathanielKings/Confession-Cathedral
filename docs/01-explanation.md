# Confession Cathedral — A Complete Walkthrough

## 1. What Is This?

This is a tiny web app. It lets you type a secret message (a "confession") and
post it to a public wall. Everyone visiting the page sees everyone else's
confessions. It works in one browser tab — there is no database and nothing
saved permanently.

Think of it as a digital sticky-note wall inside a make-believe cathedral.

---

## 2. The Building Blocks (Project Structure)

```
Confession Cathedral/
├── index.html          ← The front door — the browser opens this first
├── package.json        ← The shopping list of tools the project needs
├── tsconfig.json       ← Rules for TypeScript (JavaScript with training wheels)
├── vite.config.ts      ← Instructions for the builder tool (Vite)
├── public/
│   ├── favicon.svg     ← The tiny icon in the browser tab
│   └── icons.svg       ← A bag of SVG icons (not currently used by the app)
├── src/
│   ├── main.tsx        ← The ignition key — starts the whole app
│   ├── App.tsx         ← The brain — all the logic lives here
│   └── App.css         ← The wardrobe — all the colors, spacing, and animations
└── docs/
    └── 01-explanation.md  ← This file!
```

---

## 3. How a Page Loads (The Startup Sequence)

### Step 1: `index.html` loads

```html
<div id="app"></div>
<script type="module" src="/src/main.tsx"></script>
```

The browser sees an empty `<div>` with the id `app`. Then it runs the
TypeScript file `main.tsx`.

### Step 2: `main.tsx` boots React

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

This does three things:

1. It finds the empty `<div id="app">` in the HTML.
2. It creates a "React root" — a little universe where React is in charge.
3. It tells React to paint the `<App />` component inside that div.

`<StrictMode>` is like wearing a seatbelt during development. It doesn't
change how the app looks, but it helps catch mistakes by running things
twice on purpose.

### Step 3: `App.tsx` runs

This is where the actual app begins. Let's go line by line.

---

## 4. The Brain: `App.tsx` — Line-by-Line

### Imports

```tsx
import { useState, useCallback } from 'react'
import './App.css'
```

- `useState` — a "memory hook" that lets the component remember things.
- `useCallback` — a "sticky-note hook" that keeps a function from being
  re-created on every render.
- `'./App.css'` — pulls in the wardrobe file (styles).

### The Confession Shape

```tsx
interface Confession {
  text: string
  time: Date
}
```

This is a TypeScript "interface" — a promise that says: every confession
must have a `text` (the words typed) and a `time` (when it was posted).

### The Two Pieces of Memory (State)

```tsx
const [text, setText] = useState('')
const [confessions, setConfessions] = useState<Confession[]>([])
```

React's `useState` gives you two things in a pair:

| Variable | What it holds | Starting value |
|---|---|---|
| `text` | Whatever is typed in the text box *right now* | `''` (empty string) |
| `confessions` | A list of every confession ever posted | `[]` (empty array) |
| `setText` | A setter — call it to change `text` | |
| `setConfessions` | A setter — call it to change `confessions` | |

These two variables are the *entire memory* of the app. When either one
changes, React automatically repaints the screen.

### The Character Counter

```tsx
const remaining = 280 - text.length
```

`text.length` is the number of letters typed so far. Subtract that from 280
and you get how many letters are left. If `remaining` goes negative, the user
has typed too much.

### The Submit Handler

```tsx
const handleSubmit = useCallback(() => {
  const trimmed = text.trim()
  if (trimmed.length === 0) return
  setConfessions(prev => [{ text: trimmed, time: new Date() }, ...prev])
  setText('')
}, [text])
```

When the user clicks **Confess**, here's what happens:

1. **Trim the text** — remove extra spaces from the beginning and end.
2. **Guard clause** — if nothing is left after trimming, stop right here
   (don't create an empty confession).
3. **Add the new confession** — `setConfessions` is called with a *function*
   (not a value). This is important! The function receives the *previous*
   list (`prev`) and returns a *new* list with the fresh confession at the
   front. Using `prev => [...]` guarantees we never lose any confessions,
   even if React batches multiple updates together.
4. **Clear the input** — `setText('')` empties the text box so the user can
   type another confession.

#### Why `useCallback`?

Without `useCallback`, the `handleSubmit` function would be rebuilt from
scratch every time the component renders (i.e., every keystroke). The
`[text]` dependency says: "only rebuild this function when `text` changes."
This is a small performance optimization for a small app.

### The Return Value (What You See on Screen)

```tsx
return (
  <div className="app">
    ...
  </div>
)
```

Everything inside the `return (...)` is JSX — it looks like HTML but is
actually JavaScript. React turns this into real DOM elements on the page.

#### The Header

```tsx
<header>
  <h1>Confession Cathedral</h1>
</header>
```

Just the title at the top. Styled purple by the CSS variable `--accent`.

#### The Form — Controlled Input

```tsx
<form
  className="confession-form"
  onSubmit={e => {
    e.preventDefault()
    handleSubmit()
  }}
>
```

- `onSubmit` fires when the user presses Enter in the textarea or clicks the
  **Confess** button.
- `e.preventDefault()` stops the browser from doing its default form behavior
  (which would reload the page). We want to stay on the page and handle the
  submission with our own code.

```tsx
<textarea
  className="confession-input"
  value={text}
  onChange={e => setText(e.target.value)}
  placeholder="Speak your confession..."
  rows={4}
/>
```

**This is the controlled input.** Here's why it's called "controlled":

1. The `value` is locked to the `text` state variable. The textarea *cannot*
   show anything that isn't in `text`.
2. Every keystroke fires `onChange`, which calls `setText(e.target.value)`.
3. That updates the `text` state, which triggers a re-render, which updates
   the `value` prop on the textarea.

The flow is a perfect loop:

```
User types → onChange fires → setText(newValue) → text state changes
→ React re-renders → textarea shows new value
```

There is no gap where the textarea's visual content and React's memory
disagree. React is the *single source of truth*.

> **Contrast with an "uncontrolled" input:** An uncontrolled input would let
> the DOM manage its own value (using `ref`), and React would only check it
> when needed. Here, React manages every letter.

#### The Footer — Counter + Button

```tsx
<div className="form-footer">
  <span className={`char-counter ${remaining < 0 ? 'over' : ''}`}>
    {remaining}
  </span>
  <button type="submit" className="submit-btn">
    Confess
  </button>
</div>
```

- **Character counter** — shows the `remaining` value. If it drops below 0,
  the CSS class `over` is added, which turns the text red (`--danger` color).
- **Submit button** — triggers the form's `onSubmit`.

#### The Empty State Message

```tsx
{confessions.length === 0 && (
  <p className="empty-message">No confessions yet. Be the first.</p>
)}
```

This is *conditional rendering*. The `<p>` only appears when the confessions
list is empty. As soon as the first confession is posted, it disappears.

#### The Confession Feed

```tsx
<div className="feed">
  {confessions.map((c, i) => (
    <div key={i} className="confession-card">
      <p className="confession-text">{c.text}</p>
      <time className="confession-time">
        {c.time.toLocaleString()}
      </time>
    </div>
  ))}
</div>
```

- `.map()` loops over every confession and creates a "card" for each one.
- `key={i}` gives each card a unique identifier so React can track them
  efficiently when the list changes. (Using the index `i` is acceptable here
  because the list is only ever prepended — items never reorder or delete.)
- Each card shows the confession text and a timestamp.

---

## 5. The Wardrobe: `App.css` — Style & Animation Deep Dive

### CSS Custom Properties (The Color Palette)

```css
:root {
  --bg: #0f0f14;        /* Very dark purple-black background */
  --surface: #1a1a24;   /* Slightly lighter card/form backgrounds */
  --border: #2a2a3a;    /* Subtle borders */
  --text: #d4d4dc;      /* Light gray body text */
  --text-muted: #6b6b7b;/* Dim gray secondary text */
  --accent: #c084fc;    /* Bright purple for highlights */
  --danger: #f87171;    /* Red for the over-limit counter */
  --radius: 12px;       /* Consistent border radius */
}
```

These are variables — change one and everything using it updates. The app
uses a dark cathedral-like color scheme: deep purples, muted grays, with a
bright purple accent.

### Global Reset

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
```

Wipes out browser default spacing so the app looks the same everywhere.
`box-sizing: border-box` makes padding count *inside* an element's width
rather than adding to it — this makes layout math predictable.

### Transitions (Soft State Changes)

Three CSS rules use `transition` — these create smooth animated changes
whenever a CSS property changes value:

#### 1. Input Border on Focus

```css
.confession-input {
  transition: border-color 0.2s;
}
.confession-input:focus {
  border-color: var(--accent);
}
```

When the user clicks into the textarea, the border changes from gray to
purple over 0.2 seconds. This is a purely CSS-driven animation — no
JavaScript involved.

#### 2. Character Counter Color

```css
.char-counter {
  transition: color 0.2s;
}
.char-counter.over {
  color: var(--danger);
}
```

When `remaining` goes negative (because the user typed more than 280
characters), the `.over` class is added, and the counter smoothly shifts
from muted gray to red over 0.2 seconds.

#### 3. Submit Button Hover

```css
.submit-btn {
  transition: opacity 0.2s;
}
.submit-btn:hover {
  opacity: 0.85;
}
```

When the mouse hovers over the button, it fades to 85% opacity over 0.2
seconds. A subtle "I'm clickable" signal.

### Keyframe Animation (The Entrance Effect)

```css
.confession-card {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**This is the only keyframe animation in the app.** Every time a new
`.confession-card` is added to the DOM, it:

1. Starts invisible (`opacity: 0`) and 12 pixels *below* its final position
   (`translateY(12px)`).
2. Over 0.5 seconds, it fades in and slides up to its natural spot.
3. `ease-out` means the animation starts fast and slows down at the end
   (like a car gently braking).

React triggers this by inserting a new `<div className="confession-card">`
into the DOM when `setConfessions` adds a new item. The browser sees the
new element, finds the `animation` rule, and plays the keyframes.

> **Important:** This animation only plays when a card is *first added*.
> Existing cards do not re-animate on subsequent renders because their DOM
> nodes are already present.

---

## 6. The Complete Data Flow (End to End)

Here's exactly what happens from keystroke to screen update:

```
1. User types a letter
2. onChange fires → setText(e.target.value) updates the `text` state
3. React re-renders App
   ├── `remaining` recalculates (280 - text.length)
   ├── Textarea re-renders with updated `value={text}`
   ├── Character counter re-renders with new number
   └── If remaining < 0, the `over` CSS class is added → color transitions to red

4. User clicks "Confess" (or presses Enter)
5. onSubmit fires → e.preventDefault() → handleSubmit()
6. handleSubmit:
   ├── Trims whitespace from text
   ├── Guard: if empty, return
   ├── setConfessions(prev => [newConfession, ...prev])
   │   └── Creates a NEW array with the new confession at position 0
   └── setText('') → clears the input

7. React re-renders App again
   ├── Textarea is now empty (text === '')
   ├── Character counter resets to 280
   ├── The empty message disappears (confessions.length > 0)
   └── New .confession-card appears at the TOP of the feed
       └── Browser plays the fadeIn animation
```

---

## 7. Key Concepts Summary

### Controlled Input
The textarea's `value` is directly tied to React state via `value={text}`.
Every keystroke goes through `setText`. React is the single source of truth
for the input's content.

### State Updates
Two `useState` hooks hold all application memory. State updates trigger
re-renders. `setConfessions` uses the functional updater pattern
(`prev => [...]`) to safely add to the list without race conditions.

### Animation Logic
- **CSS transitions** (`transition: <property> 0.2s`) animate border color,
  text color, and button opacity on state changes.
- **CSS keyframes** (`@keyframes fadeIn`) animate new confession cards
  entering the DOM with a fade-in + slide-up effect over 0.5 seconds.
- All animation is CSS-only — no JavaScript animation libraries.

### Conditional Rendering
The empty-state message only renders when `confessions.length === 0`. The
`over` CSS class is conditionally applied when `remaining < 0`. React
efficiently adds/removes DOM elements and classes based on these conditions.

### Immutability
`setConfessions` never modifies the old array. It creates a brand new array
with the new item prepended. This is a React best practice that ensures
reliable re-rendering.

---

## 8. Configuration Files (Quick Reference)

| File | Purpose |
|---|---|
| `package.json` | Declares the project name, scripts (`dev`, `build`, `preview`), and dependencies (React 19, Vite 8, TypeScript 6) |
| `tsconfig.json` | TypeScript compiler settings — targets ES2023, uses bundler module resolution, enables strict linting |
| `vite.config.ts` | Vite configuration — only loads the React plugin, which handles JSX transformation |
| `.gitignore` | Tells Git to ignore `node_modules`, `dist`, and other generated files |

### Available Scripts

```bash
npm run dev       # Start the development server (hot reload)
npm run build     # TypeScript check + production build (outputs to dist/)
npm run preview   # Preview the production build locally
```

---

## 9. What's NOT in This App (Yet)

- **No persistence** — refreshing the page wipes all confessions. They live
  only in React state (RAM).
- **No routing** — single-page, no navigation.
- **No backend / API** — everything happens in the browser.
- **No authentication** — anonymous posting with no user accounts.
- **No moderation** — no delete, edit, or report functionality.
- **No virtualization** — if thousands of confessions are posted, all DOM
  nodes stay in memory (though at 280 chars each, this would take a very
  long time to become a problem).

---

*Document generated from the source code on May 17, 2026.*
