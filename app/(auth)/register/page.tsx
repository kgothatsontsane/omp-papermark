import { Metadata } from "next";

import RegisterClient from "./page-client";

import { APP_URL, BRAND_NAME } from "@/lib/branding";

const data = {
  description: `Sign up to ${BRAND_NAME}`,
  title: `Sign up | ${BRAND_NAME}`,
  url: "/register",
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

export default function RegisterPage() {
  return <RegisterClient />;
}
