'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/types'
import { Button } from '@/components/ui/Button'
import { Target, Skull, Dices, ChevronLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { format, addDays } from 'date-fns'

export default function NewChallengePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [friends, setFriends] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null)
  const [goal, setGoal] = useState('')
  const [deadline, setDeadline] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
  const [consequenceType, setConsequenceType] = useState<'embarrassing_post' | 'dare_forfeit'>('dare_forfeit')
  const [consequenceDetails, setConsequenceDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setCurrentUser(user.id)

      const { data } = await supabase
        .from('friendships')
        .select('user_id, friend_id, profiles!friend_id(*)')
        .eq('status', 'accepted')

      const { data: reverse } = await supabase
        .from('friendships')
        .select('user_id, friend_id, profiles!user_id(*)')
        .eq('status', 'accepted')
        .eq('friend_id', user.id)

      const friendProfiles: Profile[] = []
      data?.forEach(f => {
        if (f.user_id === user.id && f.profiles) {
          const p = f.profiles as unknown as Profile
          if (!friendProfiles.find(fp => fp.id === p.id)) friendProfiles.push(p)
        }
      })
      reverse?.forEach(f => {
        if (f.profiles) {
          const p = f.profiles as unknown as Profile
          if (!friendProfiles.find(fp => fp.id === p.id)) friendProfiles.push(p)
        }
      })
      setFriends(friendProfiles)
    }
    load()
  }, [router])

  const filteredFriends = friends.filter(f =>
    f.username.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = async () => {
    if (!selectedFriend || !goal.trim() || !deadline || !consequenceDetails.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('challenges').insert({
      challenger_id: currentUser,
      challenged_id: selectedFriend.id,
      goal: goal.trim(),
      deadline: new Date(deadline).toISOString(),
      consequence_type: consequenceType,
      consequence_details: consequenceDetails.trim(),
      status: 'pending',
    })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  const minDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard" className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">New Challenge</h1>
            <p className="text-sm text-gray-500">Step {step} of 3</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {[1,2,3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-brand-500' : 'bg-gray-800'}`} />
          ))}
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Choose friend */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="card p-6">
                <h2 className="font-bold text-white mb-1">Who do you want to challenge?</h2>
                <p className="text-sm text-gray-500 mb-5">You can only challenge friends.</p>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    className="input pl-9"
                    placeholder="Search friends..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                {friends.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-3">No friends yet.</p>
                    <Link href="/friends" className="text-brand-400 text-sm hover:underline">Add friends first →</Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {filteredFriends.map(friend => (
                      <button
                        key={friend.id}
                        onClick={() => setSelectedFriend(friend)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                          selectedFriend?.id === friend.id
                            ? 'bg-brand-600/20 border border-brand-500/40'
                            : 'hover:bg-gray-800 border border-transparent'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {friend.username[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-white">@{friend.username}</span>
                        {selectedFriend?.id === friend.id && (
                          <span className="ml-auto text-brand-400 text-xs font-bold">Selected ✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => { if (selectedFriend) setStep(2); else setError('Select a friend first') }} disabled={!selectedFriend}>
                  Next →
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Goal & deadline */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="card p-6 space-y-5">
                <div>
                  <h2 className="font-bold text-white mb-1">What is @{selectedFriend?.username}&apos;s challenge?</h2>
                  <p className="text-sm text-gray-500">Be specific. Vague goals are easy to fake.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Goal description</label>
                  <textarea
                    className="input resize-none min-h-[100px]"
                    placeholder="e.g. Run a 5K in under 30 minutes and share Strava proof"
                    value={goal}
                    onChange={e => setGoal(e.target.value)}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-600 mt-1 text-right">{goal.length}/500</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Deadline</label>
                  <input
                    type="date"
                    className="input"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    min={minDate}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
                <Button onClick={() => { if (!goal.trim()) { setError('Describe the goal'); return } setError(null); setStep(3) }}>
                  Next →
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Consequence */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="card p-6 space-y-5">
                <div>
                  <h2 className="font-bold text-white mb-1">Set the consequence</h2>
                  <p className="text-sm text-gray-500">This gets revealed publicly if they fail.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConsequenceType('dare_forfeit')}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                      consequenceType === 'dare_forfeit'
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <Dices className={`w-5 h-5 mb-2 ${consequenceType === 'dare_forfeit' ? 'text-brand-400' : 'text-gray-500'}`} />
                    <p className={`text-sm font-semibold ${consequenceType === 'dare_forfeit' ? 'text-brand-300' : 'text-gray-400'}`}>Dare / Forfeit</p>
                    <p className="text-xs text-gray-600 mt-0.5">They have to do something embarrassing</p>
                  </button>

                  <button
                    onClick={() => setConsequenceType('embarrassing_post')}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                      consequenceType === 'embarrassing_post'
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <Skull className={`w-5 h-5 mb-2 ${consequenceType === 'embarrassing_post' ? 'text-red-400' : 'text-gray-500'}`} />
                    <p className={`text-sm font-semibold ${consequenceType === 'embarrassing_post' ? 'text-red-300' : 'text-gray-400'}`}>Embarrassing Post</p>
                    <p className="text-xs text-gray-600 mt-0.5">A post goes public to all their friends</p>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Describe the consequence</label>
                  <textarea
                    className="input resize-none min-h-[100px]"
                    placeholder={
                      consequenceType === 'dare_forfeit'
                        ? 'e.g. They have to eat a whole raw lemon on video call with the group'
                        : 'e.g. Their most embarrassing childhood photo becomes their profile picture for a week'
                    }
                    value={consequenceDetails}
                    onChange={e => setConsequenceDetails(e.target.value)}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-600 mt-1 text-right">{consequenceDetails.length}/500</p>
                </div>

                {/* Review */}
                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 text-sm space-y-2">
                  <p className="font-semibold text-white text-xs uppercase tracking-wide text-gray-500 mb-2">Summary</p>
                  <div className="flex justify-between"><span className="text-gray-500">Challenging</span><span className="text-white font-medium">@{selectedFriend?.username}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Goal</span><span className="text-white font-medium max-w-[60%] text-right truncate">{goal}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Deadline</span><span className="text-white font-medium">{deadline}</span></div>
                </div>
              </div>
              <div className="mt-4 flex justify-between">
                <Button variant="secondary" onClick={() => setStep(2)}>← Back</Button>
                <Button onClick={handleSubmit} loading={loading} disabled={!consequenceDetails.trim()}>
                  Send Challenge 🎯
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
