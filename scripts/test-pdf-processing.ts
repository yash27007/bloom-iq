#!/usr/bin/env tsx

import { PDFToMarkdownProcessor } from '../src/lib/pdf-to-markdown-processor';
import * as fs from 'fs';
import * as path from 'path';

async function testPDFProcessing() {
  console.log('=== Testing PDF Processing Fix ===');
  
  // Create a simple test PDF file (we'll create a basic binary file for testing)
  const testPdfPath = path.join(process.cwd(), 'temp', 'test.pdf');
  
  // Ensure temp directory exists
  const tempDir = path.dirname(testPdfPath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Create a minimal PDF-like file for testing (just to test the Buffer->Uint8Array conversion)
  const pdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n');
  fs.writeFileSync(testPdfPath, pdfHeader);
  
  try {
    const processor = new PDFToMarkdownProcessor();
    
    console.log('Testing processPDFToMarkdown...');
    await processor.processPDFToMarkdown(testPdfPath);
    console.log('✅ PDF processing completed without Buffer/Uint8Array error');
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Uint8Array')) {
        console.log('❌ Buffer/Uint8Array issue still exists:', error.message);
      } else {
        console.log('✅ Buffer/Uint8Array issue fixed! Other error (expected for test file):', error.message);
      }
    }
  } finally {
    // Clean up test file
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
      console.log('🧹 Test file cleaned up');
    }
  }
}

testPDFProcessing().catch(console.error);
