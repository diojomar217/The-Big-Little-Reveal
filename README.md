# The Big Little Reveal

A live, reusable gender reveal experience for families and their guests.

Organizers sign in with Google, create an event, share a guest link or QR code, open and close voting, and launch a synchronized reveal across guest phones and a dedicated live display.

## Features

- One independent event per family
- Google organizer authentication with Auth.js
- Anonymous guest voting
- Password-free, owner-protected event controls
- Live Girl/Boy prediction results
- Dedicated `/e/{code}/live` projector display
- Synchronized countdown, suspense sequence, and reveal
- Neon PostgreSQL persistence
- Responsive event dashboard and native sharing

## Local Development

Requirements:

- Node.js 22.13 or newer
- A Google OAuth web client
- A Neon PostgreSQL database

Copy `.env.example` to `.env.local` and provide:

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

Google OAuth redirect URI for local development:

```text
http://localhost:3000/api/auth/callback/google
```

Install and start:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Vercel Deployment

1. Import this repository into Vercel.
2. Connect a Neon database and expose its pooled connection string as `DATABASE_URL`.
3. Add `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET`.
4. Add this Google OAuth redirect URI, using the production domain:

```text
https://YOUR-DOMAIN/api/auth/callback/google
```

5. Redeploy after adding the environment variables.

The application creates its PostgreSQL tables automatically on first use.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm start
```
