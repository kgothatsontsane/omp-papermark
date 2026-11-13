import prisma from "@/lib/prisma";

export async function withStatementTimeout<T>(
  ms: number,
  fn: (tx: any) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = ${Math.max(0, Math.floor(ms))}`);
    return fn(tx);
  });
}
