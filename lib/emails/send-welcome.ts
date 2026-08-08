import WelcomeEmail from "@/components/emails/welcome";

import { sendEmail } from "@/lib/resend";

import { CreateUserEmailProps } from "../types";

export const sendWelcomeEmail = async (params: CreateUserEmailProps) => {
  const { name, email } = params.user;
  const emailTemplate = WelcomeEmail({ name });
  try {
    await sendEmail({
      to: email as string,
      subject: "Welcome to {BRAND_NAME}!",
      react: emailTemplate,
      test: process.env.NODE_ENV === "development",
    });
  } catch (e) {
    console.error(e);
  }
};

import { BRAND_NAME } from "@/lib/branding";
