import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  console.log("SUPABASE_URL:", supabaseUrl ? "SET" : "MISSING");
  console.log("SUPABASE_ANON_KEY:", supabaseKey ? "SET" : "MISSING");
  process.exit(1);
}

console.log("✅ Environment variables loaded");
console.log("🔗 Supabase URL:", supabaseUrl);
console.log("🔑 Anon Key:", supabaseKey.substring(0, 20) + "...");

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  try {
    console.log("\n🧪 Testing Supabase connection...");

    // Test basic connection by trying to list buckets
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error("❌ Error listing buckets:", bucketsError);
      return;
    }

    console.log("✅ Successfully connected to Supabase Storage");
    console.log("📦 Current buckets:", buckets?.length || 0);

    if (buckets && buckets.length > 0) {
      buckets.forEach((bucket) => {
        console.log(
          `  - ${bucket.name} (${bucket.public ? "public" : "private"})`
        );
      });
    }

    // Check if course-materials bucket exists
    const courseMaterialsBucket = buckets?.find(
      (b) => b.name === "course-materials"
    );

    if (!courseMaterialsBucket) {
      console.log(
        "\n📝 course-materials bucket not found. Attempting to create..."
      );

      const { data: createData, error: createError } =
        await supabase.storage.createBucket("course-materials", {
          public: true,
          allowedMimeTypes: [
            "application/pdf",
            "text/plain",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
          fileSizeLimit: 10485760, // 10MB
        });

      if (createError) {
        console.error("❌ Error creating bucket:", createError);
        console.log("\n💡 Manual bucket creation steps:");
        console.log("1. Go to your Supabase Dashboard");
        console.log("2. Navigate to Storage");
        console.log('3. Click "New bucket"');
        console.log("4. Name: course-materials");
        console.log("5. Make it Public: Yes");
        console.log("6. Create bucket");
      } else {
        console.log("✅ Bucket created successfully:", createData);
      }
    } else {
      console.log("✅ course-materials bucket exists");
    }
  } catch (error) {
    console.error("💥 Connection test failed:", error);
  }
}

testSupabaseConnection();
