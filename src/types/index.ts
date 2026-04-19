export type Profile = {
  id: string
  username: string
  avatar_url: string | null
  created_at: string
}

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected'

export type Friendship = {
  id: string
  user_id: string
  friend_id: string
  status: FriendshipStatus
  created_at: string
  profiles?: Profile
}

export type ConsequenceType = 'embarrassing_post' | 'dare_forfeit'
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'failed' | 'rejected'

export type Challenge = {
  id: string
  challenger_id: string
  challenged_id: string
  goal: string
  deadline: string
  consequence_type: ConsequenceType
  consequence_details: string
  status: ChallengeStatus
  consequence_revealed: boolean
  created_at: string
  challenger?: Profile
  challenged?: Profile
}

export type Update = {
  id: string
  challenge_id: string
  user_id: string
  content: string | null
  media_url: string | null
  created_at: string
  profiles?: Profile
}

export type Proof = {
  id: string
  challenge_id: string
  user_id: string
  media_url: string | null
  content: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  verified_at: string | null
}

export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  related_id: string | null
  read: boolean
  created_at: string
}
