# MoChat

Private two-person chat built with Next.js App Router, PostgreSQL, and Server-Sent Events (SSE).

## Why this stack
- **Next.js App Router** keeps frontend + backend in one deployable unit for Vercel or Fly.io.
- **SSE** is more reliable than WebSockets on serverless runtimes and supports automatic reconnect.
- **PostgreSQL** gives durable storage across restarts and sleeps.
- **S3-compatible storage** handles files without tying to local disk.

## Environment variables
```
DATABASE_URL=postgresql://...
SECRET_CODE_HASH=...
SECRET_CODE_SALT=...
CAPTCHA_SECRET=...
SESSION_SECRET=...
WRONG_CODE_REDIRECT=https://example.com
MAX_FILE_SIZE_MB=20

# Optional S3 settings
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=mochat
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_URL=https://cdn.example.com
```

### Generating the secret code hash
```
node -e "const crypto=require('crypto');const code='1234';const salt=crypto.randomBytes(16).toString('hex');const hash=crypto.scryptSync(code,salt,64).toString('hex');console.log({salt,hash});"
```

## Database
```
pnpm prisma generate
pnpm prisma migrate dev
```

## Run locally
```
pnpm install
pnpm dev
```

## Deployment
### Vercel
1. Create a PostgreSQL database (Neon, Supabase, RDS).
2. Add the environment variables in Vercel.
3. Build & deploy.
4. Run Prisma migrations via `prisma migrate deploy` during build or a CI job.

### Fly.io
1. `fly launch` in repo.
2. Attach a Postgres instance via `fly postgres create` and `fly postgres attach`.
3. Set secrets: `fly secrets set SECRET_CODE_HASH=...` etc.
4. Deploy with `fly deploy`.

## Notes
- SSE reconnects on sleep and loads missed messages from the database.
- All chat routes verify an HMAC-signed session cookie.
- Wrong code after correct captcha redirects to `WRONG_CODE_REDIRECT`.
