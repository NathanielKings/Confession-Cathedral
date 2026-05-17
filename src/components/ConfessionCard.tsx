import { memo } from 'react'
import type { Confession } from '../App'

const ConfessionCard = memo(function ConfessionCard({
  confession,
}: {
  confession: Confession
}) {
  return (
    <div className="confession-card">
      <p className="confession-text">{confession.text}</p>
      <time className="confession-time">
        {confession.time.toLocaleString()}
      </time>
    </div>
  )
})

export default ConfessionCard
