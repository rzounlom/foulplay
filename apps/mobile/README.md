# FoulPlay Mobile

React Native (Expo) app for FoulPlay. Uses the same backend (Next.js API + Ably) as the web app.

## Setup

```bash
cd apps/mobile
npm install
```

## Run

```bash
npm start
```

Then press `i` for iOS simulator or `a` for Android emulator, or scan the QR code with Expo Go.

## Env

Create `.env` (or use EAS env) when you add API auth:

- `EXPO_PUBLIC_API_URL` — Backend URL (e.g. `https://your-app.vercel.app`)
- Clerk and Ably keys per [REACT_NATIVE_MOBILE_APP_PLAN.md](../../dev-docs/planning/REACT_NATIVE_MOBILE_APP_PLAN.md)

## Repo layout

- **Web app:** repo root (Next.js); deploys via Vercel.
- **Mobile app:** `apps/mobile` (this folder); builds via EAS, submits to App Store / Play Store.
