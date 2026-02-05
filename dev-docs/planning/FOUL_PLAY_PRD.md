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

Tour "Don't Show Again" Preference

Users can opt out of the interactive tour that appears when games start.

Add `skipTour` field to User model (Boolean, default false)

Add checkbox in tour UI: "Don't show this tour again"

When checked, save preference to user account

Tour checks user preference before auto-starting on game_started event

If skipTour = true, tour won't auto-start (but can still be manually started from instructions modal)

Database Schema Update

Add to User model:
- skipTour (Boolean, default false)

API Endpoint

PATCH /api/user/profile - Update user profile (including skipTour preference)

12. 🎮 HOST CONTROLS DURING GAMEPLAY (Future Features)

Host Controls

The host should be able to manage game state and player points during active gameplay.

End Game & Declare Winner

Host can end the current game and declare a winner (player with highest points)

Game room remains open with same players

New game automatically starts with same players

All player points reset to 0 for the new game

Useful for playing multiple rounds without recreating the room

API: POST /api/game/end

Request body: { roomCode: string }

Response: { winner: Player, newGameState: GameState }

Realtime Event: game_ended, new_game_started

Reset Points Without Ending Game

Host can reset all player points to 0 without ending the game

Useful when players join very late and the group agrees to reset points for fairness

Does not change game state, card submissions, or any other game data

Only resets point values

API: POST /api/game/reset-points

Request body: { roomCode: string }

Response: { success: boolean, players: Player[] }

Realtime Event: points_reset

Host Controls UI

Add host control panel to game board (only visible to host)

Buttons:
- "End Game" - Opens confirmation modal, then ends game and starts new one
- "Reset Points" - Opens confirmation modal, then resets all points

Confirmation modals for destructive actions to prevent accidental clicks

Database Schema Updates

No schema changes required - uses existing Room, Player, and GameState models

13. 💬 MESSAGING & REACTIONS (Future Features)

In-Game Chat

Real-time messaging within game rooms

Players can send text messages to the room

Message history persists during the game session

Ably channel for chat messages (separate from game events or same channel with different event types)

Message format:
- sender: Player info
- message: string
- timestamp: DateTime

Reaction System

Quick reaction buttons (👍, 👎, 🎉, 😂, ❤️, 🔥, etc.)

Animated reactions that appear on screen

Visual feedback for game events (card approvals, rejections, point awards)

Reactions can be:
- General reactions (thumbs up, fire, etc.)
- Event-specific reactions (celebrate approval, react to rejection)

Reaction Animations

Smooth animations for reactions appearing and disappearing

Card approval/rejection animations with visual feedback

Point award celebrations with confetti or similar effects

Animated emoji reactions floating on screen

Details to be determined during implementation phase

Database Schema Updates

Add Message model:
- id: String
- roomId: String
- senderId: String (Player id)
- message: String
- createdAt: DateTime

Add Reaction model (optional, if storing reaction history):
- id: String
- roomId: String
- senderId: String
- reactionType: String (emoji or type)
- targetType: String? (optional - "card", "message", "event")
- targetId: String? (optional - ID of target)
- createdAt: DateTime

API Endpoints

POST /api/chat/message - Send a chat message
GET /api/chat/messages?roomCode=XXX - Get message history
POST /api/chat/reaction - Send a reaction

Realtime Events

message_sent - New chat message
reaction_sent - New reaction

14. 🚀 BUILD ORDER (to hit Wednesday)
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