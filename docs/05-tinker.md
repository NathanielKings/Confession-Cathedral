What I picked

**`src/App.tsx`, line 63** — the `...prev,` inside `handleSubmit`:

```tsx
const next = [
  { id: crypto.randomUUID(), text: sanitize(trimmed), time: new Date() },
  ...prev,
]
```

That little `...prev` — the spread of the previous confession list — is the only thing stopping each new submission from erasing every confession that came before it.

What I predicted

Remove `...prev,` and the `next` array will contain exactly one item: the brand new confession. `prev` (the old list) disappears into thin air. `setConfessions` replaces state wholesale, so:

- Submit a confession → feed shows 1 card. Cool.
- Submit a second confession → feed now shows only the second one. The first one is gone. Ragequit material.

In short: the app becomes a single-confession-at-a-time machine. Every "Confess" click is also a "delete everything" click.

What I actually changed

Deleted `...prev,` so the array literal only wraps the new object.

What happened when I ran it

The dev server fired up fine. No compilation errors — TypeScript stayed silent. And that's the part I didn't think about beforehand:

There's no warning. The bug is invisible at build time. The function still returns a valid `Confession[]`. It still stores to localStorage. React still renders. Everything looks normal — until you submit twice.

From a user's perspective in the browser:
- Type "hello", hit Confess. One card appears. Hooray.
- Type "goodbye", hit Confess. The "hello" card vanishes. Only "goodbye" remains.
- The localStorage key keeps shrinking. Old confessions are truly gone.

The gap

I assumed removing the spread would *obviously* break things, so it'd be a boring prediction. The surprise was how quietly it breaks. No runtime crash, no red screen, no stack trace. The app doesn't *feel* broken — it just silently misbehaves. A user would think it's a buggy feature, not a missing line of code.

The lesson: the scariest bugs aren't the ones that explode. They're the ones that compile fine, render fine, and only reveal themselves two interactions later. That spread wasn't guarding against a crash — it was guarding against data loss, and data loss doesn't tend to raise exceptions.
