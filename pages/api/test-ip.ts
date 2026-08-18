import { NextApiRequest, NextApiResponse } from "next";

const getFirst = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const tryGetIp = (v: string | string[] | undefined): string | undefined => {
  const first = Array.isArray(v) ? v[0] : v;
  return typeof first === "string" ? first.split(",")[0]?.trim() : undefined;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  let ip: string | undefined;
  if (process.env.VERCEL === "1") {
    ip = getFirst(req.headers["x-real-ip"]) ||
      tryGetIp(req.headers["x-forwarded-for"]) ||
      getFirst(req.headers["x-vercel-forwarded-for"]);
  } else {
    ip = "127.0.0.1";
  }

  res.status(200).json({
    ip: getFirst(req.headers["x-real-ip"]) || tryGetIp(req.headers["x-forwarded-for"]) || getFirst(req.headers["x-vercel-forwarded-for"]) || "none",
    xRealIp: req.headers["x-real-ip"],
    xForwardedFor: req.headers["x-forwarded-for"],
    xVercelForwardedFor: req.headers["x-vercel-forwarded-for"],
    xVercelIpCountry: req.headers["x-vercel-ip-country"],
    xVercelIpCity: req.headers["x-vercel-ip-city"],
    allHeaders: Object.keys(req.headers).filter(k => k.includes("ip") || k.includes("forward") || k.includes("real") || k.includes("vercel") || k.includes("x-"))
  });
}

