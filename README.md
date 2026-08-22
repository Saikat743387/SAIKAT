# Galaxy App — MERN + Telegram Mini App

Full scaffold matching the agreed structure: Telegram Mini App (React + Vite)
→ Express API → MongoDB. No email/password/OTP — Telegram identity is the
account.

## Structure

```
galaxy-app/
  backend/    Express API, Mongoose models, coin/withdrawal/referral logic
  frontend/   React + Vite Mini App (Home, Tasks, Referral, Withdrawal, History)
```

## 1. Backend — local development

```bash
cd backend
npm install
cp .env.example .env
# edit .env: MONGODB_URI, TELEGRAM_BOT_TOKEN, JWT_SECRET, ADMIN_JWT_SECRET
npm run seed:admin -- admin yourStrongPassword   # creates your first admin login
npm run dev
```

Reward amounts and the minimum withdrawal are all configurable via `.env`:

| Env var                  | Default |
|---------------------------|---------|
| DAILY_CLAIM_COINS          | 250     |
| AD_REWARD_COINS            | 100     |
| REFERRAL_REWARD_COINS      | 5000    |
| MIN_WITHDRAWAL_COINS       | 50000   |

## 2. Backend — deploying to Vercel

The backend is structured to run as a Vercel serverless function:

```
backend/
  api/index.js     ← Vercel's entry point (imports src/app.js)
  vercel.json       ← routes every request to api/index.js
  src/app.js        ← the actual Express app (no app.listen here)
  src/server.js     ← only used for local `npm run dev`, not on Vercel
```

Steps:

1. Push the `backend` folder to its own GitHub repo (or point Vercel at a
   monorepo with `backend` as the **root directory** for that project).
2. On vercel.com → **New Project** → import the repo → set **Root
   Directory** to `backend` if it's a monorepo.
3. Under **Environment Variables**, add everything from `.env.example`
   (`MONGODB_URI`, `TELEGRAM_BOT_TOKEN`, `JWT_SECRET`, `ADMIN_JWT_SECRET`,
   `CORS_ORIGIN`, etc.) — set `CORS_ORIGIN` to your frontend's Vercel URL
   once you have it (e.g. `https://galaxy-app.vercel.app`).
4. Deploy. Your API will be live at `https://<your-backend>.vercel.app/api/...`.
5. Run the admin seed script **once**, from your own machine, pointed at the
   same `MONGODB_URI` you used in Vercel (Vercel has no shell access):
   ```bash
   cd backend
   MONGODB_URI="<same string as in Vercel>" npm run seed:admin -- admin yourPassword
   ```

⚠️ Two real limitations of serverless hosting to know about:
- **The in-memory rate limiter resets on cold starts** and doesn't share
  state across concurrent instances — it's not real abuse protection here.
  For that, use a shared store like Upstash Redis with `express-rate-limit`.
- **No persistent background jobs** (cron, schedulers) run this way — if you
  later add things like auto-expiring pending withdrawals after N days,
  that needs Vercel Cron Jobs or an external scheduler, not a `setInterval`
  in the Express app (serverless functions don't stay running between
  requests).

## 3. Frontend — deploying to Vercel

```bash
cd frontend
npm install
```

1. Push `frontend` to its own repo (or set Root Directory to `frontend` in
   the same monorepo).
2. On Vercel, import it — Vercel auto-detects Vite, no config needed.
3. Add environment variable `VITE_API_BASE_URL` = your backend's Vercel URL
   + `/api`, e.g. `https://galaxy-backend.vercel.app/api`.
4. Deploy. You'll get an HTTPS URL like `https://galaxy-app.vercel.app`.
5. In @BotFather, set this HTTPS URL as your bot's Mini App / Menu Button
   URL. Telegram requires HTTPS — Vercel gives you that automatically, so
   no ngrok/tunnel needed once deployed.

## 3. What's already implemented

- **Telegram verification** (`backend/src/middleware/verifyTelegramInitData.js`):
  validates the raw `initData` string using the official HMAC-SHA256 algorithm
  and checks `auth_date` freshness — never trusts `initDataUnsafe` alone.
- **Account creation**: first verified login auto-creates a `User` keyed by
  `telegramUserId` (unique) — returning users load their existing record.
  There is no separate login/register screen.
- **Referral linking**: pass `?startapp=<referralCode>` on the Mini App link;
  the referrer is credited 5,000 coins the moment the referred user's first
  login is verified.
- **Daily claim**: server checks `lastDailyClaimAt` — the button can be
  pressed repeatedly and still only pays out once per calendar day.
- **Ad reward**: de-duplicated by `adRef` in the `AdReward` collection, so the
  same verified ad view can never be paid twice.
  ⚠️ The current `handleWatchAd` in `Home.jsx` uses a placeholder `adRef` —
  you must replace this with your real ad network's rewarded-ad SDK and only
  trust an `adRef`/callback that network verifies server-side, or anyone can
  script the "watch" and drain the coin pool.
- **Withdrawal**: coins are debited immediately into a `PENDING` record (so
  the same balance can't be withdrawn twice while under review); admin
  approve marks it `SUCCESSFUL`, admin reject refunds the coins.
- **Coin ledger**: every credit/debit goes through `applyCoinTransaction`,
  which writes a `CoinTransaction` row — full audit trail for support/admin.
- **Admin API**: login, dashboard stats, user list, withdrawal list +
  approve/reject, referral list. (No admin frontend UI yet — build `/admin`
  routes in the React app against these endpoints, or use a tool like
  Postman/Insomnia to operate it initially.)

## 4. Not yet built (scaffolded but stubbed)

- **Task system**: `Task` / `TaskCompletion` models exist; add
  `routes/task.routes.js` (list active tasks, mark complete + reward) and
  wire up `frontend/src/pages/Tasks.jsx` when ready.
- **Admin frontend**: dashboard/users/withdrawals screens as React pages
  under `/admin`, calling the admin API with the admin JWT.

## A note on the economics

Before this goes live with real users, it's worth stress-testing the numbers
end to end: ad revenue per view vs. the 100-coin payout, referral cost vs.
lifetime value, and whether 50,000 coins at your chosen coin→currency rate is
something you can actually pay out sustainably as volume grows. The ledger
above will show you exactly where coins are coming from and going — use it to
watch for that gap before it becomes a backlog of PENDING withdrawals you
can't clear.
