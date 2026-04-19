import { differenceInSeconds, isPast, formatDistanceToNow } from 'date-fns'
import { ChallengeStatus } from '@/types'

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function calculateTimeLeft(deadline: string) {
  const deadlineDate = new Date(deadline)
  if (isPast(deadlineDate)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 }
  }
  const totalSeconds = differenceInSeconds(deadlineDate, new Date())
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds, isExpired: false, totalSeconds }
}

export function formatRelativeTime(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function getStatusColor(status: ChallengeStatus) {
  switch (status) {
    case 'active':    return 'text-green-400 bg-green-400/10 border-green-400/20'
    case 'pending':   return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    case 'completed': return 'text-brand-400 bg-brand-400/10 border-brand-400/20'
    case 'failed':    return 'text-red-400 bg-red-400/10 border-red-400/20'
    case 'rejected':  return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    default:          return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
  }
}

export function getStatusLabel(status: ChallengeStatus) {
  switch (status) {
    case 'active':    return 'Active'
    case 'pending':   return 'Pending'
    case 'completed': return 'Completed ✓'
    case 'failed':    return 'Failed 💀'
    case 'rejected':  return 'Rejected'
    default:          return status
  }
}

export function getMediaUrl(supabaseUrl: string, bucket: string, path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

export function validateFileUpload(
  file: File,
  options: { maxSizeMB?: number; allowVideo?: boolean } = {}
) {
  const { maxSizeMB = 10, allowVideo = false } = options
  const maxBytes = maxSizeMB * 1024 * 1024
  const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const allowedVideo = ['video/mp4', 'video/webm', 'video/quicktime']
  const allowed = allowVideo ? [...allowedImages, ...allowedVideo] : allowedImages

  if (file.size > maxBytes) {
    return { valid: false, error: `File must be under ${maxSizeMB}MB` }
  }
  if (!allowed.includes(file.type)) {
    return { valid: false, error: `File type not allowed. Use: ${allowed.join(', ')}` }
  }
  return { valid: true, error: null }
}
