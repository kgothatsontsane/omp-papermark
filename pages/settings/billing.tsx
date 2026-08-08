import { useRouter } from "next/router";

import { useEffect } from "react";

import { isSelfHostedMode } from "@/lib/self-hosted";
import { useTeam } from "@/context/team-context";
import { sendGTMEvent } from "@next/third-parties/google";
import { toast } from "sonner";

import { useAnalytics } from "@/lib/analytics";
import { usePlan } from "@/lib/swr/use-billing";

import AppLayout from "@/components/layouts/app";
import { SettingsHeader } from "@/components/settings/settings-header";

export default function Billing() {
  const router = useRouter();
  const analytics = useAnalytics();

  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { plan } = usePlan();

  // ponytail: in self-hosted mode, redirect billing page to settings
  useEffect(() => {
    if (isSelfHostedMode()) {
      router.replace("/settings/general");
    }
  }, [router]);

  useEffect(() => {
    if (router.query.success) {
      toast.success("Upgrade success!");
      analytics.capture("User Upgraded", {
        plan: plan,
        teamId: teamId,
        $set: { teamId: teamId, teamPlan: plan },
      });

      sendGTMEvent({ event: "upgraded" });

      // Remove the success query parameter
      router.replace("/settings/billing", undefined, { shallow: true });
    }

    if (router.query.cancel) {
      analytics.capture("Stripe Checkout Cancelled", {
        teamId: teamId,
      });

      // Remove the cancel query parameter
      router.replace("/settings/billing", undefined, { shallow: true });
    }
  }, [router.query]);

  if (isSelfHostedMode()) {
    return null;
  }

  return (
    <AppLayout>
      <SettingsHeader />
    </AppLayout>
  );
}