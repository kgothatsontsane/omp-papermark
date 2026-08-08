export const isSelfHostedMode = (): boolean => {
  return (
    process.env.NEXT_PUBLIC_SELF_HOSTED_MODE === "true" ||
    process.env.SELF_HOSTED_MODE === "true"
  );
};

export const SELF_HOSTED_PLAN = "datarooms-plus";

export function getEffectivePlan(plan: string | undefined): string {
  if (isSelfHostedMode()) {
    return plan?.includes("+old")
      ? `${SELF_HOSTED_PLAN}+old`
      : SELF_HOSTED_PLAN;
  }
  return plan ?? "free";
}

export function isEntitledFeature(plan: string | undefined): boolean {
  if (isSelfHostedMode()) {
    return true;
  }
  if (!plan || plan === "free" || plan === "free+drtrial") {
    return false;
  }
  return true;
}

export function isFreePlan(plan: string | undefined): boolean {
  return !isSelfHostedMode() && (plan === "free" || plan === "free+drtrial");
}

export function isSelfHostedOrPaid(plan: string | undefined): boolean {
  return isSelfHostedMode() || (!isFreePlan(plan));
}