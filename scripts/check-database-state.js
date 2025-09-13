"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../src/generated/prisma");
const prisma = new prisma_1.PrismaClient();
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
                }
                catch (error) {
                    console.log(`     ❌ JSON Parse Error: ${error}`);
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
            // Check configuration
            try {
                const bloomLevels = JSON.parse(job.bloomLevels || '[]');
                const questionTypes = JSON.parse(job.questionTypes || '[]');
                const difficultyLevels = JSON.parse(job.difficultyLevels || '[]');
                console.log(`     📋 Configuration:`);
                console.log(`        - Bloom Levels: ${bloomLevels.join(', ')}`);
                console.log(`        - Question Types: ${questionTypes.join(', ')}`);
                console.log(`        - Difficulty Levels: ${difficultyLevels.join(', ')}`);
            }
            catch (error) {
                console.log(`     ❌ Configuration Parse Error: ${error}`);
            }
        }
        // 3. Check generated questions and their relationship to source materials
        console.log("\n\n❓ STEP 3: Checking Generated Questions");
        const questions = await prisma.question.findMany({
            include: {
                course: { select: { courseCode: true, courseName: true } },
                sourceMaterial: { select: { title: true, isProcessed: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        console.log(`Found ${questions.length} questions:`);
        for (const question of questions) {
            console.log(`\n  ❓ Question ID: ${question.id}`);
            console.log(`     Course: ${question.course.courseCode} - ${question.course.courseName}`);
            console.log(`     Source Material: ${question.sourceMaterial?.title || 'None'}`);
            console.log(`     Material Processed: ${question.sourceMaterial?.isProcessed ? '✅' : '❌'}`);
            console.log(`     Unit: ${question.unit}`);
            console.log(`     Bloom Level: ${question.bloomLevel}`);
            console.log(`     Difficulty: ${question.difficultyLevel}`);
            console.log(`     Question Type: ${question.questionType}`);
            console.log(`     Marks: ${question.marks}`);
            console.log(`     Topic: ${question.topic}`);
            console.log(`     Created: ${question.createdAt}`);
            console.log(`     Status: ${question.status}`);
            console.log(`     Question: "${question.question.substring(0, 150)}..."`);
            console.log(`     Answer: "${question.answer.substring(0, 150)}..."`);
        }
        // 4. Workflow Analysis
        console.log("\n\n📊 STEP 4: Workflow Analysis");
        const processedMaterials = materials.filter(m => m.isProcessed);
        const materialsWithJson = materials.filter(m => m.sectionsData);
        const completedJobs = jobs.filter(j => j.status === 'COMPLETED');
        const questionsWithSource = questions.filter(q => q.sourceMaterialId);
        console.log(`\n📈 Workflow Statistics:`);
        console.log(`  - Materials Uploaded: ${materials.length}`);
        console.log(`  - Materials Processed (PDF → JSON): ${processedMaterials.length}/${materials.length} (${((processedMaterials.length / materials.length) * 100 || 0).toFixed(1)}%)`);
        console.log(`  - Materials with JSON Sections: ${materialsWithJson.length}/${materials.length} (${((materialsWithJson.length / materials.length) * 100 || 0).toFixed(1)}%)`);
        console.log(`  - Jobs Started: ${jobs.length}`);
        console.log(`  - Jobs Completed: ${completedJobs.length}/${jobs.length} (${((completedJobs.length / jobs.length) * 100 || 0).toFixed(1)}%)`);
        console.log(`  - Questions Generated: ${questions.length}`);
        console.log(`  - Questions with Source Material: ${questionsWithSource.length}/${questions.length} (${((questionsWithSource.length / questions.length) * 100 || 0).toFixed(1)}%)`);
        // 5. Workflow Validation
        console.log(`\n✅ Workflow Validation:`);
        const workflowChecks = [
            {
                name: "PDF Upload & Storage",
                passed: materials.length > 0,
                details: `${materials.length} materials uploaded`
            },
            {
                name: "PDF → JSON Processing",
                passed: processedMaterials.length > 0,
                details: `${processedMaterials.length} materials processed with JSON data`
            },
            {
                name: "Question Generation Jobs",
                passed: jobs.length > 0,
                details: `${jobs.length} jobs created`
            },
            {
                name: "Questions Generated from PDF Content",
                passed: questionsWithSource.length > 0,
                details: `${questionsWithSource.length} questions linked to source materials`
            },
            {
                name: "End-to-End Workflow",
                passed: processedMaterials.length > 0 && completedJobs.length > 0 && questionsWithSource.length > 0,
                details: "Complete workflow from PDF to questions"
            }
        ];
        workflowChecks.forEach(check => {
            console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}: ${check.details}`);
        });
        const allPassed = workflowChecks.every(check => check.passed);
        console.log(`\n🎯 Overall Workflow Status: ${allPassed ? '✅ WORKING' : '❌ NEEDS ATTENTION'}`);
        if (!allPassed) {
            console.log(`\n🔧 Recommendations:`);
            workflowChecks.filter(check => !check.passed).forEach(check => {
                console.log(`  - Fix: ${check.name}`);
            });
        }
    }
    catch (error) {
        console.error("❌ Error checking database state:", error);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkWorkflowImplementation();
// Check question generation jobs
const jobCount = await prisma.questionGenerationJob.count();
console.log(`Question Generation Jobs: ${jobCount}`);
if (jobCount > 0) {
    const jobs = await prisma.questionGenerationJob.findMany({
        select: {
            id: true,
            status: true,
            processingStage: true,
            progress: true,
            generatedCount: true,
            createdAt: true,
            errorMessage: true
        },
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    console.log("Recent jobs:");
    jobs.forEach(job => {
        console.log(`  - ${job.status} (${job.processingStage}, ${job.progress}%) - ${job.generatedCount || 0} questions`);
        console.log(`    Created: ${job.createdAt}`);
        if (job.errorMessage) {
            console.log(`    Error: ${job.errorMessage}`);
        }
    });
}
try { }
catch (error) {
    console.error("Error checking database:", error);
}
finally {
    await prisma.$disconnect();
}
checkDatabaseState();
