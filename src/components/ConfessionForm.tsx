import type { RefObject } from 'react'

interface Props {
  text: string
  remaining: number
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onTextChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export default function ConfessionForm({
  text,
  remaining,
  textareaRef,
  onTextChange,
  onSubmit,
}: Props) {
  return (
    <form className="confession-form" onSubmit={onSubmit}>
      <label htmlFor="confession-input" className="visually-hidden">
        Your confession
      </label>
      <textarea
        id="confession-input"
        ref={textareaRef}
        className="confession-input"
        value={text}
        onChange={e => onTextChange(e.target.value)}
        placeholder="Speak your confession..."
        rows={4}
        maxLength={280}
        aria-describedby="char-counter-desc"
      />
      <div className="form-footer">
        <span
          id="char-counter-desc"
          role="status"
          aria-label={`${remaining} characters remaining`}
          aria-live="polite"
          className={`char-counter ${remaining < 0 ? 'over' : ''}`}
        >
          {remaining}
        </span>
        <button type="submit" className="submit-btn">
          Confess
        </button>
      </div>
    </form>
  )
}
