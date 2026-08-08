import { isSelfHostedMode } from "@/lib/self-hosted";

export type BetaFeatures =
  | "tokens"
  | "incomingWebhooks"
  | "roomChangeNotifications"
  | "webhooks"
  | "conversations"
  | "dataroomUpload"
  | "inDocumentLinks"
  | "usStorage";

type BetaFeaturesRecord = Record<BetaFeatures, string[]>;

export const getFeatureFlags = async ({ teamId }: { teamId?: string }) => {
  if (isSelfHostedMode()) {
    return Object.fromEntries(
      Object.keys({
        tokens: [],
        incomingWebhooks: [],
        roomChangeNotifications: [],
        webhooks: [],
        conversations: [],
        dataroomUpload: [],
        inDocumentLinks: [],
        usStorage: [],
      }).map(([key]) => [key, true]),
    ) as Record<BetaFeatures, boolean>;
  }

  const teamFeatures: Record<BetaFeatures, boolean> = {
    tokens: false,
    incomingWebhooks: false,
    roomChangeNotifications: false,
    webhooks: false,
    conversations: false,
    dataroomUpload: false,
    inDocumentLinks: false,
    usStorage: false,
  };

  // Return all features as true if edge config is not available
  if (!process.env.EDGE_CONFIG) {
    return Object.fromEntries(
      Object.entries(teamFeatures).map(([key, _v]) => [key, true]),
    );
  } else if (!teamId) {
    return teamFeatures;
  }

  let betaFeatures: BetaFeaturesRecord | undefined = undefined;

  try {
    // ponytail: lazy import of @vercel/edge-config only when needed in non-self-hosted mode
    const { get } = await import("@vercel/edge-config");
    betaFeatures = await get("betaFeatures");
  } catch (e) {
    console.error(`Error getting beta features: ${e}`);
  }

  if (betaFeatures) {
    for (const [featureFlag, teamIds] of Object.entries(betaFeatures)) {
      if (teamIds.includes(teamId)) {
        teamFeatures[featureFlag as BetaFeatures] = true;
      }
    }
  }

  return teamFeatures;
};