1. 🧠 Product Vision

FoulPlay App is a real-time social game platform that brings game night online. Friends join shared rooms and play interactive card-based games together from anywhere.

The first game type is a sports-based card game, but the platform will expand into multiple game decks and social play formats.

2. 🎯 MVP Objectives

Users must be able to:

Create & join rooms

Play with ≥2 players

Draw cards turn-by-turn

Submit cards for group approval

Vote on card validity

See real-time updates

Track points/penalties

3. 🧩 Core Game Rules (MVP)
Minimum Players

Game requires at least 2 players

Game pauses if players drop below 2

Turn Flow

Player draws card

Event happens in real life

Player submits card for review

Other players vote

If ≥ 50% approvals, card clears and effects apply

Approval Logic

Submitter cannot vote

Required approvals = ceil(activePlayers * 0.5)

Approval resolves instantly once threshold met

Card Clearing & Quarter System (Future Feature)

Host can enable "Quarter Clearing" option when creating room

Players can discard cards at quarter breaks (Q1, Q2, Q3, Q4)

To discard a card, player must drink the penalty on that card

Host controls when players can turn in cards (enable/disable toggle)

When quarter advances and clearing is enabled, players can:

Select which cards to discard

Drink penalties for each discarded card

Draw fresh cards to replace discarded ones

4. 🏗 Tech Stack
Layer	Tech
Framework	Next.js (App Router)
Language	TypeScript
Auth	Clerk
Realtime	Ably
DB	Neon Postgres
ORM	Prisma
Styling	TailwindCSS
Themes	next-themes
Testing	Jest + RTL
CI	GitHub Actions
Hooks	Husky
5. 🎨 UI / UX Requirements

Polished, modern UI

No cartoon visuals

Dark mode supported

Smooth transitions

Colors
Primary: #FF6600
Dark: #0A0A0A
Accent: #00B2FF
Neutral: #F7F7F9

6. 🗄 Database Schema (Prisma)
model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  name      String
}

model Room {
  id      String @id @default(cuid())
  code    String @unique
  hostId  String
  status  String // lobby | active | ended
  mode    String
  sport   String
}

model Player {
  id      String @id @default(cuid())
  userId  String
  roomId  String
  points  Int    @default(0)
  isHost  Boolean @default(false)
}

model GameState {
  id                  String @id @default(cuid())
  roomId              String @unique
  currentTurnPlayerId String
  activeCardInstanceId String?
  deckSeed            String
}

model Card {
  id          String @id @default(cuid())
  sport       String
  title       String
  description String
  severity    String
  type        String
}

model CardInstance {
  id        String @id @default(cuid())
  roomId    String
  cardId    String
  drawnById String
  status    String
}

model CardSubmission {
  id             String @id @default(cuid())
  roomId         String
  cardInstanceId String @unique
  submittedById  String
  status         String
}

model CardVote {
  id            String @id @default(cuid())
  submissionId  String
  voterPlayerId String
  vote          Boolean

  @@unique([submissionId, voterPlayerId])
}

7. 🔌 API Endpoints
Endpoint	Purpose
POST /api/rooms	Create room
POST /api/rooms/join	Join room
GET /api/rooms/[code]	Fetch room
POST /api/game/start	Start game
POST /api/game/draw	Draw card
POST /api/game/submit	Submit card
POST /api/game/vote	Cast vote
POST /api/game/discard	Discard card (with penalty) - Future
PATCH /api/game/turn-in-control	Host toggle for card turn-in - Future
8. ⚡ Realtime Events (Ably)

Channel: room:{code}

Events:

player_joined

game_started

card_drawn

card_submitted

vote_cast

submission_approved

submission_rejected

turn_changed

card_discarded (Future)

quarter_advanced (Future)

turn_in_control_changed (Future)

9. 🧪 Testing

Tests required for:

Approval threshold logic

Voting uniqueness

Turn transitions

API routes

UI state transitions

10. 🚦 CI/CD

GitHub Actions:

Install

Lint

Test

Build

11. 👤 USER PROFILE & NAVIGATION (Future Features)

User Profile

Users can view and edit their profile

Set a permanent default nickname

View game statistics (games played, wins, total points)

Navigation

Main navigation bar with links to:
- Home
- Profile
- Create Room
- Join Room
- User menu (sign out)

Database Schema Updates

Add to User model:
- defaultNickname (String?, optional)
- gamesPlayed (Int, default 0)
- gamesWon (Int, default 0)
- totalPoints (Int, default 0)

API Endpoints

GET /api/user/profile - Get current user's profile

PATCH /api/user/profile - Update user profile (nickname, etc.)

Nickname Priority Logic

When joining a room:
1. If user has a permanent defaultNickname, use it as the default
2. User can override with a room-specific nickname
3. If no nickname provided, use defaultNickname or account name

11. 🚀 BUILD ORDER (to hit Wednesday)
Phase 1 — Foundations

Setup Next.js + Tailwind

Clerk auth

Prisma schema

Neon DB

Ably client

Phase 2 — Rooms

Create room

Join room

Lobby UI

Phase 3 — Game Engine

Start game

Turn system

Card draw endpoint

Phase 4 — Submission System

Submit endpoint

Vote endpoint

Approval logic

Phase 5 — Realtime Sync

Broadcast events

Sync UI

Phase 6 — UI Polish

Dark mode

Animations

Card modal

Phase 7 — Testing + CI
12. 🔥 Success Criteria

MVP success when:

2+ players can play

Voting works

Cards clear correctly

Real-time sync is stable

No crashes on refresh