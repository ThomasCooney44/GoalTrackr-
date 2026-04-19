import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Navbar } from '@/components/Navbar'
import { ChallengeCard } from '@/components/ChallengeCard'
import { Challenge } from '@/types'
import { Plus, Swords, Trophy, Skull, Clock } from 'lucide-react'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  // Expire overdue challenges
  await supabase.rpc('expire_overdue_challenges')

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*, challenger:profiles!challenger_id(*), challenged:profiles!challenged_id(*)')
    .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const all = (challenges ?? []) as Challenge[]

  const active    = all.filter(c => c.status === 'active')
  const pending   = all.filter(c => c.status === 'pending')
  const completed = all.filter(c => c.status === 'completed')
  const failed    = all.filter(c => c.status === 'failed')

  const stats = [
    { label: 'Active',    value: active.length,    icon: Clock,   color: 'text-green-400' },
    { label: 'Pending',   value: pending.length,   icon: Swords,  color: 'text-yellow-400' },
    { label: 'Completed', value: completed.length, icon: Trophy,  color: 'text-brand-400' },
    { label: 'Failed',    value: failed.length,    icon: Skull,   color: 'text-red-400' },
  ]

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar user={profile} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Hey, <span className="gradient-text">@{profile.username}</span> 👋
            </h1>
            <p className="text-gray-400 mt-0.5">Here are your active accountability challenges.</p>
          </div>
          <Link href="/challenges/new" className="btn-primary flex items-center gap-2 py-2.5">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Challenge</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 font-medium">{label}</span>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Active challenges */}
        {active.length > 0 && (
          <section className="mb-8">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-400" />
              Active Challenges
            </h2>
            <div className="space-y-3">
              {active.map((c, i) => (
                <ChallengeCard key={c.id} challenge={c} currentUserId={user.id} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <section className="mb-8">
            <h2 className="section-title mb-4 flex items-center gap-2">
              <Swords className="w-5 h-5 text-yellow-400" />
              Awaiting Response
            </h2>
            <div className="space-y-3">
              {pending.map((c, i) => (
                <ChallengeCard key={c.id} challenge={c} currentUserId={user.id} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* History */}
        {(completed.length > 0 || failed.length > 0) && (
          <section>
            <h2 className="section-title mb-4">History</h2>
            <div className="space-y-3">
              {[...completed, ...failed].map((c, i) => (
                <ChallengeCard key={c.id} challenge={c} currentUserId={user.id} index={i} />
              ))}
            </div>
          </section>
        )}

        {all.length === 0 && (
          <div className="text-center py-24">
            <Swords className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">No challenges yet</h3>
            <p className="text-gray-600 mb-6">Challenge a friend or wait for someone to dare you.</p>
            <Link href="/challenges/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Challenge someone
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
