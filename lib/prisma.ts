import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

// NOTE: prod must use Aiven's pooler endpoint (cannot verify secret here).
if (process.env.NODE_ENV === "production") {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      datasources: {
        db: {
          url: `${process.env.POSTGRES_PRISMA_URL}${
            process.env.POSTGRES_PRISMA_URL?.includes("?") ? "&" : "?"
          }pgbouncer=true&connection_limit=1&statement_timeout=30000`,
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
        }pgbouncer=true&connection_limit=1&statement_timeout=30000`,
      },
    },
  });
}

export default prisma;
