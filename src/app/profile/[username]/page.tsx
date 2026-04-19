import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Navbar } from '@/components/Navbar'
import { ProfileClient } from './ProfileClient'

export const revalidate = 0

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: currentProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!currentProfile) redirect('/auth/login')

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username.toLowerCase())
    .single()

  if (!targetProfile) notFound()

  const isOwnProfile = user.id === targetProfile.id

  // Challenges visible to current user
  const { data: challenges } = await supabase
    .from('challenges')
    .select('*, challenger:profiles!challenger_id(*), challenged:profiles!challenged_id(*)')
    .or(`challenger_id.eq.${targetProfile.id},challenged_id.eq.${targetProfile.id}`)
    .order('created_at', { ascending: false })

  // Friendship status
  const { data: friendship } = await supabase
    .from('friendships')
    .select('*')
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${user.id})`
    )
    .maybeSingle()

  // Friend counts
  const { count: friendCount } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .or(`user_id.eq.${targetProfile.id},friend_id.eq.${targetProfile.id}`)

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar user={currentProfile} />
      <ProfileClient
        profile={targetProfile}
        currentUserId={user.id}
        isOwnProfile={isOwnProfile}
        challenges={challenges ?? []}
        friendship={friendship ?? null}
        friendCount={friendCount ?? 0}
      />
    </div>
  )
}
