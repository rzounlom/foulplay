🧱 PHASE 1 — FOUNDATION (Project Setup)

Outcome: App runs locally, auth works, DB connected, styling ready.

🔹 Card 1.1 — Initialize Project

Create Next.js app (App Router, TS)

Install core deps:

@clerk/nextjs

@prisma/client, prisma

ably

next-themes

tailwindcss

zod

Setup Tailwind config

Setup global layout + theme provider

🔹 Card 1.2 — Folder Structure

Create structure:

/app
  /(auth)
  /(game)
  /api
/components
  /ui
  /game
/lib
  /db
  /ably
  /game
  /auth
/prisma
/tests

🔹 Card 1.3 — Clerk Auth Setup

Wrap app with Clerk provider

Protect game routes

Store clerkId in DB

🔹 Card 1.4 — Prisma Setup

Create schema.prisma

Run first migration

Create DB client helper /lib/db/prisma.ts

🔹 Card 1.5 — Husky + CI Setup

Install Husky

Pre-commit hook → run tests

GitHub Action:

install

lint

test

build

🏠 PHASE 2 — ROOM SYSTEM

Outcome: Users can create/join rooms and see lobby.

🔹 Card 2.1 — Room DB Model Migration

Add Room, Player models

Run migration.

🔹 Card 2.2 — API: Create Room

POST /api/rooms

Generate code

Insert room + host player

🔹 Card 2.3 — API: Join Room

POST /api/rooms/join

Add player to room

🔹 Card 2.4 — Lobby UI

Player list

Mode selector

Start button disabled <2 players

🔹 Card 2.5 — Ably Hook

/lib/ably/useRoomChannel.ts

Subscribe to room:{code}

Emit player_joined

🎮 PHASE 3 — GAME ENGINE

Outcome: Turn-based flow + card draw.

🔹 Card 3.1 — Card Models Migration

Add Card + CardInstance

🔹 Card 3.2 — GameState Model

Migration for turn + active card

🔹 Card 3.3 — Game Logic Utilities

/lib/game/engine.ts

Functions:

generateDeck(seed)

drawNextCard(state)

advanceTurn(state)

Pure logic (fully testable)

🔹 Card 3.4 — API: Start Game

Initialize deck + first turn

🔹 Card 3.5 — API: Draw Card

Creates CardInstance
Publishes Ably event

🗳 PHASE 4 — SUBMISSION + VOTING

Outcome: Approval system functional.

🔹 Card 4.1 — Submission Models Migration

Add CardSubmission + CardVote

🔹 Card 4.2 — Approval Logic Utility

/lib/game/approval.ts

Functions:

requiredApprovals(count)

canResolveSubmission(submission, votes)

🔹 Card 4.3 — API: Submit Card

Create submission

Emit card_submitted

🔹 Card 4.4 — API: Vote

Add vote

Check threshold

If met → approve & advance turn

🔄 PHASE 4.5 — CARD CLEARING & QUARTER SYSTEM (Future)

Outcome: Host-controlled card clearing with penalty system.

🔹 Card 4.5.1 — Room Settings: Enable Quarter Clearing

Add room setting: allowQuarterClearing (boolean)

Host can toggle this when creating/editing room

🔹 Card 4.5.2 — API: Discard Card (with penalty)

POST /api/game/discard

Player selects cards to discard

Must drink penalty for each card discarded

Card status changes to "discarded"

Player can draw new cards to replace discarded ones

🔹 Card 4.5.3 — Host Controls: Enable/Disable Card Turn-In

Host can toggle when players can turn in cards

API endpoint: PATCH /api/game/turn-in-control

Emit realtime event when control state changes

🔹 Card 4.5.4 — Quarter System

Track current quarter (Q1, Q2, Q3, Q4)

Host can advance quarter

When quarter advances and quarterClearing enabled:

All players can discard cards (with penalties)

Reset hand or allow fresh draws

⚡ PHASE 5 — REALTIME SYNC

Outcome: All players see updates instantly.

🔹 Card 5.1 — Ably Event System

Standard event names:

player_joined

game_started

card_drawn

card_submitted

vote_cast

submission_approved

🔹 Card 5.2 — Client Sync Layer

Hook listens + refetches state

🎨 PHASE 6 — UI POLISH
🔹 Card 6.1 — Game Table UI

Turn indicator

Card modal

Scoreboard

🔹 Card 6.2 — Voting UI

Modal with vote buttons + progress

🔹 Card 6.3 — Animations + Transitions

Card flip, approval animation

🧪 PHASE 7 — TESTING
🔹 Card 7.1 — Game Engine Tests

Deck, turn, state logic

🔹 Card 7.2 — Approval Logic Tests

Threshold math, edge cases

🔹 Card 7.3 — API Route Tests

👤 PHASE 8 — USER PROFILE & NAVIGATION (Future)

Outcome: Users can manage their profile and navigate the app easily.

🔹 Card 8.1 — User Profile Page

Create /profile page

Display user stats (games played, wins, etc.)

Edit profile settings

🔹 Card 8.2 — Permanent Nickname

Add `defaultNickname` field to User model

Allow users to set a permanent nickname in profile

Use permanent nickname as default when joining rooms (can still override per-room)

🔹 Card 8.3 — Navigation Component

Create main navigation header/bar

Links to: Home, Profile, Create Room, Join Room

User menu with sign-out option

🔹 Card 8.4 — User Stats Tracking

Track games played, games won, total points across all games

Display in profile page

🔹 Card 8.5 — Profile API

GET /api/user/profile - Get user profile data

PATCH /api/user/profile - Update user profile (including defaultNickname)

🔹 Card 8.6 — Tour "Don't Show Again" Preference

Add `skipTour` (Boolean, default false) field to User model

Add checkbox/option in tour UI: "Don't show this tour again"

When checked, save preference to user account via API

Tour will check user preference before auto-starting on game start

If user has skipTour = true, don't auto-start tour (but can still manually start from instructions modal)

API: PATCH /api/user/profile - Update skipTour preference

📋 PHASE 9 — HOST CONTROLS DURING GAMEPLAY (Future)

Outcome: Host can manage game state and player points during active gameplay.

🔹 Card 9.1 — End Game & Declare Winner

Host can end current game and declare winner (highest points)

Keep game room open with same players

Start new game automatically with same players

Reset points for new game

API: POST /api/game/end

🔹 Card 9.2 — Reset Points Without Ending Game

Host can reset all player points to 0

Useful when players join late and group agrees to reset for fairness

Does not end game or change game state

API: POST /api/game/reset-points

🔹 Card 9.3 — Host Controls UI

Add host control panel to game board

Buttons: "End Game", "Reset Points"

Confirmation modals for destructive actions

💬 PHASE 10 — MESSAGING & REACTIONS (Future)

Outcome: Enhanced social interaction with messaging and animated reactions.

🔹 Card 10.1 — In-Game Chat

Real-time messaging within game rooms

Ably channel for chat messages

Message history

🔹 Card 10.2 — Reaction System

Quick reaction buttons (👍, 👎, 🎉, 😂, etc.)

Animated reactions that appear on screen

Visual feedback for game events

🔹 Card 10.3 — Reaction Animations

Smooth animations for reactions

Card approval/rejection animations

Point award celebrations

Details to be determined during implementation

🚀 FINAL RESULT

You now have:

Modular architecture

Mobile-ready API

Fully testable game engine

Realtime multiplayer

Clean UI