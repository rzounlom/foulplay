# iPhone distribution — owner account setup

**Wednesday 25 November 2026:** testers use the **web PWA** (Safari → Share → Add to Home Screen).  
**TestFlight is a stretch goal.** It cannot start until the accounts below exist. Do **not** block the web launch on this list.

No Apple Developer Program membership and no Expo/EAS account are currently available.

---

## Why TestFlight is blocked

| Requirement | Status | Who |
|-------------|--------|-----|
| Expo account | Missing | Owner |
| EAS project linked to `apps/mobile` | Missing | Owner, after Expo login |
| Apple Developer Program ($99/year, personal or company) | Missing | Owner |
| App Store Connect app record (`com.foulplay.app`) | Missing | Owner, after Apple membership is active |
| iOS distribution certificate / provisioning | Missing | Created by EAS after Apple membership |
| Physical iPhone for PWA smoke | Owner | Owner |

Apple membership can take **hours to 48 hours** after purchase. First **external** TestFlight review can take additional days. Internal TestFlight is only for App Store Connect users with Admin/App Manager/Developer roles on the same team.

---

## A. Wednesday path (no Apple account)

1. Deploy production web to `https://app.foulplay.io` after web go/no-go.
2. Open that URL in **iPhone Safari** (not Chrome).
3. Sign in, or add to Home Screen first then sign in from the icon.
4. Share → **Add to Home Screen**.
5. Launch FoulPlay from the Home Screen (standalone, no Safari chrome).
6. Create/join a private room, submit a card, vote, confirm scores update live.

Do **not** add `foulplay.io` (marketing) to the Home Screen. Use **`app.foulplay.io`**.

There is **no service worker**. If cards look stale, that is a network/Ably issue, not a cached PWA.

---

## B. Expo / EAS (after web is stable)

Do this in the **existing** `apps/mobile` app. Do not create a new Expo project.

1. Create an Expo account at [https://expo.dev/signup](https://expo.dev/signup).
2. Install CLI: `npm install -g eas-cli`
3. `eas login`
4. From `apps/mobile`: `eas init`  
   This writes `expo.extra.eas.projectId` and `expo.owner` into `app.json`. Commit that result.
5. Copy `apps/mobile/.env.example` to `.env` (gitignored) with:
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (same Clerk instance as web, or a dedicated native app in Clerk)
   - `EXPO_PUBLIC_API_URL=https://app.foulplay.io`
6. In Clerk, add native redirect `foulplay://` and the Expo auth callback if you use OAuth. Password sign-in already exists in the lobby shell.
7. `npx expo start` for local smoke only. **Do not** `eas build` until Apple membership is active (signing will fail).

`eas.json` is already in `apps/mobile`. Profiles: `development`, `preview` (internal), `production`.

---

## C. Apple Developer + TestFlight (after explicit approval)

1. Enroll at [https://developer.apple.com/programs/](https://developer.apple.com/programs/).
2. Wait until the membership shows **Active**.
3. App Store Connect → New App:
   - Bundle ID: `com.foulplay.app` (must match `apps/mobile/app.json`)
   - Name: FoulPlay
4. Put the numeric Apple ID into `eas.json` → `submit.production.ios.ascAppId`.
5. `cd apps/mobile && eas credentials` (or let `eas build` create them).
6. **Stop and get owner approval** before:
   ```bash
   eas build --platform ios --profile preview
   eas submit --platform ios --profile preview
   ```
7. Internal TestFlight: add team members in App Store Connect.
8. External TestFlight: first build needs Beta App Review. **Do not promise Wednesday.**

This Expo shell still **opens the web game** for gameplay. That is intentional. Do not implement native cards/voting this week.

---

## D. Clerk / Ably notes for a later native build

- Web PWA uses Clerk **cookies** on `app.foulplay.io`.
- Expo uses Clerk **session tokens** (`Authorization: Bearer`) via `getCurrentUserFromRequest`.
- Native Ably currently no-ops so a root key is not shipped. Wire `/api/ably/token` with the Clerk Bearer token before relying on lobby realtime in TestFlight.

---

## Explicit non-goals until approval

- Creating a second Expo app
- Native Stripe / IAP
- Native gameplay engine
- Public App Store release
- Android unless web + iOS PWA are done
