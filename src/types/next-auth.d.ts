import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      role: string;
      facultyId: string;
      firstName: string;
      lastName: string;
      designation: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    facultyId: string;
    firstName: string;
    lastName: string;
    designation: string;
    email: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    facultyId: string;
    firstName: string;
    lastName: string;
    designation: string;
  }
}