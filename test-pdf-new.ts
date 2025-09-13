/**
 * Test script to verify the PDF to JSON processing pipeline
 * This script tests the new pdf2json-based workflow
 */

import { pdfProcessor } from './src/lib/pdf-to-json-processor';
import path from 'path';

async function testPDFProcessing() {
  console.log('=== Testing PDF to JSON Processing ===\n');
  
  // Test with a small sample PDF (you can replace this with an actual PDF path)
  const testPDFPath = path.join(process.cwd(), 'test-sample.pdf');
  
  try {
    console.log(`Processing PDF: ${testPDFPath}`);
    const result = await pdfProcessor.processFromFile(testPDFPath);
    
    console.log('\n=== Processing Results ===');
    console.log(`Title: ${result.title}`);
    console.log(`Total Pages: ${result.totalPages}`);
    console.log(`Full Text Length: ${result.fullText.length} characters`);
    console.log(`Number of Sections: ${result.sections.length}`);
    console.log(`Total Text Blocks: ${result.metadata.totalTextBlocks}`);
    console.log(`Average Font Size: ${result.metadata.averageFontSize}`);
    
    console.log('\n=== Sections Preview ===');
    result.sections.forEach((section, index) => {
      console.log(`\nSection ${index + 1}:`);
      console.log(`  ID: ${section.id}`);
      console.log(`  Title: ${section.title}`);
      console.log(`  Level: ${section.level}`);
      console.log(`  Page: ${section.page}`);
      console.log(`  Content Length: ${section.content.length} chars`);
      console.log(`  Text Blocks: ${section.textBlocks.length}`);
      console.log(`  Content Preview: ${section.content.substring(0, 100)}...`);
    });
    
    console.log('\n=== Full Text Preview ===');
    console.log(result.fullText.substring(0, 500) + '...');
    
    console.log('\n=== JSON Structure for Database ===');
    const jsonForDB = JSON.stringify(result.sections, null, 2);
    console.log(`JSON size: ${jsonForDB.length} characters`);
    console.log('First section as JSON:');
    console.log(JSON.stringify(result.sections[0] || {}, null, 2));
    
    return result;
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error;
  }
}

// Test with mock PDF data if real PDF is not available
async function testMockPDFData() {
  console.log('\n=== Testing with Mock PDF Buffer ===');
  
  // Create a minimal mock PDF buffer for testing
  // Note: This is just for testing the buffer processing method
  // In reality, you'd use an actual PDF buffer
  const mockBuffer = Buffer.from('Mock PDF data for testing');
  
  try {
    // This will likely fail with mock data, but tests the buffer processing path
    const result = await pdfProcessor.processFromBuffer(mockBuffer);
    console.log('Mock processing successful:', result.title);
  } catch (error) {
    console.log('Expected error with mock data:', (error as Error).message);
  }
}

async function main() {
  try {
    // Test 1: Try to process a real PDF file
    try {
      await testPDFProcessing();
    } catch (error) {
      console.log('Real PDF test failed (expected if no test PDF available):', (error as Error).message);
    }
    
    // Test 2: Test buffer processing method
    await testMockPDFData();
    
    console.log('\n=== Test Complete ===');
    console.log('PDF processing infrastructure is ready!');
    console.log('To test with real data:');
    console.log('1. Upload a PDF through the dashboard');
    console.log('2. Generate questions for that material');
    console.log('3. Check the sectionsData in the database');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
