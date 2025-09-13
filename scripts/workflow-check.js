const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function checkWorkflowImplementation() {
  console.log("=== Workflow Verification: PDF Upload → JSON Extraction → Question Generation ===\n");
  
  try {
    // 1. Check for uploaded materials with processed JSON data
    console.log("📁 STEP 1: Checking Course Materials (PDF Storage)");
    const materials = await prisma.courseMaterial.findMany({
      include: {
        course: { select: { courseCode: true, courseName: true } }
      },
      orderBy: { uploadedAt: 'desc' }
    });
    
    console.log(`Found ${materials.length} course materials:`);
    
    for (const material of materials) {
      console.log(`\n  📄 Material: ${material.title}`);
      console.log(`     Course: ${material.course.courseCode} - ${material.course.courseName}`);
      console.log(`     File Path: ${material.filePath}`);
      console.log(`     Uploaded: ${material.uploadedAt}`);
      console.log(`     Is Processed: ${material.isProcessed ? '✅' : '❌'}`);
      console.log(`     Has Markdown Content: ${material.markdownContent ? `✅ (${material.markdownContent.length} chars)` : '❌'}`);
      console.log(`     Has JSON Sections: ${material.sectionsData ? '✅' : '❌'}`);
      
      // Check JSON structure if exists
      if (material.sectionsData) {
        try {
          const sections = JSON.parse(JSON.stringify(material.sectionsData));
          console.log(`     📊 JSON Sections: ${Array.isArray(sections) ? sections.length : 'Invalid format'} sections`);
          
          if (Array.isArray(sections) && sections.length > 0) {
            console.log(`     📝 Sample Section Structure:`);
            const firstSection = sections[0];
            console.log(`        - ID: ${firstSection.id || 'Missing'}`);
            console.log(`        - Title: ${firstSection.title || 'Missing'}`);
            console.log(`        - Content Length: ${firstSection.content ? firstSection.content.length : 0} chars`);
            console.log(`        - Level: ${firstSection.level || 'Missing'}`);
            console.log(`        - Page: ${firstSection.page || 'Missing'}`);
            console.log(`        - Text Blocks: ${firstSection.textBlocks ? firstSection.textBlocks.length : 0}`);
            
            if (firstSection.content) {
              console.log(`        - Content Preview: "${firstSection.content.substring(0, 100)}..."`);
            }
          }
        } catch (error) {
          console.log(`     ❌ JSON Parse Error: ${error.message}`);
        }
      }
    }
    
    // 2. Check question generation jobs
    console.log("\n\n🔄 STEP 2: Checking Question Generation Jobs");
    const jobs = await prisma.questionGenerationJob.findMany({
      include: {
        course: { select: { courseCode: true, courseName: true } },
        material: { select: { title: true } },
        initiatedBy: { select: { email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`Found ${jobs.length} question generation jobs:`);
    
    for (const job of jobs) {
      console.log(`\n  🎯 Job ID: ${job.id}`);
      console.log(`     Course: ${job.course.courseCode} - ${job.course.courseName}`);
      console.log(`     Material: ${job.material.title}`);
      console.log(`     Unit: ${job.unit}`);
      console.log(`     Status: ${job.status}`);
      console.log(`     Processing Stage: ${job.processingStage}`);
      console.log(`     Progress: ${job.progress}%`);
      console.log(`     Questions Generated: ${job.generatedCount || 0} / ${job.totalQuestions || 'Unknown'}`);
      console.log(`     Created: ${job.createdAt}`);
      console.log(`     Updated: ${job.updatedAt}`);
      console.log(`     Initiated By: ${job.initiatedBy.email}`);
      
      if (job.errorMessage) {
        console.log(`     ❌ Error: ${job.errorMessage}`);
      }
    }
    
    // 3. Check generated questions
    console.log("\n\n❓ STEP 3: Checking Generated Questions");
    const questions = await prisma.question.findMany({
      include: {
        course: { select: { courseCode: true, courseName: true } },
        sourceMaterial: { select: { title: true, isProcessed: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`Found ${questions.length} questions:`);
    
    for (const question of questions) {
      console.log(`\n  ❓ Question ID: ${question.id}`);
      console.log(`     Course: ${question.course.courseCode} - ${question.course.courseName}`);
      console.log(`     Source Material: ${question.sourceMaterial?.title || 'None'}`);
      console.log(`     Material Processed: ${question.sourceMaterial?.isProcessed ? '✅' : '❌'}`);
      console.log(`     Unit: ${question.unit}`);
      console.log(`     Bloom Level: ${question.bloomLevel}`);
      console.log(`     Question: "${question.question.substring(0, 100)}..."`);
      console.log(`     Answer: "${question.answer.substring(0, 100)}..."`);
    }
    
    // 4. Workflow Analysis
    console.log("\n\n📊 STEP 4: Workflow Analysis");
    
    const processedMaterials = materials.filter(m => m.isProcessed);
    const materialsWithJson = materials.filter(m => m.sectionsData);
    const completedJobs = jobs.filter(j => j.status === 'COMPLETED');
    const questionsWithSource = questions.filter(q => q.sourceMaterialId);
    
    console.log(`\n📈 Workflow Statistics:`);
    console.log(`  - Materials Uploaded: ${materials.length}`);
    console.log(`  - Materials Processed (PDF → JSON): ${processedMaterials.length}/${materials.length}`);
    console.log(`  - Materials with JSON Sections: ${materialsWithJson.length}/${materials.length}`);
    console.log(`  - Jobs Started: ${jobs.length}`);
    console.log(`  - Jobs Completed: ${completedJobs.length}/${jobs.length}`);
    console.log(`  - Questions Generated: ${questions.length}`);
    console.log(`  - Questions with Source Material: ${questionsWithSource.length}/${questions.length}`);
    
    // 5. Workflow Validation
    console.log(`\n✅ Workflow Status:`);
    console.log(`  ${materials.length > 0 ? '✅' : '❌'} PDF Upload & Storage`);
    console.log(`  ${processedMaterials.length > 0 ? '✅' : '❌'} PDF → JSON Processing`);
    console.log(`  ${jobs.length > 0 ? '✅' : '❌'} Question Generation Jobs`);
    console.log(`  ${questionsWithSource.length > 0 ? '✅' : '❌'} Questions from PDF Content`);
    
    const workflowWorking = materials.length > 0 && processedMaterials.length > 0 && questionsWithSource.length > 0;
    console.log(`\n🎯 Overall: ${workflowWorking ? '✅ WORKFLOW WORKING' : '❌ WORKFLOW NEEDS ATTENTION'}`);
    
  } catch (error) {
    console.error("❌ Error checking database state:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWorkflowImplementation();
