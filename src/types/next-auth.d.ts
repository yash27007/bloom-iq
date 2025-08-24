import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  // Extend User type
  interface User extends DefaultUser {
    id: string;
    role: string;
  }

  // Extend Session type
  interface Session {
    user: {
      id: string;
      role: string;
      email: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    email: string;
  }
}
