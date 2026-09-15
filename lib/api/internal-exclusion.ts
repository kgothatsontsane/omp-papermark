import prisma from "@/lib/prisma";

export async function getInternalExclusion(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { excludedEmails: true, excludedLinkIds: true },
  });
  return {
    excludedEmails: team?.excludedEmails ?? [],
    excludedLinkIds: team?.excludedLinkIds ?? [],
  };
}
