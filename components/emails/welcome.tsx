import React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { BRAND_NAME } from "@/lib/branding";
import EmailLogo from "@/components/emails/email-logo";

interface WelcomeEmailProps {
  name: string | null | undefined;
}

const WelcomeEmail = ({ name }: WelcomeEmailProps) => {
  const previewText = `The document sharing infrastructure for the modern web`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              Welcome to{" "}
              <EmailLogo />
            </Text>
            <Text className="text-sm">
              Thanks for signing up{name && `, ${name}`}!
            </Text>
            <Text className="text-sm">
              My name is Marc, and I&apos;m the creator of {BRAND_NAME} – the
              open-source DocSend alternative! I&apos;m excited to have you on
              board!
            </Text>
            <Text className="text-sm">
              Here are a few things you can do to get started:
            </Text>
            <Text className="text-sm">
              <ul className="list-inside list-disc text-sm">
                <li>Upload a document</li>
                <li>Create a virtual data room</li>
                <li>
                  Share a link{" "}
                  <span className="italic">(with your custom domain)✨</span>
                </li>
                <li>Watch the views come in real-time</li>
              </ul>
            </Text>
            <Section className="mb-[32px] mt-[32px] text-center">
              <Button
                className="rounded bg-black text-center text-xs font-semibold text-white no-underline"
                href={`${process.env.NEXT_PUBLIC_BASE_URL}/welcome`}
                style={{ padding: "12px 20px" }}
              >
                Get Started
              </Button>
            </Section>
            <Section>
              <Text className="text-sm">
                If you would like to keep up to date, you can:
              </Text>
              <Text className="text-sm">
                <ul className="list-inside list-disc text-sm">
                  <li>
                    Visit{" "}
                    <Link
                      href="https://dealroom.open-mic.co.za"
                      target="_blank"
                    >
                      Open Mic Productions
                    </Link>
                  </li>

                </ul>
              </Text>
            </Section>
            <Section className="mt-4">
              <Text className="text-sm">
                If you have any questions or feedback just respond to this
                email. I&apos;m always happy to help!
              </Text>
              <Text className="text-sm text-gray-400">Marc from {BRAND_NAME}</Text>
            </Section>
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
                You will shortly receive the intro to {BRAND_NAME}. Stay tuned.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default WelcomeEmail;
