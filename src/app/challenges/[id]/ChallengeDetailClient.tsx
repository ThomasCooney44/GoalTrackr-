'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Challenge, Update, Proof } from '@/types'
import { CountdownTimer } from '@/components/CountdownTimer'
import { MediaUpload } from '@/components/MediaUpload'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { getStatusLabel, formatRelativeTime } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Target, Skull, Clock, CheckCircle, XCircle, Upload,
  MessageSquare, Trophy, AlertTriangle, ChevronLeft, Dices
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type Props = {
  challenge: Challenge
  updates: Update[]
  proofs: Proof[]
  currentUserId: string
  supabaseUrl: string
}

export function ChallengeDetailClient({ challenge, updates, proofs, currentUserId, supabaseUrl }: Props) {
  const router = useRouter()
  const isChallenger = challenge.challenger_id === currentUserId
  const isChallenged = challenge.challenged_id === currentUserId
  const other = isChallenger ? challenge.challenged : challenge.challenger

  const [updateContent, setUpdateContent] = useState('')
  const [updateFile, setUpdateFile] = useState<File | null>(null)
  const [proofContent, setProofContent] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showProofModal, setShowProofModal] = useState(false)

  const latestProof = proofs[0]

  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'brand'> = {
    active: 'success', pending: 'warning', completed: 'brand', failed: 'danger', rejected: 'default',
  }

  const uploadFile = async (file: File, bucket: string, userId: string) => {
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file)
    if (uploadErr) throw uploadErr
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
  }

  const handleAccept = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('challenges')
      .update({ status: 'active' })
      .eq('id', challenge.id)
    if (err) { setError(err.message); setLoading(false); return }
    router.refresh()
    setLoading(false)
  }

  const handleReject = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('challenges')
      .update({ status: 'rejected' })
      .eq('id', challenge.id)
    if (err) { setError(err.message); setLoading(false); return }
    router.refresh()
    setLoading(false)
  }

  const handlePostUpdate = async () => {
    if (!updateContent.trim() && !updateFile) { setError('Add text or media'); return }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    let mediaUrl: string | null = null
    if (updateFile) {
      try { mediaUrl = await uploadFile(updateFile, 'updates', currentUserId) }
      catch (e: unknown) { setError((e as Error).message); setLoading(false); return }
    }
    const { error: err } = await supabase.from('updates').insert({
      challenge_id: challenge.id,
      user_id: currentUserId,
      content: updateContent.trim() || null,
      media_url: mediaUrl,
    })
    if (err) { setError(err.message); setLoading(false); return }
    setUpdateContent('')
    setUpdateFile(null)
    setShowUpdateModal(false)
    router.refresh()
    setLoading(false)
  }

  const handleSubmitProof = async () => {
    if (!proofContent.trim() && !proofFile) { setError('Add text or media proof'); return }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    let mediaUrl: string | null = null
    if (proofFile) {
      try { mediaUrl = await uploadFile(proofFile, 'proofs', currentUserId) }
      catch (e: unknown) { setError((e as Error).message); setLoading(false); return }
    }
    const { error: err } = await supabase.from('proofs').insert({
      challenge_id: challenge.id,
      user_id: currentUserId,
      content: proofContent.trim() || null,
      media_url: mediaUrl,
    })
    if (err) { setError(err.message); setLoading(false); return }
    setProofContent('')
    setProofFile(null)
    setShowProofModal(false)
    router.refresh()
    setLoading(false)
  }

  const handleVerify = async (proofId: string, approve: boolean) => {
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('proofs')
      .update({ status: approve ? 'approved' : 'rejected', verified_at: new Date().toISOString() })
      .eq('id', proofId)
    if (err) { setError(err.message); setLoading(false); return }
    router.refresh()
    setLoading(false)
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Dashboard
      </Link>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Header card */}
      <motion.div className="card p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
              {isChallenger ? 'You challenged' : 'Challenged by'}
              <span className="text-white font-semibold">@{other?.username}</span>
            </div>
            <h1 className="text-xl font-bold text-white leading-snug">{challenge.goal}</h1>
          </div>
          <Badge variant={statusVariant[challenge.status] ?? 'default'}>
            {getStatusLabel(challenge.status)}
          </Badge>
        </div>

        {/* Countdown or expired */}
        {(challenge.status === 'active' || challenge.status === 'pending') && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Time remaining
            </p>
            <CountdownTimer deadline={challenge.deadline} />
          </div>
        )}

        {/* Consequence */}
        <div className={`flex items-start gap-3 p-4 rounded-xl ${
          challenge.status === 'failed' && challenge.consequence_revealed
            ? 'bg-red-950/40 border border-red-500/30'
            : 'bg-gray-800/50 border border-gray-700'
        }`}>
          {challenge.consequence_type === 'embarrassing_post'
            ? <Skull className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            : <Dices className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
          }
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">
              {challenge.consequence_type === 'embarrassing_post' ? 'Embarrassing Post' : 'Dare / Forfeit'}
              {challenge.consequence_revealed && <span className="ml-2 text-red-400">— REVEALED 💀</span>}
            </p>
            <p className="text-sm text-white">{challenge.consequence_details}</p>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      {isChallenged && challenge.status === 'pending' && (
        <motion.div className="card p-5 mb-6 flex flex-col sm:flex-row gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-sm text-gray-400 flex-1">Do you accept this challenge?</p>
          <Button variant="danger" onClick={handleReject} loading={loading} size="sm">
            Reject
          </Button>
          <Button onClick={handleAccept} loading={loading} size="sm">
            Accept Challenge 🎯
          </Button>
        </motion.div>
      )}

      {isChallenged && challenge.status === 'active' && (
        <div className="flex gap-3 mb-6">
          <Button variant="secondary" onClick={() => setShowUpdateModal(true)} className="flex-1 flex items-center gap-2 justify-center">
            <MessageSquare className="w-4 h-4" />
            Post Update
          </Button>
          {!latestProof || latestProof.status === 'rejected' ? (
            <Button onClick={() => setShowProofModal(true)} className="flex-1 flex items-center gap-2 justify-center">
              <Upload className="w-4 h-4" />
              Submit Proof
            </Button>
          ) : (
            <div className="flex-1 p-3 card text-center text-sm text-gray-400">
              {latestProof.status === 'pending' ? '⏳ Proof awaiting review' : '✅ Proof approved'}
            </div>
          )}
        </div>
      )}

      {/* Proof verification (for challenger) */}
      {isChallenger && latestProof?.status === 'pending' && (
        <motion.div className="card p-5 mb-6 border-brand-800/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Proof submitted — your verdict
          </h3>
          {latestProof.media_url && (
            latestProof.media_url.match(/\.(mp4|webm|mov)/i) ? (
              <video src={latestProof.media_url} controls className="w-full rounded-xl mb-4 max-h-64 object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={latestProof.media_url} alt="Proof" className="w-full rounded-xl mb-4 max-h-64 object-cover" />
            )
          )}
          {latestProof.content && <p className="text-sm text-gray-300 mb-4">{latestProof.content}</p>}
          <div className="flex gap-3">
            <Button variant="danger" onClick={() => handleVerify(latestProof.id, false)} loading={loading} className="flex-1 flex items-center gap-2 justify-center">
              <XCircle className="w-4 h-4" />
              Reject — consequence triggered!
            </Button>
            <Button onClick={() => handleVerify(latestProof.id, true)} loading={loading} className="flex-1 flex items-center gap-2 justify-center">
              <CheckCircle className="w-4 h-4" />
              Approve
            </Button>
          </div>
        </motion.div>
      )}

      {/* Completed banner */}
      {challenge.status === 'completed' && (
        <div className="p-5 bg-brand-950/30 border border-brand-500/20 rounded-2xl mb-6 flex items-center gap-3">
          <Trophy className="w-6 h-6 text-brand-400 shrink-0" />
          <div>
            <p className="font-bold text-brand-300">Challenge complete!</p>
            <p className="text-sm text-brand-400/70">Proof was approved. Well done.</p>
          </div>
        </div>
      )}

      {/* Updates feed */}
      {updates.length > 0 && (
        <section>
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            Progress Updates
          </h2>
          <div className="space-y-3">
            {updates.map((update, i) => (
              <motion.div key={update.id} className="card p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-xs font-bold text-white">
                    {update.profiles?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="text-sm font-medium text-white">@{update.profiles?.username}</span>
                  <span className="text-xs text-gray-600 ml-auto">{formatRelativeTime(update.created_at)}</span>
                </div>
                {update.content && <p className="text-sm text-gray-300 mb-2">{update.content}</p>}
                {update.media_url && (
                  update.media_url.match(/\.(mp4|webm|mov)/i) ? (
                    <video src={update.media_url} controls className="w-full rounded-xl max-h-64 object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={update.media_url} alt="Update" className="w-full rounded-xl max-h-64 object-cover" />
                  )
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Post Update Modal */}
      <Modal open={showUpdateModal} onClose={() => setShowUpdateModal(false)} title="Post Progress Update">
        <div className="space-y-4">
          <textarea
            className="input resize-none min-h-[80px]"
            placeholder="What progress have you made?"
            value={updateContent}
            onChange={e => setUpdateContent(e.target.value)}
            maxLength={1000}
          />
          <MediaUpload
            onFileSelect={setUpdateFile}
            allowVideo
            maxSizeMB={50}
            label="Attach photo/video (optional)"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button onClick={handlePostUpdate} loading={loading} className="w-full">
            Post Update
          </Button>
        </div>
      </Modal>

      {/* Submit Proof Modal */}
      <Modal open={showProofModal} onClose={() => setShowProofModal(false)} title="Submit Final Proof">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Your challenger will review this. Make it convincing!</p>
          <textarea
            className="input resize-none min-h-[80px]"
            placeholder="Describe your proof..."
            value={proofContent}
            onChange={e => setProofContent(e.target.value)}
            maxLength={1000}
          />
          <MediaUpload
            onFileSelect={setProofFile}
            allowVideo
            maxSizeMB={50}
            label="Photo/video proof"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button onClick={handleSubmitProof} loading={loading} className="w-full">
            <Target className="w-4 h-4" />
            Submit Proof
          </Button>
        </div>
      </Modal>
    </main>
  )
}
