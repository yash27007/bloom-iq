import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCaller } from "@/trpc/server";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is course coordinator
    if (session.user.role !== "COURSE_COORDINATOR") {
      return NextResponse.json(
        { error: "Only course coordinators can approve questions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const caller = await createCaller();
    const result = await caller.coordinator.approveQuestions(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Approve questions error:", error);
    return NextResponse.json(
      { error: "Failed to approve questions" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is course coordinator
    if (session.user.role !== "COURSE_COORDINATOR") {
      return NextResponse.json(
        { error: "Only course coordinators can delete questions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const caller = await createCaller();
    const result = await caller.coordinator.deleteQuestion(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Delete question error:", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}
