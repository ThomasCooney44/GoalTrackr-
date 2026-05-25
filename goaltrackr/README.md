# GoalTrackr

An accountability app where you set goals, invite a friend as your partner, and stay on track — with automatic reminders, proof verification, and enforced forfeits.

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop (for Postgres + Redis)
- A [Resend](https://resend.com) account (free) for emails
- A [Cloudflare R2](https://developers.cloudflare.com/r2/) or AWS S3 bucket for file uploads

---

### 1. Start the databases

```bash
docker-compose up -d
```

This starts PostgreSQL on port 5432 and Redis on port 6379.

---

### 2. Set up the Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your secrets
npm install
npm run prisma:migrate    # creates tables
npm run prisma:generate   # generates Prisma client
npm run start:dev         # starts on http://localhost:3001
```

Swagger docs will be available at **http://localhost:3001/api/docs**

---

### 3. Set up the Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev               # starts on http://localhost:3000
```

---

## Project Structure

```
goaltrackr/
├── docker-compose.yml       # Postgres + Redis for local dev
├── backend/                 # NestJS API
│   ├── prisma/schema.prisma # Database schema
│   └── src/
│       ├── auth/            # JWT auth + refresh tokens
│       ├── users/           # User profiles + search
│       ├── goals/           # Goal CRUD
│       ├── participants/    # Invite accept/decline flow
│       ├── submissions/     # Proof upload + review
│       ├── forfeits/        # Forfeit confirm/waive
│       ├── notifications/   # In-app notification system
│       ├── uploads/         # R2/S3 presigned URL generation
│       ├── jobs/            # BullMQ scheduled jobs (THE ENGINE)
│       └── mail/            # Resend email service
└── frontend/                # Next.js 14 app
    ├── app/
    │   ├── (auth)/          # Login + Register pages
    │   ├── (app)/           # Protected pages (dashboard, goals, etc.)
    │   └── invite/[token]/  # Public invite accept page
    └── lib/
        ├── api.ts           # Axios client + all API calls
        ├── hooks/           # TanStack Query hooks
        └── stores/          # Zustand stores (auth)
```

## Background Jobs

The app is self-running via 4 BullMQ cron jobs:

| Job | Schedule | What it does |
|-----|----------|--------------|
| `weekly-partner-reminder` | Mon 09:00 | Emails partners to check in on goal owner |
| `missing-submission-check` | Fri 09:00 | Reminds owners who haven't submitted proof this week |
| `deadline-approaching` | Daily 09:00 | Alerts both parties 3 days and 1 day before deadline |
| `forfeit-trigger` | Daily 00:05 | Marks overdue goals as FAILED and triggers forfeit flow |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + TypeScript |
| Database | PostgreSQL + Prisma |
| Queue | BullMQ + Redis |
| Frontend | Next.js 14 (App Router) |
| State | TanStack Query + Zustand |
| Emails | Resend |
| Files | Cloudflare R2 / AWS S3 |
| Auth | JWT (access + refresh tokens) |
