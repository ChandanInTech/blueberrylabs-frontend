# blueberrylabs-frontend

Next.js (App Router) + React + TypeScript client for the social image resizer.
Deployed to Vercel from this repository.

```bash
bun install
cp .env.example .env.local    # NEXT_PUBLIC_API_BASE_URL
bun run dev                   # http://localhost:3000
```

```bash
bun run test
bun run typecheck
bun run lint
bun run build
```

## Layout

```
app/
├── layout.tsx              root layout + SessionProvider
├── login/page.tsx          "Continue with demo account"
├── (app)/layout.tsx        session gate + AppShell
├── (app)/page.tsx          upload → preset → generate
├── (app)/generations/[id]/ status, preview, download
└── (app)/history/          cursor-paginated history
components/{upload,presets,generation,session,ui}/
hooks/
├── use-upload.ts           SELECT → REQUESTING → UPLOADING → VERIFYING → READY
└── use-generation-polling.ts
lib/
├── api-client.ts           typed fetch wrapper, runtime-trusted responses only
├── auth.ts
├── upload.ts               XHR upload with real progress
└── validation.ts
vendor/                     pinned @social-resizer/contracts tarball
```

## Two progress measurements, deliberately separate

`useUpload` reports **browser** upload progress from `XMLHttpRequest.upload.onprogress`.
`useGenerationPolling` reports **server** progress from the status endpoint. They are
never combined into one bar: a single bar would imply continuous measurement across two
unrelated phases.

Each phase has its own state (`REQUESTING_UPLOAD`, `UPLOADING`, `VERIFYING_UPLOAD`,
`READY_TO_GENERATE`), so the UI can label exactly what is happening.

## Polling rules

- Poll every 2 s while `QUEUED`/`PROCESSING`.
- After 30 s of waiting, back off to 5 s.
- When the tab is hidden, poll every 10 s; refresh immediately on return.
- Transient failures back off exponentially (capped at 30 s) and honour `Retry-After`.
- `401`/`404` are fatal: polling stops and the UI explains why.
- One in-flight request at a time; one timer; abort on unmount.

## Shared contracts

`@social-resizer/contracts` is installed from `vendor/*.tgz`, produced by the backend
(`npm run contracts:sync` in the parent repo). Types come from the package, but every
response is still treated as runtime-untrusted: `isApiErrorBody` and friends guard
before use, and the presets are re-validated by the backend on every request.

## Session handling

The session cookie is `HttpOnly` — this app can never read or forge it. `lib/auth.ts`
only asks the API who the cookie belongs to. State-changing requests send the
`X-CSRF-Token` header read from the readable `bl_csrf` cookie (double-submit pattern).
