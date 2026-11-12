import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

// NOTE: Aiven free tier has no pooler; connection_limit=1 + global client is the cap.
// Server-side statement_timeout must be set in the Aiven console (PostgreSQL settings),
// NOT as a URL param — node-postgres (pg) silently ignores unknown URL params.
if (process.env.NODE_ENV === "production") {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      datasources: {
        db: {
          url: `${process.env.POSTGRES_PRISMA_URL}${
            process.env.POSTGRES_PRISMA_URL?.includes("?") ? "&" : "?"
          }pgbouncer=true&connection_limit=1`,
        },
      },
    });
  }
  prisma = global.prisma;
} else {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: `${process.env.POSTGRES_PRISMA_URL}${
          process.env.POSTGRES_PRISMA_URL?.includes("?") ? "&" : "?"
        }pgbouncer=true&connection_limit=1`,
      },
    },
  });
}

export default prisma;
