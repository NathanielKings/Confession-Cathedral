import { useState, useCallback, useEffect } from 'react'
import './App.css'

const STORAGE_KEY = 'confession-cathedral-confessions'

interface Confession {
  text: string
  time: Date
}

function loadConfessions(): Confession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: { text: string; time: string }[] = JSON.parse(raw)
    return parsed.map(c => ({ text: c.text, time: new Date(c.time) }))
  } catch {
    return []
  }
}

function App() {
  const [text, setText] = useState('')
  const [confessions, setConfessions] = useState<Confession[]>(loadConfessions)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(confessions))
  }, [confessions])

  const remaining = 280 - text.length

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim()
    if (trimmed.length === 0) return
    setConfessions(prev => [{ text: trimmed, time: new Date() }, ...prev])
    setText('')
  }, [text])

  return (
    <div className="app">
      <header>
        <h1>Confession Cathedral</h1>
      </header>

      <form
        className="confession-form"
        onSubmit={e => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <textarea
          className="confession-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Speak your confession..."
          rows={4}
        />
        <div className="form-footer">
          <span className={`char-counter ${remaining < 0 ? 'over' : ''}`}>
            {remaining}
          </span>
          <button type="submit" className="submit-btn">
            Confess
          </button>
        </div>
      </form>

      {confessions.length === 0 && (
        <p className="empty-message">No confessions yet. Be the first.</p>
      )}

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
    </div>
  )
}

export default App
