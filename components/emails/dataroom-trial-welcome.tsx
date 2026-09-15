import React from "react";

import {
  Body,
  Container,
  Head,
  Html,
  Tailwind,
  Text,
} from "@react-email/components";

import EmailLogo from "@/components/emails/email-logo";
import { BRAND_NAME } from "@/lib/branding";

interface WelcomeEmailProps {
  name: string | null | undefined;
}

const DataroomTrialWelcomeEmail = ({ name }: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              <EmailLogo />
            </Text>
            <Text className="text-sm leading-6 text-black">Hi {name},</Text>
            <Text className="text-sm leading-6 text-black">
              I am Marc, founder of {BRAND_NAME}. Thanks for creating a trial.
              Do you need any help with Data Rooms setup?
            </Text>
            <Text className="text-sm leading-6 text-black">Marc</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default DataroomTrialWelcomeEmail;
