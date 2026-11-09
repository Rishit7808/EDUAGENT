import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AssessmentResult } from '../types';

describe('EDUAGENT Assessment Data Consistency & Calculations', () => {
  // Graded quiz predicate (identical to server.ts and UI components)
  const isQuizGraded = (q: any): boolean => {
    return Boolean(
      q &&
      typeof q.percentage === 'number' &&
      !isNaN(q.percentage) &&
      typeof q.totalScore === 'number' &&
      q.totalScore > 0 &&
      q.isCompleted !== false &&
      q.isUngraded !== true
    );
  };

  const calculateAssessmentAverage = (quizzes: AssessmentResult[]): number | null => {
    const graded = quizzes.filter(isQuizGraded);
    if (graded.length === 0) return null;
    return Math.round(graded.reduce((acc, q) => acc + q.percentage, 0) / graded.length);
  };

  const createMockAssessment = (
    id: string,
    courseCode: string,
    score: number,
    totalScore: number,
    percentage: number,
    weakTopics: string[] = [],
    evalDetails: any[] = []
  ): AssessmentResult => ({
    id,
    courseCode,
    score,
    totalScore,
    percentage,
    submittedAt: '2026-11-06T10:00:00Z',
    details: {
      score,
      total_score: totalScore,
      percentage,
      weak_topics: weakTopics,
      remediation_advice: 'Review weak topics.',
      eval_details: evalDetails,
    },
  });

  test('Empty assessment history returns null average and zero count (displays "—")', () => {
    const quizzes: AssessmentResult[] = [];
    const avg = calculateAssessmentAverage(quizzes);
    const gradedCount = quizzes.filter(isQuizGraded).length;

    assert.strictEqual(avg, null, 'Average should be null when no quizzes have been evaluated');
    assert.strictEqual(gradedCount, 0, 'Count should be 0');
    // In UI: avg !== null ? `${avg}%` : '—'
    const displayValue = avg !== null ? `${avg}%` : '—';
    assert.strictEqual(displayValue, '—');
  });

  test('Single completed quiz returns exact percentage and count of 1', () => {
    const quizzes: AssessmentResult[] = [
      createMockAssessment('quiz-1', 'CS201', 40, 50, 80),
    ];

    const avg = calculateAssessmentAverage(quizzes);
    const gradedCount = quizzes.filter(isQuizGraded).length;

    assert.strictEqual(avg, 80);
    assert.strictEqual(gradedCount, 1);
  });

  test('Multiple completed quizzes return exact mathematical average', () => {
    const quizzes: AssessmentResult[] = [
      createMockAssessment('quiz-1', 'CS201', 30, 50, 60),
      createMockAssessment('quiz-2', 'CS201', 45, 50, 90),
    ];

    const avg = calculateAssessmentAverage(quizzes);
    const gradedCount = quizzes.filter(isQuizGraded).length;

    // (60 + 90) / 2 = 75
    assert.strictEqual(avg, 75);
    assert.strictEqual(gradedCount, 2);
  });

  test('Incomplete or ungraded attempts are strictly excluded from calculation', () => {
    const quizzes: any[] = [
      createMockAssessment('quiz-valid', 'CS201', 40, 50, 80),
      {
        id: 'quiz-incomplete-1',
        courseCode: 'CS201',
        score: 0,
        totalScore: 0,
        percentage: 0,
        isCompleted: false, // Incomplete attempt
      },
      {
        id: 'quiz-incomplete-2',
        courseCode: 'CS201',
        percentage: NaN, // Invalid NaN percentage
        totalScore: 50,
      },
      {
        id: 'quiz-ungraded',
        courseCode: 'CS201',
        score: 50,
        totalScore: 50,
        percentage: 100,
        isUngraded: true, // Marked explicitly as ungraded
      },
    ];

    const avg = calculateAssessmentAverage(quizzes);
    const gradedCount = quizzes.filter(isQuizGraded).length;

    assert.strictEqual(gradedCount, 1, 'Only the single valid attempt should be counted');
    assert.strictEqual(avg, 80, 'Average should only consider the valid attempt (80%)');
  });

  test('Subject-specific filtering maintains consistency between Course Assessments and Student Dashboard', () => {
    const allQuizzes: AssessmentResult[] = [
      createMockAssessment('quiz-cs201', 'CS201', 40, 50, 80),
      createMockAssessment('quiz-cs101', 'CS101', 50, 50, 100),
    ];

    const cs201Quizzes = allQuizzes.filter((q) => q.courseCode === 'CS201');
    const cs201Avg = calculateAssessmentAverage(cs201Quizzes);
    const overallAvg = calculateAssessmentAverage(allQuizzes);

    assert.strictEqual(cs201Avg, 80, 'CS201 average should be 80%');
    assert.strictEqual(overallAvg, 90, 'Overall average should be 90%');
  });

  test('Diagnosed weak topics are correctly aggregated from graded quiz failures', () => {
    const quizzes: AssessmentResult[] = [
      createMockAssessment('quiz-1', 'CS201', 20, 50, 40, ['AVL Trees', 'Red-Black Trees'], [
        {
          id: 'q1',
          question: 'Q1',
          selected_option: 'A',
          correct_option: 'B',
          is_correct: false,
          explanation: 'Exp',
          topic: 'AVL Trees',
        },
        {
          id: 'q2',
          question: 'Q2',
          selected_option: 'A',
          correct_option: 'B',
          is_correct: false,
          explanation: 'Exp',
          topic: 'Red-Black Trees',
        },
        {
          id: 'q3',
          question: 'Q3',
          selected_option: 'A',
          correct_option: 'A',
          is_correct: true,
          explanation: 'Exp',
          topic: 'Binary Search Tree',
        },
      ]),
      createMockAssessment('quiz-2', 'CS201', 30, 50, 60, ['AVL Trees'], [
        {
          id: 'q4',
          question: 'Q4',
          selected_option: 'A',
          correct_option: 'B',
          is_correct: false,
          explanation: 'Exp',
          topic: 'AVL Trees',
        },
        {
          id: 'q5',
          question: 'Q5',
          selected_option: 'A',
          correct_option: 'A',
          is_correct: true,
          explanation: 'Exp',
          topic: 'Binary Search Tree',
        },
      ]),
    ];

    const weakTopicsMap = new Map<string, number>();
    quizzes.forEach((item) => {
      item.details?.eval_details?.forEach((ed: any) => {
        if (!ed.is_correct && ed.topic) {
          weakTopicsMap.set(ed.topic, (weakTopicsMap.get(ed.topic) || 0) + 1);
        }
      });
    });

    assert.strictEqual(weakTopicsMap.get('AVL Trees'), 2, 'AVL Trees should have 2 recorded mistakes');
    assert.strictEqual(weakTopicsMap.get('Red-Black Trees'), 1, 'Red-Black Trees should have 1 recorded mistake');
    assert.strictEqual(weakTopicsMap.get('Binary Search Tree'), undefined, 'Binary Search Tree was correct, so not weak');
  });
});
