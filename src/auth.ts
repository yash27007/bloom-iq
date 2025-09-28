import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          // Call your API route instead of using Prisma directly
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

          const response = await fetch(`${baseUrl}/api/auth/validate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            if (response.status === 403) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Account deactivated");
            }
            throw new Error("Invalid credentials");
          }

          const user = await response.json();

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            facultyId: user.facultyId,
            firstName: user.firstName,
            lastName: user.lastName,
            designation: user.designation,
            isActive: user.isActive,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          throw error instanceof Error
            ? error
            : new Error("Authentication failed");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.facultyId = user.facultyId;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.designation = user.designation;
        token.isActive = user.isActive;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.facultyId = token.facultyId as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.designation = token.designation as string;
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/sign-in",
    newUser: "/sign-up",
  },
  session: {
    strategy: "jwt",
  },
});
