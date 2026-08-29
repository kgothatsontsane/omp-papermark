import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="bg-background" suppressHydrationWarning>
      <Head>
        {/* ponytail: McMaster-Carr-style perf — prefetch linked HTML on hover (Speculation Rules API) + preconnect asset/analytics origins */}
        <link
          rel="preconnect"
          href="https://api.eu-west-1.aws.tinybird.co"
          crossOrigin="anonymous"
        />
        {process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST ? (
          <>
            <link
              rel="preconnect"
              href={`https://${process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST}`}
              crossOrigin="anonymous"
            />
            <link
              rel="dns-prefetch"
              href={`https://${process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST}`}
            />
          </>
        ) : null}
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prefetch: [
                {
                  source: "document",
                  where: { selector: { href_matches: "/*" } },
                  eagerness: "conservative",
                },
              ],
            }),
          }}
        />
      </Head>
      <body className="">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
