import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") {
        return res.status(405).end("Method Not Allowed");
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { key } = req.body as { key: string };

    if (typeof key !== "string" || !key) {
        return res.status(400).json({ message: "Key is required" });
    }

    // Verify the user has access to this team's files
    const keyParts = key.split("/");
    const keyTeamId = keyParts[0];

    // Check if user belongs to the team that owns this file
    const userTeam = await prisma.userTeam.findFirst({
        where: {
            userId: (session.user as CustomUser).id,
            teamId: keyTeamId,
        },
    });

    if (!userTeam) {
        return res.status(403).json({ error: "Access denied" });
    }

    try {
        const response = await fetch(
            `${process.env.NEXTAUTH_URL}/api/file/s3/get-presigned-get-url`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
                },
                body: JSON.stringify({ key: key }),
            },
        );

        if (!response.ok) {
            const contentType = response.headers.get("content-type");
            let error: any;

            if (contentType && contentType.includes("application/json")) {
                try {
                    error = await response.json();
                } catch (parseError) {
                    error = { message: await response.text() || `Request failed with status ${response.status}` };
                }
            } else {
                const textError = await response.text();
                error = { message: textError || `Request failed with status ${response.status}` };
            }

            return res.status(response.status).json(error);
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error("Proxy error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
