# Rotten Olives — Audience-Only Starter (IP-Protected)

**Stack:** Next.js (App Router) + Prisma + Postgres

### Features
- Audience ratings only (no critics yet)
- One-review-per-IP-per-release (hashed) + /24 or /64 subnet burst cap
- MENA filter, simple UI, demo seed

### Quick Deploy
1) Create Postgres (Neon/Supabase) → copy `DATABASE_URL`
2) Add env vars (locally + Vercel): `DATABASE_URL`, `NEXTAUTH_SECRET`, `IP_HASH_SALT`
3) Initialize DB (locally, points to your cloud DB):
```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
```
4) Push to GitHub, import to Vercel, add same env vars, Deploy

Later: wire NextAuth to replace the demo user and allow multiple users on shared IPs.
