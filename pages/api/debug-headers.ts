import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const headers: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (k.includes("ip") || k.includes("forward") || k.includes("real") || k.includes("vercel") || k.includes("x-")) {
      headers[k] = req.headers[k];
    }
  }
  res.status(200).json({ headers });
}

