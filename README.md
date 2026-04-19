# Dared — Social Accountability Challenge App

Challenge your friends. Set real consequences. Fail publicly.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend / Auth / DB / Storage**: Supabase
- **Animations**: Framer Motion
- **Icons**: Lucide React

---

## Features

- Email/password authentication with auto profile creation
- Friend system (send/accept/reject requests, search by username)
- Challenge creation (3-step form: pick friend → set goal & deadline → set consequence)
- Challenge acceptance / rejection flow
- Progress updates with photo/video upload
- Final proof submission with media upload
- Challenger verification (approve / reject proof)
- Consequence auto-reveal when deadline expires or proof is rejected
- Real-time countdown timers on every challenge
- Notification system (friend requests, challenge events, proof verdicts)
- Mobile-first dark mode UI
- Row Level Security on every Supabase table

---

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New Project.

### 2. Run the schema

In your Supabase dashboard → **SQL Editor** → paste and run the entire contents of `supabase/schema.sql`.

This creates:
- All tables with constraints
- RLS policies on every table
- Database triggers for notifications and status changes
- Storage buckets for avatars, updates, and proofs

### 3. Get your API keys

Dashboard → **Settings** → **API**:

| Key | Where |
|-----|-------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` public key | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `service_role` secret key | `SUPABASE_SECRET_KEY` |

### 4. Configure environment variables

Copy `.env.local` and fill in your values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Important**: `SUPABASE_SECRET_KEY` is only ever used server-side. Never prefix it with `NEXT_PUBLIC_`.

### 5. Install dependencies and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout
│   ├── globals.css
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts       # Supabase OAuth callback
│   ├── dashboard/page.tsx
│   ├── challenges/
│   │   ├── new/page.tsx            # 3-step challenge creation
│   │   └── [id]/
│   │       ├── page.tsx            # Server component (data fetch)
│   │       └── ChallengeDetailClient.tsx  # Interactive client
│   ├── friends/
│   │   ├── page.tsx
│   │   └── FriendsClient.tsx
│   ├── notifications/
│   │   ├── page.tsx
│   │   └── NotificationsClient.tsx
│   └── profile/
│       └── [username]/
│           ├── page.tsx
│           └── ProfileClient.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   └── Modal.tsx
│   ├── Navbar.tsx
│   ├── ChallengeCard.tsx
│   ├── CountdownTimer.tsx
│   └── MediaUpload.tsx
├── lib/
│   ├── supabase.ts                 # Browser client
│   ├── supabase-server.ts          # Server client
│   └── utils.ts
├── types/
│   └── index.ts
└── middleware.ts                   # Auth route protection
```

---

## Challenge Lifecycle

```
pending  →  active   →  (proof submitted)  →  completed ✅
                    ↘  deadline expired    →  failed 💀
                    ↘  proof rejected      →  failed 💀
```

When a challenge **fails**, `consequence_revealed = true` and the consequence is shown publicly to all friends of both participants.

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Extended user data (username, avatar) |
| `friendships` | Bidirectional friend relationships with status |
| `challenges` | Challenge records with goal, deadline, consequence |
| `updates` | Progress check-ins (text + media) |
| `proofs` | Final proof submissions awaiting verification |
| `notifications` | In-app notification feed |

---

## Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel
```

Add environment variables in the Vercel dashboard under **Settings → Environment Variables**.

---

## Security Notes

- All secret keys are in `.env.local` only — never committed (`.gitignore` excludes it)
- `SUPABASE_SECRET_KEY` is never exposed to the client
- Every table has Row Level Security enabled
- File uploads are validated for type (images/video only) and size (5MB avatars, 50MB media)
- Input is sanitized via `maxLength` constraints and server-side validation
- Auth is enforced via Next.js middleware on all protected routes
