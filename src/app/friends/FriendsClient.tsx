'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/types'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { Search, UserPlus, Users, Check, X, Clock, Swords } from 'lucide-react'
import Link from 'next/link'

type FriendshipRow = {
  id: string
  user_id: string
  friend_id: string
  status: string
  profiles?: Profile
}

type Props = {
  currentUserId: string
  inbound: FriendshipRow[]
  outbound: FriendshipRow[]
  friendsAsUser: FriendshipRow[]
  friendsAsFriend: FriendshipRow[]
}

export function FriendsClient({ currentUserId, inbound, outbound, friendsAsUser, friendsAsFriend }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const allFriends: Profile[] = [
    ...friendsAsUser.map(f => f.profiles).filter(Boolean) as Profile[],
    ...friendsAsFriend.map(f => f.profiles).filter(Boolean) as Profile[],
  ]

  const handleSearch = async () => {
    if (!search.trim()) return
    setSearching(true)
    setError(null)
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${search.trim()}%`)
      .neq('id', currentUserId)
      .limit(10)
    setSearchResults(data ?? [])
    setSearching(false)
  }

  const sendRequest = async (friendId: string) => {
    setLoading(friendId)
    const supabase = createClient()
    const { error: err } = await supabase.from('friendships').insert({
      user_id: currentUserId,
      friend_id: friendId,
      status: 'pending',
    })
    if (err) { setError(err.message); setLoading(null); return }
    setLoading(null)
    router.refresh()
  }

  const respondRequest = async (friendshipId: string, accept: boolean) => {
    setLoading(friendshipId)
    const supabase = createClient()
    if (accept) {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    } else {
      await supabase.from('friendships').delete().eq('id', friendshipId)
    }
    setLoading(null)
    router.refresh()
  }

  const removeFriend = async (friendshipId: string) => {
    setLoading(friendshipId)
    const supabase = createClient()
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setLoading(null)
    router.refresh()
  }

  const getRelationshipStatus = (profileId: string) => {
    if (allFriends.find(f => f.id === profileId)) return 'friend'
    if (outbound.find(f => f.friend_id === profileId)) return 'pending_out'
    if (inbound.find(f => f.user_id === profileId)) return 'pending_in'
    return 'none'
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Users className="w-6 h-6 text-brand-400" />
        Friends
      </h1>

      {/* Search */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-brand-400" />
          Find friends by username
        </h2>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Search by username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} loading={searching} size="sm">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map(p => {
              const status = getRelationshipStatus(p.id)
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {p.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <Link href={`/profile/${p.username}`} className="font-medium text-white hover:text-brand-400 transition-colors">
                      @{p.username}
                    </Link>
                  </div>
                  {status === 'friend' && (
                    <span className="text-xs text-green-400 font-medium">Friends ✓</span>
                  )}
                  {status === 'pending_out' && (
                    <span className="text-xs text-yellow-400 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Pending
                    </span>
                  )}
                  {status === 'pending_in' && (
                    <span className="text-xs text-brand-400 font-medium">Wants to connect</span>
                  )}
                  {status === 'none' && (
                    <Button
                      size="sm"
                      onClick={() => sendRequest(p.id)}
                      loading={loading === p.id}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Incoming requests */}
      {inbound.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            Friend Requests ({inbound.length})
          </h2>
          <div className="space-y-3">
            {inbound.map((req, i) => (
              <motion.div key={req.id} className="card p-4 flex items-center gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center font-bold text-white shrink-0">
                  {req.profiles?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">@{req.profiles?.username}</p>
                  <p className="text-xs text-gray-500">Wants to challenge you</p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => respondRequest(req.id, false)}
                  loading={loading === req.id}
                  className="p-2"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => respondRequest(req.id, true)}
                  loading={loading === req.id}
                  className="p-2"
                >
                  <Check className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Friends list */}
      <section>
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-400" />
          Your Friends ({allFriends.length})
        </h2>
        {allFriends.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p>No friends yet. Search for people above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allFriends.map((friend, i) => {
              const row = [...friendsAsUser, ...friendsAsFriend].find(f =>
                f.profiles?.id === friend.id
              )
              return (
                <motion.div key={friend.id} className="card-hover p-4 flex items-center gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link href={`/profile/${friend.username}`} className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center font-bold text-white shrink-0">
                      {friend.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">@{friend.username}</p>
                      <p className="text-xs text-green-400">Friends ✓</p>
                    </div>
                  </Link>
                  <Link href={`/challenges/new`} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5" />
                    Challenge
                  </Link>
                  <button
                    onClick={() => row && removeFriend(row.id)}
                    className="p-2 hover:bg-gray-800 rounded-xl text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
