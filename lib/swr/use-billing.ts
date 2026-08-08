import { isSelfHostedMode } from "@/lib/self-hosted";
import { useTeam } from "@/context/team-context";
import { PLAN_NAME_MAP } from "@/ee/stripe/constants";
import { SubscriptionDiscount } from "@/ee/stripe/functions/get-subscription-item";
import useSWR from "swr";
import { useMemo } from "react";

import { fetcher } from "@/lib/utils";

interface BillingProps {
  id: string;
  plan: string;
  startsAt: Date | null;
  endsAt: Date | null;
  subscriptionId: string | null;
  _count: {
    documents: number;
  };
}

export function useBilling() {
  const teamInfo = useTeam();

  const { data, error } = useSWR<BillingProps>(
    teamInfo?.currentTeam && `/api/teams/${teamInfo.currentTeam.id}/billing`,
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  return {
    ...data,
    error,
    loading: !data && !error,
  };
}

export type BasePlan =
  | "free"
  | "starter"
  | "pro"
  | "trial"
  | "business"
  | "datarooms"
  | "datarooms-plus";

type PlanWithTrial = `${BasePlan}+drtrial`;
type PlanWithOld = `${BasePlan}+old` | `${BasePlan}+drtrial+old`;

type PlanResponse = {
  plan: BasePlan | PlanWithTrial | PlanWithOld;
  startsAt: Date | null;
  endsAt: Date | null;
  subscriptionId: string | null;
  isCustomer: boolean;
  subscriptionCycle: "monthly" | "yearly";
  discount: SubscriptionDiscount | null;
};

interface PlanDetails {
  plan: BasePlan | null;
  trial: string | null;
  old: boolean;
}

function parsePlan(plan: BasePlan | PlanWithTrial | PlanWithOld): PlanDetails {
  if (!plan || typeof plan !== "string") {
    return { plan: null, trial: null, old: false };
  }

  try {
    const parts = plan.split("+");
    return {
      plan: parts[0] as BasePlan,
      trial: parts.includes("drtrial") ? "drtrial" : null,
      old: parts.includes("old"),
    };
  } catch (error) {
    console.error("Error parsing plan:", error);
    return { plan: null, trial: null, old: false };
  }
}

export function usePlan({
  withDiscount = false,
}: { withDiscount?: boolean } = {}) {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const {
    data: plan,
    error,
    mutate,
  } = useSWR<PlanResponse>(
    teamId ? `/api/teams/${teamId}/billing/plan${withDiscount ? "?withDiscount=true" : ""}` : null,
    fetcher,
  );

  const parsedPlan = useMemo(() => {
    if (!plan || !plan.plan) {
      if (isSelfHostedMode()) {
        return { plan: "datarooms-plus" as BasePlan, trial: null, old: false };
      }
      return { plan: null, trial: null, old: false };
    }
    return parsePlan(plan.plan);
  }, [plan]);

  return {
    plan: parsedPlan.plan ?? "free",
    planName: PLAN_NAME_MAP[parsedPlan.plan ?? "free"],
    originalPlan: parsedPlan.plan + (parsedPlan.old ? "+old" : ""),
    trial: parsedPlan.trial,
    isTrial: !!parsedPlan.trial,
    isOldAccount: parsedPlan.old,
    isCustomer: plan?.isCustomer ?? isSelfHostedMode(),
    isAnnualPlan: plan?.subscriptionCycle === "yearly",
    startsAt: plan?.startsAt,
    endsAt: plan?.endsAt,
    cancelledAt: null,
    isPaused: false,
    isCancelled: false,
    pauseStartsAt: null,
    discount: plan?.discount || null,
    isFree: isSelfHostedMode() ? false : parsedPlan.plan === "free",
    isStarter: parsedPlan.plan === "starter",
    isPro: parsedPlan.plan === "pro",
    isBusiness: isSelfHostedMode() ? true : parsedPlan.plan === "business",
    isDatarooms:
      isSelfHostedMode() ||
      parsedPlan.plan === "datarooms" ||
      parsedPlan.plan === "datarooms-plus",
    isDataroomsPlus: isSelfHostedMode() || parsedPlan.plan === "datarooms-plus",
    loading: !plan && !error && !!teamId && !isSelfHostedMode(),
    error,
    mutate,
  };
}