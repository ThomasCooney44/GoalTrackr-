import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Navbar } from '@/components/Navbar'
import { ChallengeDetailClient } from './ChallengeDetailClient'

export const revalidate = 0

export default async function ChallengeDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/login')

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*, challenger:profiles!challenger_id(*), challenged:profiles!challenged_id(*)')
    .eq('id', params.id)
    .single()

  if (!challenge) notFound()

  const { data: updates } = await supabase
    .from('updates')
    .select('*, profiles(*)')
    .eq('challenge_id', params.id)
    .order('created_at', { ascending: false })

  const { data: proofs } = await supabase
    .from('proofs')
    .select('*')
    .eq('challenge_id', params.id)
    .order('submitted_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar user={profile} />
      <ChallengeDetailClient
        challenge={challenge}
        updates={updates ?? []}
        proofs={proofs ?? []}
        currentUserId={user.id}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
      />
    </div>
  )
}
