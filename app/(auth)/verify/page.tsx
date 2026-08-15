import { Metadata } from "next";
import Link from "next/link";

import NotFound from "@/pages/404";

import { generateChecksum } from "@/lib/utils/generate-checksum";

import { Button } from "@/components/ui/button";

import { APP_URL, BRAND_NAME, BRAND_LOGO, SUPPORT_EMAIL } from "@/lib/branding";

const data = {
  description: `Verify login to ${BRAND_NAME}`,
  title: `Verify | ${BRAND_NAME}`,
  url: "/verify",
};

const EQ_BARS = [26, 40, 22, 58, 34, 68, 30, 46, 24, 54, 38, 62];

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: data.title,
  description: data.description,
  openGraph: {
    title: data.title,
    description: data.description,
    url: data.url,
    siteName: BRAND_NAME,
    images: [
      {
        url: "/_static/meta-image.png",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: data.title,
    description: data.description,
    images: ["/_static/meta-image.png"],
  },
};

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { verification_url?: string; checksum?: string };
}) {
  const { verification_url, checksum } = searchParams;

  if (!verification_url || !checksum) {
    return <NotFound />;
  }

  // Server-side validation
  const isValidVerificationUrl = (url: string, checksum: string): boolean => {
    try {
      const urlObj = new URL(url);
      if (urlObj.origin !== process.env.NEXTAUTH_URL) return false;
      const expectedChecksum = generateChecksum(url);
      return checksum === expectedChecksum;
    } catch {
      return false;
    }
  };

  if (!isValidVerificationUrl(verification_url, checksum)) {
    return <NotFound />;
  }

  return (
    <>
      <style>{`
        @keyframes omp-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes omp-eq {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
        .omp-rise {
          opacity: 0;
          animation: omp-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .omp-eq-bar {
          transform-origin: bottom;
          animation: omp-eq 2.8s ease-in-out infinite;
        }
      `}</style>

      <div className="flex min-h-screen w-full flex-wrap bg-gray-50">
        {/* Left — verify */}
        <div className="flex w-full flex-col items-center px-6 pt-16 md:w-1/2 md:px-10 lg:w-1/2">
          <div className="omp-rise w-full max-w-md">
            <div className="mb-12 flex items-center justify-center gap-5">
              <img
                src={BRAND_LOGO}
                alt={`${BRAND_NAME} Logo`}
                className="h-16 w-auto"
              />
              <div className="flex h-10 items-end gap-[3px]" aria-hidden="true">
                {EQ_BARS.map((h, i) => (
                  <span
                    key={i}
                    className="omp-eq-bar w-[3px] rounded-t-sm bg-indigo-400"
                    style={{ height: `${h}px`, animationDelay: `${i * 0.11}s` }}
                  />
                ))}
              </div>
            </div>

            <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-indigo-700">
              Private Deal Room
            </p>
            <h1 className="text-balance text-4xl font-medium leading-[1.08] tracking-tight text-gray-900">
              Verify your login.
            </h1>
            <p className="mt-4 max-w-sm text-balance leading-relaxed text-gray-500">
              {BRAND_NAME} Deal Room — confirm it&apos;s you to continue.
            </p>

            <div className="mt-10 flex flex-col gap-4">
              <Link href={verification_url}>
                <Button className="h-11 w-full rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-300 ease-in-out hover:bg-gray-900">
                  Verify email
                </Button>
              </Link>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-5 text-sm text-gray-500">
              Didn&apos;t receive it? Check your spam folder, or{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-medium text-indigo-700 hover:text-indigo-600"
              >
                contact support
              </a>
              .
            </div>

            <p className="mt-8 text-xs leading-relaxed text-gray-400">
              By continuing, you acknowledge that you have read and agree to{" "}
              {BRAND_NAME}&apos;s{" "}
              <a
                href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/terms`}
                target="_blank"
                className="underline underline-offset-2 hover:text-gray-600"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/privacy`}
                target="_blank"
                className="underline underline-offset-2 hover:text-gray-600"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>

        {/* Right — brand panel */}
        <div className="relative hidden w-full justify-center overflow-hidden bg-[#0a0e1a] md:flex md:w-1/2 lg:w-1/2">
          <div
            className="pointer-events-none absolute -left-40 top-1/4 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />

          <div className="relative z-10 flex h-full w-full items-center justify-center p-10 lg:p-16">
            <div className="omp-rise w-full max-w-lg" style={{ animationDelay: "120ms" }}>
              <p className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-indigo-300">
                Open Mic Productions
              </p>
              <h2 className="text-balance text-4xl font-medium leading-[1.1] tracking-tight text-white lg:text-5xl">
                One more step
                <br />
                to your deal room.
              </h2>
              <p className="mt-5 max-w-md text-balance leading-relaxed text-gray-400">
                We&apos;ve sent you a verification email. Confirm your identity
                and continue to {BRAND_NAME} Deal Room — secure and
                confidential, always.
              </p>

              <div className="mt-10 border-t border-white/10 pt-5 text-sm text-gray-500">
                Hosted on SOC 2 Type II certified infrastructure — AES-256
                encryption at rest, TLS in transit, role-based access, and a
                full audit trail on every view.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
