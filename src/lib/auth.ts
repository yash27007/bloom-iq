/**
 * Better Auth Server Configuration
 * 
 * Central authentication setup using Better Auth with Prisma adapter.
 * Supports email/password authentication with custom user fields.
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  
  emailAndPassword: {
    enabled: true,
    // Custom password hashing using bcryptjs (same as before)
    password: {
      hash: async (password) => {
        return await hash(password, 10);
      },
      verify: async ({ password, hash: hashedPassword }) => {
        return await compare(password, hashedPassword);
      },
    },
  },
  
  session: {
    // Use cookies for session storage
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },
  
  // User configuration with additional fields
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: true,
      },
      lastName: {
        type: "string",
        required: true,
      },
      facultyId: {
        type: "string",
        required: true,
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "COURSE_COORDINATOR",
      },
      designation: {
        type: "string",
        required: true,
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
      },
    },
  },

  // Plugin for Next.js cookie handling in server actions
  plugins: [nextCookies()],

  // Trust host for deployment
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
  ],

  // Base path for auth routes
  basePath: "/api/auth",
});

/**
 * Custom user type with additional fields from our schema
 */
export interface AppUser {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  facultyId: string;
  role: string;
  designation: string;
  isActive: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Custom session type with properly typed user
 */
export interface AppSession {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string;
    userAgent?: string;
  };
  user: AppUser;
}

/**
 * Get session with properly typed user including custom fields
 */
export async function getSession(headers: Headers): Promise<AppSession | null> {
  const session = await auth.api.getSession({
    headers,
  });
  
  if (!session) {
    return null;
  }
  
  // Cast the session to include our custom user fields
  return session as unknown as AppSession;
}

// Export the base auth types
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
