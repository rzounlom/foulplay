# FoulPlay Testing Guide

## ✅ Features Ready to Test

Based on the implementation, here's what you can test right now:

---

## 🔐 **1. Authentication Flow**

### Test Steps:
1. Navigate to `/` (home page)
2. Click "Create Room" or "Join Room"
3. Should redirect to `/sign-in` if not authenticated
4. Sign in with Clerk
5. Should redirect back to the page you were trying to access

**Expected Behavior:**
- ✅ Unauthenticated users are redirected to sign-in
- ✅ After sign-in, users are redirected to their intended destination
- ✅ Authenticated users can access game pages

---

## 🏠 **2. Room Creation**

### Test Steps:
1. Go to `/create`
2. Select a **Mode** (Casual, Party, Lit, Non-drinking)
3. Select a **Sport** (Football or Basketball)
4. Click "Create Room"
5. Should redirect to `/game/[room-code]`

**Expected Behavior:**
- ✅ Room is created with a unique 6-character code
- ✅ You become the host player
- ✅ Room has the selected mode and sport
- ✅ Redirects to the game room page
- ✅ Lobby component is displayed

**API Endpoint:** `POST /api/rooms`

---

## 🔗 **3. Room Joining**

### Test Steps:
1. Go to `/join`
2. Enter a room code (or use URL parameter: `/join?code=XXXXXX`)
3. Click "Join Room"
4. Should redirect to `/game/[room-code]`

**Expected Behavior:**
- ✅ Player is added to the room
- ✅ Redirects to the game room page
- ✅ Lobby shows all players
- ✅ Real-time update: host sees new player join

**API Endpoint:** `POST /api/rooms/join`

---

## 🎮 **4. Lobby Features**

### Test Steps:
1. Create or join a room
2. View the lobby screen

**As Host:**
- ✅ See player list with host indicator
- ✅ Change **Mode** (dropdown)
- ✅ Change **Sport** (dropdown)
- ✅ Copy room URL button (shows room code)
- ✅ "Start Game" button (disabled if < 2 players)

**As Non-Host:**
- ✅ See player list
- ✅ See current Mode and Sport (read-only)
- ✅ Cannot change settings
- ✅ Cannot start game

**Real-time Updates:**
- ✅ When a new player joins, all players see the update
- ✅ When host changes settings, all players see the update

**API Endpoints:**
- `GET /api/rooms/[code]` - Fetch room data
- `PATCH /api/rooms/[code]` - Update room settings (host only)

---

## 🎲 **5. Start Game**

### Test Steps:
1. Create a room as host
2. Have at least 2 players in the room
3. Click "Start Game" button
4. Game should transition from lobby to game board

**Expected Behavior:**
- ✅ Only host can start the game
- ✅ Requires at least 2 players
- ✅ Room status changes from "lobby" to "active"
- ✅ Game state is initialized
- ✅ First player's turn is set
- ✅ Real-time update: all players see game start
- ✅ UI switches from `Lobby` to `GameBoard` component

**API Endpoint:** `POST /api/game/start`

---

## 🃏 **6. Draw Cards**

### Test Steps:
1. Start a game
2. Wait for your turn (or be the first player)
3. Click "Draw Card" button
4. Card should appear in your hand

**Expected Behavior:**
- ✅ Only current turn player can draw
- ✅ Hand limit: Maximum 5 cards
- ✅ If hand is full (5 cards), draw is blocked with error message
- ✅ Card is added to your hand
- ✅ Real-time update: all players see card drawn event
- ✅ Card shows title, description, severity, points

**API Endpoint:** `POST /api/game/draw`

**Hand Limit:**
- Maximum 5 cards in hand at any time
- Must submit a card before drawing another if hand is full

---

## 📋 **7. View Hand**

### Test Steps:
1. Draw some cards
2. View your hand in the game board

**Expected Behavior:**
- ✅ See all cards in your hand (status = "drawn")
- ✅ Cards display: title, description, severity, points
- ✅ Can select a card to submit
- ✅ Hand size is displayed

**API Endpoint:** `GET /api/game/hand?roomCode=XXXXXX`

---

## 📤 **8. Submit Card**

### Test Steps:
1. Have at least one card in hand
2. Select a card from your hand
3. Click "Submit Card" button
4. Card should be submitted for approval

**Expected Behavior:**
- ✅ Card status changes from "drawn" to "pending"
- ✅ Submission is created
- ✅ Real-time update: all players see card submitted
- ✅ Voting UI appears for all players
- ✅ Card is removed from your hand

**API Endpoint:** `POST /api/game/submit`

**Note:** You can only submit cards that are in your hand (status = "drawn")

---

## 🗳️ **9. Vote on Submissions**

### Test Steps:
1. Wait for a card to be submitted (by any player)
2. View the submission in the voting UI
3. Click "Approve" or "Reject"
4. Vote is recorded

**Expected Behavior:**
- ✅ See card details (title, description, severity, points)
- ✅ See who submitted the card
- ✅ See vote progress (approve vs reject)
- ✅ Cannot vote on your own submission
- ✅ Cannot vote twice
- ✅ Real-time update: all players see vote cast
- ✅ When threshold is met:
  - ✅ Submission is approved/rejected
  - ✅ Points are awarded (if approved)
  - ✅ Turn advances to next player
  - ✅ Real-time update: all players see result

**Voting Threshold:**
- Requires majority approval (50% + 1 of other players)
- Example: 4 players = need 2 approvals (excluding submitter)

**API Endpoint:** `POST /api/game/vote`

---

## 🔄 **10. Real-time Updates**

### Test Steps:
1. Open the game in multiple browsers/windows
2. Perform actions in one window
3. Observe updates in other windows

**Real-time Events:**
- ✅ `player_joined` - When a player joins the room
- ✅ `room_settings_updated` - When host changes mode/sport
- ✅ `game_started` - When game begins
- ✅ `card_drawn` - When a player draws a card
- ✅ `card_submitted` - When a card is submitted
- ✅ `vote_cast` - When a player votes
- ✅ `submission_approved` - When submission is approved
- ✅ `submission_rejected` - When submission is rejected
- ✅ `turn_changed` - When turn advances

**Expected Behavior:**
- ✅ All players see updates instantly
- ✅ UI refreshes automatically
- ✅ No page refresh needed

---

## 🎯 **11. Turn Management**

### Test Steps:
1. Start a game with multiple players
2. Observe turn progression

**Expected Behavior:**
- ✅ Turn indicator shows current player
- ✅ Only current player can draw cards
- ✅ Turn advances after submission is resolved
- ✅ Turn order follows player join order
- ✅ Real-time update: all players see turn change

---

## 📊 **12. Game Flow (End-to-End)**

### Complete Game Flow Test:

1. **Setup:**
   - Player 1: Create room (Football, Casual mode)
   - Player 2: Join room with code

2. **Lobby:**
   - Both players see each other
   - Host can change settings
   - Host clicks "Start Game"

3. **Gameplay:**
   - Player 1's turn: Draw card → Submit card
   - Player 2: Vote (Approve/Reject)
   - Submission resolves → Turn advances
   - Player 2's turn: Draw card → Submit card
   - Player 1: Vote
   - Continue...

4. **Hand Management:**
   - Draw cards up to 5
   - Try to draw 6th card → Should be blocked
   - Submit a card → Can draw again

---

## 🐛 **Known Limitations / Future Features**

### Not Yet Implemented:
- ❌ Card clearing at quarter breaks (Phase 4.5)
- ❌ Host controls for turn-in timing (Phase 4.5)
- ❌ Quarter system (Phase 4.5)
- ❌ Scoreboard display (UI polish needed)
- ❌ Card animations (UI polish needed)
- ❌ Game end conditions
- ❌ Winner determination

### These are planned but not blocking current testing.

---

## 🧪 **Testing Checklist**

Use this checklist to verify all features:

- [ ] Authentication flow (sign-in redirect)
- [ ] Create room with mode/sport
- [ ] Join room with code
- [ ] Lobby displays players correctly
- [ ] Host can change settings
- [ ] Non-host sees read-only settings
- [ ] Real-time player join updates
- [ ] Real-time settings update
- [ ] Start game (host only, 2+ players)
- [ ] Draw card (current player only)
- [ ] Hand limit enforcement (max 5 cards)
- [ ] View hand displays correctly
- [ ] Submit card for approval
- [ ] Vote on submission
- [ ] Cannot vote on own submission
- [ ] Cannot vote twice
- [ ] Submission approval threshold works
- [ ] Points awarded on approval
- [ ] Turn advances after resolution
- [ ] Real-time updates for all events
- [ ] Copy room URL works

---

## 🚀 **Quick Start Testing**

1. **Terminal 1:** Run dev server
   ```bash
   npm run dev
   ```

2. **Browser 1:** Create room as Player 1
   - Go to `http://localhost:3000/create`
   - Select mode and sport
   - Create room

3. **Browser 2:** Join room as Player 2
   - Go to `http://localhost:3000/join`
   - Enter room code
   - Join room

4. **Both Browsers:** Test real-time updates
   - Player 1 should see Player 2 join
   - Player 1 starts game
   - Both see game board
   - Take turns drawing and submitting cards
   - Vote on submissions
   - Watch real-time updates

---

## 📝 **Notes**

- All cards are seeded in the database (100 football + 100 basketball)
- Hand limit is enforced server-side (max 5 cards)
- Voting requires majority of other players (not including submitter)
- Real-time updates use Ably channels
- All API endpoints require authentication

---

## 🆘 **Troubleshooting**

**Issue: "Unauthorized" errors**
- Make sure you're signed in
- Check Clerk keys in `.env`

**Issue: Real-time updates not working**
- Check Ably keys in `.env`
- Check browser console for Ably errors
- Verify Ably channel subscription

**Issue: Can't draw card**
- Check if it's your turn
- Check if hand is full (max 5 cards)
- Check if game is active

**Issue: Can't start game**
- Verify you're the host
- Verify at least 2 players in room
- Check room status is "lobby"

---

Happy Testing! 🎮
