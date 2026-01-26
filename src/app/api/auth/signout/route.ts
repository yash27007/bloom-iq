/**
 * Custom Sign-Out API Route
 * 
 * Clears the session from database and cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("better-auth.session_token")?.value;

    if (token) {
      // Delete session from database
      await prisma.session.deleteMany({
        where: { token },
      });
    }

    // Clear session cookie
    cookieStore.delete("better-auth.session_token");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sign-out error:", error);
    // Still clear cookie even if DB operation fails
    const cookieStore = await cookies();
    cookieStore.delete("better-auth.session_token");
    return NextResponse.json({ success: true });
  }
}

export async function GET(request: NextRequest) {
  // Also support GET for simple logout links
  return POST(request);
}
