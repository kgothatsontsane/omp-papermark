import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { BRAND_COMPANY, BRAND_PLATFORM } from "@/lib/branding";
import EmailLogo from "@/components/emails/email-logo";

export type WeeklyDigestViewer = {
  email: string;
  views: number;
};

export type WeeklyDigestDropoff = {
  name: string;
  completion: number;
};

export default function WeeklyDigest({
  teamName,
  weekLabel,
  topViewers,
  dropoffs,
  securityFlagCount,
  unsignedAgreements,
}: {
  teamName: string;
  weekLabel: string;
  topViewers: WeeklyDigestViewer[];
  dropoffs: WeeklyDigestDropoff[];
  securityFlagCount: number;
  unsignedAgreements: number;
}) {
  return (
    <Html>
      <Head />
      <Preview>
        Your weekly {teamName} activity digest on {BRAND_PLATFORM}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 w-[465px] p-5">
            <Text className="mx-0 mb-8 mt-4 p-0 text-center text-2xl font-normal">
              <EmailLogo />
            </Text>
            <Text className="font-seminbold mx-0 mb-8 mt-4 p-0 text-center text-xl">
              {`Weekly digest: ${teamName}`}
            </Text>
            <Text className="text-sm leading-6 text-black">{weekLabel}</Text>
            <Text className="text-sm font-semibold leading-6 text-black">
              Top viewers
            </Text>
            {topViewers.length === 0 ? (
              <Text className="text-sm leading-6 text-black">
                No views this week.
              </Text>
            ) : (
              topViewers.map((viewer) => (
                <Text
                  key={viewer.email}
                  className="text-sm leading-6 text-black"
                >
                  {viewer.email} — {viewer.views} views
                </Text>
              ))
            )}
            <Text className="text-sm font-semibold leading-6 text-black">
              Biggest drop-offs
            </Text>
            {dropoffs.length === 0 ? (
              <Text className="text-sm leading-6 text-black">
                No documents under 25% completion.
              </Text>
            ) : (
              dropoffs.map((doc) => (
                <Text key={doc.name} className="text-sm leading-6 text-black">
                  {doc.name} — {doc.completion.toFixed(1)}% avg completion
                </Text>
              ))
            )}
            <Text className="text-sm leading-6 text-black">
              Security flags: {securityFlagCount}
            </Text>
            <Text className="text-sm leading-6 text-black">
              Unsigned agreements: {unsignedAgreements}
            </Text>
            <Text className="text-sm leading-6 text-black">
              Best,
              <br />
              The {BRAND_COMPANY} Team
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
                  {BRAND_PLATFORM}, Inc.
                </a>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
