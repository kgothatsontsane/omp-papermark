import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import Head from "next/head";

import { TeamProvider } from "@/context/team-context";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import PlausibleProvider from "next-plausible";
import { NuqsAdapter } from "nuqs/adapters/next/pages";

import { EXCLUDED_PATHS } from "@/lib/constants";
import {
  APP_URL,
  BRAND_NAME,
} from "@/lib/branding";

import { PostHogCustomProvider } from "@/components/providers/posthog-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function App({
  Component,
  pageProps: { session, ...pageProps },
  router,
}: AppProps<{ session: Session }>) {
  return (
    <>
      <Head>
        <title>{BRAND_NAME} | Secure Document Sharing</title>
        <meta name="theme-color" content="#000000" />
        <meta
          name="description"
          content={`${BRAND_NAME} secure document sharing with built-in analytics.`}
          key="description"
        />
        <meta
          property="og:title"
          content={`${BRAND_NAME} | Secure Document Sharing`}
          key="og-title"
        />
        <meta
          property="og:description"
          content={`${BRAND_NAME} secure document sharing with built-in analytics.`}
          key="og-description"
        />
        <meta
          property="og:image"
          content={`${APP_URL}/_static/meta-image.png`}
          key="og-image"
        />
        <meta
          property="og:url"
          content={APP_URL}
          key="og-url"
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={BRAND_NAME} key="tw-title" />
        <meta
          name="twitter:description"
          content={`${BRAND_NAME} secure document sharing with built-in analytics.`}
          key="tw-description"
        />
        <meta
          name="twitter:image"
          content={`${APP_URL}/_static/meta-image.png`}
          key="tw-image"
        />
        <link rel="icon" href="/favicon.ico" key="favicon" />
      </Head>
      <SessionProvider session={session}>
        <PostHogCustomProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <PlausibleProvider
              domain="dealroom.open-mic.co.za"
              enabled={process.env.NEXT_PUBLIC_VERCEL_ENV === "production"}
            >
              <NuqsAdapter>
                <main className={inter.className}>
                  <Toaster closeButton />
                  <TooltipProvider delayDuration={100}>
                    {EXCLUDED_PATHS.includes(router.pathname) ? (
                      <Component {...pageProps} />
                    ) : (
                      <TeamProvider>
                        <Component {...pageProps} />
                      </TeamProvider>
                    )}
                  </TooltipProvider>
                </main>
              </NuqsAdapter>
            </PlausibleProvider>
          </ThemeProvider>
        </PostHogCustomProvider>
      </SessionProvider>
    </>
  );
}
