// Test script to verify question generation with new Marks enum
const testQuestionGeneration = async () => {
  try {
    console.log("🧪 Testing question generation with new Marks enum...");

    const response = await fetch(
      "http://localhost:3001/api/questions/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: "test-course-id",
          materialId: null,
          unit: 1,
          questionTypes: ["SHORT_ANSWER", "LONG_ANSWER"],
          difficultyLevels: ["EASY", "MEDIUM", "HARD"],
          questionsPerBloomLevel: {
            REMEMBER: 2,
            UNDERSTAND: 2,
            APPLY: 2,
            ANALYZE: 2,
            EVALUATE: 1,
            CREATE: 1,
          },
        }),
      }
    );

    const result = await response.json();
    console.log("✅ Question generation response:", result);

    if (result.success) {
      console.log(`🎉 Success! Job ID: ${result.jobId}`);

      // Wait a bit and check job status
      setTimeout(async () => {
        try {
          const jobResponse = await fetch(
            `http://localhost:3001/api/questions/status/${result.jobId}`
          );
          const jobResult = await jobResponse.json();
          console.log("📊 Job status:", jobResult);
        } catch (error) {
          console.log("ℹ️ Job status check not available (that's okay)");
        }
      }, 3000);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
};

// Run the test
testQuestionGeneration();
