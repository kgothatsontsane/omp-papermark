import { Metadata } from "next";
import { Inter } from "next/font/google";

import PlausibleProvider from "next-plausible";

import { APP_URL, BRAND_NAME } from "@/lib/branding";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

const data = {
  description: `${BRAND_NAME} secure document sharing with real-time analytics.`,
  title: `${BRAND_NAME} | Secure Document Sharing`,
  url: "/",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <PlausibleProvider
          domain="dealroom.open-mic.co.za"
          enabled={process.env.NEXT_PUBLIC_VERCEL_ENV === "production"}
        />
        {/* ponytail: McMaster-style perf — prefetch linked HTML on hover + preconnect analytics */}
        <link
          rel="preconnect"
          href="https://api.eu-west-1.aws.tinybird.co"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://plausible.io"
          crossOrigin="anonymous"
        />
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prefetch: [
                {
                  source: "document",
                  where: { selector: { hover: "a" } },
                  eagerness: "conservative",
                },
              ],
            }),
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
