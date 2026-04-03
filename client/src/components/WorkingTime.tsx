import { useEffect, useState } from 'react'

function formatDuration(seconds?: number) {
  const safe = Math.max(0, Math.floor(seconds ?? 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remainingSeconds = safe % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

export default function WorkingTime({
  seconds = 0,
  isRunning = false,
  className = '',
}: {
  seconds?: number
  isRunning?: boolean
  className?: string
}) {
  const [displaySeconds, setDisplaySeconds] = useState(Math.max(0, Math.floor(seconds)))

  useEffect(() => {
    setDisplaySeconds(Math.max(0, Math.floor(seconds)))
  }, [seconds, isRunning])

  useEffect(() => {
    if (!isRunning) return
    const interval = window.setInterval(() => {
      setDisplaySeconds(current => current + 1)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [isRunning])

  return <span className={className}>{formatDuration(displaySeconds)}</span>
}
