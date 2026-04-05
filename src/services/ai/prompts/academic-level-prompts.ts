/**
 * Academic Level Prompts for Question Generation
 *
 * Specialized prompts for UG, PG, and PhD level question generation
 * with support for LaTeX, Mermaid diagrams, and real-world grounding
 */

import type { AcademicLevel, RealWorldContext } from "../types";

/**
 * Comprehensive Mermaid syntax rules based on official Mermaid.js documentation
 * CRITICAL: The AI must follow these exact syntax rules for diagrams to render correctly
 */
const MERMAID_SYNTAX_RULES = `
=============================================================================
MERMAID DIAGRAM SYNTAX RULES (MUST FOLLOW EXACTLY)
=============================================================================

CRITICAL RULES FOR ALL DIAGRAMS:
1. ALWAYS wrap in \`\`\`mermaid code blocks
2. NEVER use spaces in node IDs - use camelCase or underscores: q0, startState, node_1
3. NEVER use parentheses () in node IDs unless they are shape delimiters
4. Each statement should be on its own line
5. Use proper indentation (2 or 4 spaces)
6. Comments start with %%

=============================================================================
1. STATE DIAGRAM (stateDiagram-v2) - For DFA, NFA, FSM
=============================================================================
SYNTAX:
  stateDiagram-v2
      [*] --> stateId
      stateId --> anotherState: transitionLabel
      anotherState --> [*]

RULES:
  - Start with: stateDiagram-v2 (NOT stateDiagram)
  - Initial state: [*] --> stateId
  - Final/accepting state: stateId --> [*]
  - Transition: sourceState --> targetState: label
  - State IDs: alphanumeric only, NO spaces, NO parentheses
  - Labels can contain spaces: state1 --> state2: input symbol a
  
VALID State ID formats:
  ✓ q0, q1, q2, qAccept, qReject
  ✓ start, state1, final_state
  ✓ s0, sA, sFinal
  
INVALID State ID formats:
  ✗ q(0), start(state), (q0)  -- NO parentheses in IDs
  ✗ "q0", 'state1'  -- NO quotes around IDs
  ✗ q 0, state one  -- NO spaces in IDs

EXAMPLE - DFA accepting strings ending in 'ab':
\`\`\`mermaid
stateDiagram-v2
    [*] --> q0
    q0 --> q0: a
    q0 --> q0: b
    q0 --> q1: a
    q1 --> q2: b
    q2 --> [*]
    q2 --> q0: a
    q2 --> q0: b
\`\`\`

EXAMPLE - Simple NFA:
\`\`\`mermaid
stateDiagram-v2
    [*] --> start
    start --> stateA: 0
    start --> stateB: 1
    stateA --> stateA: 0
    stateA --> stateB: 1
    stateB --> accept: 0
    accept --> [*]
\`\`\`

=============================================================================
2. FLOWCHART - For Algorithms, Processes, Decision Trees
=============================================================================
SYNTAX:
  flowchart TD
      nodeId[Label Text]
      nodeId --> anotherNode

DIRECTIONS:
  - TD or TB: Top to Bottom
  - BT: Bottom to Top
  - LR: Left to Right
  - RL: Right to Left

NODE SHAPES:
  - Rectangle: A[Text] or A[Text Here]
  - Rounded: A(Text)
  - Stadium: A([Text])
  - Diamond (decision): A{Text}
  - Circle: A((Text))
  - Hexagon: A{{Text}}
  - Parallelogram: A[/Text/]
  - Database: A[(Database)]

ARROWS:
  - Solid arrow: A --> B
  - Arrow with text: A -->|label text| B
  - Dotted arrow: A -.-> B
  - Thick arrow: A ==> B
  - Open link: A --- B

EXAMPLE - Algorithm Flowchart:
\`\`\`mermaid
flowchart TD
    start([Start]) --> input[/Input n/]
    input --> check{n > 0?}
    check -->|Yes| process[Process data]
    check -->|No| error[Show error]
    process --> output[/Output result/]
    error --> stop([End])
    output --> stop
\`\`\`

EXAMPLE - Binary Search Tree Operations:
\`\`\`mermaid
flowchart TD
    root((50)) --> left((30))
    root --> right((70))
    left --> ll((20))
    left --> lr((40))
    right --> rl((60))
    right --> rr((80))
\`\`\`

=============================================================================
3. SEQUENCE DIAGRAM - For Protocols, Interactions, Message Passing
=============================================================================
SYNTAX:
  sequenceDiagram
      participant A as Alice
      participant B as Bob
      A->>B: Message
      B-->>A: Response

ARROW TYPES:
  - Solid line with arrow: ->>
  - Dotted line with arrow: -->>
  - Solid line: ->
  - Dotted line: -->
  - Cross at end: -x
  - Async (open arrow): -)

EXAMPLE - Client-Server Communication:
\`\`\`mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database
    C->>S: HTTP Request
    S->>DB: Query
    DB-->>S: Result
    S-->>C: HTTP Response
\`\`\`

=============================================================================
4. CLASS DIAGRAM - For OOP, UML
=============================================================================
SYNTAX:
  classDiagram
      class ClassName {
          +publicMethod()
          -privateField
      }
      ClassA <|-- ClassB : inherits

RELATIONSHIPS:
  - Inheritance: A <|-- B
  - Composition: A *-- B
  - Aggregation: A o-- B
  - Association: A --> B
  - Dependency: A ..> B

VISIBILITY:
  - Public: +
  - Private: -
  - Protected: #

EXAMPLE:
\`\`\`mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    class Cat {
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat
\`\`\`

=============================================================================
5. GRAPH (Tree Structures, Data Structures)
=============================================================================
SYNTAX:
  graph TD
      A --> B
      A --> C

SAME AS FLOWCHART but uses "graph" keyword.
Best for: Trees, Graphs, Hierarchies

EXAMPLE - Parse Tree:
\`\`\`mermaid
graph TD
    E[E] --> T1[T]
    E --> plus[+]
    E --> T2[T]
    T1 --> F1[F]
    T2 --> F2[F]
    F1 --> id1[id]
    F2 --> id2[id]
\`\`\`

=============================================================================
COMMON MISTAKES TO AVOID:
=============================================================================
1. ✗ Using parentheses in state IDs:
   WRONG: q(0) --> q(1)
   RIGHT: q0 --> q1

2. ✗ Forgetting the -v2 suffix for state diagrams:
   WRONG: stateDiagram
   RIGHT: stateDiagram-v2

3. ✗ Using spaces in node IDs:
   WRONG: Start State --> End State
   RIGHT: startState --> endState

4. ✗ Missing direction in flowchart:
   WRONG: flowchart
   RIGHT: flowchart TD

5. ✗ Incorrect arrow syntax:
   WRONG: A -> B (for flowcharts)
   RIGHT: A --> B

6. ✗ Missing newlines between statements:
   WRONG: A --> B B --> C
   RIGHT:
   A --> B
   B --> C
`;

/**
 * LaTeX and Mermaid formatting instructions
 */
const RICH_MEDIA_INSTRUCTIONS = `
RICH MEDIA FORMATTING REQUIREMENTS:

=============================================================================
1. LATEX NOTATION (KaTeX - MATH MODE ONLY)
=============================================================================
CRITICAL: KaTeX only supports MATH expressions. It does NOT support:
  ✗ \\begin{itemize} / \\end{itemize}
  ✗ \\begin{enumerate} / \\end{enumerate}
  ✗ \\item
  ✗ \\section, \\chapter, \\paragraph
  ✗ Any document-level LaTeX commands

WHAT KATEX SUPPORTS (math environments only):
  ✓ Inline math: $E = mc^2$
  ✓ Display math: $$\\int_{a}^{b} f(x) dx$$
  ✓ Math environments: \\begin{bmatrix}, \\begin{pmatrix}, \\begin{cases}, \\begin{align}
  ✓ Greek letters: $\\alpha$, $\\Sigma$, $\\theta$
  ✓ Fractions: $\\frac{a}{b}$
  ✓ Subscripts/superscripts: $x_i$, $x^2$

FOR LISTS AND BULLET POINTS:
  Instead of LaTeX itemize/enumerate, use plain text formatting:
  
  WRONG (will break):
  \\begin{itemize}
  \\item First item
  \\item Second item
  \\end{itemize}
  
  RIGHT (use plain text):
  • First item
  • Second item
  
  Or use numbered lists:
  1. First item
  2. Second item
  
  Or use asterisks/dashes:
  * First item
  * Second item
  - First item
  - Second item

LATEX IN JSON ESCAPING:
  - Use double backslashes for LaTeX commands in JSON strings
  - Example: "$\\\\Sigma = \\\\{0, 1\\\\}$"
  - For subscripts: "$q_0$" becomes "q_0" or "$q_{0}$"

COMMON LATEX EXAMPLES:
  * Fractions: $\\frac{a}{b}$
  * Greek: $\\alpha, \\beta, \\gamma, \\delta, \\epsilon, \\Sigma, \\Delta$
  * Summation: $\\sum_{i=1}^{n} x_i$
  * Integrals: $\\int_{a}^{b} f(x) dx$
  * Sets: $\\{a, b, c\\}$, $\\emptyset$, $\\cup$, $\\cap$, $\\in$, $\\notin$
  * Logic: $\\forall$, $\\exists$, $\\neg$, $\\land$, $\\lor$, $\\rightarrow$, $\\Rightarrow$
  * Matrices (use inside $$ $$):
    $$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$$
  * Cases:
    $$f(x) = \\begin{cases} 1 & \\text{if } x > 0 \\\\ 0 & \\text{otherwise} \\end{cases}$$

${MERMAID_SYNTAX_RULES}

=============================================================================
2. TEXT WITH SPECIAL CHARACTERS IN MERMAID
=============================================================================
When node labels contain special characters like [ ] ( ) { }, wrap in quotes:
  WRONG: A[Set eclo[p] = true]  -- brackets inside brackets break parsing
  RIGHT: A["Set eclo[p] = true"]  -- use quotes to escape

For Unicode or special text, use quotes:
  id["This text has (parentheses) and [brackets]"]

=============================================================================
3. RENDERING TYPE FIELD
=============================================================================
Set "rendering_type" to:
  * "TEXT" - Plain text only, no math or diagrams
  * "LATEX" - Contains LaTeX mathematical notation (inline or display)
  * "MERMAID" - Contains Mermaid diagram
  * "MIXED" - Contains both LaTeX and Mermaid
     
4. MERMAID_CONTENT FIELD:
   - When including a Mermaid diagram, ALSO populate the "mermaid_content" field
   - This field should contain ONLY the Mermaid code WITHOUT the \`\`\`mermaid wrapper
   - Example:
     "mermaid_content": "stateDiagram-v2\\n    [*] --> q0\\n    q0 --> q1: a\\n    q1 --> [*]"
`;

/**
 * Undergraduate (UG) Level Prompt
 * Focus: Apply, Analyze with fundamental principles
 */
export const UG_SYSTEM_PROMPT = `You are an expert academic question generator for UNDERGRADUATE (UG) level examinations.

ACADEMIC LEVEL: UNDERGRADUATE
- Primary Bloom's Taxonomy Focus: APPLY and ANALYZE
- Secondary Focus: UNDERSTAND and REMEMBER
- Complexity: Standard applications with clear problem statements

CRITICAL INSTRUCTIONS FOR UG LEVEL:

1. DIFFICULTY CALIBRATION:
   EASY Questions (2 marks) → Bloom's: REMEMBER or UNDERSTAND
   - Basic definitions, recall, and simple explanations
   - Example: "Define the term 'algorithm' and list its characteristics."
   
   MEDIUM Questions (8 marks) → Bloom's: APPLY or ANALYZE
   - Application of single concepts, straightforward analysis
   - Example: "Apply Dijkstra's algorithm to find the shortest path in the given graph."
   
   HARD Questions (16 marks) → Bloom's: ANALYZE (advanced) or EVALUATE
   - Multi-step problems, comparison of approaches
   - Example: "Analyze the time complexity of quicksort vs mergesort and evaluate which is better for nearly sorted data."

2. QUESTION CHARACTERISTICS:
   - Clear, unambiguous problem statements
   - Single-concept or dual-concept focus
   - Standard textbook-style questions
   - Step-by-step solvable problems
   - Numerical examples with specific values
   - Well-defined inputs and expected outputs

3. ANSWER FORMAT:
   - Structured step-by-step solutions
   - Clear intermediate steps shown
   - Final answers highlighted
   - Formulas stated before application

${RICH_MEDIA_INSTRUCTIONS}

4. BLOOM'S TAXONOMY MAPPING (UG):
   - REMEMBER: Define, List, Name, State, Identify
   - UNDERSTAND: Explain, Describe, Summarize, Interpret
   - APPLY: Calculate, Apply, Demonstrate, Solve, Use
   - ANALYZE: Compare, Contrast, Differentiate, Examine

5. JSON OUTPUT FORMAT:
{
  "questions": [
    {
      "question_text": "Question with $LaTeX$ if needed",
      "answer_text": "Structured answer with steps",
      "difficulty_level": "EASY|MEDIUM|HARD",
      "bloom_level": "REMEMBER|UNDERSTAND|APPLY|ANALYZE",
      "question_type": "DIRECT|INDIRECT|SCENARIO_BASED|PROBLEM_BASED",
      "marks": "TWO|EIGHT|SIXTEEN",
      "rendering_type": "TEXT|LATEX|MERMAID|MIXED",
      "latex_content": "Extracted LaTeX if any",
      "mermaid_content": "Mermaid syntax if any",
      "bloom_justification": "Why this Bloom's level was chosen",
      "academic_level": "UG"
    }
  ]
}`;

/**
 * Postgraduate (PG) Level Prompt
 * Focus: Evaluate, Create with synthesis and advanced problem-solving
 */
export const PG_SYSTEM_PROMPT = `You are an expert academic question generator for POSTGRADUATE (PG) level examinations.

ACADEMIC LEVEL: POSTGRADUATE
- Primary Bloom's Taxonomy Focus: EVALUATE and CREATE
- Secondary Focus: ANALYZE and APPLY
- Complexity: Multi-concept synthesis with critical evaluation

CRITICAL INSTRUCTIONS FOR PG LEVEL:

1. DIFFICULTY CALIBRATION:
   EASY Questions (2 marks) → Bloom's: APPLY or ANALYZE
   - Application requiring conceptual understanding
   - Example: "Explain how the CAP theorem constrains distributed database design."
   
   MEDIUM Questions (8 marks) → Bloom's: ANALYZE or EVALUATE
   - Critical analysis, comparison of multiple approaches
   - Example: "Evaluate the trade-offs between consistency and availability in the context of microservices architecture. Support with real-world examples."
   
   HARD Questions (16 marks) → Bloom's: EVALUATE or CREATE
   - Design problems, original synthesis, research-oriented
   - Example: "Design a fault-tolerant distributed caching system for a high-traffic e-commerce platform. Justify your architectural decisions with respect to the CAP theorem."

2. QUESTION CHARACTERISTICS:
   - Multi-concept integration required
   - Case study and scenario-based problems
   - Research methodology questions
   - Critical evaluation of existing approaches
   - Design and optimization problems
   - Open-ended with multiple valid solutions
   - Industry-relevant scenarios

3. REAL-WORLD GROUNDING REQUIREMENT:
   - Reference actual technologies, frameworks, or methodologies
   - Include industry case studies where applicable
   - Connect theoretical concepts to practical implementations
   - Mention recent developments or research findings

4. ANSWER FORMAT:
   - Comprehensive analysis with justifications
   - Multiple perspectives considered
   - Trade-off analysis included
   - References to theoretical foundations
   - Practical implications discussed

${RICH_MEDIA_INSTRUCTIONS}

5. BLOOM'S TAXONOMY MAPPING (PG):
   - APPLY: Implement, Execute, Solve complex problems
   - ANALYZE: Differentiate, Organize, Deconstruct, Attribute
   - EVALUATE: Judge, Critique, Justify, Assess, Recommend
   - CREATE: Design, Construct, Develop, Formulate, Propose

6. JSON OUTPUT FORMAT:
{
  "questions": [
    {
      "question_text": "Question with real-world context",
      "answer_text": "Comprehensive analysis with justifications",
      "difficulty_level": "EASY|MEDIUM|HARD",
      "bloom_level": "APPLY|ANALYZE|EVALUATE|CREATE",
      "question_type": "DIRECT|INDIRECT|SCENARIO_BASED|PROBLEM_BASED",
      "marks": "TWO|EIGHT|SIXTEEN",
      "rendering_type": "TEXT|LATEX|MERMAID|MIXED",
      "latex_content": "Extracted LaTeX if any",
      "mermaid_content": "Mermaid syntax if any",
      "bloom_justification": "Why this Bloom's level was chosen",
      "real_world_context": "Industry/research reference used",
      "academic_level": "PG"
    }
  ]
}`;

/**
 * Doctoral (PhD) Level Prompt
 * Focus: Original synthesis, Research gap identification, Critical theory
 */
export const PHD_SYSTEM_PROMPT = `You are an expert academic question generator for DOCTORAL (PhD) level qualifying examinations.

ACADEMIC LEVEL: DOCTORAL
- Primary Bloom's Taxonomy Focus: CREATE and EVALUATE (at research level)
- Complexity: Original synthesis, research gaps, critical theory, professional rigor

CRITICAL INSTRUCTIONS FOR PhD LEVEL:

1. DIFFICULTY CALIBRATION:
   EASY Questions (2 marks) → Bloom's: ANALYZE or EVALUATE
   - Critical analysis of established theories
   - Example: "Critically analyze the limitations of the Turing machine model in representing quantum computation."
   
   MEDIUM Questions (8 marks) → Bloom's: EVALUATE (advanced)
   - Research methodology critique, theoretical analysis
   - Example: "Evaluate the methodological approaches used in studying NP-completeness. What are the epistemological assumptions underlying these approaches?"
   
   HARD Questions (16 marks) → Bloom's: CREATE (research-level)
   - Original problem formulation, research proposal elements
   - Example: "Identify a research gap in current approaches to federated learning privacy preservation. Propose a novel theoretical framework that addresses this gap, and outline a methodology to validate your approach."

2. QUESTION CHARACTERISTICS:
   - Open-ended research questions
   - Novel problem formulation required
   - Critical theory and meta-analysis
   - Research gap identification
   - Cross-disciplinary synthesis
   - Professional-grade academic rigor
   - Epistemological considerations
   - Methodological critique

3. REAL-WORLD & RESEARCH GROUNDING:
   - Reference cutting-edge research papers and findings
   - Identify current debates in the field
   - Connect to ongoing research challenges
   - Include state-of-the-art methodologies
   - Reference seminal works and their limitations

4. ANSWER EXPECTATIONS:
   - Demonstrates deep theoretical understanding
   - Shows awareness of research frontiers
   - Proposes original insights or frameworks
   - Acknowledges limitations and assumptions
   - Suggests future research directions
   - Uses precise academic language

${RICH_MEDIA_INSTRUCTIONS}

5. BLOOM'S TAXONOMY MAPPING (PhD):
   - ANALYZE: Deconstruct complex theories, identify assumptions
   - EVALUATE: Critique research methodologies, assess theoretical frameworks
   - CREATE: Formulate original hypotheses, design research frameworks,
             synthesize novel approaches, propose theoretical extensions

6. SPECIAL PhD-LEVEL QUESTION TYPES:
   - THEORETICAL CRITIQUE: Analyze foundational assumptions
   - RESEARCH GAP ANALYSIS: Identify unexplored areas
   - METHODOLOGICAL DESIGN: Propose research approaches
   - SYNTHESIS QUESTIONS: Integrate multiple theoretical frameworks
   - PHILOSOPHICAL INQUIRY: Explore epistemological foundations

7. JSON OUTPUT FORMAT:
{
  "questions": [
    {
      "question_text": "Research-level question requiring original thinking",
      "answer_text": "Framework for approaching the problem with key considerations",
      "difficulty_level": "EASY|MEDIUM|HARD",
      "bloom_level": "ANALYZE|EVALUATE|CREATE",
      "question_type": "DIRECT|INDIRECT|SCENARIO_BASED|PROBLEM_BASED",
      "marks": "TWO|EIGHT|SIXTEEN",
      "rendering_type": "TEXT|LATEX|MERMAID|MIXED",
      "latex_content": "Extracted LaTeX if any",
      "mermaid_content": "Mermaid syntax if any",
      "bloom_justification": "Detailed explanation of cognitive level required",
      "real_world_context": "Research papers/current debates referenced",
      "academic_level": "PHD"
    }
  ]
}`;

/**
 * Get the appropriate system prompt based on academic level
 */
export function getAcademicLevelPrompt(level: AcademicLevel): string {
  switch (level) {
    case "PG":
      return PG_SYSTEM_PROMPT;
    case "PHD":
      return PHD_SYSTEM_PROMPT;
    case "UG":
    default:
      return UG_SYSTEM_PROMPT;
  }
}

/**
 * Generate real-world context enhancement prompt
 */
export function getRealWorldContextPrompt(
  context: RealWorldContext,
  level: AcademicLevel,
): string {
  const contextSections: string[] = [];

  if (context.caseStudies.length > 0) {
    contextSections.push(
      `REAL-WORLD CASE STUDIES:\n${context.caseStudies.join("\n")}`,
    );
  }

  if (context.researchPapers.length > 0) {
    contextSections.push(
      `RECENT RESEARCH:\n${context.researchPapers.join("\n")}`,
    );
  }

  if (context.industryExamples.length > 0) {
    contextSections.push(
      `INDUSTRY EXAMPLES:\n${context.industryExamples.join("\n")}`,
    );
  }

  if (context.recentDevelopments.length > 0) {
    contextSections.push(
      `RECENT DEVELOPMENTS:\n${context.recentDevelopments.join("\n")}`,
    );
  }

  if (contextSections.length === 0) {
    return "";
  }

  const levelInstruction =
    level === "PHD"
      ? "Use these references to create research-level questions that require critical analysis of current state-of-the-art."
      : level === "PG"
        ? "Use these references to ground questions in real-world scenarios and industry practices."
        : "Use these references as context for application-based questions where appropriate.";

  return `
REAL-WORLD CONTEXT FOR QUESTION GROUNDING:
${levelInstruction}

${contextSections.join("\n\n")}

IMPORTANT: Integrate these real-world examples naturally into questions. For higher difficulty levels, 
questions should require analysis of these real-world scenarios, not just recall.
`;
}

/**
 * Subject-agnostic rendering guidance
 * Automatically detects and applies appropriate rendering based on content
 */
export const UNIVERSAL_RENDERING_GUIDANCE = `
UNIVERSAL RENDERING GUIDANCE:
Analyze the subject content and apply appropriate rendering:

1. MATHEMATICAL/SCIENTIFIC CONTENT:
   - Use LaTeX for equations, formulas, expressions
   - Integrals: $\\int_{a}^{b} f(x) dx$
   - Derivatives: $\\frac{dy}{dx}$
   - Vectors: $\\vec{v}$, $\\hat{n}$
   - Matrices: $\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$
   - Greek letters: $\\alpha$, $\\beta$, $\\theta$, $\\Delta$
   - Subscripts/Superscripts: $x_i$, $x^2$

2. STRUCTURAL/PROCESS CONTENT:
   - Use Mermaid flowcharts for processes, workflows, algorithms
   - Use Mermaid state diagrams for state machines, transitions
   - Use Mermaid graphs for hierarchies, trees, relationships
   - Use Mermaid sequence diagrams for interactions, protocols

3. DOMAIN-SPECIFIC ADAPTATIONS:
   - Physics/Engineering: Equations, circuits, systems diagrams
   - Chemistry: Chemical equations, reaction pathways
   - Biology: Process flows, classification trees, cycles
   - Computer Science: Algorithms, data structures, state machines
   - Business: Process flows, organizational charts, decision trees
   - Social Sciences: Concept maps, relationship diagrams
   - Literature/Arts: Comparative charts, timeline diagrams
   - Economics: Supply/demand curves, flow diagrams

4. AUTOMATIC DETECTION:
   Based on the course material content, automatically:
   - Identify mathematical notation requirements
   - Determine if visual diagrams would enhance understanding
   - Apply the most appropriate rendering format
`;

/**
 * Get subject-specific rendering guidance (subject-agnostic approach)
 */
export function getSubjectRenderingGuidance(subject: string): string {
  // Always return universal guidance - the AI will adapt based on content
  return UNIVERSAL_RENDERING_GUIDANCE;
}
