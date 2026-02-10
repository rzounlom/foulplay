# FoulPlay Mobile

React Native (Expo) app for FoulPlay. Uses the same backend (Next.js API + Ably) as the web app.

## Setup

```bash
cd apps/mobile
npm install
```

If you get peer dependency conflicts (e.g. with Clerk/React), run:

```bash
npm install --legacy-peer-deps
```

Required peer deps (already in `package.json`): `expo-linking`, `expo-web-browser`, `expo-auth-session`, `react-dom` — needed by expo-router and Clerk.

## Run

```bash
npm start
```

Then press `i` for iOS simulator or `a` for Android emulator, or scan the QR code with Expo Go.

## Env (Phase 1)

Copy `.env.example` to `.env` and set:

- **`EXPO_PUBLIC_API_URL`** — Backend URL (e.g. `https://your-app.vercel.app` or `http://YOUR_IP:3000` for same-network device).
- **`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`** — Same value as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in the root `.env`.
- **`EXPO_PUBLIC_ABLY_API_KEY`** (optional) — Same as web; needed for realtime (e.g. game started) in Lobby.

In the [Clerk Dashboard](https://dashboard.clerk.com), enable **Native applications** (Native API) for your app.

## Repo layout

- **Web app:** repo root (Next.js); deploys via Vercel.
- **Mobile app:** `apps/mobile` (this folder); builds via EAS, submits to App Store / Play Store.
