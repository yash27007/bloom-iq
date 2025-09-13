import { PDFToMarkdownProcessor } from '../src/lib/pdf-to-markdown-processor';
import * as fs from 'fs';

async function testPDFProcessor() {
  try {
    console.log('=== Testing PDF Processor ===');
    
    const processor = new PDFToMarkdownProcessor();
    const testPdfPath = './node_modules/pdf-parse/test/data/01-valid.pdf';
    
    console.log(`Testing with file: ${testPdfPath}`);
    console.log(`File exists: ${fs.existsSync(testPdfPath)}`);
    
    const result = await processor.processPDFToMarkdown(testPdfPath);
    
    console.log('\n=== PROCESSING RESULTS ===');
    console.log(`Title: ${result.title}`);
    console.log(`Page Count: ${result.metadata.pageCount}`);
    console.log(`Word Count: ${result.metadata.wordCount}`);
    console.log(`Sections Count: ${result.sections.length}`);
    
    console.log('\n=== MARKDOWN CONTENT PREVIEW ===');
    console.log(result.markdownContent.substring(0, 500));
    
    console.log('\n=== SECTIONS ===');
    result.sections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.title} (Level ${section.level})`);
      console.log(`   Content: ${section.content.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('Error testing PDF processor:', error);
  }
}

testPDFProcessor();
