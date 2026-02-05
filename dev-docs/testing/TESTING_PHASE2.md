# Phase 2 Testing Guide - Room System

## Prerequisites

1. **Database Migration Applied**
   ```bash
   npx prisma migrate dev
   ```
   This should apply the `add_rooms_and_players` migration.

2. **Environment Variables Set**
   Check your `.env` file has:
   - `DATABASE_URL` - Your Neon Postgres connection string
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
   - `CLERK_SECRET_KEY` - Clerk secret key
   - `NEXT_PUBLIC_ABLY_API_KEY` - Ably API key (for client-side)
   - `ABLY_API_KEY` - Ably API key (for server-side)

3. **Dev Server Running**
   ```bash
   npm run dev
   ```

## Testing Checklist

### 1. Home Page
- [ ] Visit `http://localhost:3000`
- [ ] See "FoulPlay" title and description
- [ ] See "Create Room" and "Join Room" buttons
- [ ] Both buttons are clickable

### 2. Authentication
- [ ] Click "Create Room" - should redirect to Clerk sign-in if not authenticated
- [ ] Sign in with Clerk
- [ ] After sign-in, should redirect back to create room page

### 3. Create Room
- [ ] Click "Create Room" button
- [ ] Room should be created successfully
- [ ] Should redirect to `/game/[ROOM_CODE]` (lobby page)
- [ ] Room code should be displayed (6 uppercase characters)
- [ ] You should appear in the player list as "Host"
- [ ] Your name should be visible

### 4. Lobby UI
- [ ] Player list shows you as the only player
- [ ] "Start Game" button is disabled (need 2+ players)
- [ ] Game settings (Mode, Sport) are visible
- [ ] Room code is displayed and can be copied/shared

### 5. Join Room (Second User)
**Open a new browser window/tab (or use incognito mode)**
- [ ] Visit `http://localhost:3000/join`
- [ ] Sign in with a different Clerk account (or same account)
- [ ] Enter the room code from step 3
- [ ] Click "Join Room"
- [ ] Should redirect to the lobby page
- [ ] Should see both players in the player list
- [ ] Second player should NOT be marked as "Host"

### 6. Real-time Updates
**In the first browser window (host):**
- [ ] When second player joins, you should see them appear in the player list automatically (via Ably)
- [ ] No page refresh needed

**In the second browser window:**
- [ ] Should see both players in the player list
- [ ] Should see the host's name

### 7. API Endpoints (Optional - using curl or Postman)

#### Create Room
```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -d '{}'
```

#### Join Room
```bash
curl -X POST http://localhost:3000/api/rooms/join \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -d '{"code": "ABCD12"}'
```

#### Get Room
```bash
curl http://localhost:3000/api/rooms/ABCD12 \
  -H "Cookie: __session=YOUR_SESSION_COOKIE"
```

## Common Issues & Solutions

### Issue: "Unauthorized" errors
- **Solution**: Make sure you're signed in with Clerk
- Check that Clerk keys are set correctly in `.env`

### Issue: Room not found
- **Solution**: Make sure the room code is correct (case-insensitive but should be uppercase)
- Check that the database migration was applied

### Issue: Real-time updates not working
- **Solution**: 
  - Check that `NEXT_PUBLIC_ABLY_API_KEY` is set in `.env`
  - Check browser console for Ably connection errors
  - Verify Ably API key has Publish and Subscribe capabilities

### Issue: Database errors
- **Solution**: 
  - Run `npx prisma migrate dev` to apply migrations
  - Check `DATABASE_URL` is correct in `.env`
  - Verify database connection with `npx prisma db pull`

## Expected Behavior Summary

✅ **Working correctly if:**
- You can create a room and see yourself as host
- You can join a room with a code
- Player list updates in real-time when someone joins
- Start button is disabled with <2 players
- Room code is 6 characters, uppercase

❌ **Not working if:**
- Getting 401/403 errors (auth issue)
- Getting 404 on room endpoints (migration not applied)
- Players don't appear in real-time (Ably issue)
- Room code generation fails (API issue)

## Next Steps After Testing

Once Phase 2 is confirmed working:
1. All players can join rooms
2. Real-time updates work
3. Lobby UI displays correctly

You're ready to move to **Phase 3 - Game Engine**!
