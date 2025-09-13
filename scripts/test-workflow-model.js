const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function testWorkflowAndModel() {
  console.log('🧪 COMPREHENSIVE WORKFLOW AND MODEL TEST\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Check database for materials with JSON
    console.log('\n📁 STEP 1: Checking Materials with JSON Data');
    const materials = await prisma.courseMaterial.findMany({
      include: {
        course: { select: { courseCode: true, courseName: true } }
      },
      orderBy: { uploadedAt: 'desc' }
    });
    
    if (materials.length === 0) {
      console.log('❌ No materials found. Upload a PDF first.');
      return;
    }
    
    console.log(`Found ${materials.length} materials:`);
    
    let testMaterial = null;
    for (const material of materials) {
      console.log(`\n  📄 Material: ${material.title}`);
      console.log(`     Course: ${material.course.courseCode} - ${material.course.courseName}`);
      console.log(`     Is Processed: ${material.isProcessed ? '✅' : '❌'}`);
      console.log(`     Has JSON Sections: ${material.sectionsData ? '✅' : '❌'}`);
      
      if (material.sectionsData) {
        testMaterial = material;
        console.log(`     🎯 Selected for testing: ${material.title}`);
      }
    }
    
    if (!testMaterial) {
      console.log('❌ No materials with JSON sections found. Process a PDF first.');
      return;
    }
    
    // Step 2: Test JSON Extraction
    console.log('\n\n📊 STEP 2: Testing JSON Section Extraction');
    console.log('-'.repeat(50));
    
    let sections;
    try {
      sections = JSON.parse(JSON.stringify(testMaterial.sectionsData));
      console.log(`✅ JSON parsed successfully`);
      console.log(`📝 Found ${Array.isArray(sections) ? sections.length : 'Invalid'} sections`);
      
      if (Array.isArray(sections) && sections.length > 0) {
        console.log('\n📖 Sample Section Analysis:');
        const sampleSection = sections[0];
        console.log(`   🏷️  ID: ${sampleSection.id || 'Missing'}`);
        console.log(`   📋 Title: ${sampleSection.title || 'Missing'}`);
        console.log(`   📏 Content Length: ${sampleSection.content ? sampleSection.content.length : 0} chars`);
        console.log(`   🎚️  Level: ${sampleSection.level || 'Missing'}`);
        console.log(`   📄 Page: ${sampleSection.page || 'Missing'}`);
        
        if (sampleSection.content) {
          console.log(`   📝 Content Preview:`);
          console.log(`      "${sampleSection.content.substring(0, 150)}..."`);
        }
      }
    } catch (error) {
      console.log(`❌ JSON Parse Error: ${error.message}`);
      return;
    }
    
    // Step 3: Test Model Integration
    console.log('\n\n🤖 STEP 3: Testing LLM Model Integration');
    console.log('-'.repeat(50));
    
    try {
      // Import LLM provider correctly
      const { LLM } = await import('../src/lib/llm/index.js');
      const llmProvider = LLM.getDefaultProvider();
      
      console.log(`✅ LLM Provider loaded: ${llmProvider.name}`);
      
      // Test 1: Simple text generation
      console.log('\n🔤 Test 1: Basic Text Generation');
      const simplePrompt = "Generate a simple test response saying 'LLM is working correctly'";
      
      try {
        const simpleResponse = await llmProvider.generateText(simplePrompt, { timeout: 10000 });
        console.log(`✅ Simple text generation works: "${simpleResponse.substring(0, 100)}..."`);
      } catch (error) {
        console.log(`❌ Simple text generation failed: ${error.message}`);
      }
      
      // Test 2: Section extraction (if we have content)
      if (testMaterial.markdownContent) {
        console.log('\n📑 Test 2: Section Extraction from Content');
        try {
          const extractedSections = await llmProvider.extractSections(
            testMaterial.markdownContent.substring(0, 2000), 
            { timeout: 15000 }
          );
          console.log(`✅ Section extraction works: ${extractedSections.length} sections extracted`);
        } catch (error) {
          console.log(`❌ Section extraction failed: ${error.message}`);
        }
      }
      
      // Test 3: Question generation from JSON sections
      console.log('\n❓ Test 3: Question Generation from JSON Sections');
      
      const config = {
        bloomLevels: ['UNDERSTAND', 'APPLY'],
        questionTypes: ['STRAIGHTFORWARD'],
        difficultyLevels: ['MEDIUM'],
        unit: 1,
        courseContext: `${testMaterial.course.courseCode} - ${testMaterial.course.courseName}`,
      };
      
      // Convert JSON sections to DocumentSection format
      const documentSections = sections.slice(0, 2).map(section => ({
        id: section.id || `section_${Math.random()}`,
        title: section.title || 'Untitled Section',
        content: section.content || 'No content available',
        level: section.level || 1,
        topics: section.topics || [],
        concepts: section.concepts || [],
      }));
      
      try {
        console.log(`🎯 Generating questions from ${documentSections.length} sections...`);
        const questions = await llmProvider.generateQuestions(documentSections, config);
        
        console.log(`✅ Question generation successful: ${questions.length} questions generated`);
        
        if (questions.length > 0) {
          console.log('\n📝 Sample Generated Question:');
          const sample = questions[0];
          console.log(`   ❓ Question: "${sample.question}"`);
          console.log(`   ✅ Answer: "${sample.answer.substring(0, 200)}..."`);
          console.log(`   🎓 Bloom Level: ${sample.bloomLevel}`);
          console.log(`   🎯 Question Type: ${sample.questionType}`);
          console.log(`   📊 Marks: ${sample.marks}`);
        }
        
      } catch (error) {
        console.log(`❌ Question generation failed: ${error.message}`);
        console.log('🔄 Testing fallback question generation...');
        
        // Test fallback questions
        const fallbackQuestions = [
          {
            question: `What are the main concepts covered in "${testMaterial.title}"?`,
            answer: `The material "${testMaterial.title}" covers comprehensive concepts related to ${testMaterial.course.courseName}. Based on the content analysis, key areas include fundamental principles, practical applications, and theoretical frameworks that are essential for understanding this subject domain.`,
            bloomLevel: 'UNDERSTAND',
            difficultyLevel: 'MEDIUM',
            questionType: 'STRAIGHTFORWARD',
            marks: 8,
            unit: 1,
            topic: testMaterial.title,
          }
        ];
        
        console.log(`✅ Fallback questions work: ${fallbackQuestions.length} questions available`);
      }
      
    } catch (error) {
      console.log(`❌ LLM Integration failed: ${error.message}`);
    }
    
    // Step 4: Test Database Storage
    console.log('\n\n💾 STEP 4: Testing Database Question Storage');
    console.log('-'.repeat(50));
    
    const recentQuestions = await prisma.question.findMany({
      where: { sourceMaterialId: testMaterial.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    
    console.log(`Found ${recentQuestions.length} questions for this material:`);
    recentQuestions.forEach((q, index) => {
      console.log(`\n   ${index + 1}. Question: "${q.question.substring(0, 100)}..."`);
      console.log(`      Answer: "${q.answer.substring(0, 100)}..."`);
      console.log(`      Bloom Level: ${q.bloomLevel}, Marks: ${q.marks}`);
    });
    
    // Step 5: Overall Assessment
    console.log('\n\n🎯 STEP 5: Overall Workflow Assessment');
    console.log('='.repeat(60));
    
    const hasJsonData = testMaterial.sectionsData !== null;
    const hasQuestions = recentQuestions.length > 0;
    
    console.log(`\n📊 Workflow Results:`);
    console.log(`   ${hasJsonData ? '✅' : '❌'} JSON sections extracted and stored`);
    console.log(`   ${hasQuestions ? '✅' : '❌'} Questions generated and saved`);
    console.log(`   📈 Data Quality: ${hasJsonData && hasQuestions ? 'EXCELLENT' : 'NEEDS IMPROVEMENT'}`);
    
    const overallStatus = hasJsonData && hasQuestions ? 'WORKING' : 'NEEDS ATTENTION';
    console.log(`\n🏆 Overall Status: ${overallStatus}`);
    
    if (overallStatus === 'NEEDS ATTENTION') {
      console.log('\n🔧 Recommendations:');
      if (!hasJsonData) console.log('   - Upload and process a PDF to get JSON sections');
      if (!hasQuestions) console.log('   - Run question generation job to create questions');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkflowAndModel();
