import { checkStorageHealth } from "../src/lib/supabase-storage.js";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

async function runHealthCheck() {
  console.log("🏥 Running Supabase Storage Health Check...\n");

  try {
    const health = await checkStorageHealth();

    console.log("📊 Health Check Results:");
    console.log("=".repeat(50));
    console.log(`✅ Healthy: ${health.isHealthy ? "YES" : "NO"}`);
    console.log(`📖 Can Read: ${health.canRead ? "YES" : "NO"}`);
    console.log(`📤 Can Upload: ${health.canUpload ? "YES" : "NO"}`);
    console.log(`💬 Message: ${health.message}`);
    console.log("=".repeat(50));

    if (health.isHealthy) {
      console.log("\n🎉 Storage is ready for use!");
      console.log(
        "Your course coordinator dashboard should now work with file uploads."
      );
    } else {
      console.log("\n⚠️ Storage needs configuration:");
      console.log("1. Go to your Supabase dashboard");
      console.log("2. Navigate to SQL Editor");
      console.log("3. Run the SQL from scripts/storage-policies.sql");
      console.log("4. Run this health check again");
    }
  } catch (error) {
    console.error("💥 Health check failed:", error);
  }
}

runHealthCheck();
