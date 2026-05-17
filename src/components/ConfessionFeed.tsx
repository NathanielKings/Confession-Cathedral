import type { Confession } from '../App'
import ConfessionCard from './ConfessionCard'

export default function ConfessionFeed({
  confessions,
}: {
  confessions: Confession[]
}) {
  return (
    <>
      <div aria-live="polite">
        {confessions.length === 0 && (
          <p className="empty-message">No confessions yet. Be the first.</p>
        )}
      </div>

      {confessions.length > 0 && (
        <div className="feed" aria-label="Confession feed" aria-live="polite">
          {confessions.map(c => (
            <ConfessionCard key={c.id} confession={c} />
          ))}
        </div>
      )}
    </>
  )
}
