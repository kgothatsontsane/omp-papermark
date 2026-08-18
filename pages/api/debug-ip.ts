import { NextApiRequest, NextApiResponse } from "next";

import { LOCALHOST_IP } from "@/lib/utils/geo";

export default async function handler(req, NextApiResponse) {
  const getFirst = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

  const tryGetIp = (v: string | string[] | undefined): string | undefined => {
    const first = Array.isArray(v) ? v[0] : v;
    return first?.split(",")[0]?.trim();
  };

  let ip: string | undefined;
  if (process.env.VERCEL === "1") {
    ip = req.headers["x-real-ip"] || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.headers["x-vercel-forwarded-for"];
  } else {
    ip = "127.0.0.1";
  }

  res.status(200).json({
    ip: req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.headers["x-vercel-forwarded-for"] || "none",
    xRealIp: req.headers["x-real-ip"],
    xForwardedFor: req.headers["x-forwarded-for"],
    xVercelForwardedFor: req.headers["x-vercel-forwarded-for"],
    xVercelIpCountry: req.headers["x-vercel-ip-country"],
    xVercelIpCity: req.headers["x-vercel-ip-city"],
    xForwardedFor: req.headers["x-forwarded-for"],
    xVercelForwardedFor: req.headers["x-vercel-forwarded-for"],
    allHeaders: Object.keys(req.headers).filter(k => k.includes("ip") || k.includes("forward") || k.includes("real") || k.includes("vercel") || k.includes("x-"))
  });
}

export default handler;