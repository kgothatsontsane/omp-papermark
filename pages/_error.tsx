import { NextPageContext } from "next";
import Link from "next/link";

function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">
          {statusCode || "Error"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {statusCode === 404
            ? "Page not found"
            : "Something went wrong. Please try again."}
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
