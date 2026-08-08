# Open Mic Productions Whitelabel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace user-facing Papermark branding with Open Mic Productions branding across the self-hosted application while preserving internal identifiers, functionality, and security controls.

**Architecture:** Add the supplied Open Mic assets to the public static directory, centralize reusable public brand values, and replace user-facing strings and metadata at their existing call sites. Keep database/API/package identifiers and the two external Papermark demo-media URLs unchanged as documented exceptions.

**Tech Stack:** Next.js 14, React, TypeScript, SVG/PNG/JPG static assets, React Email, Resend, Prisma.

---

### Task 1: Install Open Mic Assets

**Files:**
- Create: `public/_static/open-mic/omp_logo_b.svg`
- Create: `public/_static/open-mic/omp_logo_b.png`
- Create: `public/_static/open-mic/omp_logo_w.png`
- Create: `public/_static/open-mic/omp_banner_w.jpg`

- [ ] **Step 1: Copy the supplied assets without modifying their source files**

Run:

```bash
mkdir -p public/_static/open-mic
cp -f "/Users/kgothatsontsane/Desktop/Open Mic/omp_logo_b.svg" public/_static/open-mic/omp_logo_b.svg
cp -f "/Users/kgothatsontsane/Desktop/Open Mic/omp_logo_b.png" public/_static/open-mic/omp_logo_b.png
cp -f "/Users/kgothatsontsane/Desktop/Open Mic/omp_logo_w.png" public/_static/open-mic/omp_logo_w.png
cp -f "/Users/kgothatsontsane/Desktop/Open Mic/omp_banner_w.jpg" public/_static/open-mic/omp_banner_w.jpg
```

Expected: all four files exist under `public/_static/open-mic/`.

- [ ] **Step 2: Confirm the assets are valid and have non-zero sizes**

Run:

```bash
file public/_static/open-mic/omp_logo_b.svg public/_static/open-mic/omp_logo_b.png public/_static/open-mic/omp_logo_w.png public/_static/open-mic/omp_banner_w.jpg
```

Expected: SVG, PNG, PNG, and JPEG file types respectively.

- [ ] **Step 3: Commit the asset addition**

```bash
git add public/_static/open-mic
git commit -m "feat: add Open Mic brand assets"
```

### Task 2: Centralize Public Brand Values

**Files:**
- Create: `lib/branding.ts`
- Modify: `lib/resend.ts`
- Modify: `pages/_app.tsx`
- Modify: `app/layout.tsx`
- Modify: `middleware.ts`
- Modify: `pages/api/auth-plus/set-cookie.ts`
- Modify: `app/api/cron/domains/route.ts`

- [ ] **Step 1: Add the public brand constants**

Create `lib/branding.ts` with:

```ts
export const BRAND_NAME = "Open Mic Productions";
export const BRAND_DOMAIN = "open-mic.co.za";
export const APP_HOST = "dealroom.open-mic.co.za";
export const APP_URL = `https://${APP_HOST}`;
export const SUPPORT_EMAIL = "support@open-mic.co.za";
export const BRAND_LOGO = "/_static/open-mic/omp_logo_b.svg";
export const BRAND_LOGO_WHITE = "/_static/open-mic/omp_logo_w.png";
export const BRAND_BANNER = "/_static/open-mic/omp_banner_w.jpg";
```

- [ ] **Step 2: Replace hard-coded runtime brand/domain values**

Use the constants in Resend defaults, Plausible provider domains, middleware standard-host checks, auth-plus cookie domain, and domain cron exclusions. Preserve `HttpOnly`, `Secure`, and `SameSite` attributes exactly as they currently are.

For verification mail, use `process.env.RESEND_FROM_EMAIL || "Open Mic Productions <noreply@open-mic.co.za>"`; do not use `verify.papermark.io`.

- [ ] **Step 3: Verify runtime domain references**

Run:

```bash
git grep -n -i "papermark\.io" -- '*.ts' '*.tsx'
```

Expected: no runtime email, analytics, cookie, middleware, or support-domain matches remain. Only documented external demo-media URLs may remain.

- [ ] **Step 4: Commit runtime branding changes**

```bash
git add lib/branding.ts lib/resend.ts pages/_app.tsx app/layout.tsx middleware.ts pages/api/auth-plus/set-cookie.ts app/api/cron/domains/route.ts
git commit -m "feat: configure Open Mic runtime branding"
```

### Task 3: Replace Authentication and Application UI Branding

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/login/page-client.tsx`
- Modify: `app/(auth)/register/page.tsx`
- Modify: `app/(auth)/register/page-client.tsx`
- Modify: `app/(auth)/verify/page.tsx`
- Modify: `app/(auth)/verify/invitation/page.tsx`
- Modify: `app/(auth)/verify/invitation/InvitationStatusContent.tsx`
- Modify: `app/(auth)/auth/confirm-email-change/[token]/page.tsx`
- Modify: `pages/account/general.tsx`
- Modify: `pages/documents/[id]/chat.tsx`
- Modify: `pages/datarooms/[id]/groups/[groupId]/index.tsx`
- Modify: `pages/datarooms/[id]/settings/index.tsx`
- Modify: `components/billing/upgrade-plan-modal.tsx`
- Modify: `components/billing/pro-annual-banner.tsx`
- Modify: `components/billing/pro-banner.tsx`
- Modify: `components/domains/domain-configuration.tsx`

- [ ] **Step 1: Replace visible product names and metadata**

Replace user-facing `Papermark` text with `Open Mic Productions`, and update titles, descriptions, Open Graph values, Twitter values, creator/site metadata, and accessibility labels. Do not change API paths, route segments, database fields, or internal variables solely because they contain `papermark`.

- [ ] **Step 2: Replace authentication logos and preserve the requested screenshot**

Use `/_static/open-mic/omp_logo_b.svg` for light backgrounds and `/_static/open-mic/omp_logo_w.png` for dark backgrounds. Update `alt` values to `Open Mic Productions logo`.

Keep the already-uncommented trusted-teams screenshot in `app/(auth)/login/page-client.tsx`; do not alter its external source URL unless a local replacement is supplied.

- [ ] **Step 3: Replace support and plan copy**

Use `support@open-mic.co.za` for support links and clipboard actions. Replace visible Papermark plan/product labels with Open Mic Productions wording while retaining plan IDs and billing behavior.

- [ ] **Step 4: Commit authentication and UI changes**

```bash
git add "app/(auth)/login/page.tsx" "app/(auth)/login/page-client.tsx" "app/(auth)/register/page.tsx" "app/(auth)/register/page-client.tsx" "app/(auth)/verify/page.tsx" "app/(auth)/verify/invitation/page.tsx" "app/(auth)/verify/invitation/InvitationStatusContent.tsx" "app/(auth)/auth/confirm-email-change/[token]/page.tsx" pages/account/general.tsx "pages/documents/[id]/chat.tsx" "pages/datarooms/[id]/groups/[groupId]/index.tsx" "pages/datarooms/[id]/settings/index.tsx" components/billing/upgrade-plan-modal.tsx components/billing/pro-annual-banner.tsx components/billing/pro-banner.tsx components/domains/domain-configuration.tsx
git commit -m "feat: replace visible Papermark branding"
```

### Task 4: Replace Email and Default Asset Branding

**Files:**
- Modify: `ee/emails/pause-resume-reminder.tsx`
- Modify: `components/emails/*.tsx` files containing Papermark display text or logo paths
- Modify: `pages/datarooms/[id]/branding/index.tsx`
- Modify: `pages/nav_ppreview_demo.tsx`
- Modify: `pages/welcome.tsx` and related welcome components where the product name is visible
- Modify: `components/ui/progress.tsx`
- Modify: `components/profile-menu.tsx`
- Modify: `components/sidebar/nav-user.tsx`

- [ ] **Step 1: Replace email-visible branding**

Update email headings, body copy, logo `src`, logo `alt`, footer/signature text, and product descriptions to Open Mic Productions. Keep email URLs based on `NEXT_PUBLIC_BASE_URL` or `NEXTAUTH_URL`.

- [ ] **Step 2: Replace default Dataroom branding**

Change `DEFAULT_BANNER_IMAGE` and any default logo references to the new files under `/_static/open-mic/`. Preserve uploaded team branding behavior and storage URLs.

- [ ] **Step 3: Classify demo content**

Keep these two external media references unchanged because they point to real assets:

- `app/(auth)/login/page-client.tsx` trusted-teams screenshot.
- `components/welcome/dataroom.tsx` Dataroom demo video.

If the supplied Open Mic images replace either demo asset later, update the `src` and commit that asset migration separately.

- [ ] **Step 4: Commit email and asset-reference changes**

```bash
git add ee/emails components/emails pages/datarooms pages/nav_ppreview_demo.tsx pages/welcome.tsx components/ui/progress.tsx components/profile-menu.tsx components/sidebar/nav-user.tsx
git commit -m "feat: apply Open Mic email and asset branding"
```

### Task 5: Audit and Verify the Whitelabel

**Files:**
- Test: source-tree branding scan and production build

- [ ] **Step 1: Run the case-insensitive branding audit**

Run:

```bash
git grep -n -i -E "Papermark|papermark|PAPERMARK" -- app pages components ee lib public
```

Classify every remaining result as an internal identifier, upstream legal/docs content, or one of the two documented external media URLs. No visible UI, metadata, email, logo path, `alt`, support address, or runtime domain should remain.

- [ ] **Step 2: Run TypeScript verification**

```bash
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 3: Run the production build**

```bash
npm run build
```

Expected: successful Next.js production build with Prisma generation/migrations handled according to the repository build script.

- [ ] **Step 4: Verify critical routes manually**

Check `/login`, `/register`, `/verify`, `/verify/invitation`, `/dashboard`, `/settings/domains`, `/datarooms`, and `/datarooms/<id>/branding` in both light and dark themes. Confirm Open Mic logos, banner, titles, descriptions, alt text, support links, and default Dataroom branding.

- [ ] **Step 5: Verify email configuration without exposing secrets**

Confirm Production has `RESEND_API_KEY` and `RESEND_FROM_EMAIL` configured, and confirm `open-mic.co.za` is verified in Resend. Trigger one verification email and inspect only delivery status and non-secret error messages.

- [ ] **Step 6: Commit verification adjustments and preserve unrelated work**

```bash
git status --short --branch
git --no-pager diff --check
```

Do not revert unrelated worktree changes. Commit only verification-driven branding fixes.
