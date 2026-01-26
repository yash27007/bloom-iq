/**
 * File Upload API Route
 * 
 * Handles PDF uploads by parsing them in memory and returning the content.
 * Files are NOT stored on disk - only the parsed content is saved to the database.
 * This is compatible with Vercel's serverless environment (read-only filesystem).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parsePDFToText, validateParsedContent } from "@/lib/pdf-parser";

export async function POST(request: NextRequest) {
  try {
    // Check authentication first (before reading body)
    const session = await getSession(request.headers);
    
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

    // Read file into buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse PDF in memory
    let parsedContent;
    try {
      parsedContent = await parsePDFToText(buffer);
    } catch (parseError) {
      console.error("PDF parsing error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse PDF content. Please ensure the file is a valid PDF." },
        { status: 400 }
      );
    }

    // Validate parsed content
    const validation = validateParsedContent(parsedContent);
    if (!validation.isValid) {
      console.warn("PDF validation warnings:", validation.warnings);
    }

    // Check if content was extracted
    if (!parsedContent.markdown || parsedContent.markdown.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from PDF. The file may be scanned or image-based." },
        { status: 400 }
      );
    }

    // Return parsed content (no file storage)
    return NextResponse.json({
      message: "File parsed successfully",
      originalName: file.name,
      size: file.size,
      uploadedBy: session.user.id,
      parsedContent: {
        text: parsedContent.text,
        markdown: parsedContent.markdown,
        metadata: parsedContent.metadata,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}
