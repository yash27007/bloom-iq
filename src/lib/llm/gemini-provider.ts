import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  LLMProvider,
  LLMOptions,
  DocumentSection,
  QuestionGenerationConfig,
  GeneratedQuestion,
  BloomLevel,
  QuestionType,
  DifficultyLevel,
} from "./llm-provider";

export class GeminiProvider implements LLMProvider {
  name = "gemini";
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  async generateText(prompt: string, options?: LLMOptions): Promise<string> {
    const model = this.genAI.getGenerativeModel({ 
      model: options?.model || "gemini-2.5-flash" 
    });

    // Reduced timeout to prevent hanging
    const timeout = options?.timeout || 15000; // 15 seconds default instead of 30
    
    const generatePromise = model.generateContent(prompt);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('LLM request timed out after 15 seconds')), timeout);
    });

    try {
      const result = await Promise.race([generatePromise, timeoutPromise]);
      return result.response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractSections(markdownContent: string, options?: LLMOptions): Promise<DocumentSection[]> {
    const prompt = `
Analyze the following markdown content and extract meaningful sections for academic question generation.

For each section, identify:
1. Main topics covered
2. Key concepts explained
3. Important definitions
4. Procedures or processes
5. Examples and case studies

Content:
${markdownContent.substring(0, 8000)} // Limit to avoid token limits

Return the analysis as a JSON array with this structure:
[
  {
    "id": "section_1",
    "title": "Section Title",
    "content": "Section content...",
    "level": 1,
    "topics": ["topic1", "topic2"],
    "concepts": ["concept1", "concept2"]
  }
]

Focus on extracting sections that would be valuable for generating educational questions.
Return ONLY valid JSON, no additional text.
`;

    try {
      const response = await this.generateText(prompt, options);
      const cleanedResponse = this.cleanJSONResponse(response);
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error("Error extracting sections:", error);
      // Fallback: return basic sections
      return this.fallbackSectionExtraction(markdownContent);
    }
  }

  async generateQuestions(
    sections: DocumentSection[],
    config: QuestionGenerationConfig
  ): Promise<GeneratedQuestion[]> {
    const allQuestions: GeneratedQuestion[] = [];

    // Process sections in smaller batches to avoid timeouts
    const maxSections = Math.min(sections.length, 3); // Process max 3 sections to avoid timeout
    const selectedSections = sections.slice(0, maxSections);

    console.log(`Processing ${selectedSections.length} sections for question generation`);

    for (const section of selectedSections) {
      try {
        // Generate fewer questions per section to speed up processing
        for (const bloomLevel of config.bloomLevels.slice(0, 2)) { // Max 2 bloom levels
          for (const questionType of config.questionTypes.slice(0, 1)) { // Max 1 question type
            const questions = await this.generateQuestionsForSection(
              section,
              bloomLevel,
              questionType,
              config.difficultyLevels[0] || "MEDIUM", // Use first difficulty level
              1, // 1 question per combination
              config
            );
            allQuestions.push(...questions);
            
            // Add small delay to avoid API rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (error) {
        console.error(`Error generating questions for section ${section.id}:`, error);
        // Add fallback question for this section
        const fallbackQuestions = this.generateFallbackQuestions(
          section, 
          config.bloomLevels[0] || "UNDERSTAND", 
          config.questionTypes[0] || "STRAIGHTFORWARD", 
          config.difficultyLevels[0] || "MEDIUM", 
          1, 
          config
        );
        allQuestions.push(...fallbackQuestions);
      }
    }

    console.log(`Generated ${allQuestions.length} questions total`);
    return allQuestions;
  }

  private async generateQuestionsForSection(
    section: DocumentSection,
    bloomLevel: BloomLevel,
    questionType: QuestionType,
    difficultyLevel: DifficultyLevel,
    count: number,
    config: QuestionGenerationConfig
  ): Promise<GeneratedQuestion[]> {
    const bloomDescriptions = {
      REMEMBER: "Focus on recalling facts, terms, concepts, and basic knowledge",
      UNDERSTAND: "Focus on comprehension, interpretation, and explaining concepts",
      APPLY: "Focus on using knowledge in new situations and practical applications",
      ANALYZE: "Focus on breaking down information, finding patterns, and relationships",
      EVALUATE: "Focus on making judgments, critiquing, and assessing information",
      CREATE: "Focus on combining elements to form new ideas, products, or solutions",
    };

    const marksMapping = {
      STRAIGHTFORWARD: 2,
      PROBLEM_BASED: 8,
      SCENARIO_BASED: 16,
    };

    const prompt = `
Generate ${count} high-quality academic questions based STRICTLY on the following section content. Do NOT generate generic questions.

**Section Information:**
Title: ${section.title}
Topics: ${section.topics?.join(", ") || "General"}
Content: ${section.content.substring(0, 3000)}

**IMPORTANT: Questions MUST be based on the actual content above. Do not generate generic questions.**

**Question Requirements:**
- Bloom's Taxonomy Level: ${bloomLevel} - ${bloomDescriptions[bloomLevel]}
- Question Type: ${questionType}
- Difficulty Level: ${difficultyLevel}
- Marks: ${marksMapping[questionType]}
${config.unit ? `- Unit: ${config.unit}` : ""}
${config.courseContext ? `- Course Context: ${config.courseContext}` : ""}

**Response Format (JSON):**
Return a JSON array of question objects:
[
  {
    "question": "Specific question based on the section content",
    "answer": "Detailed answer with specific information from the content",
    "bloomLevel": "${bloomLevel}",
    "difficultyLevel": "${difficultyLevel}",
    "questionType": "${questionType}",
    "marks": ${marksMapping[questionType]},
    "topic": "specific topic from the section",
    "sourceSection": "${section.id}"
  }
]

**Critical Guidelines:**
1. Questions MUST reference specific concepts, terms, or procedures from the section content
2. Answers MUST contain factual information directly from the section
3. Use exact terminology and concepts from the provided content
4. For ${marksMapping[questionType]} marks questions, provide comprehensive answers
5. Questions should test understanding of the material at the ${bloomLevel} level
6. Avoid generic phrases like "discussed in the section" - be specific
7. Include relevant examples, formulas, or procedures mentioned in the content

**Answer Quality Requirements:**
- Provide specific, factual answers based on the content
- Include key points, definitions, and explanations from the material
- For higher marks (8-16), provide detailed explanations with multiple points
- Structure answers clearly with numbered points when appropriate

Generate exactly ${count} questions. Return ONLY valid JSON, no additional text.
`;

    try {
      const response = await this.generateText(prompt);
      const cleanedResponse = this.cleanJSONResponse(response);
      const questions = JSON.parse(cleanedResponse);
      
      return questions.map((q: {
        question?: string;
        answer?: string;
        bloomLevel?: string;
        difficultyLevel?: string;
        questionType?: string;
        marks?: number;
        topic?: string;
      }) => ({
        question: q.question || "Generated question content",
        answer: q.answer || "Generated answer content",
        bloomLevel: q.bloomLevel || bloomLevel,
        difficultyLevel: q.difficultyLevel || difficultyLevel,
        questionType: q.questionType || questionType,
        marks: q.marks || marksMapping[questionType],
        unit: config.unit,
        topic: q.topic || section.topics?.[0] || "General",
        sourceSection: section.id,
      }));
    } catch (error) {
      console.error("Error generating questions for section:", error);
      return this.generateFallbackQuestions(section, bloomLevel, questionType, difficultyLevel, count, config);
    }
  }

  private cleanJSONResponse(response: string): string {
    let cleaned = response.trim();
    
    // Remove markdown code blocks
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    
    return cleaned;
  }

  private fallbackSectionExtraction(markdownContent: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const lines = markdownContent.split('\\n');
    
    let currentSection: Partial<DocumentSection> | null = null;
    let sectionCounter = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      const headingMatch = trimmed.match(/^(#{1,6})\\s+(.+)$/);
      
      if (headingMatch) {
        if (currentSection) {
          sections.push({
            id: currentSection.id!,
            title: currentSection.title!,
            content: currentSection.content!,
            level: currentSection.level!,
            topics: this.extractTopics(currentSection.content!),
            concepts: this.extractConcepts(currentSection.content!),
          });
        }
        
        sectionCounter++;
        currentSection = {
          id: `section_${sectionCounter}`,
          title: headingMatch[2],
          level: headingMatch[1].length,
          content: '',
        };
      } else if (currentSection) {
        currentSection.content += line + '\\n';
      }
    }
    
    if (currentSection) {
      sections.push({
        id: currentSection.id!,
        title: currentSection.title!,
        content: currentSection.content!,
        level: currentSection.level!,
        topics: this.extractTopics(currentSection.content!),
        concepts: this.extractConcepts(currentSection.content!),
      });
    }
    
    return sections;
  }

  private extractTopics(content: string): string[] {
    // Simple topic extraction
    const words = content.toLowerCase().match(/\\b[a-z]{4,}\\b/g) || [];
    const wordFreq = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private extractConcepts(content: string): string[] {
    // Extract phrases that might be concepts
    const concepts = content.match(/\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\b/g) || [];
    return [...new Set(concepts)].slice(0, 5);
  }

  private generateFallbackQuestions(
    section: DocumentSection,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _bloomLevel: BloomLevel,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _questionType: QuestionType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _difficultyLevel: DifficultyLevel,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _count: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _config: QuestionGenerationConfig
  ): GeneratedQuestion[] {
    // Instead of generating fake questions, throw an error
    throw new Error(`Failed to generate questions for section "${section.title}". Insufficient content or LLM error. Cannot create quality questions without proper source material.`);
  }
}
