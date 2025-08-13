import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Role } from "@/generated/prisma";
import { z } from "zod";

const createCourseSchema = z.object({
  courseCode: z.string().min(1, "Course code is required"),
  courseName: z.string().min(1, "Course name is required"),
  courseCoordinatorId: z.string().min(1, "Course coordinator is required"),
  moduleCoordinatorId: z.string().min(1, "Module coordinator is required"),
  programCoordinatorId: z.string().min(1, "Program coordinator is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    await requireAdmin();

    const body = await request.json();
    const {
      courseCode,
      courseName,
      courseCoordinatorId,
      moduleCoordinatorId,
      programCoordinatorId,
    } = createCourseSchema.parse(body);

    // Check if course code already exists
    const existingCourse = await prisma.course.findUnique({
      where: { courseCode },
    });

    if (existingCourse) {
      return NextResponse.json(
        { error: "Course with this code already exists" },
        { status: 400 }
      );
    }

    // Verify that all coordinators exist and have appropriate roles
    const coordinators = await prisma.user.findMany({
      where: {
        id: {
          in: [courseCoordinatorId, moduleCoordinatorId, programCoordinatorId],
        },
      },
    });

    if (coordinators.length !== 3) {
      return NextResponse.json(
        { error: "One or more coordinators not found" },
        { status: 400 }
      );
    }

    // Verify roles
    const courseCoordinator = coordinators.find(
      (c) => c.id === courseCoordinatorId
    );
    const moduleCoordinator = coordinators.find(
      (c) => c.id === moduleCoordinatorId
    );
    const programCoordinator = coordinators.find(
      (c) => c.id === programCoordinatorId
    );

    if (
      courseCoordinator?.role !== Role.COURSE_COORDINATOR &&
      courseCoordinator?.role !== Role.ADMIN
    ) {
      return NextResponse.json(
        { error: "Course coordinator must have COURSE_COORDINATOR role" },
        { status: 400 }
      );
    }

    if (
      moduleCoordinator?.role !== Role.MODULE_COORDINATOR &&
      moduleCoordinator?.role !== Role.ADMIN
    ) {
      return NextResponse.json(
        { error: "Module coordinator must have MODULE_COORDINATOR role" },
        { status: 400 }
      );
    }

    if (
      programCoordinator?.role !== Role.PROGRAM_COORDINATOR &&
      programCoordinator?.role !== Role.ADMIN
    ) {
      return NextResponse.json(
        { error: "Program coordinator must have PROGRAM_COORDINATOR role" },
        { status: 400 }
      );
    }

    // Create course
    const course = await prisma.course.create({
      data: {
        courseCode,
        courseName,
        courseCoordinatorId,
        moduleCoordinatorId,
        programCoordinatorId,
      },
      include: {
        courseCoordinator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        moduleCoordinator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        programCoordinator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error("Create course error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      error instanceof Error &&
      error.message === "Insufficient permissions"
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check if user is admin
    await requireAdmin();

    const courses = await prisma.course.findMany({
      include: {
        courseCoordinator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        moduleCoordinator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        programCoordinator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            questions: true,
            materials: true,
            paperPatterns: true,
          },
        },
      },
      orderBy: {
        courseCode: "asc",
      },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Get courses error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      error instanceof Error &&
      error.message === "Insufficient permissions"
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
