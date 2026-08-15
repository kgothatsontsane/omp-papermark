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
    <div className="flex h-screen w-full flex-wrap">
      {/* Left part */}
      <div className="flex w-full flex-col items-center justify-center bg-gray-50 md:w-1/2 lg:w-1/2">
        <div className="z-10 mx-5 w-full max-w-md sm:mx-0">
          <div className="flex flex-col space-y-3 px-4 pb-2 sm:px-0">
            <img
              src={BRAND_LOGO}
              alt={`${BRAND_NAME} Logo`}
              className="mb-6 h-8 w-auto self-start"
            />
            <Link href="/">
              <span className="text-balance text-3xl font-semibold tracking-tight text-gray-900">
                Verify your login
              </span>
            </Link>
            <h3 className="text-balance text-sm text-gray-600">
              {BRAND_NAME} Deal Room — confirm it&apos;s you.
            </h3>
          </div>
          <div className="flex flex-col gap-4 px-4 pt-8 sm:px-0">
            <div className="relative">
              <Link href={verification_url}>
                <Button className="focus:shadow-outline w-full transform rounded bg-gray-800 px-4 py-2 text-white transition-colors duration-300 ease-in-out hover:bg-gray-900 focus:outline-none">
                  Verify email
                </Button>
              </Link>
            </div>
          </div>
          <p className="mt-10 w-full max-w-md px-4 text-xs text-muted-foreground sm:px-0">
            By clicking continue, you acknowledge that you have read and agree
            to {BRAND_NAME}&apos;s{" "}
            <a
              href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/terms`}
              target="_blank"
              className="underline"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/privacy`}
              target="_blank"
              className="underline"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
      {/* Right part — brand */}
      <div className="relative hidden w-full justify-center overflow-hidden bg-[#0a0e1a] md:flex md:w-1/2 lg:w-1/2">
        <div
          className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative m-0 flex h-full w-full items-center justify-center p-10">
          <div className="w-full max-w-lg">
            <div className="mb-10">
              <img
                src={BRAND_LOGO}
                alt={`${BRAND_NAME} Logo`}
                className="h-9 w-auto opacity-90"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-white">
              One more step to your deal room.
            </h2>
            <p className="mt-4 max-w-md text-balance leading-relaxed text-gray-400">
              We&apos;ve sent you a verification email. Click the button to
              confirm your identity and continue to {BRAND_NAME} Deal Room.
            </p>
            <div className="mt-10 border-t border-white/10 pt-5 text-sm text-gray-500">
              Didn&apos;t receive it? Check your spam folder, or{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-medium text-indigo-300 hover:text-indigo-200"
              >
                contact support
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
