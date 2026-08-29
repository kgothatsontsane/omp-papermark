import { JSXElementConstructor, ReactElement } from "react";

import { render } from "@react-email/components";
import { Resend } from "resend";

import { BRAND_NAME } from "@/lib/branding";
import { log, nanoid } from "@/lib/utils";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const sendEmail = async ({
  to,
  subject,
  react,
  from,
  marketing,
  system,
  verify,
  test,
  cc,
  replyTo,
  scheduledAt,
  unsubscribeUrl,
}: {
  to: string;
  subject: string;
  react: ReactElement<any, string | JSXElementConstructor<any>>;
  from?: string;
  marketing?: boolean;
  system?: boolean;
  verify?: boolean;
  test?: boolean;
  cc?: string | string[];
  replyTo?: string;
  scheduledAt?: string;
  unsubscribeUrl?: string;
}) => {
  if (!resend) {
    // Throw an error if resend is not initialized
    throw new Error("Resend not initialized");
  }

  const plainText = await render(react, { plainText: true });

  const envFromEmail = (() => {
    const v = process.env.RESEND_FROM_EMAIL;
    if (!v) return null;
    const m = v.match(/<([^>]+)>/) ?? v.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    return m ? (m[1] ?? m[0]) : v;
  })();

  const defaultEmail = marketing || scheduledAt
    ? "marc@open-mic.co.za"
    : system
      ? "system@open-mic.co.za"
      : verify
        ? "noreply@open-mic.co.za"
        : "marc@open-mic.co.za";

  const fromAddress =
    from ?? `${BRAND_NAME} <${envFromEmail ?? defaultEmail}>`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: test ? "delivered@resend.dev" : to,
      cc: cc,
      replyTo: marketing ? "marc@open-mic.co.za" : replyTo,
      subject,
      react,
      scheduledAt,
      text: plainText,
      headers: {
        "X-Entity-Ref-ID": nanoid(),
        ...(unsubscribeUrl ? { "List-Unsubscribe": unsubscribeUrl } : {}),
      },
    });

    // Check if the email sending operation returned an error and throw it
    if (error) {
      log({
        message: `Resend returned error when sending email: ${error.name} \n\n ${error.message}`,
        type: "error",
        mention: true,
      });
      throw error;
    }

    // If there's no error, return the data
    return data;
  } catch (exception) {
    // Log and rethrow any caught exceptions for upstream handling
    log({
      message: `Unexpected error when sending email: ${exception}`,
      type: "error",
      mention: true,
    });
    throw exception; // Rethrow the caught exception
  }
};
