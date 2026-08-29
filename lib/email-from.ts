import { BRAND_NAME } from "@/lib/branding";

export const OPEN_MIC_DOMAIN = "open-mic.co.za";

export function extractEmail(value?: string | null): string | null {
  if (!value) return null;
  const m =
    value.match(/<([^>]+)>/) ?? value.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? (m[1] ?? m[0]) : null;
}

// Builds the final "From" header. The display name is always BRAND_NAME and the
// address must be on the Open Mic domain. Any candidate whose domain is not
// open-mic.co.za (e.g. a stale "Papermark" custom email from Edge Config or
// RESEND_FROM_EMAIL) is ignored, falling back to the Open Mic defaults. This
// keeps every email template branded regardless of how it's called.
export function buildFromAddress(opts: {
  from?: string;
  envFromEmail?: string;
  marketing?: boolean;
  system?: boolean;
  verify?: boolean;
  scheduledAt?: string;
}): string {
  const { from, envFromEmail, marketing, system, verify, scheduledAt } = opts;

  const candidates: (string | null | undefined)[] = [
    from,
    envFromEmail,
    marketing || scheduledAt ? "marc@open-mic.co.za" : null,
    system ? "system@open-mic.co.za" : null,
    verify ? "noreply@open-mic.co.za" : null,
    "noreply@open-mic.co.za",
  ];

  let email: string | null = null;
  for (const candidate of candidates) {
    const candidateEmail = extractEmail(candidate);
    if (candidateEmail && candidateEmail.toLowerCase().endsWith(OPEN_MIC_DOMAIN)) {
      email = candidateEmail;
      break;
    }
  }

  return `${BRAND_NAME} <${email}>`;
}
