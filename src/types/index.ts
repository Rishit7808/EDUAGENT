export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student';
  semester?: string;
}

export interface SyllabusTopic {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedHours: number;
}

export interface Unit {
  id: string;
  unitNumber: number;
  title: string;
  description: string;
  topics: SyllabusTopic[];
}

export interface Course {
  id: string;
  code: string;
  name: string;
  semester: string;
  description: string;
  referenceBooks: string[];
  units: Unit[];
}

export interface AcademicDoc {
  id: string;
  courseId: string;
  filename: string;
  docType: string;
  chunks: string[];
  uploadedAt: string;
}

export interface AgentExecutionStep {
  step: string;
  description: string;
  status: 'running' | 'completed' | 'failed';
  timestamp?: number;
}

export interface ChatPersonalization {
  masteryLevel: 'Mastery' | 'Developing' | 'Needs Attention' | 'Unassessed';
  explanationMode: string;
  courseScore: number | null;
  totalQuizzes: number;
  weakTopics: string[];
  repeatedMistakes: string[];
  strongTopics: string[];
  recommendations: {
    nextTopicToStudy?: string;
    conceptToRevise?: string;
    revisionReason?: string;
    practiceQuestionPrompt?: string;
    recommendedLecture?: {
      title: string;
      channel: string;
      url: string;
      duration?: string;
    };
  };
}

export type LearningMode = 'normal' | 'socratic';

export type SocraticAction = 'ask' | 'submit_answer' | 'request_hint' | 'reveal_solution';

export type SocraticStage = 'initial_question' | 'hint_1' | 'hint_2' | 'hint_3' | 'solution_revealed' | 'answered';

export interface SocraticEvaluation {
  isCorrect: boolean;
  conceptFeedback: string;
  misconceptionsIdentified?: string[];
  nextGuidingQuestion?: string;
  readyForSolution?: boolean;
}

export interface SocraticState {
  stage: SocraticStage;
  hintCount: number;
  maxHints: number;
  originalQuery: string;
  currentGuidingQuestion?: string;
  lastEvaluation?: SocraticEvaluation;
  isSolutionRevealed: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: AgentExecutionStep[];
  selectedAgent?: string;
  timestamp: string;
  personalization?: ChatPersonalization;
  mode?: LearningMode;
  socraticState?: SocraticState;
}

export interface StudentWeakTopic {
  topic: string;
  missedCount: number;
  lastMissedDate?: string;
  reasons: string[];
}

export interface StudentLearningProfile {
  studentId: string;
  studentName?: string;
  semester?: string;
  courseCode: string;
  courseName?: string;
  totalAssessments: number;
  courseAssessmentsCount: number;
  courseAverageScore: number | null;
  overallAverageScore: number | null;
  masteryLevel: 'Mastery' | 'Developing' | 'Needs Attention' | 'Unassessed';
  weakTopics: StudentWeakTopic[];
  repeatedMistakes: string[];
  strongTopics: string[];
  completedTopicIds: string[];
  totalCourseTopics: number;
  syllabusProgressPct: number;
  hasHistory: boolean;
  recommendations: {
    nextTopicToStudy?: string;
    conceptToRevise?: string;
    revisionReason?: string;
    practiceQuestionPrompt?: string;
    recommendedLecture?: {
      title: string;
      channel: string;
      url: string;
      duration?: string;
    };
  };
}

export interface AcademicResource {
  title: string;
  author: string;
  course: string;
  unit: string;
  description: string;
  source_website: string;
  resource_type: 'open_access_pdf' | 'university_notes' | 'official_publisher' | 'commercial_ref';
  is_open_access: boolean;
  url: string;
  pdf_url?: string | null;
}

export interface VideoResource {
  title: string;
  channel: string;
  url: string;
  thumbnail: string;
  duration: string;
  course: string;
  unit: string;
  relevance: string;
}

export interface StudyTask {
  id: string;
  date: string;
  day_number: number;
  type: 'study' | 'revision' | 'buffer' | 'mock_test' | 'practice';
  title: string;
  course_name: string;
  unit_title?: string;
  difficulty?: string;
  duration_hours: number;
  status: 'pending' | 'completed' | 'rescheduled';
  is_completed: boolean;
}

export interface StudyPlan {
  total_study_days: number;
  daily_hours: number;
  semester_start: string;
  semester_end: string;
  exam_date: string;
  total_topics_covered: number;
  total_tasks: number;
  tasks: StudyTask[];
  phases: {
    study_days: number;
    revision_sessions: number;
    buffer_days: number;
    mock_tests: number;
  };
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  topic: string;
  hint?: string;
}

export interface AssessmentResult {
  id: string;
  courseCode: string;
  unitTitle?: string;
  score: number;
  totalScore: number;
  percentage: number;
  details: {
    score: number;
    total_score: number;
    percentage: number;
    weak_topics: string[];
    remediation_advice: string;
    eval_details: Array<{
      id: string;
      question: string;
      selected_option: string;
      correct_option: string;
      is_correct: boolean;
      explanation: string;
      topic: string;
    }>;
  };
  submittedAt: string;
}

export interface ApiKeyStatus {
  configuredCount: number;
  totalFailovers: number;
  model: string;
  youtubeStatus?: {
    configured: boolean;
    state: 'Active' | 'Unavailable' | 'Quota Exceeded' | 'Not Configured';
    maskedKey?: string;
    message?: string;
  };
  keys: Array<{
    maskedId: string;
    isHealthy: boolean;
    totalCalls: number;
    consecutiveFailures: number;
  }>;
}
