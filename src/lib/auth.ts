import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/types/auth-schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          console.log("Authorize called with:", credentials);

          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) {
            console.log("Schema validation failed:", parsed.error);
            return null;
          }

          const { email, password } = parsed.data;
          console.log("Looking for user with email:", email);

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            console.log("User not found");
            return null;
          }

          console.log("User found, checking password");
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            console.log("Password invalid");
            return null;
          }

          console.log("User authenticated successfully:", {
            id: user.id,
            email: user.email,
            role: user.role,
          });
          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          };
        } catch (error) {
          console.error("Error in authorize function:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Default redirections
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
});
