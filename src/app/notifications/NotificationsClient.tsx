'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Notification } from '@/types'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { Bell, CheckCheck, Swords, Users, Trophy, Skull, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'

const ICON_MAP: Record<string, React.ElementType> = {
  challenge_received: Swords,
  proof_submitted:    AlertCircle,
  proof_approved:     Trophy,
  proof_rejected:     Skull,
  friend_request:     Users,
  friend_accepted:    Users,
}

const COLOR_MAP: Record<string, string> = {
  challenge_received: 'text-brand-400 bg-brand-400/10',
  proof_submitted:    'text-yellow-400 bg-yellow-400/10',
  proof_approved:     'text-green-400 bg-green-400/10',
  proof_rejected:     'text-red-400 bg-red-400/10',
  friend_request:     'text-blue-400 bg-blue-400/10',
  friend_accepted:    'text-blue-400 bg-blue-400/10',
}

export function NotificationsClient({ notifications, userId }: { notifications: Notification[]; userId: string }) {
  const router = useRouter()
  const [marking, setMarking] = useState(false)

  const markAllRead = async () => {
    setMarking(true)
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setMarking(false)
    router.refresh()
  }

  const markRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    router.refresh()
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const getLink = (n: Notification) => {
    if (n.type === 'friend_request' || n.type === 'friend_accepted') return '/friends'
    if (n.related_id) return `/challenges/${n.related_id}`
    return null
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-brand-400" />
          Notifications
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-brand-500 rounded-full text-xs text-white font-bold">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} loading={marking}>
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const Icon = ICON_MAP[n.type] ?? Bell
            const colorClass = COLOR_MAP[n.type] ?? 'text-gray-400 bg-gray-800'
            const link = getLink(n)

            const Content = (
              <div className={`card p-4 flex items-start gap-3 transition-all duration-200 ${!n.read ? 'border-brand-800/40 bg-gray-900/80' : 'opacity-60'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{n.title}</p>
                  <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-xs text-gray-600 mt-1">{formatRelativeTime(n.created_at)}</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                )}
              </div>
            )

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => !n.read && markRead(n.id)}
              >
                {link ? (
                  <Link href={link}>{Content}</Link>
                ) : Content}
              </motion.div>
            )
          })}
        </div>
      )}
    </main>
  )
}
