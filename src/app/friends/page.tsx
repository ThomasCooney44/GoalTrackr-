import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Navbar } from '@/components/Navbar'
import { FriendsClient } from './FriendsClient'

export const revalidate = 0

export default async function FriendsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/login')

  // Pending requests sent TO me
  const { data: inbound } = await supabase
    .from('friendships')
    .select('*, profiles!user_id(*)')
    .eq('friend_id', user.id)
    .eq('status', 'pending')

  // Pending requests I sent
  const { data: outbound } = await supabase
    .from('friendships')
    .select('*, profiles!friend_id(*)')
    .eq('user_id', user.id)
    .eq('status', 'pending')

  // Accepted friends (both directions)
  const { data: friendsAsUser } = await supabase
    .from('friendships')
    .select('*, profiles!friend_id(*)')
    .eq('user_id', user.id)
    .eq('status', 'accepted')

  const { data: friendsAsFriend } = await supabase
    .from('friendships')
    .select('*, profiles!user_id(*)')
    .eq('friend_id', user.id)
    .eq('status', 'accepted')

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar user={profile} />
      <FriendsClient
        currentUserId={user.id}
        inbound={inbound ?? []}
        outbound={outbound ?? []}
        friendsAsUser={friendsAsUser ?? []}
        friendsAsFriend={friendsAsFriend ?? []}
      />
    </div>
  )
}
