# Golf Club Social Platform

A social platform for your golf club. Create an account with your email, sign in, and manage your profile.

## Features

- **Accounts** – Sign up and sign in with email (used as username)
- **Profile Page** – Update First Name, Last Name, GHIN Number, and Handicap Index
- **Manual Handicap** – Users and admins update handicap data manually (no API lookup)

## Getting Started

**Requires Node.js 18.17.0 or later.**

```bash
npm install
npm run db:push    # Create the SQLite database (first time only)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create an account, sign in, then go to **My Profile**.

## Environment

Copy `.env.example` to `.env` and set:

- `NEXTAUTH_SECRET` – Required for session encryption. Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` – Your app URL (e.g. `http://localhost:3000`)
- `INITIAL_ADMIN_EMAIL` – (Optional) Comma-separated emails. Users who sign up with these emails get the `admin` role. Example: `admin@club.com,other@club.com`

## User Roles

- **member** – Default role for new accounts. Full access to profile, members, tournaments, and registration.
- **admin** – Admins have elevated access. Use `requireAdmin()` in API routes to restrict actions (e.g. creating tournaments).

To promote an existing user to admin, use Prisma Studio: `npx prisma studio` → open `User` → edit the row → set `role` to `admin`.

## Golf Course Autocomplete

The Home Course field uses a bundled list of Southern California golf courses (from the [SCGA Course Directory](https://newfrontier.scga.org/course-directory)). To refresh the list:

```bash
npm run scrape:courses
```

This fetches course names from the SCGA directory and updates `src/data/california-golf-courses.json`. Ensure you comply with SCGA's terms of service when running the scraper.

## Project Structure

- `src/app/signup/` – Create account
- `src/app/signin/` – Sign in
- `src/app/profile/` – Profile page (requires sign in)
- `src/app/api/profile/` – Profile API
- `src/lib/auth.ts` – NextAuth config
- `src/lib/db.ts` – Prisma client
- `prisma/schema.prisma` – Database schema
