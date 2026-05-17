# Software Engineering Principles — Confession Cathedral

Each principle below is present in the codebase. Every entry includes a plain-language
definition and the exact file:line location of the pattern in action.

---

## 1. Controlled Components

**Definition:** A form element whose displayed value is bound to React component state.
React — not the DOM — is the sole authority for what the input shows. Every keystroke
flows through a state setter, which triggers a re-render, which updates the element's
`value` prop. There is no gap where the DOM and React memory disagree.

**Lines:** `src/App.tsx:10,35-38`

- Line 10: `const [text, setText] = useState('')` — the state variable that owns the input's value.
- Line 37: `value={text}` — locks the textarea's display to the `text` state.
- Line 38: `onChange={e => setText(e.target.value)}` — routes every keystroke back into state.

---

## 2. Immutability

**Definition:** Existing data structures are never modified in place. Instead, every
"change" produces a brand-new copy. This guarantees that React's change detection
(reference comparison) works reliably, because a new reference always means new data.

**Lines:** `src/App.tsx:18`

- Line 18: `setConfessions(prev => [{ text: trimmed, time: new Date() }, ...prev])`
  Creates a new array by spreading the previous items after the new confession. The old
  array is never touched — `prev` is only read, never mutated.

---

## 3. Separation of Concerns

**Definition:** Different responsibilities are kept in different files or modules.
Logic lives apart from presentation, bootstrapping lives apart from application code,
and configuration lives apart from both.

**Lines:**

| Concern | File | Lines |
|---|---|---|
| Document structure | `index.html` | 1–12 |
| React bootstrapping | `src/main.tsx` | 1–9 |
| Application logic + state | `src/App.tsx` | 1–70 |
| Visual presentation | `src/App.css` | 1–156 |
| Type checker rules | `tsconfig.json` | 1–24 |
| Bundler configuration | `vite.config.ts` | 1–6 |
| Dependency manifest | `package.json` | 1–22 |

---

## 4. Lifting State

**Definition:** When two or more child components need to read or write the same piece
of data, that state is moved ("lifted") up to their nearest common ancestor, which
passes it back down as props. This keeps the single source of truth above all consumers.

**Lines:** `src/App.tsx:10-11`

- Lines 10–11: `const [text, setText] = useState('')` and
  `const [confessions, setConfessions] = useState<Confession[]>([])`

  The app is currently a single component, so no literal "lift" from child to parent
  occurs. However, all shared state already lives at the root `App` level — the exact
  architecture lifting state would produce if the form and feed were split into
  separate child components.

---

## 5. Single Source of Truth

**Definition:** Every piece of data has exactly one canonical home. No value is stored
in two places where it could drift out of sync. When the data changes, it changes in
one spot, and everything derived from it updates automatically.

**Lines:** `src/App.tsx:10,37`

- Line 10: `const [text, setText] = useState('')` — the one and only home for the input text.
- Line 37: `value={text}` — the textarea reads from that same source (never from the DOM directly).

---

## 6. Functional Updater Pattern

**Definition:** When a state update depends on the *previous* value, the setter is
called with a callback function that receives the previous state as its argument
(e.g. `prev => newValue`). This avoids stale closures and ensures correctness even
when React batches multiple updates.

**Lines:** `src/App.tsx:18`

- Line 18: `setConfessions(prev => [{ text: trimmed, time: new Date() }, ...prev])`
  Uses the functional form (`prev => ...`) rather than reading the `confessions`
  variable directly.

---

## 7. Conditional Rendering

**Definition:** Different UI is shown depending on the current value of state or props.
React evaluates JavaScript expressions inside JSX and conditionally includes or
excludes elements.

**Lines:** `src/App.tsx:43,52-54`

- Line 43: `className={`char-counter ${remaining < 0 ? 'over' : ''}`}` — the `over`
  CSS class is applied only when the character limit is exceeded.
- Lines 52–54: `{confessions.length === 0 && ( ... )}` — the empty-state message
  renders only when no confessions exist.

---

## 8. Declarative Programming

**Definition:** The developer describes *what* the UI should look like for a given
state, not *how* to build it step-by-step. React translates the declaration into DOM
operations automatically.

**Lines:** `src/App.tsx:22-67`

- The entire `return (...)` block declares the full UI structure as a function of
  `text`, `remaining`, and `confessions`. No imperative `document.createElement` or
  `element.appendChild` calls exist anywhere in the source.

---

## 9. Composition

**Definition:** Complex interfaces are built by nesting simpler components inside one
another — like Russian dolls. Each component does one job and can be combined with
others to form the whole.

**Lines:** `src/main.tsx:5-8`

- Lines 5–8: `<StrictMode><App /></StrictMode>` — `App` is composed inside
  `StrictMode`, which was imported from React. Composition is also implicitly used in
  `App.tsx:22-67` where standard HTML elements are composed into a form and feed.

---

## 10. Guard Clause (Early Return)

**Definition:** Invalid or edge-case conditions are handled first, with an early
`return` that bails out before the main logic runs. This keeps the "happy path" code
un-nested and easy to read.

**Lines:** `src/App.tsx:16-17`

- Line 16: `const trimmed = text.trim()`
- Line 17: `if (trimmed.length === 0) return` — if the input is empty or whitespace-only, abort
  immediately. The confession-creating code (line 18) only runs for valid input.

---

## 11. Type Safety (Static Typing)

**Definition:** The shape of data is declared up front using a type system. The
compiler catches mismatches (e.g. passing a number where a string is expected) before
the code ever runs.

**Lines:** `src/App.tsx:4-7,11`

- Lines 4–7: `interface Confession { text: string; time: Date }` — defines the shape of a confession.
- Line 11: `useState<Confession[]>([])` — the generic type parameter guarantees the array
  only holds `Confession` objects.

  Also: `tsconfig.json:17-20` — `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`, and `erasableSyntaxOnly` all enable stricter type-checking.

---

## 12. Memoization

**Definition:** A computed value or function is cached so it is not rebuilt from
scratch on every render unless its dependencies change. This avoids unnecessary work
and can prevent child components from re-rendering.

**Lines:** `src/App.tsx:15-20`

- Lines 15–20: `const handleSubmit = useCallback(() => { ... }, [text])` — the
  function is recreated only when `text` changes, not on every keystroke-triggered
  render.

---

## 13. Derived State

**Definition:** A value that is computed from existing state (or props) on every
render, rather than being stored as its own piece of state. This eliminates the risk of
derived data falling out of sync.

**Lines:** `src/App.tsx:13`

- Line 13: `const remaining = 280 - text.length` — `remaining` is recalculated on
  every render from `text.length`. It is never stored separately with `useState`.

---

## 14. Semantic HTML

**Definition:** HTML elements are chosen for their *meaning*, not just their default
appearance. This improves accessibility (screen readers), SEO, and code readability.

**Lines:** `src/App.tsx:24-25,28-50,60-61`

- Line 24: `<header>` — semantically identifies the page header region.
- Line 25: `<h1>` — the top-level heading.
- Lines 28–50: `<form>`, `<textarea>`, `<button type="submit">` — a proper accessible
  form that submits on Enter.
- Lines 60–61: `<time>` — semantically marks the timestamp as a machine-readable date/time.

---

## 15. CSS Design Tokens (Custom Properties)

**Definition:** Visual values (colors, spacing, radii) are defined once as named CSS
custom properties on `:root` and referenced everywhere else via `var()`. Changing a
token in one place updates the entire interface.

**Lines:** `src/App.css:9-18`

- Lines 9–18: `:root { --bg: #0f0f14; --surface: #1a1a24; --border: #2a2a3a;
  --text: #d4d4dc; --text-muted: #6b6b7b; --accent: #c084fc; --danger: #f87171;
  --radius: 12px; }`

  Referenced throughout the stylesheet (e.g. `background: var(--bg)` at line 21,
  `color: var(--accent)` at line 43, `color: var(--danger)` at line 92).

---

## 16. Event Prevention

**Definition:** When an HTML element has a built-in browser behavior (like a form
reloading the page on submit), that default is explicitly cancelled in the JavaScript
handler so custom logic can take over.

**Lines:** `src/App.tsx:30-32`

- Line 31: `e.preventDefault()` — stops the browser from performing a full-page
  form POST, keeping control inside the React application.

---

## 17. Don't Repeat Yourself (DRY)

**Definition:** Every piece of knowledge has a single, unambiguous representation.
Repeated values are extracted into a shared constant, variable, or token so a change
only needs to happen in one place.

**Lines:** `src/App.css:9-18`

- The seven CSS custom properties (lines 9–18) eliminate dozens of repeated hex color
  values throughout the stylesheet. For example, `var(--accent)` is used at lines 43,
  70, 96 instead of repeating `#c084fc` three times.

---

## 18. CSS Reset (Normalization)

**Definition:** Browser default margins, padding, and box-model behavior are wiped
clean at the start of the stylesheet. This creates a predictable, consistent baseline
across different browsers.

**Lines:** `src/App.css:1-7`

- Lines 1–7: `*, *::before, *::after { box-sizing: border-box; margin: 0;
  padding: 0; }` — strips all default spacing and switches to the intuitive
  border-box model (padding is counted inside an element's declared width).

---

## 19. Strict Mode (Development Guardrails)

**Definition:** A React wrapper that intentionally double-invokes certain functions
(render, state updaters, etc.) during development to surface side-effect bugs and
deprecated API usage. It has zero effect in production builds.

**Lines:** `src/main.tsx:6-8`

- Lines 6–8: `<StrictMode><App /></StrictMode>` — wraps the entire application during
  development to catch common mistakes early.

---

## 20. Single Responsibility Principle

**Definition:** A module, component, or function should have exactly one reason to
change — one clear job. When a unit does too many things, changes to one concern risk
breaking another.

**Lines:**

- `src/main.tsx:1-9` — one job: mount React into the DOM.
- `src/App.tsx:1-70` — one job: manage the confession wall's state and UI.
- `src/App.css:1-156` — one job: define the visual presentation.
- `index.html:1-12` — one job: provide the HTML document shell.
- `tsconfig.json:1-24` — one job: configure the TypeScript compiler.
- `vite.config.ts:1-6` — one job: configure the Vite bundler.

---

## 21. Progressive Enhancement

**Definition:** Core functionality works with basic, universally-supported technology
(plain HTML form semantics). Enhanced behavior (React state management, CSS
transitions) layers on top without breaking the underlying mechanism.

**Lines:** `src/App.tsx:28-50`

- Lines 28–50: The confession input is a proper `<form>` with a `<button
  type="submit">`. It works with keyboard-only interaction (Enter to submit) and would
  still be recognizable as a form even without JavaScript. React's `onSubmit` and
  `e.preventDefault()` then layer on the single-page behavior.

---

## 22. Key Prop (List Identity)

**Definition:** Each item in a dynamically-rendered list carries a unique `key` prop.
React uses keys to track which DOM nodes correspond to which data items across
re-renders, enabling efficient updates (inserts, reorders) without unnecessary DOM
destruction and recreation.

**Lines:** `src/App.tsx:58`

- Line 58: `key={i}` — each `.confession-card` receives the array index as its
  identity key. Using the index is safe here because the list is only ever prepended
  (items never reorder, delete, or insert mid-list).
