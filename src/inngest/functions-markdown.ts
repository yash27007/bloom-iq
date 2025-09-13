import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { pdfProcessor, type ProcessedPDFDocument, type PDFSection } from "@/lib/pdf-to-json-processor";
import { LLM, QuestionGenerationConfig, DocumentSection, BloomLevel, QuestionType, DifficultyLevel } from "@/lib/llm";
import { BLOOM_LEVEL, DIFFICULTY_LEVEL, Marks, Prisma } from "@/generated/prisma";
import * as fs from "fs";
import * as path from "path";

// Type definitions
type GeneratedQuestion = {
  question: string;
  answer: string;
  bloomLevel: BloomLevel;
  difficultyLevel: DifficultyLevel;
  questionType: QuestionType;
  marks: number;
  unit: number;
  topic: string;
};

// Simple logger for the function
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const logger = {
  info: (message: string, data?: unknown) => console.log(`[INFO] ${message}`, data),
  error: (message: string, data?: unknown) => console.error(`[ERROR] ${message}`, data),
};

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
  }
);

export const processDocumentAndGenerateQuestions = inngest.createFunction(
  {
    id: "process-document-generate-questions",
    name: "Process PDF to Markdown and Generate Questions",
    retries: 2,
    concurrency: {
      limit: 3, // Limit concurrent processing jobs
    },
  },
  { event: "documents/process-and-generate" },
  async ({ event, step, logger }) => {
    const {
      jobId,
      materialId,
      courseId,
      questionTypes = ["STRAIGHTFORWARD", "PROBLEM_BASED"],
      difficultyLevels = ["EASY", "MEDIUM"],
      unit,
      questionsPerBloomLevel = { UNDERSTAND: 2, APPLY: 2 },
    } = event.data;

    logger.info("Starting document processing and question generation", {
      jobId,
      materialId,
      courseId,
    });

    // Step 1: Update job status to PROCESSING
    await step.run("update-job-status-processing", async () => {
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "PROCESSING",
          processingStage: "MARKDOWN_CONVERSION",
          progress: 10,
        },
      });
    });

    // Step 2: Get material information
    const material = await step.run("get-material-info", async () => {
      const mat = await prisma.courseMaterial.findUnique({
        where: { id: materialId },
        include: {
          course: true,
        },
      });

      if (!mat) {
        throw new Error(`Material with ID ${materialId} not found`);
      }

      return mat;
    });

    // Step 3: Process PDF to JSON (if not already processed)
    let processedDoc: ProcessedPDFDocument;
    
    if (!material.isProcessed) {
      processedDoc = await step.run("process-pdf-to-json", async () => {
        logger.info("Converting PDF to JSON structure", { filePath: material.filePath });
        
        try {
          // Construct full path to PDF in uploads directory
          const fullPath = path.join(process.cwd(), material.filePath);
          
          // Check if PDF file exists before processing
          if (!fs.existsSync(fullPath)) {
            throw new Error(`PDF file not found at path: ${fullPath}. Cannot generate questions without source material.`);
          }
          
          // Process the actual uploaded PDF file using pdf2json
          const doc = await pdfProcessor.processFromFile(fullPath);
          
          // Validate that we actually got content
          if (!doc.fullText || doc.fullText.trim().length < 100) {
            throw new Error(`PDF processing resulted in insufficient content (${doc.fullText?.length || 0} chars). Cannot generate quality questions.`);
          }
          
          // Update material with processed content
          await prisma.courseMaterial.update({
            where: { id: materialId },
            data: {
              markdownContent: doc.fullText, // Store full text in markdown field for backward compatibility
              sectionsData: JSON.parse(JSON.stringify(doc.sections)) as Prisma.InputJsonValue,
              isProcessed: true,
            },
          });

          await prisma.questionGenerationJob.update({
            where: { id: jobId },
            data: {
              processingStage: "SECTION_EXTRACTION",
              progress: 30,
            },
          });

          return doc;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error("Failed to process PDF", { error: errorMessage });
          
          // Update job status to failed
          await prisma.questionGenerationJob.update({
            where: { id: jobId },
            data: {
              status: "FAILED",
              processingStage: "PDF_PROCESSING_FAILED",
              errorMessage: errorMessage,
            },
          });
          
          throw error;
        }
      });
    } else {
      // Use already processed content - but validate it exists and has sufficient content
      if (!material.markdownContent || material.markdownContent.trim().length < 100) {
        const errorMessage = `Material was marked as processed but has insufficient content (${material.markdownContent?.length || 0} chars). Cannot generate quality questions.`;
        logger.error("Insufficient processed content", { materialId, contentLength: material.markdownContent?.length || 0 });
        
        // Update job status to failed
        await prisma.questionGenerationJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            processingStage: "INSUFFICIENT_CONTENT",
            errorMessage: errorMessage,
          },
        });
        
        throw new Error(errorMessage);
      }
      
      // Reconstruct ProcessedPDFDocument from stored data
      processedDoc = {
        title: material.title,
        totalPages: 1,
        sections: material.sectionsData as unknown as PDFSection[],
        fullText: material.markdownContent!,
        metadata: {
          extractedAt: new Date(),
          totalTextBlocks: 0,
          averageFontSize: 12,
        },
      };
    }

    // Step 4: Extract and enhance sections using LLM
    const enhancedSections = await step.run("enhance-sections-with-llm", async () => {
      logger.info("Enhancing sections with LLM analysis");
      
      try {
        const llmProvider = LLM.getDefaultProvider();
        
        // Convert PDF sections to basic DocumentSections for LLM processing
        const basicSections = processedDoc.sections.map(section => ({
          id: section.id,
          title: section.title,
          content: section.content,
          level: section.level,
          topics: [],
          concepts: [],
        })) as DocumentSection[];
        
        // If we have sections from PDF processing, use them directly
        // Otherwise, try to extract sections using LLM from full text
        let sections: DocumentSection[];
        
        if (basicSections.length > 0 && basicSections.some(s => s.content.trim().length > 50)) {
          // Use PDF-extracted sections
          sections = basicSections;
          logger.info("Using PDF-extracted sections", { count: sections.length });
        } else {
          // Fallback: Try LLM section extraction from full text
          sections = await llmProvider.extractSections(processedDoc.fullText, {
            timeout: 20000 // 20 second timeout
          });
          logger.info("Used LLM section extraction", { count: sections.length });
        }
        
        await prisma.questionGenerationJob.update({
          where: { id: jobId },
          data: {
            processingStage: "QUESTION_GENERATION",
            progress: 50,
          },
        });

        return sections;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn("LLM section enhancement failed, using basic sections", { error: errorMessage });
        // Fallback to basic sections from PDF processor
        return processedDoc.sections.map(section => ({
          id: section.id,
          title: section.title,
          content: section.content,
          level: section.level,
          topics: [],
          concepts: [],
        })) as DocumentSection[];
      }
    });

    // Step 5: Generate questions using LLM
    const generatedQuestions = await step.run("generate-questions", async () => {
      logger.info("Generating questions from sections", { 
        sectionsCount: enhancedSections.length 
      });

      // Define config at the beginning so it's available in catch block
      const config: QuestionGenerationConfig = {
        bloomLevels: Object.keys(questionsPerBloomLevel) as BloomLevel[],
        questionTypes: questionTypes as QuestionType[],
        difficultyLevels: difficultyLevels as DifficultyLevel[],
        unit,
        courseContext: `${material.course.courseCode} - ${material.course.courseName}`,
      };

      try {
        const llmProvider = LLM.getDefaultProvider();
        
        // Add timeout for question generation - reduced timeout
        const questionPromise = llmProvider.generateQuestions(enhancedSections, config);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Question generation timed out after 30 seconds')), 30000); // Reduced to 30 seconds
        });
        
        const questions = await Promise.race([questionPromise, timeoutPromise]);
        
        await prisma.questionGenerationJob.update({
          where: { id: jobId },
          data: {
            progress: 80,
            totalQuestions: questions.length,
          },
        });

        return questions;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error("Question generation failed, using fallback method", { error: errorMessage });
        
        // Fallback: Generate simple questions based on section content
        const fallbackQuestions = generateFallbackQuestions(enhancedSections, config);
        
        await prisma.questionGenerationJob.update({
          where: { id: jobId },
          data: {
            progress: 80,
            totalQuestions: fallbackQuestions.length,
            errorMessage: `LLM failed: ${errorMessage}. Using fallback generation.`,
          },
        });

        return fallbackQuestions;
      }
    });

    // Step 6: Save questions to database
    const savedQuestions = await step.run("save-questions-to-db", async () => {
      logger.info("Saving questions to database", { 
        questionsCount: generatedQuestions?.length || 0
      });

      const savedQuestions = [];

      if (generatedQuestions && generatedQuestions.length > 0) {
        for (const q of generatedQuestions) {
          try {
            const question = await prisma.question.create({
              data: {
                question: q.question,
                answer: q.answer,
                questionType: q.questionType as QuestionType,
                unit: q.unit || unit || 1,
                bloomLevel: q.bloomLevel as BLOOM_LEVEL,
                difficultyLevel: q.difficultyLevel as DIFFICULTY_LEVEL,
                marks: getMarksEnum(q.marks),
                topic: q.topic,
                courseId,
                sourceMaterialId: materialId,
                status: "CREATED_BY_COURSE_COORDINATOR",
              },
            });
            savedQuestions.push(question);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.warn("Failed to save question", { 
              question: q.question.substring(0, 50),
              error: errorMessage
            });
          }
        }
      }

      return savedQuestions;
    });

    // Step 7: Complete the job
    await step.run("complete-job", async () => {
      await prisma.questionGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          processingStage: "COMPLETED",
          progress: 100,
          generatedCount: savedQuestions.length,
          updatedAt: new Date(),
        },
      });

      logger.info("Job completed successfully", {
        jobId,
        questionsGenerated: savedQuestions.length,
        sectionsProcessed: enhancedSections.length,
      });
    });

    return {
      success: true,
      jobId,
      questionsGenerated: savedQuestions.length,
      sectionsProcessed: enhancedSections.length,
      documentTitle: processedDoc.title,
    };
  }
);

// Helper function to convert marks to enum
function getMarksEnum(marks: number): Marks {
  if (marks <= 2) return Marks.TWO_MARKS;
  if (marks <= 8) return Marks.EIGHT_MARKS;
  return Marks.SIXTEEN_MARKS;
}

// Fallback question generation when LLM fails
function generateFallbackQuestions(
  sections: DocumentSection[],
  config: QuestionGenerationConfig
): GeneratedQuestion[] {
  // Enhanced fallback questions with comprehensive answers
  const fallbackQuestions: GeneratedQuestion[] = [
    // Level 1: Remembering Questions
    {
      question: "What are the five components of a data communication system?",
      answer: "A data communication system consists of five essential components that work together to enable effective communication: 1) **Message** - the information to be communicated (data, text, images, audio, video), 2) **Sender** - the device that sends the data message (computer, workstation, telephone handset), 3) **Receiver** - the device that receives the message (computer, workstation, telephone handset), 4) **Transmission Medium** - the physical path through which a message travels from sender to receiver (twisted-pair wire, coaxial cable, fiber-optic cable, radio waves), and 5) **Protocol** - a set of rules that govern data communications, representing an agreement between the communicating devices. Without protocols, two devices may be connected but not communicating, just as a person speaking French cannot be understood by a person who speaks only Japanese.",
      bloomLevel: "REMEMBER",
      difficultyLevel: "EASY",
      questionType: "STRAIGHTFORWARD",
      marks: 2,
      unit: config.unit || 1,
      topic: "Data Communication Fundamentals",
    },
    {
      question: "Define a protocol in data communication and explain its importance.",
      answer: "A protocol in data communication is a set of rules that govern data communication between devices. It represents a formal agreement between the communicating devices that defines how data is transmitted, received, and interpreted. **Importance of protocols:** 1) **Standardization** - Ensures that devices from different manufacturers can communicate effectively, 2) **Error Detection and Correction** - Protocols include mechanisms to detect and correct transmission errors, 3) **Flow Control** - Manages the rate of data transmission to prevent overwhelming the receiver, 4) **Data Formatting** - Defines how data should be structured and formatted for transmission, 5) **Security** - Many protocols include authentication and encryption features, 6) **Addressing** - Protocols specify how devices are identified and addressed in a network. Without protocols, devices may be physically connected but unable to understand each other, similar to two people trying to communicate without speaking the same language.",
      bloomLevel: "UNDERSTAND",
      difficultyLevel: "MEDIUM",
      questionType: "STRAIGHTFORWARD",
      marks: 8,
      unit: config.unit || 1,
      topic: "Protocols",
    },
    {
      question: "Compare and contrast half-duplex and full-duplex communication modes with practical examples.",
      answer: "**Half-Duplex Communication:** In half-duplex mode, communication is possible in both directions but only one direction at a time. When one device is sending, the other can only receive, and vice versa. **Examples:** 1) Walkie-talkies - only one person can speak at a time, 2) Traditional Ethernet hubs with collision detection. **Full-Duplex Communication:** In full-duplex mode, communication is possible in both directions simultaneously. Both devices can send and receive data at the same time. **Examples:** 1) Telephone conversations - both parties can speak and listen simultaneously, 2) Modern Ethernet switches with dedicated channels. **Key Differences:** 1) **Simultaneity** - Half-duplex requires turn-taking, while full-duplex allows simultaneous communication, 2) **Efficiency** - Full-duplex is more efficient as it utilizes the full capacity of the communication channel, 3) **Hardware Requirements** - Full-duplex typically requires more sophisticated hardware and separate channels for each direction, 4) **Applications** - Full-duplex is preferred for high-performance applications requiring real-time bidirectional communication.",
      bloomLevel: "UNDERSTAND",
      difficultyLevel: "MEDIUM",
      questionType: "STRAIGHTFORWARD",
      marks: 8,
      unit: config.unit || 1,
      topic: "Communication Modes",
    },
    {
      question: "Analyze the advantages and disadvantages of mesh topology compared to star topology.",
      answer: "**Mesh Topology Analysis:** **Advantages:** 1) **High Reliability** - Multiple paths exist between nodes, providing redundancy if one link fails, 2) **Security** - Dedicated point-to-point links provide privacy and security, 3) **No Traffic Congestion** - Each connection carries its own data load, 4) **Fault Isolation** - Problems are easily isolated and identified. **Disadvantages:** 1) **High Cost** - Requires n(n-1)/2 links for n nodes, making it expensive, 2) **Complex Installation** - Difficult to install and reconfigure, 3) **Space Requirements** - Requires significant physical space for cabling. **Star Topology Analysis:** **Advantages:** 1) **Easy Installation** - Simple to install and modify, 2) **Centralized Management** - Easy to manage and troubleshoot from the central hub, 3) **Cost-Effective** - Requires only n links for n nodes, 4) **Fault Isolation** - Easy to identify and isolate faults. **Disadvantages:** 1) **Single Point of Failure** - If the central hub fails, the entire network becomes inoperative, 2) **Limited by Hub Capacity** - Network performance depends on the hub's capacity. **Recommendation:** Star topology is preferred for most small to medium networks due to cost-effectiveness and ease of management, while mesh topology is reserved for critical applications requiring maximum reliability.",
      bloomLevel: "ANALYZE",
      difficultyLevel: "HARD",
      questionType: "PROBLEM_BASED",
      marks: 16,
      unit: config.unit || 1,
      topic: "Network Topologies",
    },
    {
      question: "Evaluate the role and importance of the OSI model in modern networking, and explain how it facilitates interoperability.",
      answer: "**The OSI (Open Systems Interconnection) Model** is a conceptual framework that standardizes network communication functions into seven distinct layers. **Key Roles:** 1) **Standardization** - Provides a universal standard for network protocols and communication, 2) **Modular Design** - Separates network functions into manageable layers, each with specific responsibilities, 3) **Troubleshooting** - Enables systematic problem identification and resolution by isolating issues to specific layers, 4) **Vendor Independence** - Allows equipment from different manufacturers to work together seamlessly. **Facilitating Interoperability:** 1) **Layer Independence** - Each layer can be modified without affecting other layers, promoting innovation and upgrades, 2) **Protocol Standards** - Defines standard interfaces between layers, ensuring compatibility, 3) **Service Abstraction** - Upper layers don't need to know implementation details of lower layers, 4) **Global Acceptance** - Universally accepted framework enables worldwide network compatibility. **Modern Relevance:** While TCP/IP is more commonly used in practice, the OSI model remains crucial for: 1) **Education and Training** - Provides clear conceptual understanding of networking, 2) **Network Design** - Guides systematic network architecture development, 3) **Protocol Development** - Serves as reference for creating new networking protocols, 4) **Industry Standards** - Forms basis for many international networking standards. The model's layered approach simplifies complex networking concepts and ensures that networks can evolve while maintaining compatibility.",
      bloomLevel: "EVALUATE",
      difficultyLevel: "HARD",
      questionType: "SCENARIO_BASED",
      marks: 16,
      unit: config.unit || 1,
      topic: "OSI Model",
    },
  ];

  // Add section-specific questions if available
  for (const section of sections.slice(0, 2)) {
    const sectionTitle = section.title || "Course Content";
    const sectionContent = section.content.substring(0, 300);
    
    fallbackQuestions.push({
      question: `Analyze the key concepts presented in "${sectionTitle}" and explain their practical applications in real-world scenarios.`,
      answer: `The section "${sectionTitle}" presents several fundamental concepts that are crucial for understanding the subject matter. **Key Concepts:** ${sectionContent}... **Practical Applications:** These concepts can be applied in various real-world scenarios: 1) **Industry Implementation** - Understanding these principles helps in designing efficient systems and solutions, 2) **Problem-Solving** - The theoretical framework provides tools for analyzing and solving complex problems, 3) **Technology Integration** - These concepts form the foundation for integrating new technologies and methodologies, 4) **Performance Optimization** - Application of these principles leads to improved system performance and efficiency. **Real-World Examples:** In professional practice, these concepts are utilized in system design, network implementation, software development, and strategic planning. The theoretical knowledge serves as a bridge between academic understanding and practical implementation, enabling professionals to make informed decisions and create effective solutions. Students should focus on understanding not just the 'what' but also the 'why' and 'how' of these concepts to develop comprehensive expertise in the field.`,
      bloomLevel: "ANALYZE",
      difficultyLevel: "MEDIUM",
      questionType: "PROBLEM_BASED",
      marks: 8,
      unit: config.unit || 1,
      topic: sectionTitle,
    });
  }
  
  return fallbackQuestions.slice(0, 6); // Return 6 high-quality questions
}
