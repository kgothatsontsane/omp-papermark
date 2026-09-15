import { Img } from "@react-email/components";

import { APP_URL, BRAND_LOGO_PNG, BRAND_PLATFORM } from "@/lib/branding";

export const EMAIL_LOGO_URL = `${APP_URL}${BRAND_LOGO_PNG}`;

export default function EmailLogo({
  width = 240,
  height = 124,
  className = "mx-auto",
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <Img
      src={EMAIL_LOGO_URL}
      alt={BRAND_PLATFORM}
      width={width}
      height={height}
      className={className}
    />
  );
}
