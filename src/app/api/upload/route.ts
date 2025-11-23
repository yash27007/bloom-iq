import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  try {
    // Check authentication first (before reading body)
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is coordinator
    if (session.user.role !== "COURSE_COORDINATOR") {
      return NextResponse.json(
        { error: "Only course coordinators can upload materials" },
        { status: 403 }
      );
    }

    // Read formData (only once)
    let data;
    try {
      data = await request.formData();
    } catch (formError) {
      console.error("FormData parsing error:", formError);
      return NextResponse.json(
        { error: "Failed to parse form data" },
        { status: 400 }
      );
    }
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type (PDF only)
    if (!file.type.includes("pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename with timestamp
    const timestamp = new Date().getTime();
    const filename = `${timestamp}-${file.name.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    )}`;

    // Define upload path
    const uploadPath = join(process.cwd(), "src", "uploads", filename);

    // Write file to uploads directory
    await writeFile(uploadPath, buffer);

    // Return immediately - PDF parsing will happen in background via tRPC
    return NextResponse.json({
      message: "File uploaded successfully",
      filename: filename,
      originalName: file.name,
      size: file.size,
      uploadedBy: session.user.id,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
