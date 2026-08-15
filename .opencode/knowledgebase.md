# omp-papermark-knowledgebase

PROJECT: omp-papermark
ROOT: /Users/kgothatsontsane/Desktop/omp-papermark
TYPE: Next.js 14 (App Router) + TypeScript + Prisma (Postgres) + NextAuth + Vercel
ARCHITECTURE: Single Next.js app — Papermark fork. Domains: auth, teams, documents,
  datarooms, links, views, analytics. Split Prisma schema (prisma/schema/*.prisma).
LAST_INDEXED: 2026-08-15

## Entry points
- `app/` — App Router pages/routes; `pages/` — legacy Next.js pages
- `lib/tracking/record-link-view.ts` — server-side view ingest (analytics entry point)
- `lib/tinybird/` — Tinybird client + deployed resource files
- `lib/api/views/` — webhook + notification delivery
- `prisma/schema/schema.prisma` — core models (User, Document, DocumentVersion, View, Viewer, Link, Webhook, ...)

## Modules

### tracking/
- PURPOSE: Client+server analytics ingestion
- FILES:
  - `record-link-view.ts` — server ingest for a link view. Builds `clickData` (device, geo, referer, ip w/ EU privacy filter) + `locationData`, then `Promise.all`: `recordTinybird()` (graceful-degraded), `sendNotification` (if enabled), `sendLinkViewWebhook`.
  - `video-tracking.ts` — `createVideoTracker` (client video view tracking)
  - `tracking-config.ts` — `TRACKING_CONFIG`, `getTrackingOptions`
  - `safe-page-view-tracker.ts` — client page-view tracking
- EXPORTS:
  - `recordLinkView({ req, clickId, viewId, linkId, teamId, documentId?, dataroomId?, enableNotification })` — returns clickData or null (bots skipped)
  - `createVideoTracker`, `getTrackingOptions`
- DEPENDENCIES: `lib/tinybird` (recordLinkViewTB), `lib/api/notification-helper` (sendNotification), `lib/api/views/send-webhook-event` (sendLinkViewWebhook), `lib/utils` (log), `@vercel/functions` (geolocation, ipAddress), `next/server` (userAgent)

### tinybird/
- PURPOSE: Tinybird client (ingest + query) and the deployed resource files (FORWARD workspace)
- FILES:
  - `publish.ts` — ingest endpoints (`tb.buildIngestEndpoint`)
  - `pipes.ts` — query endpoints (`tb.buildPipe`)
  - `index.ts` — `export * from "./pipes"` + `"./publish"`
  - `datasources/*.datasource` — deployed datasource definitions (5)
  - `endpoints/*.pipe` — deployed pipe definitions (13, each ends `TYPE ENDPOINT`)
- EXPORTS (publish.ts): `publishPageView`, `recordWebhookEvent`, `recordVideoView`, `recordClickEvent`, `recordLinkViewTB`
- EXPORTS (pipes.ts): `getTotalAvgPageDuration`, `getViewPageDuration`, `getTotalDocumentDuration`, `getTotalLinkDuration`, `getTotalViewerDuration`, `getViewUserAgent_v2`, `getViewUserAgent`, `getTotalDataroomDuration`, `getDocumentDurationPerViewer`, `getWebhookEvents`, `getVideoEventsByDocument`, `getVideoEventsByView`, `getClickEventsByView`
- DEPENDENCIES: `@tinybirdco/mockingbird` client (`tb`)

### api/views/ + api/notification-helper.ts
- PURPOSE: View-triggered delivery (webhooks + email)
- FILES/EXPORTS:
  - `send-webhook-event.ts` — `sendLinkViewWebhook({ teamId, clickData })`
  - `notification-helper.ts` — default `sendNotification({ viewId, locationData })`, `sendViewerInvitation(...)`

### lib/utils.ts
- PURPOSE: shared helpers; exports `log({ message, type })` at line 66 (used for degradation logging)

### prisma/
- PURPOSE: ORM schema (split across files)
- FILES: `schema/schema.prisma` (User, Account, Session, Brand, Document, DocumentVersion, DocumentPage, Domain, View, Viewer, Reaction, Invitation, SentEmail, Chat, Folder, Feedback, FeedbackResponse, Agreement, AgreementResponse, IncomingWebhook, RestrictedToken, Webhook, VerificationToken), `schema/link.prisma` (Link, LinkPreset, CustomField, CustomFieldResponse), `schema/dataroom.prisma` (Dataroom, DataroomDocument, DataroomFolder, DataroomBrand, ViewerGroup, ...), `schema/team.prisma`, `schema/conversation.prisma` (Conversation, ConversationParticipant, Message, ConversationView)

## Dependencies (key)
- `next` ^14.2.31, `react` ^18.3.1, `next-auth` ^4.24.11, `prisma`/`@prisma/client` ^6.5.0
- `@vercel/functions` (geolocation, ipAddress), `@tinybirdco/mockingbird` (Tinybird client), resend/unsend (email), `@vercel/edge-config`

## Build / Test / Verify
- BUILD: `npm run build` (next build; vercel-build = prisma generate + next build). postinstall: `prisma generate`
- DEV: `npm run dev`; prisma: `npm run dev:prisma` (generate + migrate deploy)
- TYPE: `npx tsc --noEmit`
- LINT: `npm run lint` (next lint)
- Tinybird verify: curl `https://api.eu-west-1.aws.tinybird.co/v0/datasources/?token=$TOK` and `/v0/pipes/?token=$TOK`

## Patterns
- Graceful degradation: wrap NON-security features (analytics/telemetry) in try/catch + `log({ type: "error" })`; never fail open on security controls. See `record-link-view.ts` `recordTinybird()`.
- Commit style: `fix: <imperative summary>`; small surgical diffs; no code comments unless asked.
- TS strict; `@/` path alias for `lib/`.

## Notes
- Tinybird workspace is FORWARD (not Classic): resources named by FILENAME, `VERSION` ignored, pipes need explicit `TYPE ENDPOINT`. Full details + deploy command in AGENTS.md / project-state.md.
- Stats endpoints have historical error-hardening: Promise.allSettled, Tinybird 403 handling, NaN versionNumber guard, JWT decrypt try/catch (see git log).
- Live state (deployment, endpoints, verification) lives in `.opencode/project-state.md` — refresh this index and that file after changes.
