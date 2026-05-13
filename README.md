Threads Pocket is a small Next.js app for saving Threads URLs and showing their saved summaries.

## Getting Started

Install dependencies and generate Prisma Client:

```bash
npm install
npm run db:generate
```

Create `.env` from `.env.example`, then paste your Neon Postgres connection string:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

Apply the database migration:

```bash
npm run db:migrate
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API

- `GET /api/threads` returns `{ posts }`.
- `GET /api/threads?folderId=...` returns posts in a folder. Use `folderId=__none` for posts without a folder.
- `POST /api/threads` accepts `{ "folderId": "...", "title": "Useful idea", "url": "https://..." }` and returns `{ post }`.
- `PATCH /api/threads/[id]` accepts `{ "folderId": "..." }` or `{ "folderId": null }` to move a saved thread.
- `GET /api/folders` returns `{ folders, totalCount, noFolderCount }`.
- `POST /api/folders` accepts `{ "name": "Ideas" }` and returns `{ folder }`.

## Database

The app uses Prisma with Neon Postgres. The `ThreadPost` table is defined in `prisma/schema.prisma`, and the initial migration lives in `prisma/migrations`.

Useful commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
```

## Deploy on Vercel

Set `DATABASE_URL` in Vercel Environment Variables before deploying. Run migrations against Neon before opening the production app.

This project requires Node.js `20.19+`, `22.12+`, or `24+` because Prisma 7 enforces that engine range.
