# MoChat Design

## System architecture
- **Client (Next.js App Router)** renders the landing page and chat UI.
- **Route handlers (Node runtime)** provide captcha, verification, message APIs, file upload, and SSE streaming.
- **PostgreSQL** stores messages and delivery state for sleep-proof reliability.
- **S3-compatible storage** holds files; local `/public/uploads` is the fallback.
- **SSE** streams new messages and status updates to connected clients.

## Database schema
- **Message**: `id`, `senderId`, `content`, `type`, `fileUrl`, `fileName`, `fileSize`, `mimeType`, `status`, `createdAt`, `deliveredAt`.
- Indexes on `createdAt` and `senderId` for retrieval.

## API design
- `GET /api/captcha` → returns math captcha + sets captcha cookie.
- `POST /api/verify` → validates captcha + secret code, sets session cookie or returns redirect.
- `GET /api/messages?after=ISO_DATE` → fetches messages (sync on reconnect).
- `POST /api/messages` → creates message, emits SSE update.
- `POST /api/messages/ack` → marks messages delivered, emits status update.
- `POST /api/messages/upload` → validates and stores uploads.
- `GET /api/stream` → SSE stream for messages + delivery status.

## Frontend structure
- `app/page.tsx` + `components/LandingForm.tsx` for captcha/code entry.
- `app/chat/page.tsx` enforces session cookie and renders `components/ChatClient.tsx`.
- `ChatClient` handles SSE, polling fallback, and retries for sync.

## Security flow
- Captcha answer is signed and stored in an HttpOnly cookie; verification compares the signed answer.
- Secret code is hashed using `scrypt` with salt and compared using timing-safe equality.
- Session is an HMAC-signed cookie, checked on all API routes.
- Uploads validated by type and size.
- Rate-limited verify attempts per IP.

## Deployment guide
- **Vercel**: Use managed Postgres, set environment variables, run Prisma migrations at deploy.
- **Fly.io**: Attach Fly Postgres, set secrets, deploy with `fly deploy`.

## Optional improvements
- End-to-end encryption with a shared symmetric key.
- Message deletion via soft-delete column.
- Read receipts using a `readAt` field and SSE updates.
