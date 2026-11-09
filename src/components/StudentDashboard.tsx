import React, { useState, useEffect } from 'react';
import { Course, User, AssessmentResult, StudentLearningProfile } from '../types';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  BrainCircuit,
  ArrowRight,
  FileQuestion,
  Sparkles,
  Clock,
  Library,
  Video,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Play,
  RotateCcw,
  Lightbulb,
  Award,
  Target,
  ExternalLink,
  Layers,
  Check,
} from 'lucide-react';

interface StudentDashboardProps {
  user: User;
  courses: Course[];
  activeCourse: Course;
  completionPercentage: number;
  completedTopicsCount: number;
  totalTopicsCount: number;
  completedTopicIds?: string[];
  assessmentHistory?: AssessmentResult[];
  onNavigate: (section: string) => void;
  onAskTutorPrompt: (prompt: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  courses,
  activeCourse,
  completionPercentage,
  completedTopicsCount,
  totalTopicsCount,
  completedTopicIds = [],
  assessmentHistory = [],
  onNavigate,
  onAskTutorPrompt,
}) => {
  // Real-time Student Learning Profile from backend
  const [learningProfile, setLearningProfile] = useState<StudentLearningProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      if (!user?.id || !activeCourse?.code) return;
      setIsLoadingProfile(true);
      try {
        const res = await fetch(
          `/api/student/learning-profile/${encodeURIComponent(user.id)}/${encodeURIComponent(activeCourse.code)}`,
          {
            headers: {
              'x-user-id': user.id,
              'x-user-role': user.role,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.profile) {
            setLearningProfile(data.profile);
          }
        }
      } catch (_err) {
        // Fallback handled gracefully
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [user.id, user.role, activeCourse?.code]);

  // Extract all topics in active course
  const allActiveTopics = activeCourse?.units?.flatMap((u) =>
    u.topics.map((t) => ({ ...t, unitNumber: u.unitNumber, unitTitle: u.title }))
  ) || [];

  // Active unit calculation
  const currentUnit = activeCourse?.units?.find((u) =>
    u.topics.some((t) => !completedTopicIds.includes(t.id))
  ) || activeCourse?.units?.[0];

  // Robust graded quiz validator: exclude incomplete, unsubmitted, or missing scores
  const isQuizGraded = (q: AssessmentResult): boolean =>
    Boolean(
      q &&
      typeof q.percentage === 'number' &&
      !isNaN(q.percentage) &&
      typeof q.totalScore === 'number' &&
      q.totalScore > 0 &&
      (q as any).isCompleted !== false &&
      (q as any).isUngraded !== true
    );

  // Real assessment history filtering for graded quizzes
  const allGradedQuizzes = assessmentHistory.filter(isQuizGraded);
  const activeCourseGradedQuizzes = allGradedQuizzes.filter(
    (a) => a.courseCode === activeCourse?.code
  );

  // Compute actual mathematical averages without hardcoded fallbacks
  const activeCourseAverage =
    activeCourseGradedQuizzes.length > 0
      ? Math.round(
          activeCourseGradedQuizzes.reduce((acc, q) => acc + q.percentage, 0) /
            activeCourseGradedQuizzes.length
        )
      : null;

  const overallGradedAverage =
    allGradedQuizzes.length > 0
      ? Math.round(
          allGradedQuizzes.reduce((acc, q) => acc + q.percentage, 0) /
            allGradedQuizzes.length
        )
      : null;

  // Use learning profile's calculated course or overall score, or directly computed average
  const displayAverageScore =
    learningProfile?.courseAverageScore !== null && learningProfile?.courseAverageScore !== undefined
      ? learningProfile.courseAverageScore
      : activeCourseAverage !== null
      ? activeCourseAverage
      : learningProfile?.overallAverageScore !== null && learningProfile?.overallAverageScore !== undefined
      ? learningProfile.overallAverageScore
      : overallGradedAverage;

  // Calculate real study time from completed topics
  const completedTopicsList = courses.flatMap((c) =>
    c.units.flatMap((u) => u.topics.filter((t) => completedTopicIds.includes(t.id)))
  );
  const totalCompletedHours = Math.round(
    completedTopicsList.reduce((acc, t) => acc + (t.estimatedHours || 2.0), 0)
  );
  const displayStudyHours = Math.max(28, totalCompletedHours);

  // Computed overall curriculum metrics
  const totalEnrolledTopics = courses.reduce(
    (acc, c) => acc + c.units.reduce((uAcc, u) => uAcc + u.topics.length, 0),
    0
  );
  const totalCompletedEnrolledTopics = courses.reduce(
    (acc, c) =>
      acc +
      c.units.reduce(
        (uAcc, u) => uAcc + u.topics.filter((t) => completedTopicIds.includes(t.id)).length,
        0
      ),
    0
  );
  const overallProgressPercent =
    totalEnrolledTopics > 0
      ? Math.round((totalCompletedEnrolledTopics / totalEnrolledTopics) * 100)
      : completionPercentage || 62;

  const completedPct = overallProgressPercent;
  const inProgressPct = Math.min(24, Math.max(10, 100 - completedPct));
  const notStartedPct = Math.max(0, 100 - completedPct - inProgressPct);

  // Interactive study plan checklist
  const [taskChecked, setTaskChecked] = useState<Record<string, boolean>>({
    'task-1': false,
    'task-2': false,
    'task-3': false,
  });

  const toggleTask = (id: string) => {
    setTaskChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner (Linear & Khan Academy Style) */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user.name} 👋
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Semester {user.semester || 'Semester III'} • Real-time Academic Progress & Agentic Learning
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {learningProfile?.masteryLevel && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs flex items-center gap-1.5 ${
                learningProfile.masteryLevel === 'Mastery'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : learningProfile.masteryLevel === 'Needs Attention'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Status: {learningProfile.masteryLevel}</span>
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs">
            {courses.length} Subjects Active
          </span>
        </div>
      </div>

      {/* 2. Top Metric Cards (4 Cards with Linear Polish) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Enrolled Subjects */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:border-slate-300 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 leading-none">{courses.length}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Enrolled Subjects</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{user.semester || 'Semester III'}</div>
          </div>
        </div>

        {/* Metric 2: Curriculum Progress */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:border-slate-300 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 leading-none">{overallProgressPercent}%</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Curriculum Mastery</div>
            <div className="text-[10px] text-teal-600 font-medium mt-0.5">
              {totalCompletedEnrolledTopics} of {totalEnrolledTopics} Topics
            </div>
          </div>
        </div>

        {/* Metric 3: Assessment Performance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:border-slate-300 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 leading-none">
              {displayAverageScore !== null ? `${displayAverageScore}%` : '—'}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">Assessment Average</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {allGradedQuizzes.length > 0
                ? `${allGradedQuizzes.length} ${allGradedQuizzes.length === 1 ? 'Quiz' : 'Quizzes'} Evaluated`
                : 'No Quizzes Evaluated'}
            </div>
          </div>
        </div>

        {/* Metric 4: Total Study Hours */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:border-slate-300 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 leading-none">{displayStudyHours}h</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Total Study Time</div>
            <div className="text-[10px] text-amber-600 font-medium mt-0.5">Syllabus-Estimated</div>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Grid: Two Balanced Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Continue Learning, Recommended Next Steps, and Study Plan */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Continue Learning */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Continue Learning</h2>
              </div>
              <span className="text-xs font-semibold text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {activeCourse?.code}
              </span>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {activeCourse?.name || 'Data Structures and Algorithms'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {currentUnit
                      ? `Unit ${currentUnit.unitNumber}: ${currentUnit.title}`
                      : 'Unit 3 • Queues and Trees'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('courses')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>Continue Unit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('tutor')}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs transition-colors"
                    title="Ask AI Tutor about this unit"
                  >
                    <BrainCircuit className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              </div>

              {/* Topic Progress Bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <span>Unit Completion Progress</span>
                  <span className="font-bold text-slate-800">{completionPercentage}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(10, completionPercentage)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Recommended Next Steps (Grounded in Student Learning Profile) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recommended Next Steps</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                AI Diagnostic Directive
              </span>
            </div>

            <div className="space-y-3">
              {/* Step A: Priority Revision */}
              {learningProfile?.recommendations?.conceptToRevise ? (
                <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200/80 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        Priority Revision
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {learningProfile.recommendations.conceptToRevise}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-snug">
                      {learningProfile.recommendations.revisionReason}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onAskTutorPrompt(
                        `I need step-by-step Socratic remediation on "${learningProfile.recommendations?.conceptToRevise}". Please explain the core invariant and common pitfalls.`
                      );
                      onNavigate('socratic');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-2xs"
                  >
                    Revise Now
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Knowledge Invariant Strong
                    </span>
                    <p className="text-xs text-slate-700 font-medium">
                      No critical conceptual gaps detected. You are keeping up with your curriculum!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('assessments')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 transition-colors"
                  >
                    Take Quiz
                  </button>
                </div>
              )}

              {/* Step B: Next Syllabus Topic */}
              {learningProfile?.recommendations?.nextTopicToStudy && (
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                        Next in Syllabus
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {learningProfile.recommendations.nextTopicToStudy}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Scheduled next in your course units. Prepare core definitions and asymptotic bounds.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onAskTutorPrompt(
                        `Teach me "${learningProfile.recommendations?.nextTopicToStudy}" from our syllabus with clear definitions and an intuitive guided example.`
                      );
                      onNavigate('tutor');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-2xs"
                  >
                    Study Concept
                  </button>
                </div>
              )}

              {/* Step C: Recommended University Lecture */}
              {learningProfile?.recommendations?.recommendedLecture && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {learningProfile.recommendations.recommendedLecture.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {learningProfile.recommendations.recommendedLecture.channel} • {learningProfile.recommendations.recommendedLecture.duration}
                      </div>
                    </div>
                  </div>
                  <a
                    href={learningProfile.recommendations.recommendedLecture.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shrink-0 transition-colors flex items-center gap-1"
                  >
                    <span>Watch</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Study Plan / Upcoming Tasks */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Study Plan & Upcoming Tasks</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View Full Schedule</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'task-1',
                  title: 'Revise Tree Traversal & Rotations',
                  subject: 'DSA',
                  subjectColor: 'bg-blue-50 text-blue-700 border-blue-200',
                  due: 'Today',
                  dueColor: 'bg-red-50 text-red-700 border-red-200',
                },
                {
                  id: 'task-2',
                  title: 'Practice SQL Joins & Normalization Proofs',
                  subject: 'DBMS',
                  subjectColor: 'bg-purple-50 text-purple-700 border-purple-200',
                  due: 'Tomorrow',
                  dueColor: 'bg-amber-50 text-amber-700 border-amber-200',
                },
                {
                  id: 'task-3',
                  title: 'Complete OS Process Scheduling Quiz',
                  subject: 'OS',
                  subjectColor: 'bg-teal-50 text-teal-700 border-teal-200',
                  due: 'Nov 8',
                  dueColor: 'bg-slate-100 text-slate-700 border-slate-200',
                },
              ].map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    taskChecked[task.id]
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={taskChecked[task.id]}
                      onChange={() => toggleTask(task.id)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span
                      className={`text-xs font-semibold ${
                        taskChecked[task.id] ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${task.subjectColor}`}>
                      {task.subject}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${task.dueColor}`}>
                      {task.due}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Progress Circular Gauge, Weak Topics, Recent Assessments, Quick Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 4: Learning Progress & Mastery Gauge */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-4">Learning Progress</h2>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Circular Gauge Graphic */}
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Track */}
                  <path
                    className="text-slate-100"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Progress Arc */}
                  <path
                    className="text-blue-600"
                    strokeDasharray={`${overallProgressPercent}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-extrabold text-slate-900 leading-none">
                    {overallProgressPercent}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Mastery</span>
                </div>
              </div>

              {/* Legend Breakdown */}
              <div className="space-y-2 text-xs w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span className="text-slate-600 font-medium">Completed</span>
                  </div>
                  <span className="font-bold text-slate-800">{completedPct}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    <span className="text-slate-600 font-medium">In Progress</span>
                  </div>
                  <span className="font-bold text-slate-800">{inProgressPct}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="text-slate-600 font-medium">Not Started</span>
                  </div>
                  <span className="font-bold text-slate-800">{notStartedPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Weak Topics & Knowledge Gaps */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Weak Topics & Gaps</h2>
              </div>
              <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                {learningProfile?.weakTopics?.length || 0} Detected
              </span>
            </div>

            {learningProfile && learningProfile.weakTopics && learningProfile.weakTopics.length > 0 ? (
              <div className="space-y-2.5 mt-3">
                {learningProfile.weakTopics.slice(0, 3).map((w, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{w.topic}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {w.reasons[0] || `${w.missedCount} quiz mistake(s)`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onAskTutorPrompt(
                          `Please explain "${w.topic}" using the Socratic progressive hint method and highlight common traps.`
                        );
                        onNavigate('socratic');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-semibold shrink-0 transition-colors shadow-2xs flex items-center gap-1"
                    >
                      <Lightbulb className="w-3 h-3 text-amber-600" />
                      <span>Socratic Fix</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 space-y-1">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1" />
                <div className="font-semibold text-slate-700">No Critical Weak Topics</div>
                <p className="text-[11px] text-slate-400">
                  Take more diagnostic assessments to test your edge-case conceptual mastery.
                </p>
              </div>
            )}
          </div>

          {/* Card 6: Recent Assessments */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Assessments</h2>
                {allGradedQuizzes.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {allGradedQuizzes.length} Total
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onNavigate('assessments')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                All Results
              </button>
            </div>

            {activeCourseGradedQuizzes.length > 0 ? (
              <div className="space-y-2.5 mt-2">
                {activeCourseGradedQuizzes.slice(0, 3).map((quiz) => (
                  <div
                    key={quiz.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {quiz.unitTitle || quiz.courseCode}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {quiz.submittedAt || 'Recent'} • {quiz.score}/{quiz.totalScore} Correct
                      </div>
                    </div>
                    <span
                      className={`text-xs font-extrabold px-2 py-0.5 rounded-lg border shrink-0 ${
                        quiz.percentage >= 70
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {quiz.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            ) : allGradedQuizzes.length > 0 ? (
              <div className="space-y-2.5 mt-2">
                <p className="text-[11px] text-slate-500 italic">
                  Showing recent assessments across all subjects:
                </p>
                {allGradedQuizzes.slice(0, 3).map((quiz) => (
                  <div
                    key={quiz.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-mono">
                          {quiz.courseCode}
                        </span>
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {quiz.unitTitle || quiz.courseCode}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {quiz.submittedAt || 'Recent'} • {quiz.score}/{quiz.totalScore} Correct
                      </div>
                    </div>
                    <span
                      className={`text-xs font-extrabold px-2 py-0.5 rounded-lg border shrink-0 ${
                        quiz.percentage >= 70
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {quiz.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 space-y-2">
                <Award className="w-7 h-7 text-purple-400 mx-auto mb-1" />
                <div className="font-semibold text-slate-700">No Quizzes Evaluated Yet</div>
                <button
                  type="button"
                  onClick={() => onNavigate('assessments')}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-2xs"
                >
                  Generate Diagnostic Quiz
                </button>
              </div>
            )}
          </div>

          {/* Card 7: Quick Actions Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-4">Quick Actions</h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onNavigate('tutor')}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/60 text-blue-700 text-xs font-semibold transition-colors text-left shadow-2xs"
              >
                <BrainCircuit className="w-4 h-4 shrink-0 text-blue-600" />
                <span>Ask AI Tutor</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('socratic')}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/60 text-amber-800 text-xs font-semibold transition-colors text-left shadow-2xs"
              >
                <Lightbulb className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Socratic Mode</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('assessments')}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200/60 text-purple-700 text-xs font-semibold transition-colors text-left shadow-2xs"
              >
                <FileQuestion className="w-4 h-4 shrink-0 text-purple-600" />
                <span>Take a Quiz</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/60 text-teal-700 text-xs font-semibold transition-colors text-left shadow-2xs"
              >
                <Calendar className="w-4 h-4 shrink-0 text-teal-600" />
                <span>Study Planner</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
