import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="bg-background" suppressHydrationWarning>
      <Head>
        {/* ponytail: McMaster-style perf — prefetch linked HTML on hover + preconnect analytics */}
        <link
          rel="preconnect"
          href="https://api.eu-west-1.aws.tinybird.co"
          crossOrigin="anonymous"
        />
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prefetch: [
                {
                  source: "document",
                  where: { selector: { hover: "a" } },
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
