import { NextApiRequest, NextApiResponse } from "next";

import { handleRoute } from "@/ee/features/billing/cancellation/api/pause-route";

export const config = {
  // in order to enable `waitUntil` function
};

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  return handleRoute(req, res);
}
