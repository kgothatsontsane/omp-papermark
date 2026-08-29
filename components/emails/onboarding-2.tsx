import React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { BRAND_NAME } from "@/lib/branding";
import EmailLogo from "@/components/emails/email-logo";

const Onboarding2Email = () => {
  const previewText = `The document sharing infrastructure for the modern web`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              <EmailLogo />
            </Text>
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              Set link permissions
            </Text>
            <Text className="text-sm">
              There are many ways how you can protect your documents!
            </Text>
            <Text className="text-sm">
              With {BRAND_NAME} you can use different link settings for shared
              documents and data rooms:
            </Text>
            <Text className="text-sm">
              <ul className="list-inside list-disc text-sm">
                <li>Require email to view</li>
                <li>Expiration date</li>
                <li>Allow & block list 🌟</li>
                <li>Email verification</li>
                <li>Password protection</li>
                <li>NDA and other agreements</li>
                <li>Screenshot protection</li>
              </ul>
            </Text>
            {/* <Text className="text-sm">You can also use Bulk upload</Text> */}
            <Section className="mb-[32px] mt-[32px] text-center">
              <Button
                className="rounded bg-black text-center text-xs font-semibold text-white no-underline"
                href={`https://dealroom.open-mic.co.za/documents?utm_source=onboarding&utm_medium=email&utm_campaign=20240723&utm_content=upload_documents`}
                style={{ padding: "12px 20px" }}
              >
                To my link settings
              </Button>
            </Section>
            <Text className="text-sm">
              Additionally you can turn on/off: downloading, notifications,
              feedback, and cta settings
            </Text>
            <Hr />
            <Section className="mt-8 text-gray-400">
              <Text className="text-xs">
                © {new Date().getFullYear()}{" "}
                <a
                  href="https://dealroom.open-mic.co.za"
                  className="text-gray-400 no-underline hover:text-gray-400"
                  target="_blank"
                >
                  dealroom.open-mic.co.za
                </a>
              </Text>
              <Text className="text-xs">
                If you have any feedback or questions about this email, simply
                reply to it. I&apos;d love to hear from you!{" "}
              </Text>

              <Text className="text-xs">Stop this onboarding sequence</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default Onboarding2Email;
