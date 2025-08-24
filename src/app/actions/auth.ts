"use server";
import { signIn, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function credentialsLogin(FormData: {
  email: string;
  password: string;
}) {
  console.log("FormData:", FormData);
  try {
    const result = await signIn("credentials", {
      email: FormData.email,
      password: FormData.password,
      redirect: false,
    });

    if (result?.error) {
      return { error: "Invalid credentials" };
    }

    // Get the session to check user role and redirect accordingly
    const session = await auth();

    if (session?.user?.role) {
      if (session.user.role === "ADMIN") {
        redirect("/admin/dashboard");
      } else {
        redirect("/coordinator/dashboard");
      }
    }

    return { error: "Authentication failed" };
  } catch (error: unknown) {
    // Handle NextAuth redirect errors
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error; // Re-throw to allow the redirect to happen
    }

    console.error("Login error:", error);
    return { error: "Invalid credentials" };
  }
}

export async function handleSignOut() {
  await signOut();
  redirect("/sign-in");
}
