import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorageAccess() {
  try {
    console.log("🔍 Testing Supabase Storage access...");

    // List buckets
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.error("❌ Error listing buckets:", listError);
      return;
    }

    console.log(
      "📦 Available buckets:",
      buckets?.map((b) => ({ name: b.name, public: b.public }))
    );

    const coursesBucket = buckets?.find((b) => b.name === "course-materials");

    if (!coursesBucket) {
      console.log("⚠️ course-materials bucket not found!");
      console.log("📋 Please create it manually in your Supabase dashboard:");
      console.log("1. Go to https://supabase.com/dashboard");
      console.log("2. Navigate to Storage");
      console.log('3. Click "New bucket"');
      console.log("4. Name: course-materials");
      console.log("5. Make it Public");
      console.log("6. Create bucket");
      return;
    }

    console.log("✅ course-materials bucket found!");
    console.log(`   - Public: ${coursesBucket.public}`);

    // Test listing files (should be empty)
    const { data: files, error: filesError } = await supabase.storage
      .from("course-materials")
      .list("", { limit: 1 });

    if (filesError) {
      console.error("❌ Error accessing bucket contents:", filesError);
    } else {
      console.log("✅ Bucket access successful");
      console.log(`📁 Files in bucket: ${files?.length || 0}`);
    }
  } catch (error) {
    console.error("💥 Test failed:", error);
  }
}

testStorageAccess();
