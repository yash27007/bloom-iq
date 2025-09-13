#!/usr/bin/env tsx

import { PDFToMarkdownProcessor } from '../src/lib/pdf-to-markdown-processor';
import * as fs from 'fs';
import * as path from 'path';

async function testPDFProcessing() {
  console.log('=== Testing PDF Processing with pdf-parse ===');
  
  // Create a simple test PDF content (we'll use a buffer that should not cause worker issues)
  const testPdfPath = path.join(process.cwd(), 'temp', 'test.pdf');
  
  // Ensure temp directory exists
  const tempDir = path.dirname(testPdfPath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Create a minimal valid PDF for testing
  const pdfContent = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Hello World!) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000198 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
295
%%EOF`);
  
  fs.writeFileSync(testPdfPath, pdfContent);
  
  try {
    const processor = new PDFToMarkdownProcessor();
    
    console.log('Testing processPDFToMarkdown...');
    const result = await processor.processPDFToMarkdown(testPdfPath);
    console.log('✅ PDF processing completed successfully');
    console.log('Extracted text length:', result.markdownContent.length);
    console.log('Page count:', result.metadata.pageCount);
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('worker')) {
        console.log('❌ Worker issue still exists:', error.message);
      } else {
        console.log('⚠️ Different error (may be expected for simple test PDF):', error.message);
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
