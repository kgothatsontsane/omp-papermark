import { Img } from "@react-email/components";

import { APP_URL, BRAND_LOGO_PNG, BRAND_NAME } from "@/lib/branding";

export const EMAIL_LOGO_URL = `${APP_URL}${BRAND_LOGO_PNG}`;

export default function EmailLogo({
  width = 120,
  height = 42,
  className = "mx-auto",
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <Img
      src={EMAIL_LOGO_URL}
      alt={BRAND_NAME}
      width={width}
      height={height}
      className={className}
    />
  );
}
