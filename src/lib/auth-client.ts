/**
 * Better Auth Client
 * 
 * Client-side authentication utilities using Better Auth.
 * Use this for client components (login forms, logout buttons, etc.)
 */

import { createAuthClient } from "better-auth/react";

// Get base URL - on client side, use window.location.origin if no env var
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    // Client-side: use current origin
    return window.location.origin;
  }
  // Server-side: use env var or default
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
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
