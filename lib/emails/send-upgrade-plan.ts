import UpgradePlanEmail from "@/components/emails/upgrade-plan";

import { sendEmail } from "@/lib/resend";
import { CreateUserEmailProps } from "@/lib/types";

export const sendUpgradePlanEmail = async (
  params: CreateUserEmailProps & { planType: string },
) => {
  const { name, email } = params.user;
  const { planType } = params;
  const emailTemplate = UpgradePlanEmail({ name, planType });
  try {
    await sendEmail({
      to: email as string,
      subject: `Thank you for upgrading to {BRAND_NAME} ${planType}!`,
      react: emailTemplate,
      test: process.env.NODE_ENV === "development",
    });
  } catch (e) {
    console.error(e);
  }
};

import { BRAND_NAME } from "@/lib/branding";
