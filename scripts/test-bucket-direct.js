import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBucketAccess() {
  try {
    console.log("🔍 Testing direct bucket access...");

    // Try to list files in the bucket
    const { data: files, error: listError } = await supabase.storage
      .from("course-materials")
      .list("", { limit: 1 });

    if (listError) {
      console.error("❌ Error listing files in bucket:", listError);
      console.log("\n📋 To fix this, you need to:");
      console.log("1. Go to your Supabase dashboard");
      console.log("2. Navigate to Authentication → Policies");
      console.log("3. Create a policy for the storage.objects table");
      console.log("4. Allow SELECT, INSERT for the course-materials bucket");
      return;
    }

    console.log("✅ Bucket is accessible");
    console.log("📁 Files in bucket:", files?.length || 0);

    // Try a simple upload test
    console.log("\n🧪 Testing file upload...");

    const testContent = "Test file content";
    const testFileName = `test-${Date.now()}.txt`;

    const { error: uploadError } = await supabase.storage
      .from("course-materials")
      .upload(testFileName, new Blob([testContent], { type: "text/plain" }), {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ Upload test failed:", uploadError);
      console.log(
        "\n📋 This usually means RLS policies need to be configured."
      );
      console.log("Check the Storage policies in your Supabase dashboard.");
      return;
    }

    console.log("✅ Upload test successful!");

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("course-materials")
      .getPublicUrl(testFileName);

    console.log("🔗 Public URL:", urlData.publicUrl);

    // Clean up
    await supabase.storage.from("course-materials").remove([testFileName]);

    console.log("🧹 Test file cleaned up");
    console.log("🎉 Bucket is ready for use!");
  } catch (error) {
    console.error("💥 Test failed:", error);
  }
}

testBucketAccess();
