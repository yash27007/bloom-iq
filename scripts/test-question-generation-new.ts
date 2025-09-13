import { LLM } from '../src/lib/llm';
import * as fs from 'fs';

async function testQuestionGeneration() {
  try {
    console.log('=== Testing Question Generation with Real Content ===');
    
    // Read the test content
    const testContent = fs.readFileSync('./test-content.md', 'utf-8');
    console.log(`Content length: ${testContent.length} characters`);
    
    // Create a mock section with real content
    const mockSection = {
      id: 'section_1',
      title: 'Introduction to Computer Networks',
      content: testContent,
      level: 1,
      topics: ['Computer Networks', 'Network Types', 'Topologies', 'OSI Model'],
      concepts: ['LAN', 'WAN', 'Network Security', 'TCP/IP']
    };
    
    console.log('\n=== Generating Questions ===');
    
    const llmProvider = LLM.getDefaultProvider();
    
    const config = {
      bloomLevels: ['UNDERSTAND', 'APPLY'],
      questionTypes: ['STRAIGHTFORWARD', 'PROBLEM_BASED'],
      difficultyLevels: ['MEDIUM'],
      questionsPerSection: 3,
      unit: 1,
      courseContext: '212CSE2301 - Computer Networks'
    };
    
    const questions = await llmProvider.generateQuestions([mockSection], config);
    
    console.log(`\n=== Generated ${questions.length} Questions ===`);
    
    questions.forEach((q, index) => {
      console.log(`\n${index + 1}. QUESTION:`);
      console.log(`   ${q.question}`);
      console.log(`   Type: ${q.questionType} | Marks: ${q.marks} | Bloom: ${q.bloomLevel}`);
      console.log(`   Topic: ${q.topic}`);
      console.log(`   ANSWER:`);
      console.log(`   ${q.answer}`);
      console.log(`   ---`);
    });
    
    // Validate questions
    console.log('\n=== Question Validation ===');
    let validQuestions = 0;
    questions.forEach((q, index) => {
      const hasRealContent = !q.question.includes('discussed in') && 
                            !q.question.includes('concept discussed') &&
                            !q.answer.includes('Sample answer') &&
                            q.answer.length > 20;
      
      if (hasRealContent) {
        validQuestions++;
        console.log(`✅ Question ${index + 1}: Valid content-based question`);
      } else {
        console.log(`❌ Question ${index + 1}: Generic or insufficient content`);
      }
    });
    
    console.log(`\nSummary: ${validQuestions}/${questions.length} questions have real content`);
    
  } catch (error) {
    console.error('Error testing question generation:', error);
  }
}

testQuestionGeneration();
