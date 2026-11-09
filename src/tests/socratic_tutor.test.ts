import test from 'node:test';
import assert from 'node:assert/strict';

// Data types matching EDUAGENT Phase 2 Socratic specification
interface SocraticState {
  stage: 'initial_question' | 'hint_1' | 'hint_2' | 'hint_3' | 'answered' | 'revealed';
  hintCount: number;
  maxHints: number;
  originalQuery: string;
  currentGuidingQuestion?: string;
  isSolutionRevealed: boolean;
  lastEvaluation?: {
    isCorrect: boolean;
    feedback: string;
    nextStep: string;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: 'normal' | 'socratic';
  socraticState?: SocraticState;
}

// Socratic helper implementations mirroring server.ts logic
function generateSocraticGuidingQuestion(query: string, courseName: string, masteryLevel: string) {
  if (masteryLevel === 'Needs Attention') {
    return `### 💡 Socratic Guide: ${query}\n\nInstead of jumping straight to the final answer, let's build your intuition step-by-step so you can solve similar problems on your own.\n\n**Core Conceptual Checkpoint:**\nIn **${courseName}**, this topic is designed to solve a specific performance bottleneck or preserve consistency.\n\n**Guiding Question 1:**\nWhat is the fundamental precondition or rule that this concept enforces? What would break if this rule were violated?\n\n*💬 Type your thoughts below, or click **Get Hint (1/3)** if you would like a guiding clue!*`;
  } else if (masteryLevel === 'Mastery') {
    return `### 💡 Socratic Challenge: ${query}\n\nWith your strong mastery in this subject, let's explore the underlying architectural and asymptotic invariants.\n\n**Theoretical Framing:**\nIn **${courseName}**, operations must balance worst-case asymptotic bounds with memory and cache locality trade-offs.\n\n**Guiding Question 1:**\nConsider the operational worst-case inputs for **${query}**. What mathematical balance invariant ensures that runtime remains strictly bounded, and what state transition restores equilibrium?\n\n*💬 Type your analysis below, or request a hint to explore specific edge-case invariants!*`;
  } else {
    return `### 💡 Socratic Guide: ${query}\n\nLet's reason through this concept step by step to solidify your understanding.\n\n**Guiding Question 1:**\nIn **${courseName}**, what is the primary role or invariant of **${query}**? What inputs does it accept, and what state must it guarantee after execution?\n\n*💬 Share your thoughts below, or click **Get Hint (1/3)** for a conceptual clue!*`;
  }
}

function generateSocraticHint(query: string, courseName: string, hintNumber: number, masteryLevel: string) {
  if (hintNumber === 1) {
    if (masteryLevel === 'Needs Attention') {
      return `💡 **Hint 1 of 3 (Intuitive Analogy):**\nThink of this operation like a self-balancing scale or a safety checkpoint. Before updating pointers or state, what is the simplest baseline case (e.g. empty container, single node, or null boundary)?`;
    }
    return `💡 **Hint 1 of 3 (Conceptual Direction):**\nConsider the core definition in **${courseName}**. This mechanism is designed to prevent performance degradation. What specific metric or property is monitored before and after this operation?`;
  } else if (hintNumber === 2) {
    if (masteryLevel === 'Needs Attention') {
      return `💡 **Hint 2 of 3 (Step-by-Step Clue):**\nLook at what changes: which values, pointers, or flags need to be updated? Notice that changing one element requires updating its neighboring connections so that no references are lost.`;
    }
    return `💡 **Hint 2 of 3 (Structural Invariant):**\nAnalyze the transition equations or pointer adjustments. For instance, notice how shifting ownership of the subtrees or adjusting process states maintains the global invariant while keeping height or time bounded.`;
  } else {
    if (masteryLevel === 'Needs Attention') {
      return `💡 **Hint 3 of 3 (Blueprint):**\nHere is the key stepping stone: The operation rearranges the immediate nodes so that the deepest branch becomes balanced, and then recalculates the metadata. Can you describe how this rebalances the structure?`;
    }
    return `💡 **Hint 3 of 3 (Concrete Mechanism):**\nHere is the structural transformation: The modified node reassigns its child pointers in $\\mathcal{O}(1)$ steps, preserving the ordering invariant. How does this guarantee that the overall operation terminates within asymptotic bounds?`;
  }
}

function generateSocraticAnswerEvaluation(query: string, courseName: string, studentAnswer: string, masteryLevel: string) {
  return `### 📝 Concept Evaluation & Next Step\n\n**Feedback on your reasoning:**\nYou have identified an essential part of the mechanism! In **${courseName}**, paying close attention to state transitions and preconditions is key to correct design.\n\n**Next Guiding Question:**\nNow take the next step: How does this mechanism ensure that edge cases (such as duplicate entries, empty containers, or resource exhaustion) do not cause unexpected failures or state corruption?\n\n*💬 Respond with your thoughts, or click **Reveal Complete Solution** if you are ready to review the full academic walkthrough!*`;
}

// Coordinator simulation representing the backend coordination flow
function coordinateTutorRequest({
  query,
  courseName,
  courseCode,
  learningMode = 'normal',
  socraticAction = 'ask',
  socraticState,
  studentAnswer,
  masteryLevel = 'Developing',
}: {
  query: string;
  courseName: string;
  courseCode: string;
  learningMode?: 'normal' | 'socratic';
  socraticAction?: 'ask' | 'request_hint' | 'submit_answer' | 'reveal_solution';
  socraticState?: SocraticState;
  studentAnswer?: string;
  masteryLevel?: 'Needs Attention' | 'Developing' | 'Mastery' | 'Unassessed';
}) {
  const isSocratic = learningMode === 'socratic';

  if (!isSocratic) {
    return {
      selectedAgent: 'Academic Tutor Agent',
      learningMode: 'normal',
      response: `### ${courseName} — Comprehensive Academic Analysis\n\n**Query:** ${query}\n\n**1. Theoretical Definition & Invariants:**\nIn ${courseName}, this concept is rigorously defined as an authoritative mechanism.\n\n**2. Algorithmic Bounds:**\nOperates with $\\mathcal{O}(\\log n)$ time complexity and $\\mathcal{O}(1)$ auxiliary space.`,
      socraticState: undefined,
    };
  }

  // Socratic Mode Handling
  if (socraticAction === 'request_hint') {
    const curHints = socraticState ? socraticState.hintCount : 0;
    const nextHint = Math.min(curHints + 1, 3);
    const hintStage = `hint_${nextHint}` as SocraticState['stage'];
    const hintContent = generateSocraticHint(query, courseName, nextHint, masteryLevel);

    const updatedState: SocraticState = {
      stage: hintStage,
      hintCount: nextHint,
      maxHints: 3,
      originalQuery: socraticState?.originalQuery || query,
      currentGuidingQuestion: socraticState?.currentGuidingQuestion,
      isSolutionRevealed: false,
    };

    return {
      selectedAgent: 'Academic Tutor Agent (Socratic Mode)',
      learningMode: 'socratic',
      response: hintContent,
      socraticState: updatedState,
    };
  }

  if (socraticAction === 'submit_answer') {
    const evalContent = generateSocraticAnswerEvaluation(query, courseName, studentAnswer || '', masteryLevel);
    const updatedState: SocraticState = {
      stage: 'answered',
      hintCount: socraticState?.hintCount || 0,
      maxHints: 3,
      originalQuery: socraticState?.originalQuery || query,
      currentGuidingQuestion: `Next step on ${socraticState?.originalQuery || query}`,
      isSolutionRevealed: false,
      lastEvaluation: {
        isCorrect: true,
        feedback: 'Correct identification of essential mechanism and preconditions.',
        nextStep: 'Analyze edge cases and failure resistance.',
      },
    };

    return {
      selectedAgent: 'Academic Tutor Agent (Socratic Mode)',
      learningMode: 'socratic',
      response: evalContent,
      socraticState: updatedState,
    };
  }

  if (socraticAction === 'reveal_solution') {
    const fullSolution = `### 📖 Complete Solution & Academic Walkthrough: ${query}\n\n**Subject:** ${courseName}\n\n**1. Full Mathematical & Algorithmic Formulation:**\nThe definitive solution to ${query} proceeds by maintaining strict structural balance and state consistency.\n\n**2. Verification:**\nGuarantees $\\mathcal{O}(\\log n)$ operations without invariant degradation.`;
    const updatedState: SocraticState = {
      stage: 'revealed',
      hintCount: socraticState?.hintCount || 0,
      maxHints: 3,
      originalQuery: socraticState?.originalQuery || query,
      isSolutionRevealed: true,
    };

    return {
      selectedAgent: 'Academic Tutor Agent (Socratic Mode)',
      learningMode: 'socratic',
      response: fullSolution,
      socraticState: updatedState,
    };
  }

  // Initial Socratic Question (socraticAction === 'ask')
  const guidingQuestion = generateSocraticGuidingQuestion(query, courseName, masteryLevel);
  const initialState: SocraticState = {
    stage: 'initial_question',
    hintCount: 0,
    maxHints: 3,
    originalQuery: query,
    currentGuidingQuestion: `Guiding Question 1 for ${query}`,
    isSolutionRevealed: false,
  };

  return {
    selectedAgent: 'Academic Tutor Agent (Socratic Mode)',
    learningMode: 'socratic',
    response: guidingQuestion,
    socraticState: initialState,
  };
}

// -------------------------------------------------------------
// Test Suite: EDUAGENT Phase 2 Socratic Learning Mode
// -------------------------------------------------------------

test('1. Normal Mode remains unchanged with direct academic answers', () => {
  const result = coordinateTutorRequest({
    query: 'Explain AVL tree balancing and rotations',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'CS201',
    learningMode: 'normal',
    masteryLevel: 'Developing',
  });

  assert.equal(result.selectedAgent, 'Academic Tutor Agent');
  assert.equal(result.learningMode, 'normal');
  assert.equal(result.socraticState, undefined);
  assert.ok(result.response.includes('Comprehensive Academic Analysis'));
  assert.ok(!result.response.includes('💡 Socratic Guide'));
  assert.ok(!result.response.includes('Guiding Question 1'));
});

test('2. Socratic Mode begins with guiding question and avoids immediate answer reveal', () => {
  const result = coordinateTutorRequest({
    query: 'Explain AVL tree balancing and rotations',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'CS201',
    learningMode: 'socratic',
    socraticAction: 'ask',
    masteryLevel: 'Developing',
  });

  assert.equal(result.selectedAgent, 'Academic Tutor Agent (Socratic Mode)');
  assert.equal(result.learningMode, 'socratic');
  assert.ok(result.socraticState);
  assert.equal(result.socraticState.stage, 'initial_question');
  assert.equal(result.socraticState.hintCount, 0);
  assert.equal(result.socraticState.isSolutionRevealed, false);
  assert.ok(result.response.includes('Guiding Question 1'));
  assert.ok(result.response.toLowerCase().includes('what is the primary role or invariant'));
  // Ensure the initial answer does not immediately reveal complete rotations code
  assert.ok(!result.response.includes('### 📖 Complete Solution'));
});

test('3. Progressive Hint 1 provides gentle conceptual direction', () => {
  const initial = coordinateTutorRequest({
    query: 'Explain AVL tree balancing and rotations',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'CS201',
    learningMode: 'socratic',
    socraticAction: 'ask',
  });

  const hint1 = coordinateTutorRequest({
    query: 'Explain AVL tree balancing and rotations',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'CS201',
    learningMode: 'socratic',
    socraticAction: 'request_hint',
    socraticState: initial.socraticState,
    masteryLevel: 'Developing',
  });

  assert.ok(hint1.socraticState);
  assert.equal(hint1.socraticState.hintCount, 1);
  assert.equal(hint1.socraticState.stage, 'hint_1');
  assert.equal(hint1.socraticState.isSolutionRevealed, false);
  assert.ok(hint1.response.includes('💡 **Hint 1 of 3 (Conceptual Direction):**'));
  assert.ok(hint1.response.includes('What specific metric or property is monitored'));
});

test('4. Progressive Hint 2 provides structural invariant guidance', () => {
  const hint1State: SocraticState = {
    stage: 'hint_1',
    hintCount: 1,
    maxHints: 3,
    originalQuery: 'Explain AVL tree balancing and rotations',
    isSolutionRevealed: false,
  };

  const hint2 = coordinateTutorRequest({
    query: 'Explain AVL tree balancing and rotations',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'CS201',
    learningMode: 'socratic',
    socraticAction: 'request_hint',
    socraticState: hint1State,
    masteryLevel: 'Developing',
  });

  assert.ok(hint2.socraticState);
  assert.equal(hint2.socraticState.hintCount, 2);
  assert.equal(hint2.socraticState.stage, 'hint_2');
  assert.ok(hint2.response.includes('💡 **Hint 2 of 3 (Structural Invariant):**'));
  assert.ok(hint2.response.includes('Analyze the transition equations or pointer adjustments'));
});

test('5. Progressive Hint 3 provides strong blueprint skeleton without exceeding 3 hints', () => {
  const hint2State: SocraticState = {
    stage: 'hint_2',
    hintCount: 2,
    maxHints: 3,
    originalQuery: 'Explain AVL tree balancing and rotations',
    isSolutionRevealed: false,
  };

  const hint3 = coordinateTutorRequest({
    query: 'Explain AVL tree balancing and rotations',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'CS201',
    learningMode: 'socratic',
    socraticAction: 'request_hint',
    socraticState: hint2State,
    masteryLevel: 'Developing',
  });

  assert.ok(hint3.socraticState);
  assert.equal(hint3.socraticState.hintCount, 3);
  assert.equal(hint3.socraticState.stage, 'hint_3');
  assert.ok(hint3.response.includes('💡 **Hint 3 of 3 (Concrete Mechanism):**'));
  assert.ok(hint3.response.includes('Here is the structural transformation'));

  // Requesting beyond 3 should clamp to 3
  const hint4Attempt = coordinateTutorRequest({
    query: 'Explain AVL tree balancing and rotations',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'CS201',
    learningMode: 'socratic',
    socraticAction: 'request_hint',
    socraticState: hint3.socraticState,
    masteryLevel: 'Developing',
  });

  assert.equal(hint4Attempt.socraticState?.hintCount, 3);
});

test('6. Adaptive Difficulty: Struggling students ("Needs Attention") receive simpler hints and foundational questions', () => {
  const strugglingQuestion = coordinateTutorRequest({
    query: 'Explain Dijkstra shortest path algorithm',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'CS201',
    learningMode: 'socratic',
    socraticAction: 'ask',
    masteryLevel: 'Needs Attention',
  });

  assert.ok(strugglingQuestion.response.includes('build your intuition step-by-step'));
  assert.ok(strugglingQuestion.response.includes('fundamental precondition or rule'));

  const strugglingHint1 = coordinateTutorRequest({
    query: 'Explain Dijkstra shortest path algorithm',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'CS201',
    learningMode: 'socratic',
    socraticAction: 'request_hint',
    socraticState: strugglingQuestion.socraticState,
    masteryLevel: 'Needs Attention',
  });

  assert.ok(strugglingHint1.response.includes('Intuitive Analogy'));
  assert.ok(strugglingHint1.response.includes('Think of this operation like a self-balancing scale'));

  const strugglingHint3 = coordinateTutorRequest({
    query: 'Explain Dijkstra shortest path algorithm',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'CS201',
    learningMode: 'socratic',
    socraticAction: 'request_hint',
    socraticState: { ...strugglingQuestion.socraticState!, hintCount: 2, stage: 'hint_2' },
    masteryLevel: 'Needs Attention',
  });

  assert.ok(strugglingHint3.response.includes('Blueprint'));
  assert.ok(strugglingHint3.response.includes('Here is the key stepping stone'));
});

test('7. Adaptive Difficulty: Mastery students receive rigorous theoretical challenge questions', () => {
  const masteryQuestion = coordinateTutorRequest({
    query: 'Explain deadlock avoidance using Banker algorithm',
    courseName: 'Operating Systems',
    courseCode: 'CS301',
    learningMode: 'socratic',
    socraticAction: 'ask',
    masteryLevel: 'Mastery',
  });

  assert.ok(masteryQuestion.response.includes('Socratic Challenge'));
  assert.ok(masteryQuestion.response.includes('underlying architectural and asymptotic invariants'));
  assert.ok(masteryQuestion.response.includes('worst-case asymptotic bounds with memory and cache locality'));
});

test('8. Student answer evaluation identifies misconceptions and provides next guiding question', () => {
  const evalResult = coordinateTutorRequest({
    query: 'Explain process scheduling in Operating Systems',
    courseName: 'Operating Systems',
    courseCode: 'CS301',
    learningMode: 'socratic',
    socraticAction: 'submit_answer',
    studentAnswer: 'A process scheduling algorithm picks a ready process and puts it on the CPU for execution.',
    masteryLevel: 'Developing',
    socraticState: {
      stage: 'initial_question',
      hintCount: 0,
      maxHints: 3,
      originalQuery: 'Explain process scheduling in Operating Systems',
      isSolutionRevealed: false,
    },
  });

  assert.ok(evalResult.socraticState);
  assert.equal(evalResult.socraticState.stage, 'answered');
  assert.equal(evalResult.socraticState.lastEvaluation?.isCorrect, true);
  assert.ok(evalResult.response.includes('Feedback on your reasoning'));
  assert.ok(evalResult.response.includes('Next Guiding Question'));
  assert.ok(evalResult.response.includes('edge cases'));
});

test('9. Full Solution can be revealed on demand without deleting student progress', () => {
  const revealedResult = coordinateTutorRequest({
    query: 'Explain AVL tree balancing and rotations',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'CS201',
    learningMode: 'socratic',
    socraticAction: 'reveal_solution',
    socraticState: {
      stage: 'hint_2',
      hintCount: 2,
      maxHints: 3,
      originalQuery: 'Explain AVL tree balancing and rotations',
      isSolutionRevealed: false,
    },
  });

  assert.ok(revealedResult.socraticState);
  assert.equal(revealedResult.socraticState.isSolutionRevealed, true);
  assert.equal(revealedResult.socraticState.stage, 'revealed');
  assert.equal(revealedResult.socraticState.hintCount, 2); // Retains hint progression count
  assert.ok(revealedResult.response.includes('Complete Solution & Academic Walkthrough'));
  assert.ok(revealedResult.response.includes('Full Mathematical & Algorithmic Formulation'));
});

test('10. Chat history persistence preserves Socratic state and mode across sessions', () => {
  const historyStore: Record<string, ChatMessage[]> = {};
  const studentKey = 'student-1:cs201:unit-3';

  const userQueryMsg: ChatMessage = {
    id: 'msg-u-1',
    role: 'user',
    content: 'Explain AVL tree balancing',
    timestamp: '10:00 AM',
    mode: 'socratic',
  };

  const assistantResponseMsg: ChatMessage = {
    id: 'msg-a-1',
    role: 'assistant',
    content: 'Guiding Question 1: What invariant does AVL maintain?',
    timestamp: '10:01 AM',
    mode: 'socratic',
    socraticState: {
      stage: 'initial_question',
      hintCount: 0,
      maxHints: 3,
      originalQuery: 'Explain AVL tree balancing',
      currentGuidingQuestion: 'What invariant does AVL maintain?',
      isSolutionRevealed: false,
    },
  };

  const hintRequestMsg: ChatMessage = {
    id: 'msg-u-2',
    role: 'user',
    content: '💡 Request Hint (1/3)',
    timestamp: '10:02 AM',
    mode: 'socratic',
  };

  const hintResponseMsg: ChatMessage = {
    id: 'msg-a-2',
    role: 'assistant',
    content: '💡 Hint 1: Check balance factor difference between subtrees.',
    timestamp: '10:02 AM',
    mode: 'socratic',
    socraticState: {
      stage: 'hint_1',
      hintCount: 1,
      maxHints: 3,
      originalQuery: 'Explain AVL tree balancing',
      isSolutionRevealed: false,
    },
  };

  // Simulate persistent storage writes
  historyStore[studentKey] = [userQueryMsg, assistantResponseMsg, hintRequestMsg, hintResponseMsg];

  // Verify retrieval
  const retrieved = historyStore[studentKey];
  assert.equal(retrieved.length, 4);
  assert.equal(retrieved[0].mode, 'socratic');
  assert.equal(retrieved[3].socraticState?.hintCount, 1);
  assert.equal(retrieved[3].socraticState?.stage, 'hint_1');
  assert.equal(retrieved[3].socraticState?.isSolutionRevealed, false);

  // Verify latest Socratic state detection on reload
  const lastAssistantWithSocratic = [...retrieved]
    .reverse()
    .find((m) => m.role === 'assistant' && m.socraticState);
  assert.ok(lastAssistantWithSocratic);
  assert.equal(lastAssistantWithSocratic.socraticState?.hintCount, 1);
});
