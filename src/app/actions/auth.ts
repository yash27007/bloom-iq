"use server";
import { signIn, signOut, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

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

    console.log("SignIn result:", result);

    if (result?.error) {
      console.log("SignIn error:", result.error);
      return { error: "Invalid credentials" };
    }

    // Get the session to check user role and redirect accordingly
    const session = await auth();
    console.log("Session after signin:", session);

    if (session?.user?.role) {
      if (session.user.role === "ADMIN") {
        redirect("/admin/dashboard");
  
      } else if (session.user.role === "COURSE_COORDINATOR" || session.user.role ==="MODULE_COORDINATOR" || session.user.role === "PROGRAM_COORDINATOR") {
        redirect("/coordinator/dashboard");
      } else {
        redirect("/");
      }
    } else {
      console.log("No session or role found");
      return { error: "Authentication failed - no session" };
    }
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Login error:", error);
    return { error: "Invalid credentials" };
  }
}

export async function handleSignOut() {
  await signOut();
  redirect("/");
}
