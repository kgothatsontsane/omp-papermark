import { Head, Html, Main, NextScript } from "next/document";

Document.getInitialProps = async (ctx: any) => {
  const initialProps = await ctx.defaultGetInitialProps(ctx);
  return { ...initialProps, isView: (ctx.pathname || "").startsWith("/view") };
};

export default function Document({ isView }: { isView?: boolean }) {
  return (
    <Html lang="en" className="bg-background" suppressHydrationWarning>
       <Head>
        {/* Prevent FOUC: set base background before CSS loads (path-aware) */}
        <style
          dangerouslySetInnerHTML={{
            __html: isView
                ? "html,body{background:#030712;color:#fff;margin:0;padding:0;}body{font-family:system-ui,-apple-system,sans-serif;}"
                : "html,body{background:#ffffff;color:#111827;margin:0;padding:0;}body{font-family:system-ui,-apple-system,sans-serif;}",
          }}
        />
        <link
          rel="preload"
          as="image"
          href="/_static/open-mic/omp_logo_b.webp"
          type="image/webp"
        />
        <link
          rel="preload"
          as="image"
          href="/_static/open-mic/omp_banner_cropped.webp"
          type="image/webp"
        />
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
