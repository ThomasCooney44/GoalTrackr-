'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Target, Clock, Skull, Trophy, ChevronRight } from 'lucide-react'
import { Challenge } from '@/types'
import { CountdownTimer } from './CountdownTimer'
import { Badge } from './ui/Badge'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

type Props = {
  challenge: Challenge
  currentUserId: string
  index?: number
}

export function ChallengeCard({ challenge, currentUserId, index = 0 }: Props) {
  const isChallenger = challenge.challenger_id === currentUserId
  const other = isChallenger ? challenge.challenged : challenge.challenger
  const role = isChallenger ? 'You challenged' : 'Challenged by'

  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'brand'> = {
    active:    'success',
    pending:   'warning',
    completed: 'brand',
    failed:    'danger',
    rejected:  'default',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/challenges/${challenge.id}`}>
        <div className="card-hover p-5 group cursor-pointer">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">{role}</span>
                <span className="text-xs font-semibold text-white truncate">
                  @{other?.username ?? '…'}
                </span>
              </div>
              <p className="text-white font-semibold leading-snug line-clamp-2">{challenge.goal}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge variant={statusVariant[challenge.status] ?? 'default'}>
                {getStatusLabel(challenge.status)}
              </Badge>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-brand-400 transition-colors" />
            </div>
          </div>

          {/* Consequence teaser */}
          {challenge.status === 'failed' && challenge.consequence_revealed ? (
            <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-500/20 rounded-xl mb-4">
              <Skull className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-400 mb-0.5">Consequence Revealed</p>
                <p className="text-sm text-red-300 line-clamp-2">{challenge.consequence_details}</p>
              </div>
            </div>
          ) : challenge.status === 'completed' ? (
            <div className="flex items-center gap-2 p-3 bg-brand-950/30 border border-brand-500/20 rounded-xl mb-4">
              <Trophy className="w-4 h-4 text-brand-400" />
              <p className="text-sm text-brand-300 font-medium">Challenge completed!</p>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-gray-800/50 rounded-xl mb-4">
              <Target className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400 line-clamp-2">
                <span className="text-gray-500 font-medium capitalize">
                  {challenge.consequence_type === 'embarrassing_post' ? '📸 Embarrassing post' : '🎲 Dare/forfeit'}:{' '}
                </span>
                {challenge.consequence_details}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
              <Clock className="w-3.5 h-3.5" />
              {challenge.status === 'active' || challenge.status === 'pending' ? (
                <CountdownTimer deadline={challenge.deadline} compact />
              ) : (
                <span>{formatDistanceToNow(new Date(challenge.deadline), { addSuffix: true })}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
