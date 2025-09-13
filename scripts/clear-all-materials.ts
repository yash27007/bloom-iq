#!/usr/bin/env bun

import { prisma } from '../src/lib/prisma';
import { existsSync, rmSync } from 'fs';
import path from 'path';

async function clearAllMaterials() {
  console.log('=== Clearing all materials and jobs ===');

  try {
    // Delete all question jobs first (due to foreign key constraints)
    const jobCount = await prisma.questionGenerationJob.count();
    if (jobCount > 0) {
      await prisma.questionGenerationJob.deleteMany();
      console.log(`✅ Deleted ${jobCount} question jobs`);
    }

    // Delete all questions
    const questionCount = await prisma.question.count();
    if (questionCount > 0) {
      await prisma.question.deleteMany();
      console.log(`✅ Deleted ${questionCount} questions`);
    }

    // Delete all materials
    const materialCount = await prisma.courseMaterial.count();
    if (materialCount > 0) {
      await prisma.courseMaterial.deleteMany();
      console.log(`✅ Deleted ${materialCount} materials`);
    }

    // Clear temp directory
    const tempDir = path.join(process.cwd(), 'temp');
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
      console.log(`✅ Cleared temp directory`);
    }

    // Clear public/uploads directory if it exists
    const uploadsDir = path.join(process.cwd(), 'public/uploads');
    if (existsSync(uploadsDir)) {
      rmSync(uploadsDir, { recursive: true, force: true });
      console.log(`✅ Cleared uploads directory`);
    }

    console.log('=== All materials and jobs cleared successfully ===');
  } catch (error) {
    console.error('❌ Error clearing materials:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllMaterials();
