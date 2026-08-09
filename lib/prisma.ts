import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

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
