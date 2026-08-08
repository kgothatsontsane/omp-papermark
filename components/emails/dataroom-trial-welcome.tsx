import React from "react";

import { Body, Head, Html, Tailwind, Text } from "@react-email/components";

import { BRAND_NAME } from "@/lib/branding";

interface WelcomeEmailProps {
  name: string | null | undefined;
}

const DataroomTrialWelcomeEmail = ({ name }: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="font-sans text-sm">
          <Text>Hi {name},</Text>
          <Text>
            I am Marc, founder of {BRAND_NAME}. Thanks for creating a trial. Do you
            need any help with Data Rooms setup?
          </Text>
          <Text>Marc</Text>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default DataroomTrialWelcomeEmail;
