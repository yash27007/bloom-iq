"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

/**
 * Server action to sign in with email and password
 */
export const login = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return {
      error: "Email and password are required",
    };
  }

  try {
    await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Login error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("deactivated")) {
        return {
          error: "Account has been deactivated. Please contact administrator.",
          deactivated: true,
        };
      }
      if (error.message.includes("Invalid") || error.message.includes("credentials")) {
        return {
          error: "Invalid email or password",
        };
      }
    }
    
    return {
      error: "An unexpected error occurred",
    };
  }
};

/**
 * Server action to sign out
 */
export const logout = async () => {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
  } catch (error) {
    console.error("Logout error:", error);
  }
  redirect("/sign-in");
};

/**
 * Get current session on the server
 */
export const getServerSession = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch {
    return null;
  }
};
