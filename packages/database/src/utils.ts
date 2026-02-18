import { Prisma } from '../generated/prisma';

export const isUniqueConstraintError = (e: any) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
