import { PDFToMarkdownProcessor } from '../src/lib/pdf-to-markdown-processor';

async function testNewPDFProcessor() {
  try {
    console.log('=== Testing New PDF Processor ===');
    
    const processor = new PDFToMarkdownProcessor();
    
    // Create a simple test by converting our markdown to text and back
    const testText = `
Computer Networks - Unit 1

Introduction to Computer Networks

Computer networks are interconnected computing devices that can exchange data and share resources.

Network Types

Local Area Network (LAN)
- Covers a small geographic area
- High data transfer rates

Wide Area Network (WAN)  
- Covers large geographic areas
- Lower data transfer rates

Network Topologies

Star Topology
- All devices connected to a central hub
- Easy to troubleshoot

Bus Topology
- All devices connected to a single cable
- Simple and cost-effective
`;
    
    // Test the markdown conversion and section extraction
    const markdownContent = processor.convertToMarkdown(testText);
    console.log('=== Markdown Content ===');
    console.log(markdownContent.substring(0, 500));
    
    const sections = processor.extractSections(markdownContent);
    console.log('\n=== Extracted Sections ===');
    sections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.title} (Level ${section.level})`);
      console.log(`   Content: ${section.content.substring(0, 100)}...`);
      console.log(`   Word Count: ${section.metadata?.wordCount || 0}`);
    });
    
  } catch (error) {
    console.error('Error testing new PDF processor:', error);
  }
}

testNewPDFProcessor();
