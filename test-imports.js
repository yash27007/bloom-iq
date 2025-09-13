// Test script to verify all imports work correctly
import { pdfProcessor } from '../src/lib/pdf-to-json-processor';
import { inngest } from '../src/inngest/client';
import { prisma } from '../src/lib/prisma';

async function testImports() {
  console.log('Testing imports...');
  
  try {
    console.log('✅ PDF processor imported:', typeof pdfProcessor);
    console.log('✅ Inngest client imported:', typeof inngest);
    console.log('✅ Prisma client imported:', typeof prisma);
    
    // Test Inngest client functionality
    console.log('Testing Inngest client...');
    console.log('Inngest client ID:', inngest.id);
    
    console.log('All imports successful!');
  } catch (error) {
    console.error('❌ Import test failed:', error);
    throw error;
  }
}

testImports().catch(console.error);
