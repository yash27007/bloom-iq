import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Upload file to Supabase Storage
export async function uploadFileToSupabase(
  file: File,
  folderPath: string
): Promise<string | null> {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;

    console.log("Uploading file to path:", filePath);
    console.log("File size:", file.size, "bytes");
    console.log("File type:", file.type);

    // Upload with proper content type and options
    const { data, error } = await supabase.storage
      .from("course-materials")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false, // Don't overwrite existing files
        contentType: file.type || "application/octet-stream",
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw error;
    }

    console.log("Upload successful, data:", data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("course-materials")
      .getPublicUrl(filePath);

    console.log("File uploaded successfully, public URL:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("File upload error:", error);
    return null;
  }
}

// Delete file from Supabase Storage
export async function deleteFileFromSupabase(
  filePath: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from("course-materials")
      .remove([filePath]);

    if (error) {
      console.error("Supabase delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("File delete error:", error);
    return false;
  }
}

// Get file download URL
export async function getFileDownloadUrl(
  filePath: string
): Promise<string | null> {
  try {
    const { data } = supabase.storage
      .from("course-materials")
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error("Get download URL error:", error);
    return null;
  }
}

// Check if storage bucket is accessible and properly configured
export async function checkStorageHealth(): Promise<{
  isHealthy: boolean;
  message: string;
  canUpload: boolean;
  canRead: boolean;
}> {
  try {
    // Test bucket access by trying to list files
    const { error: listError } = await supabase.storage
      .from("course-materials")
      .list("", { limit: 1 });

    if (listError) {
      return {
        isHealthy: false,
        message: `Cannot access bucket: ${listError.message}`,
        canUpload: false,
        canRead: false,
      };
    }

    // Test upload capability with a tiny test file
    const testContent = "health-check";
    const testPath = `health-check/${Date.now()}.txt`;

    const { error: uploadError } = await supabase.storage
      .from("course-materials")
      .upload(testPath, new Blob([testContent], { type: "text/plain" }), {
        cacheControl: "3600",
        upsert: false,
      });

    let canUpload = true;
    if (uploadError) {
      canUpload = false;
      if (uploadError.message.includes("row-level security")) {
        return {
          isHealthy: false,
          message:
            "RLS policies not configured. Please run the storage-policies.sql script.",
          canUpload: false,
          canRead: true,
        };
      }
    } else {
      // Clean up test file
      await supabase.storage.from("course-materials").remove([testPath]);
    }

    return {
      isHealthy: canUpload,
      message: canUpload
        ? "Storage is healthy and ready"
        : "Upload permissions not configured",
      canUpload,
      canRead: true,
    };
  } catch (error) {
    return {
      isHealthy: false,
      message: `Storage health check failed: ${error}`,
      canUpload: false,
      canRead: false,
    };
  }
}
