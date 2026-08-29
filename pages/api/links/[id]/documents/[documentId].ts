import { NextApiRequest, NextApiResponse } from "next";

import { errorhandler } from "@/lib/errorHandler";
import { getDataroomDocumentLinkViewData } from "@/lib/api/links/link-data";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id, documentId: dataroomDocumentId } = req.query as {
    id: string;
    documentId: string;
  };

  try {
    const { email } = req.query as { email?: string };
    const result = await getDataroomDocumentLinkViewData({
      id,
      documentId: dataroomDocumentId,
      email,
    });

    if ("notFound" in result) {
      return res.status(404).json({ error: "Link not found" });
    }
    if ("error" in result) {
      return res.status(result.status).json({ message: result.error });
    }

    return res.status(200).json({
      linkType: result.linkType,
      link: result.link,
      brand: result.brand,
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    errorhandler(error, res);
  }
}
