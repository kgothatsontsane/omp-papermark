# Open Mic Productions Whitelabel Design

## Goal

Remove user-facing Papermark branding from the self-hosted application and replace it with Open Mic Productions branding without changing internal identifiers or application behavior.

## Scope

### Included

- Visible UI text, headings, labels, testimonials, plan copy, and support contact details.
- Page titles, descriptions, Open Graph metadata, Twitter metadata, and accessibility labels.
- Login, registration, verification, invitation, account, document, Dataroom, billing, and email-template branding.
- Logo and banner references, including `src`, imports, default assets, and `alt` text.
- Resend sender and reply-to defaults, using the verified Open Mic domain.
- Plausible site domain configuration for `dealroom.open-mic.co.za`.
- Middleware and cookie-domain references that currently target Papermark domains.

### Excluded

- Package names, repository names, Prisma model/field names, database identifiers, API routes, migration names, and internal code symbols.
- External Papermark-hosted demo media URLs where replacing the URL would break the asset. These remain an explicit known exception until equivalent local assets are supplied.
- Legal documents describing the upstream Papermark project, unless they are rendered in the product UI or email.

## Brand Assets

Copy the supplied assets from `/Users/kgothatsontsane/Desktop/Open Mic/` into `public/_static/open-mic/`:

- `omp_logo_b.svg`: primary black logo for light backgrounds.
- `omp_logo_b.png`: black raster logo fallback.
- `omp_logo_w.png`: white logo for dark backgrounds.
- `omp_banner_w.jpg`: Open Mic banner/default banner asset.

Application references use stable Open Mic filenames rather than the source-folder names. Existing Papermark asset files remain untouched unless a route still requires them and the replacement is behaviorally equivalent.

## Domain Rules

- Product/application host: `dealroom.open-mic.co.za`.
- Organization/email domain: `open-mic.co.za`.
- Email defaults use addresses on `open-mic.co.za`, with `RESEND_FROM_EMAIL` taking precedence when configured.
- The Resend domain must be verified before production email delivery can succeed.

## Implementation Strategy

1. Add the supplied assets to the public static asset directory.
2. Replace direct user-facing brand strings and metadata in application pages, components, and email templates.
3. Replace logo/banner imports and image references, including accessibility text.
4. Update runtime domain references for analytics, cookies, middleware, and email defaults.
5. Leave internal Papermark identifiers and known external demo media exceptions unchanged.
6. Search the source tree case-insensitively for remaining Papermark occurrences and classify each as replaced, intentionally preserved, or internal.

## Security and Compatibility

- Do not alter authentication, authorization, RBAC, signed URLs, cookies' security attributes, API ownership checks, or database access patterns except for the intended cookie domain.
- Preserve `HttpOnly`, `Secure`, and `SameSite` cookie attributes.
- Do not expose or hard-code credentials, tokens, or private asset URLs.
- Preserve existing image dimensions, responsive behavior, and light/dark contrast.
- Preserve external demo media until local replacements exist; do not point an image or video tag at a nonexistent Open Mic path.

## Verification

- Case-insensitive source scan for `Papermark`, `papermark`, and `PAPERMARK`.
- Confirm remaining matches are only internal identifiers, upstream legal/docs content, or documented external demo media.
- Run `npx tsc --noEmit`.
- Run `npm run build` or the repository's production build command.
- Verify login, registration, verification, invitation, dashboard, Dataroom branding, email templates, and dark/light logo variants.
- Confirm the current uncommitted login screenshot change is preserved and not included in the specification commit.
