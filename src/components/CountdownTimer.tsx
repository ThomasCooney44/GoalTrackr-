'use client'

import { useState, useEffect } from 'react'
import { calculateTimeLeft } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function CountdownTimer({ deadline, compact }: { deadline: string; compact?: boolean }) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(deadline))

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calculateTimeLeft(deadline)), 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (timeLeft.isExpired) {
    return (
      <span className={cn('font-mono font-bold text-red-400', compact ? 'text-sm' : 'text-base')}>
        EXPIRED
      </span>
    )
  }

  const isUrgent = timeLeft.totalSeconds < 86400
  const color = isUrgent ? 'text-red-400' : timeLeft.totalSeconds < 259200 ? 'text-yellow-400' : 'text-green-400'

  if (compact) {
    return (
      <span className={cn('font-mono font-bold text-sm', color)}>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    )
  }

  const units = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Mins', value: timeLeft.minutes },
    { label: 'Secs', value: timeLeft.seconds },
  ]

  return (
    <div className="flex gap-2">
      {units.map(({ label, value }) => (
        <div key={label} className={cn('flex flex-col items-center bg-gray-800/50 rounded-xl px-3 py-2 min-w-[52px]', isUrgent && 'bg-red-950/30')}>
          <span className={cn('text-2xl font-mono font-bold tabular-nums', color)}>
            {String(value).padStart(2, '0')}
          </span>
          <span className="text-gray-500 text-xs mt-0.5">{label}</span>
        </div>
      ))}
    </div>
  )
}
