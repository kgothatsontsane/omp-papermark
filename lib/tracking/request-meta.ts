import { createHash } from "crypto";

import { userAgent } from "next/server";
import type { NextRequest } from "next/server";
import type { NextApiRequest } from "next";

import { geolocation, ipAddress } from "@vercel/functions";

import { log } from "@/lib/utils";
import { isBot, userAgentFromString } from "@/lib/utils/user-agent";

import { EU_COUNTRY_CODES } from "../constants";
import { capitalize } from "../utils";
import { LOCALHOST_GEO_DATA, LOCALHOST_IP } from "../utils/geo";

export interface RequestMeta {
  country: string;
  city: string;
  region: string;
  device: string;
  browser: string;
  os: string;
  ua: string;
  ip_address: string | null;
  isBot: boolean;
}

function euRedactedIp(ip: unknown, country: string | null | undefined) {
  const isEu = country && EU_COUNTRY_CODES.includes(country);
  return typeof ip === "string" && ip.trim().length > 0 && !isEu ? ip : null;
}

// App Router (NextRequest) — same extraction as record-link-view
export function metaFromNextRequest(req: NextRequest): RequestMeta {
  const ua = userAgent(req);
  const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;
  const { region } =
    process.env.VERCEL === "1"
      ? { region: geolocation(req).countryRegion }
      : LOCALHOST_GEO_DATA;
  const geo =
    process.env.VERCEL === "1" ? geolocation(req) : LOCALHOST_GEO_DATA;
  const country = geo.country || "Unknown";
  return {
    country,
    city: geo.city || "Unknown",
    region: region || "Unknown",
    device: ua.device.type ? capitalize(ua.device.type) : "Desktop",
    browser: ua.browser.name || "Unknown",
    os: ua.os.name || "Unknown",
    ua: ua.ua || "Unknown",
    ip_address: euRedactedIp(ip, geo.country),
    isBot: isBot(ua.ua),
  };
}

// Pages API (NextApiRequest) — header-based extraction
export function metaFromApiRequest(req: NextApiRequest): RequestMeta {
  const h = req.headers;
  const ua = userAgentFromString(
    Array.isArray(h["user-agent"]) ? h["user-agent"][0] : h["user-agent"],
  );
  const str = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : (v ?? "");
  const country =
    process.env.VERCEL === "1" ? str(h["x-vercel-ip-country"]) : "Unknown";
  const fwd = str(h["x-forwarded-for"]).split(",")[0].trim();
  const ip =
    process.env.VERCEL === "1" ? fwd || null : (LOCALHOST_IP as string);
  return {
    country: country || "Unknown",
    city:
      process.env.VERCEL === "1"
        ? decodeURIComponent(str(h["x-vercel-ip-city"])) || "Unknown"
        : "Unknown",
    region:
      process.env.VERCEL === "1"
        ? str(h["x-vercel-ip-country-region"]) || "Unknown"
        : "Unknown",
    device: ua.device.type ? capitalize(ua.device.type) : "Desktop",
    browser: ua.browser.name || "Unknown",
    os: ua.os.name || "Unknown",
    ua: ua.ua || "Unknown",
    ip_address: euRedactedIp(ip, country),
    isBot: isBot(ua.ua || ""),
  };
}

// SHA-256 email hash for privacy-preserving analytics (no raw PII in Tinybird)
export function hashEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

// Graceful-degradation ingest: analytics must never break the request path
export async function ingestSafely(
  promise: Promise<unknown>,
  label: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    log({ message: `Graceful degradation: ${label}. \n\n ${error}`, type: "error" });
  }
}
