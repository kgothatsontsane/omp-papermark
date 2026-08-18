import { NextApiRequest, NextApiResponse } from "next";

const getFirst = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const getIp = (): string => {
    if (process.env.VERCEL === "1") {
      const realIp = req.headers["x-real-ip"];
      if (realIp) return Array.isArray(realIp) ? realIp[0] : realIp;
      const forwarded = req.headers["x-forwarded-for"];
      if (forwarded) return Array.isArray(forwarded) ? forwarded[0] : forwarded;
      const vercelForwarded = req.headers["x-vercel-forwarded-for"];
      if (vercelForwarded) return Array.isArray(vercelForwarded) ? vercelForwarded[0] : vercelForwarded;
    }
    return "127.0.0.1";
  };

  res.status(200).json({
    ip: req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.headers["x-vercel-forwarded-for"] || "none",
    xRealIp: req.headers["x-real-ip"],
    xForwardedFor: req.headers["x-forwarded-for"],
    xVercelForwardedFor: req.headers["x-vercel-forwarded-for"],
    xVercelIpCountry: req.headers["x-vercel-ip-country"],
    xVercelIpCity: req.headers["x-vercel-ip-city"],
    allHeaders: Object.keys(req.headers).filter(k => k.includes("ip") || k.includes("forward") || k.includes("real") || k.includes("vercel") || k.includes("x-"))
  });
}

