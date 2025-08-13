// Alternative: Use database to store file metadata and Supabase for storage
// This approach doesn't require bucket creation permissions

import { createClient } from "@supabase/supabase-js";
import { prisma } from "./prisma";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Alternative approach: Store files as base64 in database (for small files)
export async function storeFileInDatabase(
  file: File,
  courseId: string,
  materialType: string
): Promise<string> {
  try {
    console.log("Converting file to base64...");
    const base64 = await fileToBase64(file);

    // Store in database with metadata
    const fileRecord = await prisma.courseMaterial.create({
      data: {
        courseId,
        title: file.name.replace(/\.[^/.]+$/, ""),
        materialType: materialType as any,
        filePath: base64, // Store base64 data directly
        uploadedById: "temp-user-id", // You'll need to pass the actual user ID
      },
    });

    console.log("File stored in database successfully");
    return fileRecord.id;
  } catch (error) {
    console.error("Database storage error:", error);
    throw error;
  }
}

// Convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // Remove data:application/pdf;base64, prefix
    };
    reader.onerror = (error) => reject(error);
  });
}

// Get file from database
export async function getFileFromDatabase(
  materialId: string
): Promise<{
  content: string;
  metadata: { name: string; type: string; size: number };
} | null> {
  try {
    const material = await prisma.courseMaterial.findUnique({
      where: { id: materialId },
      include: {
        course: true,
      },
    });

    if (!material) {
      return null;
    }

    return {
      content: material.filePath, // This is the base64 content
      metadata: {
        name: material.title,
        type: "application/pdf", // Default since we don't store mimeType
        size: material.filePath.length, // Use base64 length as approximate size
      },
    };
  } catch (error) {
    console.error("Database retrieval error:", error);
    return null;
  }
}
