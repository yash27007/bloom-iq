import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
  try {
    console.log("🔍 Checking existing RLS policies...");

    // Try to query existing policies (this might not work with anon key)
    const { data, error } = await supabase
      .from("pg_policies")
      .select("*")
      .eq("schemaname", "storage")
      .eq("tablename", "objects");

    if (error) {
      console.log("⚠️ Cannot query policies with anon key (this is normal)");
      console.log("Error:", error.message);
    } else {
      console.log("📋 Existing policies:", data);
    }

    // Test if we can at least access the bucket
    console.log("\n🧪 Testing basic bucket access...");

    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error("❌ Cannot list buckets:", bucketsError);
      return;
    }

    console.log(
      "📦 Available buckets:",
      buckets?.map((b) => b.name)
    );

    const courseMaterialsBucket = buckets?.find(
      (b) => b.name === "course-materials"
    );
    if (courseMaterialsBucket) {
      console.log("✅ course-materials bucket exists");
      console.log("📊 Bucket config:", courseMaterialsBucket);
    } else {
      console.log("❌ course-materials bucket not found");
    }
  } catch (error) {
    console.error("💥 Check failed:", error);
  }
}

checkPolicies();
