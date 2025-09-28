import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: email as string,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isPasswordValid = await compare(password as string, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if user account is active
    if (!user.isActive) {
      return NextResponse.json(
        {
          error: "Account has been deactivated. Please contact administrator.",
        },
        { status: 403 }
      );
    }

    // Return user data without password
    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      facultyId: user.facultyId,
      firstName: user.firstName,
      lastName: user.lastName,
      designation: user.designation,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error("Authentication validation error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
