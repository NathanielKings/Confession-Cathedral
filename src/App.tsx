import { useState, useEffect, useRef } from 'react'
import './App.css'
import ConfessionForm from './components/ConfessionForm'
import ConfessionFeed from './components/ConfessionFeed'

const STORAGE_KEY = 'confession-cathedral-confessions'
const MAX_CONFESSIONS = 500

export interface Confession {
  id: string
  text: string
  time: Date
}

function sanitize(raw: string): string {
  const div = document.createElement('div')
  div.textContent = raw
  return div.innerHTML
}

function loadConfessions(): Confession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: { id?: string; text: string; time: string }[] =
      JSON.parse(raw)
    return parsed.map(c => ({
      id: c.id ?? crypto.randomUUID(),
      text: sanitize(c.text),
      time: new Date(c.time),
    }))
  } catch {
    return []
  }
}

function App() {
  const [text, setText] = useState('')
  const [confessions, setConfessions] =
    useState<Confession[]>(loadConfessions)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const remaining = 280 - text.length

  useEffect(() => {
    const id = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(confessions))
    }, 300)
    return () => clearTimeout(id)
  }, [confessions])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed.length === 0) return
    setConfessions(prev => {
      const next = [
        {
          id: crypto.randomUUID(),
          text: sanitize(trimmed),
          time: new Date(),
        },
        ...prev,
      ]
      return next.length > MAX_CONFESSIONS
        ? next.slice(0, MAX_CONFESSIONS)
        : next
    })
    setText('')
    textareaRef.current?.focus()
  }

  return (
    <div className="app">
      <header>
        <h1>Confession Cathedral</h1>
      </header>

      <ConfessionForm
        text={text}
        remaining={remaining}
        textareaRef={textareaRef}
        onTextChange={setText}
        onSubmit={handleSubmit}
      />

      <ConfessionFeed confessions={confessions} />
    </div>
  )
}

export default App
