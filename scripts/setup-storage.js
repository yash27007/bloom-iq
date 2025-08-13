import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  console.log("Please set:");
  console.log("- NEXT_PUBLIC_SUPABASE_URL");
  console.log("- NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupSupabaseStorage() {
  try {
    console.log("🔧 Setting up Supabase Storage...");

    // Check if bucket exists
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.error("❌ Error listing buckets:", listError);
      return;
    }

    console.log(
      "📦 Existing buckets:",
      buckets?.map((b) => b.name)
    );

    const bucketExists = buckets?.some(
      (bucket) => bucket.name === "course-materials"
    );

    if (!bucketExists) {
      console.log("📝 Creating course-materials bucket...");

      const { data, error } = await supabase.storage.createBucket(
        "course-materials",
        {
          public: true,
          allowedMimeTypes: [
            "application/pdf",
            "text/plain",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
          fileSizeLimit: 10485760, // 10MB
        }
      );

      if (error) {
        console.error("❌ Error creating bucket:", error);
        return;
      }

      console.log("✅ Bucket created successfully:", data);
    } else {
      console.log("✅ Bucket already exists");
    }

    // Test upload with a small test file
    console.log("🧪 Testing file upload...");

    const testContent =
      "This is a test file for BloomIQ course materials storage.";
    const testFile = new File([testContent], "test.txt", {
      type: "text/plain",
    });

    const testPath = `test/${Date.now()}-test.txt`;

    const { error: uploadError } = await supabase.storage
      .from("course-materials")
      .upload(testPath, testFile);

    if (uploadError) {
      console.error("❌ Test upload failed:", uploadError);
      return;
    }

    console.log("✅ Test upload successful!");

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("course-materials")
      .getPublicUrl(testPath);

    console.log("🔗 Test file public URL:", urlData.publicUrl);

    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from("course-materials")
      .remove([testPath]);

    if (deleteError) {
      console.log("⚠️ Could not delete test file:", deleteError);
    } else {
      console.log("🧹 Test file cleaned up");
    }

    console.log("🎉 Supabase Storage setup complete!");
  } catch (error) {
    console.error("💥 Setup failed:", error);
  }
}

setupSupabaseStorage();
