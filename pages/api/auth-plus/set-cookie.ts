import { NextApiRequest, NextApiResponse } from "next";

import { getToken } from "next-auth/jwt";

import { BRAND_DOMAIN } from "@/lib/branding";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL_URL;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const token = await getToken({ req });

  if (!token) {
    return res.status(401).end();
  }

  // Set the cookie (host-only, no Domain attribute — prevents cross-subdomain leakage)
  res.setHeader(
    "Set-Cookie",
    `${VERCEL_DEPLOYMENT ? "__Secure-" : ""}next-auth.session-token=${req.cookies[`${VERCEL_DEPLOYMENT ? "__Secure-" : ""}next-auth.session-token`]}; HttpOnly; Path=/; SameSite=Lax; ${VERCEL_DEPLOYMENT ? "Secure; " : ""}Max-Age=${30 * 24 * 60 * 60}`,
  );

  res.status(200).end();
}
