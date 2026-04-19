'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile, Challenge } from '@/types'
import { ChallengeCard } from '@/components/ChallengeCard'
import { Button } from '@/components/ui/Button'
import { MediaUpload } from '@/components/MediaUpload'
import { Modal } from '@/components/ui/Modal'
import { motion } from 'framer-motion'
import { Trophy, Skull, Users, Swords, UserPlus, UserMinus, Clock, Edit3 } from 'lucide-react'

type Props = {
  profile: Profile
  currentUserId: string
  isOwnProfile: boolean
  challenges: Challenge[]
  friendship: { id: string; user_id: string; status: string } | null
  friendCount: number
  supabaseUrl?: string
}

export function ProfileClient({ profile, currentUserId, isOwnProfile, challenges, friendship, friendCount }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [username, setUsername] = useState(profile.username)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const completed = challenges.filter(c => c.status === 'completed')
  const failed    = challenges.filter(c => c.status === 'failed')
  const active    = challenges.filter(c => c.status === 'active')

  const friendshipStatus = friendship?.status ?? null
  const iAmSender = friendship?.user_id === currentUserId

  const handleFriendAction = async () => {
    setLoading(true)
    const supabase = createClient()
    if (!friendship) {
      await supabase.from('friendships').insert({ user_id: currentUserId, friend_id: profile.id, status: 'pending' })
    } else if (friendship.status === 'accepted' || (friendship.status === 'pending' && iAmSender)) {
      await supabase.from('friendships').delete().eq('id', friendship.id)
    }
    setLoading(false)
    router.refresh()
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    let avatar_url = profile.avatar_url

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${currentUserId}/avatar.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      if (uploadErr) { setError(uploadErr.message); setLoading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      avatar_url = publicUrl
    }

    const cleanUsername = username.trim().toLowerCase()
    if (cleanUsername !== profile.username) {
      if (cleanUsername.length < 3) { setError('Username must be at least 3 characters'); setLoading(false); return }
      if (!/^[a-z0-9_]+$/.test(cleanUsername)) { setError('Letters, numbers, underscores only'); setLoading(false); return }
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', cleanUsername).neq('id', currentUserId).maybeSingle()
      if (existing) { setError('Username already taken'); setLoading(false); return }
    }

    await supabase.from('profiles').update({ username: cleanUsername, avatar_url }).eq('id', currentUserId)
    setEditOpen(false)
    setLoading(false)
    router.refresh()
    if (cleanUsername !== profile.username) {
      router.push(`/profile/${cleanUsername}`)
    }
  }

  const stats = [
    { label: 'Active',    value: active.length,    icon: Clock,   color: 'text-green-400' },
    { label: 'Won',       value: completed.length, icon: Trophy,  color: 'text-brand-400' },
    { label: 'Failed',    value: failed.length,    icon: Skull,   color: 'text-red-400' },
    { label: 'Friends',   value: friendCount,      icon: Users,   color: 'text-blue-400' },
  ]

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile header */}
      <motion.div className="card p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start gap-4">
          <div className="relative">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.username} className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center text-2xl font-bold text-white">
                {profile.username[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">@{profile.username}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div>
            {isOwnProfile ? (
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Edit3 className="w-4 h-4" />
                Edit
              </Button>
            ) : (
              <Button
                variant={friendshipStatus === 'accepted' ? 'secondary' : 'primary'}
                size="sm"
                onClick={handleFriendAction}
                loading={loading}
              >
                {friendshipStatus === 'accepted' ? (
                  <><UserMinus className="w-4 h-4" /> Unfriend</>
                ) : friendshipStatus === 'pending' && iAmSender ? (
                  <><Clock className="w-4 h-4" /> Pending</>
                ) : friendshipStatus === 'pending' ? (
                  <><UserPlus className="w-4 h-4" /> Accept</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Add Friend</>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-800">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-600">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Challenges */}
      <section>
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <Swords className="w-4 h-4 text-brand-400" />
          Challenges
        </h2>
        {challenges.length === 0 ? (
          <div className="text-center py-12 text-gray-600">No challenges yet.</div>
        ) : (
          <div className="space-y-3">
            {challenges.map((c, i) => (
              <ChallengeCard key={c.id} challenge={c} currentUserId={currentUserId} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Edit profile modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile">
        <div className="space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
              <input
                className="input pl-8"
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={30}
              />
            </div>
          </div>
          <MediaUpload
            onFileSelect={setAvatarFile}
            allowVideo={false}
            maxSizeMB={5}
            label="Profile picture"
            preview={profile.avatar_url}
          />
          <Button onClick={handleSaveProfile} loading={loading} className="w-full">
            Save Changes
          </Button>
        </div>
      </Modal>
    </main>
  )
}
