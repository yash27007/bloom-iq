import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function cancelStuckJobs() {
  console.log("=== Canceling Stuck Jobs ===");
  
  // Find jobs that are stuck (in progress for more than 5 minutes without update)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const stuckJobs = await prisma.questionGenerationJob.findMany({
    where: {
      status: {
        in: ["PENDING", "PROCESSING"]
      },
      updatedAt: {
        lt: fiveMinutesAgo
      }
    },
  });

  console.log(`Found ${stuckJobs.length} stuck jobs`);

  for (const job of stuckJobs) {
    console.log(`Canceling job ${job.id} (${job.processingStage}, ${job.progress}%)`);
    
    await prisma.questionGenerationJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        processingStage: "FAILED", 
        errorMessage: "Job stuck for more than 5 minutes - auto-canceled",
        updatedAt: new Date(),
      },
    });
  }

  console.log("=== Done ===");
}

cancelStuckJobs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
