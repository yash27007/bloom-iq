import PDFParser, { Output } from 'pdf2json';

export interface PDFTextBlock {
  id: string;
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

export interface PDFSection {
  id: string;
  title: string;
  content: string;
  level: number;
  page: number;
  textBlocks: PDFTextBlock[];
}

export interface ProcessedPDFDocument {
  title: string;
  totalPages: number;
  sections: PDFSection[];
  fullText: string;
  metadata: {
    extractedAt: Date | string; // Support both Date and string for Inngest serialization
    totalTextBlocks: number;
    averageFontSize: number;
  };
}

export class PDFToJSONProcessor {
  private static instance: PDFToJSONProcessor;

  public static getInstance(): PDFToJSONProcessor {
    if (!PDFToJSONProcessor.instance) {
      PDFToJSONProcessor.instance = new PDFToJSONProcessor();
    }
    return PDFToJSONProcessor.instance;
  }

  async processFromFile(filePath: string): Promise<ProcessedPDFDocument> {
    return new Promise((resolve, reject) => {
      // Use the workaround for TypeScript issues mentioned in the blog
      const pdfParser = new (PDFParser as unknown as new (context: null, value: number) => PDFParser)(null, 1);
      
      pdfParser.on("pdfParser_dataError", (errData: Record<"parserError", Error>) => {
        console.error("PDF parsing error:", errData.parserError);
        reject(new Error(`PDF parsing failed: ${errData.parserError.message}`));
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: Output) => {
        try {
          const processedDoc = this.extractStructuredData(pdfData);
          resolve(processedDoc);
        } catch (error) {
          reject(error);
        }
      });

      // Load the PDF file
      pdfParser.loadPDF(filePath);
    });
  }

  async processFromBuffer(buffer: Buffer): Promise<ProcessedPDFDocument> {
    return new Promise((resolve, reject) => {
      // Use the workaround for TypeScript issues
      const pdfParser = new (PDFParser as unknown as new (context: null, value: number) => PDFParser)(null, 1);
      
      pdfParser.on("pdfParser_dataError", (errData: Record<"parserError", Error>) => {
        console.error("PDF parsing error:", errData.parserError);
        reject(new Error(`PDF parsing failed: ${errData.parserError.message}`));
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: Output) => {
        try {
          const processedDoc = this.extractStructuredData(pdfData);
          resolve(processedDoc);
        } catch (error) {
          reject(error);
        }
      });

      // Parse the buffer
      pdfParser.parseBuffer(buffer);
    });
  }

  private extractStructuredData(pdfData: Output): ProcessedPDFDocument {
    console.log("Processing PDF data...");
    
    const textBlocks: PDFTextBlock[] = [];
    let fullText = '';
    const totalPages = pdfData.Pages?.length || 0;
    
    // Extract text blocks from all pages
    pdfData.Pages?.forEach((page, pageIndex: number) => {
      page.Texts?.forEach((textObj, textIndex: number) => {
        const decodedText = decodeURIComponent(textObj.R?.[0]?.T || '');
        if (decodedText.trim()) {
          const block: PDFTextBlock = {
            id: `page-${pageIndex + 1}-text-${textIndex}`,
            text: decodedText,
            page: pageIndex + 1,
            x: textObj.x || 0,
            y: textObj.y || 0,
            width: textObj.w || 0,
            height: 12, // Default height since h property doesn't exist in pdf2json types
            fontSize: textObj.R?.[0]?.TS?.[1] || 12, // Font size
          };
          textBlocks.push(block);
          fullText += decodedText + ' ';
        }
      });
    });

    // Detect sections based on font size and position
    const sections = this.detectSections(textBlocks);
    
    // Extract document title (usually the largest text on first page)
    const title = this.extractTitle(textBlocks) || 'Untitled Document';
    
    // Calculate metadata
    const averageFontSize = textBlocks.length > 0 
      ? textBlocks.reduce((sum, block) => sum + block.fontSize, 0) / textBlocks.length 
      : 12;

    return {
      title,
      totalPages,
      sections,
      fullText: fullText.trim(),
      metadata: {
        extractedAt: new Date(),
        totalTextBlocks: textBlocks.length,
        averageFontSize,
      },
    };
  }

  private extractTitle(textBlocks: PDFTextBlock[]): string {
    // Find the largest text on the first page as title
    const firstPageBlocks = textBlocks.filter(block => block.page === 1);
    if (firstPageBlocks.length === 0) return '';
    
    const largestBlock = firstPageBlocks.reduce((largest, current) => 
      current.fontSize > largest.fontSize ? current : largest
    );
    
    return largestBlock.text.trim();
  }

  private detectSections(textBlocks: PDFTextBlock[]): PDFSection[] {
    const sections: PDFSection[] = [];
    
    if (textBlocks.length === 0) return sections;
    
    // Calculate average font size for comparison
    const averageFontSize = textBlocks.reduce((sum, block) => sum + block.fontSize, 0) / textBlocks.length;
    const headerThreshold = averageFontSize * 1.2; // 20% larger than average
    
    // Group text blocks by potential sections
    let currentSection: PDFSection | null = null;
    let sectionId = 1;
    
    for (const block of textBlocks) {
      const isLikelyHeader = block.fontSize >= headerThreshold && 
                            block.text.length < 100 && // Headers are usually shorter
                            !block.text.match(/^\d+$/); // Not just numbers
      
      if (isLikelyHeader) {
        // Start new section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        currentSection = {
          id: `section-${sectionId++}`,
          title: block.text.trim(),
          content: '',
          level: this.calculateLevel(block.fontSize, averageFontSize),
          page: block.page,
          textBlocks: [block],
        };
      } else if (currentSection) {
        // Add to current section
        currentSection.content += block.text + ' ';
        currentSection.textBlocks.push(block);
      } else {
        // Create initial section if none exists
        currentSection = {
          id: `section-${sectionId++}`,
          title: 'Introduction',
          content: block.text + ' ',
          level: 1,
          page: block.page,
          textBlocks: [block],
        };
      }
    }
    
    // Add the last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // Clean up content
    sections.forEach(section => {
      section.content = section.content.trim();
    });
    
    return sections;
  }
  
  private calculateLevel(fontSize: number, averageFontSize: number): number {
    const ratio = fontSize / averageFontSize;
    if (ratio >= 1.5) return 1; // Main headers
    if (ratio >= 1.2) return 2; // Sub headers
    return 3; // Regular content treated as level 3 headers
  }
}

// Export singleton instance
export const pdfProcessor = PDFToJSONProcessor.getInstance();
