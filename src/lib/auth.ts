import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma";

export async function getCurrentUser() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  });

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function requireRole(role: Role) {
  const user = await requireAuth();

  if (user.role !== role) {
    throw new Error("Insufficient permissions");
  }

  return user;
}

export async function requireAdmin() {
  return requireRole(Role.ADMIN);
}
