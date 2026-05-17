# Codebase Audit Crosscheck Report

## Overview
This document serves as an exhaustive audit and crosscheck of the Confession Cathedral codebase. The audit covers security, accessibility, performance, and best practices, detailing detected issues alongside actionable solutions.

## 1. Security

### 1.1 Stored Cross-Site Scripting (XSS) Vulnerability via Local Storage
**Location**: `src/App.tsx` (localStorage interaction and JSX rendering)
**Issue**: Confessions are pulled from `localStorage` and immediately rendered using JSX. While React natively escapes text, protecting against simple `<script>` injection, future use of `dangerouslySetInnerHTML` or tampered `localStorage` data can lead to XSS. This violates defense-in-depth principles.
**Solution**:
Create a utility to strip HTML elements from user input before saving and when loading from storage:
```typescript
function sanitize(raw: string): string {
  const div = document.createElement('div')
  div.textContent = raw
  return div.innerHTML
}
```
Apply `sanitize(trimmed)` in the `handleSubmit` function and `sanitize(c.text)` in `loadConfessions`.

## 2. Accessibility (a11y)

### 2.1 Form Field is Missing an Accessible Name
**Location**: `src/App.tsx` `<textarea className="confession-input">`
**Issue**: The `textarea` has a placeholder but lacks a formal `<label>`. Screen readers may not consistently announce placeholders, leaving visually impaired users unsure of what the input is for.
**Solution**:
Add a visually hidden label and link it to the textarea using `id` and `htmlFor`:
```tsx
<label htmlFor="confession-input" className="visually-hidden">Your confession</label>
<textarea id="confession-input" ... />
```

### 2.2 Unannounced Dynamic Content Changes
**Location**: `src/App.tsx` (Character counter and Confession feed)
**Issue**: When the user types, the character counter updates visually, but the change is invisible to screen readers. Similarly, when a new confession is posted, or when the "No confessions yet" message disappears, no announcement is made.
**Solution**:
Use `aria-live` and `aria-describedby`:
- Add `aria-describedby="char-counter"` to the textarea and `id="char-counter"`, `role="status"`, and `aria-live="polite"` to the counter span.
- Add `aria-live="polite"` to the `<div className="feed">`.
- Wrap the empty state message in an `<div aria-live="polite">`.

### 2.3 Keyboard Focus Trapping and Missing Visible Focus
**Location**: `src/App.css` (`outline: none` on `.confession-input`) & `src/App.tsx` (`handleSubmit`)
**Issue**: The default browser focus ring is hidden by `outline: none;` relying only on a subtle border color change. Additionally, submitting a form leaves the keyboard focus on the submit button, requiring manual navigation back to the input.
**Solution**:
1. Remove `outline: none` and use an explicit outline in `App.css`:
```css
.confession-input {
  outline: 2px solid transparent;
  outline-offset: 2px;
}
.confession-input:focus-visible {
  border-color: var(--accent);
  outline-color: var(--accent);
}
```
2. Add a `useRef` hook to the textarea and call `textareaRef.current?.focus()` after `handleSubmit` completes.

### 2.4 Missing Form Submission Limits
**Location**: `src/App.tsx` (`<textarea>`)
**Issue**: The text limits are enforced in state using JavaScript, but the native `<textarea>` lacks a `maxLength` attribute.
**Solution**:
Add the native `maxLength={280}` attribute to the textarea element for robust native constraint validation.

## 3. Performance & Resource Management

### 3.1 Unbounded DOM Growth and Local Storage Capacity
**Location**: `src/App.tsx` (State management)
**Issue**: Confessions are added to an array indefinitely. Over time, this leads to an enormous DOM tree, degrading performance and eventually maxing out the 5MB `localStorage` limit.
**Solution**:
Introduce a maximum item limit (e.g., 500) within `handleSubmit`:
```tsx
const MAX_CONFESSIONS = 500
setConfessions(prev => {
  const next = [{ text: sanitize(trimmed), time: new Date() }, ...prev]
  return next.length > MAX_CONFESSIONS ? next.slice(0, MAX_CONFESSIONS) : next
})
```

### 3.2 Index as Key in Map Render
**Location**: `src/App.tsx` (`confessions.map((c, i) => <div key={i}>)`)
**Issue**: Using an array index as a `key` is an anti-pattern when adding items to the *beginning* of an array. It causes React to re-render and re-animate all existing items unnecessarily because their index changes on prepend.
**Solution**:
Use a stable unique identifier when creating a confession and use it as the `key`:
```tsx
interface Confession {
  id: string
  text: string
  time: Date
}
// When creating:
{ id: crypto.randomUUID(), text: trimmed, time: new Date() }
```

### 3.3 Unnecessary use of `useCallback`
**Location**: `src/App.tsx` (`handleSubmit`)
**Issue**: `handleSubmit` is wrapped in `useCallback` with `[text]` as a dependency. Because `text` changes on every keystroke, the callback is re-created on every render anyway, providing zero memoization benefit and adding mental overhead.
**Solution**:
Remove `useCallback` and declare `handleSubmit` as a normal function.

## 4. Code Architecture & Best Practices

### 4.1 Missing Error Boundary
**Location**: `src/main.tsx` and `src/App.tsx`
**Issue**: Any unhandled exception during rendering (e.g., malformed date object or an undefined map) will unmount the entire React component tree, resulting in a blank page.
**Solution**:
Implement a class-based `<ErrorBoundary>` component and wrap it around `<App />` in `main.tsx` to provide a resilient fallback UI.

### 4.2 Non-Standard CSS Properties
**Location**: `src/App.css` (`word-break: break-word`)
**Issue**: `word-break: break-word` is deprecated and non-standard, which might behave unpredictably across various browsers.
**Solution**:
Replace it with standard properties:
```css
.confession-text {
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
```

### 4.3 Application Component Bloat
**Location**: `src/App.tsx`
**Issue**: Form logic, feed logic, visual styling logic, and state management are tightly coupled in a single monolithic file, violating the Single Responsibility Principle.
**Solution**:
Extract the presentation logic into smaller, dedicated components such as `<ConfessionForm>` and `<ConfessionFeed>`, utilizing the "Lifting State Up" pattern in the parent `<App>` component.
