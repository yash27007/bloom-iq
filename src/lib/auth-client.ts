/**
 * Better Auth Client
 * 
 * Client-side authentication utilities using Better Auth.
 * Use this for client components (login forms, logout buttons, etc.)
 */

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

// Export commonly used functions
export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
} = authClient;

// Type exports for convenience
export type AuthSession = typeof authClient.$Infer.Session;
