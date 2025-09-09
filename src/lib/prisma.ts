import { PrismaClient } from '@/generated/prisma'

const globalForPrisma = global as unknown as { 
    prisma: PrismaClient
}
console.log("DATABASE_URL used by app:", process.env.DATABASE_URL);

export const prisma = globalForPrisma.prisma || new PrismaClient(
    // {
    //     log: ['query', 'info', 'warn', 'error']
    // }
)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
