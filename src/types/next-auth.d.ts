import { Role } from "@/generated/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: Role;
    };
  }

  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    firstName: string;
    lastName: string;
  }
}
