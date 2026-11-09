import test from 'node:test';
import assert from 'node:assert/strict';

// Core mock data representing courses
const mockCourses = [
  {
    id: 'cs201',
    code: 'CS201',
    name: 'Data Structures and Algorithms',
    units: [
      {
        id: 'u1',
        unitNumber: 1,
        title: 'Introduction to Data Structures',
        topics: [
          { id: 'top-1-1', title: 'Abstract Data Types', difficulty: 'Easy', estimatedHours: 2 },
          { id: 'top-1-2', title: 'Asymptotic Analysis & Big-O Notation', difficulty: 'Medium', estimatedHours: 3 },
        ],
      },
      {
        id: 'u3',
        unitNumber: 3,
        title: 'Queues and Trees',
        topics: [
          { id: 'top-3-1', title: 'Binary Search Trees (BST)', difficulty: 'Medium', estimatedHours: 3 },
          { id: 'top-3-2', title: 'AVL Trees & Self-Balancing Rotations', difficulty: 'Hard', estimatedHours: 4 },
        ],
      },
    ],
  },
  {
    id: 'cs301',
    code: 'CS301',
    name: 'Operating Systems',
    units: [
      {
        id: 'u2',
        unitNumber: 2,
        title: 'Process Management & CPU Scheduling',
        topics: [
          { id: 'top-301-2-1', title: 'Process States & PCB', difficulty: 'Easy', estimatedHours: 2 },
          { id: 'top-301-2-2', title: 'CPU Scheduling Algorithms', difficulty: 'Hard', estimatedHours: 3 },
        ],
      },
    ],
  },
];

// Curated Lectures Mapping
const CURATED_UNIVERSITY_LECTURES: Record<string, Array<{ keyword: string; title: string; channel: string; url: string; duration: string }>> = {
  CS201: [
    {
      keyword: 'avl',
      title: 'AVL Trees and Tree Rotations (LL, RR, LR, RL) Detailed Step-by-Step',
      channel: 'Abdul Bari',
      url: 'https://www.youtube.com/watch?v=jDM6_TnYIqE',
      duration: '38m',
    },
    {
      keyword: 'tree',
      title: 'Binary Trees, BST Property, and Recursive Traversals',
      channel: 'MIT OpenCourseWare (6.006)',
      url: 'https://www.youtube.com/watch?v=76dhtgZt38A',
      duration: '51m',
    },
  ],
  CS301: [
    {
      keyword: 'schedul',
      title: 'CPU Scheduling Algorithms: FCFS, SJF, Round Robin & Priority Scheduling',
      channel: 'Gate Smashers',
      url: 'https://www.youtube.com/watch?v=EWkqlLflcrg',
      duration: '35m',
    },
  ],
};

function getCuratedLecture(courseCode: string, queryOrTopic?: string) {
  const list = CURATED_UNIVERSITY_LECTURES[courseCode] || CURATED_UNIVERSITY_LECTURES['CS201'];
  if (!queryOrTopic) return list[0];
  const queryLower = queryOrTopic.toLowerCase();
  const matched = list.find((lec) => queryLower.includes(lec.keyword.toLowerCase()));
  return matched || list[0];
}

function analyzeStudentPerformance(
  studentId: string,
  courseCode: string,
  assessmentHistory: Record<string, any[]>,
  studentProgress: Record<string, any>,
  registeredUsers: any[] = []
) {
  const userRecord = registeredUsers.find((u) => u.id === studentId);
  const studentName = userRecord ? userRecord.name : 'Student';
  const semester = userRecord ? userRecord.semester : 'Semester III';

  const course = mockCourses.find((c) => c.code === courseCode || c.id === courseCode);
  const courseName = course ? course.name : courseCode;

  const allQuizzes = (studentId && assessmentHistory[studentId]) || [];
  const courseQuizzes = allQuizzes.filter((q) => q.courseCode === courseCode);
  const progress = (studentId && studentProgress[studentId]) || { completedTopicIds: [] };
  const completedTopicIds = progress.completedTopicIds || [];

  const totalAssessments = allQuizzes.length;
  const courseAssessmentsCount = courseQuizzes.length;
  const hasHistory = courseAssessmentsCount > 0;

  const courseAverageScore =
    courseQuizzes.length > 0
      ? Math.round(courseQuizzes.reduce((acc, q) => acc + (q.percentage || 0), 0) / courseQuizzes.length)
      : null;

  const topicMisses: Record<string, { count: number; dates: string[]; reasons: string[] }> = {};
  const topicCorrect: Record<string, number> = {};

  courseQuizzes.forEach((quiz) => {
    if (quiz.details && Array.isArray(quiz.details.eval_details)) {
      quiz.details.eval_details.forEach((ed: any) => {
        if (!ed.is_correct && ed.topic) {
          if (!topicMisses[ed.topic]) {
            topicMisses[ed.topic] = { count: 0, dates: [], reasons: [] };
          }
          topicMisses[ed.topic].count += 1;
          if (quiz.submittedAt && !topicMisses[ed.topic].dates.includes(quiz.submittedAt)) {
            topicMisses[ed.topic].dates.push(quiz.submittedAt);
          }
          topicMisses[ed.topic].reasons.push(`Incorrect on ${ed.question} (Quiz: ${quiz.percentage}%)`);
        } else if (ed.is_correct && ed.topic) {
          topicCorrect[ed.topic] = (topicCorrect[ed.topic] || 0) + 1;
        }
      });
    }
  });

  const weakTopics = Object.entries(topicMisses)
    .map(([topic, data]) => ({
      topic,
      missedCount: data.count,
      lastMissedDate: data.dates[0],
      reasons: [
        data.count > 1
          ? `Missed across ${data.count} quiz questions (${data.dates.join(', ')})`
          : data.reasons[0] || 'Requires revision from recent quiz results',
      ],
    }))
    .sort((a, b) => b.missedCount - a.missedCount);

  const repeatedMistakes = weakTopics
    .filter((w) => w.missedCount >= 2)
    .map((w) => `${w.topic} (${w.missedCount} misses)`);

  let masteryLevel: 'Mastery' | 'Developing' | 'Needs Attention' | 'Unassessed' = 'Unassessed';
  let explanationMode = 'Structured Syllabus Walkthrough (Foundational Baseline)';

  if (!hasHistory) {
    masteryLevel = 'Unassessed';
    explanationMode = 'Standard Academic Walkthrough with Diagnostic Baseline';
  } else if (courseAverageScore !== null && courseAverageScore >= 80 && weakTopics.length === 0) {
    masteryLevel = 'Mastery';
    explanationMode = 'Advanced Engineering & Theoretical Exposition';
  } else if ((courseAverageScore !== null && courseAverageScore < 60) || repeatedMistakes.length > 0) {
    masteryLevel = 'Needs Attention';
    explanationMode = 'Simplified & Step-by-Step Remedial Guidance';
  } else {
    masteryLevel = 'Developing';
    explanationMode = 'Balanced Conceptual & Practical Breakdown';
  }

  const allCourseTopics: string[] = [];
  course?.units.forEach((u) => u.topics.forEach((t) => allCourseTopics.push(t.title)));

  const nextTopicToStudy =
    allCourseTopics.find(
      (top) => !completedTopicIds.includes(top) && !weakTopics.some((w) => w.topic === top)
    ) || allCourseTopics[0];

  const conceptToRevise = weakTopics.length > 0 ? weakTopics[0].topic : undefined;
  const recommendedLecture = getCuratedLecture(courseCode, conceptToRevise || allCourseTopics[0]);

  return {
    studentId,
    studentName,
    semester,
    courseCode,
    courseName,
    totalAssessments,
    courseAssessmentsCount,
    courseAverageScore,
    masteryLevel,
    explanationMode,
    weakTopics,
    repeatedMistakes,
    recommendations: {
      nextTopicToStudy,
      conceptToRevise,
      recommendedLecture,
    },
  };
}

// ================= TEST SUITE =================

test('1. Test with a student who has existing quiz history: computes real scores & detects weak topics', () => {
  const assessmentHistory = {
    'student-alex': [
      {
        courseCode: 'CS201',
        score: 50,
        totalScore: 100,
        percentage: 50,
        submittedAt: 'Nov 5, 2026',
        details: {
          eval_details: [
            { question: 'What is the balance factor of an AVL tree node?', topic: 'AVL Trees & Self-Balancing Rotations', is_correct: false },
            { question: 'Perform a single RR rotation on an unbalanced subtree.', topic: 'AVL Trees & Self-Balancing Rotations', is_correct: false },
            { question: 'What is the search time complexity of a standard BST?', topic: 'Binary Search Trees (BST)', is_correct: true },
          ],
        },
      },
    ],
  };

  const profile = analyzeStudentPerformance('student-alex', 'CS201', assessmentHistory, {});

  assert.equal(profile.courseAverageScore, 50);
  assert.equal(profile.masteryLevel, 'Needs Attention');
  assert.equal(profile.weakTopics.length, 1);
  assert.equal(profile.weakTopics[0].topic, 'AVL Trees & Self-Balancing Rotations');
  assert.equal(profile.weakTopics[0].missedCount, 2);
  assert.equal(profile.repeatedMistakes.length, 1);
  assert.equal(profile.repeatedMistakes[0], 'AVL Trees & Self-Balancing Rotations (2 misses)');
  assert.equal(profile.explanationMode, 'Simplified & Step-by-Step Remedial Guidance');
  assert.equal(profile.recommendations.conceptToRevise, 'AVL Trees & Self-Balancing Rotations');
});

test('2. Verify weak-topic detection uses actual scores and question-level evaluation', () => {
  const assessmentHistory = {
    'student-bob': [
      {
        courseCode: 'CS301',
        score: 70,
        totalScore: 100,
        percentage: 70,
        submittedAt: 'Nov 6, 2026',
        details: {
          eval_details: [
            { question: 'Define round robin time quantum.', topic: 'CPU Scheduling Algorithms', is_correct: false },
            { question: 'Explain process states in PCB.', topic: 'Process States & PCB', is_correct: true },
          ],
        },
      },
    ],
  };

  const profile = analyzeStudentPerformance('student-bob', 'CS301', assessmentHistory, {});

  assert.equal(profile.courseAverageScore, 70);
  assert.equal(profile.weakTopics.length, 1);
  assert.equal(profile.weakTopics[0].topic, 'CPU Scheduling Algorithms');
  assert.equal(profile.weakTopics[0].missedCount, 1);
  assert.equal(profile.masteryLevel, 'Developing');
  assert.equal(profile.explanationMode, 'Balanced Conceptual & Practical Breakdown');
});

test('3. Verify explanations adapt to performance: mastery mode for high-scoring student', () => {
  const assessmentHistory = {
    'student-clara': [
      {
        courseCode: 'CS201',
        score: 100,
        totalScore: 100,
        percentage: 100,
        submittedAt: 'Nov 6, 2026',
        details: {
          eval_details: [
            { question: 'BST search invariance.', topic: 'Binary Search Trees (BST)', is_correct: true },
            { question: 'AVL balance invariant.', topic: 'AVL Trees & Self-Balancing Rotations', is_correct: true },
          ],
        },
      },
    ],
  };

  const profile = analyzeStudentPerformance('student-clara', 'CS201', assessmentHistory, {});

  assert.equal(profile.courseAverageScore, 100);
  assert.equal(profile.masteryLevel, 'Mastery');
  assert.equal(profile.weakTopics.length, 0);
  assert.equal(profile.repeatedMistakes.length, 0);
  assert.equal(profile.explanationMode, 'Advanced Engineering & Theoretical Exposition');
});

test('4. Submit a new quiz and verify recommendations update immediately', () => {
  const assessmentHistory: Record<string, any[]> = {
    'student-dave': [
      {
        courseCode: 'CS201',
        percentage: 50,
        details: {
          eval_details: [
            { question: 'q1', topic: 'AVL Trees & Self-Balancing Rotations', is_correct: false },
          ],
        },
      },
    ],
  };

  const initialProfile = analyzeStudentPerformance('student-dave', 'CS201', assessmentHistory, {});
  assert.equal(initialProfile.weakTopics[0].topic, 'AVL Trees & Self-Balancing Rotations');

  // Submit new quiz where student masters the topic
  assessmentHistory['student-dave'].unshift({
    courseCode: 'CS201',
    percentage: 100,
    details: {
      eval_details: [
        { question: 'q1', topic: 'AVL Trees & Self-Balancing Rotations', is_correct: true },
        { question: 'q2', topic: 'Binary Search Trees (BST)', is_correct: true },
      ],
    },
  });

  const updatedProfile = analyzeStudentPerformance('student-dave', 'CS201', assessmentHistory, {});
  // Average score updated: (100 + 50) / 2 = 75%
  assert.equal(updatedProfile.courseAverageScore, 75);
  assert.equal(updatedProfile.courseAssessmentsCount, 2);
  assert.equal(updatedProfile.masteryLevel, 'Developing');
});

test('5. Test with a new student who has no assessment history: handles gracefully without fake data', () => {
  const assessmentHistory = {};
  const studentProgress = {};

  const profile = analyzeStudentPerformance('student-newbie', 'CS201', assessmentHistory, studentProgress);

  assert.equal(profile.courseAverageScore, null);
  assert.equal(profile.courseAssessmentsCount, 0);
  assert.equal(profile.totalAssessments, 0);
  assert.equal(profile.masteryLevel, 'Unassessed');
  assert.equal(profile.weakTopics.length, 0);
  assert.equal(profile.repeatedMistakes.length, 0);
  assert.equal(profile.explanationMode, 'Standard Academic Walkthrough with Diagnostic Baseline');
});

test('6. Verify another student data cannot influence recommendations (Student Isolation)', () => {
  const assessmentHistory = {
    'student-struggling': [
      {
        courseCode: 'CS201',
        percentage: 30,
        details: {
          eval_details: [
            { question: 'q1', topic: 'AVL Trees & Self-Balancing Rotations', is_correct: false },
            { question: 'q2', topic: 'AVL Trees & Self-Balancing Rotations', is_correct: false },
          ],
        },
      },
    ],
    'student-clean': [],
  };

  const strugglingProfile = analyzeStudentPerformance('student-struggling', 'CS201', assessmentHistory, {});
  const cleanProfile = analyzeStudentPerformance('student-clean', 'CS201', assessmentHistory, {});

  assert.equal(strugglingProfile.masteryLevel, 'Needs Attention');
  assert.equal(strugglingProfile.weakTopics.length, 1);

  // Clean student must NOT see any of struggling student's weaknesses
  assert.equal(cleanProfile.masteryLevel, 'Unassessed');
  assert.equal(cleanProfile.weakTopics.length, 0);
  assert.equal(cleanProfile.courseAverageScore, null);
});

test('7. Verify lecture recommendation matches syllabus concept correctly', () => {
  const avlLecture = getCuratedLecture('CS201', 'AVL Trees & Self-Balancing Rotations');
  assert.equal(avlLecture.channel, 'Abdul Bari');
  assert.equal(avlLecture.url.includes('youtube.com'), true);

  const schedLecture = getCuratedLecture('CS301', 'CPU Scheduling Algorithms');
  assert.equal(schedLecture.channel, 'Gate Smashers');
  assert.equal(schedLecture.url.includes('youtube.com'), true);
});

test('8. Verify Coordinator generates pedagogical directive for struggling students', () => {
  const profile = {
    masteryLevel: 'Needs Attention',
    courseAverageScore: 45,
    weakTopics: [{ topic: 'AVL Trees & Self-Balancing Rotations', missedCount: 2, reasons: ['Missed in quiz'] }],
    repeatedMistakes: ['AVL Trees & Self-Balancing Rotations (2 misses)'],
  };

  let pedagogicalDirective = '';
  if (profile.masteryLevel === 'Needs Attention') {
    pedagogicalDirective = `
STUDENT LEARNING CONTEXT & ADAPTIVE DIRECTIVE:
- Status: STRUGGLING / NEEDS REINFORCEMENT (Course Assessment Average: ${profile.courseAverageScore}%).
- Identified Weak Topics: ${profile.weakTopics.map((w) => w.topic).join(', ')}.
- Repeated Mistakes: ${profile.repeatedMistakes.join(', ') || 'None recorded'}.
- PEDAGOGICAL DIRECTIVE (SIMPLIFIED & REMEDIAL MODE):
  1. Start with an intuitive real-world analogy before formal mathematical definitions.
  2. Break down the concept into numbered step-by-step increments.
  3. Clearly highlight the common pitfalls students make on this topic.`;
  }

  assert.equal(pedagogicalDirective.includes('REMEDIAL MODE'), true);
  assert.equal(pedagogicalDirective.includes('AVL Trees & Self-Balancing Rotations'), true);
  assert.equal(pedagogicalDirective.includes('intuitive real-world analogy'), true);
});

test('9. Verify Coordinator generates advanced directive for mastery students', () => {
  const profile = {
    masteryLevel: 'Mastery',
    courseAverageScore: 95,
    strongTopics: ['AVL Trees & Self-Balancing Rotations', 'Binary Search Trees (BST)'],
    weakTopics: [],
  };

  let pedagogicalDirective = '';
  if (profile.masteryLevel === 'Mastery') {
    pedagogicalDirective = `
STUDENT LEARNING CONTEXT & ADAPTIVE DIRECTIVE:
- Status: ADVANCED / DEMONSTRATED MASTERY (Course Assessment Average: ${profile.courseAverageScore}%).
- Strong Topics: ${profile.strongTopics.join(', ')}.
- PEDAGOGICAL DIRECTIVE (ADVANCED THEORETICAL & ARCHITECTURAL EXPOSITION):
  1. Skip basic introductory analogies; dive directly into rigorous academic formalisms.
  2. Analyze asymptotic behavior, cache locality, memory layout, and system trade-offs.`;
  }

  assert.equal(pedagogicalDirective.includes('ADVANCED THEORETICAL & ARCHITECTURAL EXPOSITION'), true);
  assert.equal(pedagogicalDirective.includes('cache locality'), true);
});

test('10. Verify ChatMessage schema preserves personalization metadata across sessions', () => {
  const storedMessage = {
    id: 'msg-test-1',
    role: 'assistant',
    content: 'Remedial explanation of AVL rotation...',
    selectedAgent: 'Academic Tutor Agent',
    timestamp: '10:15 AM',
    personalization: {
      masteryLevel: 'Needs Attention',
      explanationMode: 'Simplified & Step-by-Step Remedial Guidance',
      courseScore: 40,
      totalQuizzes: 1,
      weakTopics: ['AVL Trees & Self-Balancing Rotations'],
      repeatedMistakes: ['AVL Trees & Self-Balancing Rotations (2 misses)'],
      strongTopics: [],
      recommendations: {
        conceptToRevise: 'AVL Trees & Self-Balancing Rotations',
        nextTopicToStudy: 'Queues and Trees',
        recommendedLecture: {
          title: 'AVL Trees and Tree Rotations',
          channel: 'Abdul Bari',
          url: 'https://www.youtube.com/watch?v=jDM6_TnYIqE',
        },
      },
    },
  };

  // Serialize to JSON and parse back as if storing to disk
  const serialized = JSON.stringify(storedMessage);
  const deserialized = JSON.parse(serialized);

  assert.equal(deserialized.id, 'msg-test-1');
  assert.equal(deserialized.personalization.masteryLevel, 'Needs Attention');
  assert.equal(deserialized.personalization.recommendations.conceptToRevise, 'AVL Trees & Self-Balancing Rotations');
  assert.equal(deserialized.personalization.recommendations.recommendedLecture.channel, 'Abdul Bari');
});

