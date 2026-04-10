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

function formatClock(seconds?: number) {
  const safe = Math.max(0, Math.floor(seconds ?? 0))
  const hours = String(Math.floor(safe / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, '0')
  const remainingSeconds = String(safe % 60).padStart(2, '0')
  return `${hours}:${minutes}:${remainingSeconds}`
}

export default function WorkingTime({
  seconds = 0,
  isRunning = false,
  className = '',
  variant = 'compact',
}: {
  seconds?: number
  isRunning?: boolean
  className?: string
  variant?: 'compact' | 'clock'
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

  return <span className={className}>{variant === 'clock' ? formatClock(displaySeconds) : formatDuration(displaySeconds)}</span>
}
