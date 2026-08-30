import { isSelfHostedMode } from "@/lib/self-hosted";
import { BasePlan } from "../swr/use-billing";

// Trigger.dev v4: trigger-time `queue` is a string (queue name). Concurrency
// limits are set at task definition level, not per-trigger.
export const conversionQueue = (plan: string): { name: string } => {
  const planName = plan.split("+")[0] as BasePlan;

  // ponytail: in self-hosted mode, use maximum concurrency
  if (isSelfHostedMode()) {
    return { name: `conversion-datarooms-plus` };
  }

  return { name: `conversion-${planName}` };
};