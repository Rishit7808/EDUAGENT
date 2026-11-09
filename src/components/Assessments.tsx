import React, { useState, useEffect } from 'react';
import { Course, QuizQuestion, AssessmentResult, User } from '../types';
import {
  FileQuestion,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Award,
  AlertCircle,
  Sparkles,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  BarChart3,
  Clock,
  BrainCircuit,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Check,
  Lightbulb,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AssessmentsProps {
  user: User;
  course: Course;
  assessmentHistory?: AssessmentResult[];
  onAssessmentCompleted?: (result: AssessmentResult) => void;
  onAskTutor?: (prompt: string) => void;
}

export const Assessments: React.FC<AssessmentsProps> = ({
  user,
  course,
  assessmentHistory = [],
  onAssessmentCompleted,
  onAskTutor,
}) => {
  const [assessmentTab, setAssessmentTab] = useState<'take-quiz' | 'my-results' | 'weak-topics'>('take-quiz');
  type QuizStage = 'setup' | 'taking' | 'results';
  const [quizStage, setQuizStage] = useState<QuizStage>('setup');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [activeHints, setActiveHints] = useState<Record<string, boolean>>({});
  const [evaluation, setEvaluation] = useState<any | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Medium');
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [resultsCourseFilter, setResultsCourseFilter] = useState<'current' | 'all'>('current');

  // Validate genuinely graded quizzes
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

  const allGradedQuizzes = assessmentHistory.filter(isQuizGraded);
  const courseGradedQuizzes = allGradedQuizzes.filter((a) => a.courseCode === course?.code);

  const courseAverageScore =
    courseGradedQuizzes.length > 0
      ? Math.round(
          courseGradedQuizzes.reduce((acc, q) => acc + q.percentage, 0) /
            courseGradedQuizzes.length
        )
      : null;

  const overallAverageScore =
    allGradedQuizzes.length > 0
      ? Math.round(
          allGradedQuizzes.reduce((acc, q) => acc + q.percentage, 0) /
            allGradedQuizzes.length
        )
      : null;

  // Extract real diagnosed weak topics dynamically from graded quizzes
  const realWeakTopicsMap = new Map<string, number>();
  courseGradedQuizzes.forEach((item) => {
    if (item.details?.weak_topics && Array.isArray(item.details.weak_topics)) {
      item.details.weak_topics.forEach((t: string) => {
        if (t && typeof t === 'string') {
          realWeakTopicsMap.set(t, (realWeakTopicsMap.get(t) || 0) + 1);
        }
      });
    }
    if (item.details?.eval_details && Array.isArray(item.details.eval_details)) {
      item.details.eval_details.forEach((ed: any) => {
        if (ed.is_correct === false && ed.topic) {
          realWeakTopicsMap.set(ed.topic, (realWeakTopicsMap.get(ed.topic) || 0) + 1);
        }
      });
    }
  });

  const detectedWeakTopics = Array.from(realWeakTopicsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => ({ topic, count }));

  // Generate syllabus-grounded questions by course code
  const getQuestionsForCourse = (courseObj: Course): QuizQuestion[] => {
    const code = courseObj.code;

    if (code === 'CS101') {
      return [
        {
          id: 'q-py-1',
          question: 'In Python, which of the following data types is immutable once created?',
          options: ['List', 'Dictionary', 'Tuple', 'Set'],
          correct_index: 2,
          hint: 'Elements of this sequence cannot be modified, appended, or reassigned in-place.',
          explanation: 'Tuples are immutable sequence types in Python; once allocated, their item bindings cannot be altered or reassigned.',
          topic: 'Variables, Expressions, and Dynamic Data Types',
        },
        {
          id: 'q-py-2',
          question: 'What is the primary role of a base case in a recursive algorithm?',
          options: [
            'To allocate more dynamic heap memory',
            'To terminate recursive self-calls and prevent stack overflow',
            'To reverse the direction of loop iteration',
            'To convert Python bytecode into C extensions',
          ],
          correct_index: 1,
          hint: 'Without this condition, the function would invoke itself indefinitely until the call stack is exhausted.',
          explanation: 'The base case provides a direct non-recursive termination guarantee that unwinds the recursion and prevents RecursionError (stack overflow).',
          topic: 'Recursive Call Stacks & Base Case Guarantees',
        },
        {
          id: 'q-py-3',
          question: 'What is the result of the Python list comprehension [x * 2 for x in range(4) if x % 2 == 0]?',
          options: ['[0, 4]', '[0, 2, 4, 6]', '[2, 6]', '[0, 4, 8]'],
          correct_index: 0,
          hint: 'range(4) produces 0, 1, 2, 3. Even numbers are 0 and 2. Then multiply each by 2.',
          explanation: 'The filter x % 2 == 0 selects 0 and 2. Evaluating x * 2 yields [0, 4].',
          topic: 'List Operations, Slicing & Comprehensions',
        },
      ];
    }

    if (code === 'CS203') {
      return [
        {
          id: 'q-oop-1',
          question: 'Which object-oriented principle restricts direct access to internal state and requires interactions to occur exclusively through public accessors/mutators?',
          options: ['Dynamic Polymorphism', 'Encapsulation', 'Multiple Inheritance', 'Namespace Alias'],
          correct_index: 1,
          hint: 'It bundles state and behavior together while hiding internal implementation details behind an interface.',
          explanation: 'Encapsulation shields an object’s private fields from unauthorized mutation, enforcing state invariants through getters and setters.',
          topic: 'Principles of OOP: Abstraction, Encapsulation & Modularity',
        },
        {
          id: 'q-oop-2',
          question: 'In strongly-typed OOP languages like Java, how does method overriding differ fundamentally from method overloading?',
          options: [
            'Overriding occurs within the same class with different parameters; overloading occurs in subclasses with identical signatures',
            'Overriding resolves dynamically at runtime in a subclass hierarchy with identical signature; overloading resolves statically at compile-time with different parameter types',
            'Overriding changes the return type only; overloading redefines the visibility modifier',
            'There is no functional difference in bytecode execution',
          ],
          correct_index: 1,
          hint: 'Overriding uses dynamic method dispatch via vtables at runtime; overloading is resolved by the compiler based on argument types.',
          explanation: 'Method overriding provides a subclass-specific implementation of an inherited method with identical name and parameter types, dispatched at runtime. Overloading allows multiple methods of the same name with distinct signatures resolved at compile time.',
          topic: 'Method Overriding vs Overloading & Dynamic Method Dispatch',
        },
        {
          id: 'q-oop-3',
          question: 'Which statement accurately describes Checked vs Unchecked exceptions in Java?',
          options: [
            'Checked exceptions inherit from RuntimeException and do not require explicit handling',
            'Checked exceptions inherit from Exception (excluding RuntimeException) and must be caught or declared in the method throws clause',
            'Unchecked exceptions must always be caught using try-with-resources blocks',
            'Both categories are verified only at program termination',
          ],
          correct_index: 1,
          hint: 'The compiler forces developers to handle conditions that a well-written application should anticipate.',
          explanation: 'Checked exceptions are checked at compile time by Java, forcing methods to handle them with try-catch or propagate them with throws. Unchecked exceptions indicate programming flaws like NullPointerException.',
          topic: 'Exception Hierarchy: Checked vs Unchecked Runtime Exceptions',
        },
      ];
    }

    if (code === 'CS204') {
      return [
        {
          id: 'q-coa-1',
          question: 'In modern CPU pipelining, what type of pipeline hazard occurs when an instruction depends on the result of an earlier instruction that is still in the pipeline?',
          options: ['Structural Hazard', 'Data Hazard', 'Control Hazard', 'Microcode Hazard'],
          correct_index: 1,
          hint: 'Read-After-Write (RAW) data dependencies between sequential instructions cause this stall.',
          explanation: 'A Data Hazard occurs when instructions that exhibit data dependencies access overlapping registers before prior pipeline stages complete, typically resolved by forwarding/bypassing or stalling.',
          topic: 'Pipelining Hazards & Forwarding',
        },
        {
          id: 'q-coa-2',
          question: 'In a Direct-Mapped Cache with 1024 cache lines and 32-byte blocks, which field of a 32-bit memory address determines the exact cache line to check?',
          options: ['Tag bits', 'Line/Set Index bits', 'Byte Offset bits', 'Dirty Flag bits'],
          correct_index: 1,
          hint: 'The middle address bits identify which single cache line the memory block maps into.',
          explanation: 'In cache memory addressing, the byte offset indexes the byte within a block, the index bits select the specific cache line/set, and tag bits are compared to confirm a cache hit.',
          topic: 'Cache Mapping Functions',
        },
        {
          id: 'q-coa-3',
          question: 'How does Direct Memory Access (DMA) improve overall system throughput compared to interrupt-driven I/O?',
          options: [
            'It forces the CPU to execute a software poll for every byte transferred',
            'It allows high-speed peripheral devices to transfer blocks of data directly to/from main memory without continuous CPU intervention',
            'It converts parallel system buses into serial optical fibers',
            'It eliminates the need for RAM refresh cycles',
          ],
          correct_index: 1,
          hint: 'The DMA controller transfers large buffers across the bus, interrupting the CPU only once when the entire transfer finishes.',
          explanation: 'DMA offloads bulk data movement between memory and I/O devices to a dedicated controller, freeing the CPU to execute other compute threads.',
          topic: 'Direct Memory Access (DMA) Controllers',
        },
      ];
    }

    if (code === 'CS301') {
      return [
        {
          id: 'q-os-1',
          question: 'What is the primary function of a Process Control Block (PCB) in an operating system?',
          options: [
            'To store compiler optimization symbols',
            'To record all execution state information needed to pause and resume a process',
            'To calculate hard drive sector rotational delays',
            'To manage physical network packet routing tables',
          ],
          correct_index: 1,
          hint: 'When a context switch occurs, the kernel saves the current state into this structure and loads the scheduled process.',
          explanation: 'The PCB is the kernel data structure maintaining process execution state, PID, CPU registers, scheduling priority, memory pointers, and I/O status.',
          topic: 'Process Control Block & Context Switching',
        },
        {
          id: 'q-os-2',
          question: 'Which CPU scheduling algorithm gives each process a small unit of CPU time (time quantum) and preempts it if it has not completed by the end of that quantum?',
          options: [
            'First-Come, First-Served (FCFS)',
            'Shortest Job First (SJF)',
            'Round Robin (RR)',
            'Priority Scheduling without Aging',
          ],
          correct_index: 2,
          hint: 'This algorithm is designed specifically for time-sharing systems to provide fair, responsive interactive performance.',
          explanation: 'Round Robin (RR) scheduling allocates a fixed time quantum per process in a circular FIFO queue, preempting running processes when the timer interrupt fires.',
          topic: 'CPU Scheduling Algorithms',
        },
        {
          id: 'q-os-3',
          question: 'In virtual memory systems with demand paging, what hardware event occurs when a process attempts to access a memory page whose present/valid bit is 0?',
          options: [
            'General Protection Fault resulting in immediate kernel panic',
            'Page Fault trap triggering the OS to fetch the page from secondary storage into a free frame',
            'Cache snooping invalidation signal',
            'Hardware watchdog timer reset',
          ],
          correct_index: 1,
          hint: 'The MMU traps to the OS kernel page fault handler, which brings the requested page from disk swap space into RAM.',
          explanation: 'When the referenced page is not currently resident in physical memory (valid bit = 0), the MMU raises a Page Fault interrupt. The OS loads it into a physical frame and restarts the instruction.',
          topic: 'Virtual Memory & Page Faults',
        },
      ];
    }

    if (code === 'CS401') {
      return [
        {
          id: 'q-se-1',
          question: 'In software architectural design, which principle states that software modules should possess "High Cohesion and Loose Coupling"?',
          options: [
            'Modules should have unrelated functions clustered together and depend heavily on internal global variables',
            'Each module should perform a single well-focused responsibility, while minimizing dependencies on other modules',
            'All database queries must be written in the presentation user interface layer',
            'Code must be written without automated unit tests',
          ],
          correct_index: 1,
          hint: 'High cohesion means elements within a module belong together; loose coupling means modules can change independently.',
          explanation: 'High cohesion ensures a module focuses tightly on one cohesive task, while loose coupling minimizes inter-module dependencies.',
          topic: 'Modularity Metrics: Cohesion & Coupling',
        },
        {
          id: 'q-se-2',
          question: 'In software testing methodologies, what distinguishes Black-Box Testing from White-Box Testing?',
          options: [
            'Black-box testing requires source code inspection; white-box testing tests only the compiled binary',
            'Black-box testing evaluates functional requirements without inspecting internal source code logic; white-box testing examines internal paths and logic branches',
            'Black-box testing is performed only by computers; white-box testing is done only by humans',
            'Black-box testing tests performance only; white-box testing tests UI buttons only',
          ],
          correct_index: 1,
          hint: 'Think about whether the tester has visibility into the code structure or only evaluates specifications.',
          explanation: 'Black-box testing focuses on inputs and outputs without knowing code internals. White-box testing verifies internal branch coverage and conditions using source code access.',
          topic: 'Black-Box vs White-Box Testing',
        },
        {
          id: 'q-se-3',
          question: 'According to IEEE 830 standards, what is the primary purpose of a Software Requirements Specification (SRS) document?',
          options: [
            'To store developer daily git commit logs',
            'To provide a complete, unambiguous contract of functional and non-functional requirements agreed upon by stakeholders and development teams',
            'To benchmark CPU floating-point operations per second',
            'To generate invoice billing records for commercial cloud hosting',
          ],
          correct_index: 1,
          hint: 'It bridges the gap between customer expectations and technical delivery by specifying what the software must do.',
          explanation: 'The SRS defines what the system should do (functional requirements) and operational constraints (non-functional requirements), serving as the foundation for design and validation.',
          topic: 'Requirements Engineering & SRS Documentation',
        },
      ];
    }

    if (code === 'CS202') {
      return [
        {
          id: 'q-db-1',
          question: 'In database transaction processing, which ACID property guarantees that all operations of a transaction execute completely or none at all?',
          options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
          correct_index: 0,
          hint: 'Think about the all-or-nothing guarantee that prevents partial state changes during a database crash.',
          explanation: 'Atomicity ensures that either all effects of a transaction are made permanent or none are reflected in the database (all-or-nothing).',
          topic: 'ACID Properties & Transaction States',
        },
        {
          id: 'q-db-2',
          question: 'A relational schema is in Boyce-Codd Normal Form (BCNF) if and only if for every non-trivial functional dependency X -> Y:',
          options: ['Y is a prime attribute', 'X is a superkey', 'X is a foreign key', 'Y is functionally independent of X'],
          correct_index: 1,
          hint: 'BCNF is stricter than 3NF: the left side of every non-trivial functional dependency must uniquely identify tuples.',
          explanation: 'BCNF requires that the determinant X in every non-trivial functional dependency X -> Y must be a superkey of the relation.',
          topic: 'Database Normalization (BCNF)',
        },
      ];
    }

    // Default: CS201 Data Structures and Algorithms
    return [
      {
        id: 'q1',
        question: 'What is the worst-case asymptotic time complexity of searching for an element in an unsorted Singly Linked List with n elements?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correct_index: 2,
        hint: 'Because elements are connected by pointer links without array indexing, finding a missing key requires checking every node sequentially.',
        explanation: 'Because an unsorted singly linked list has sequential node pointers without direct random indexing, locating a target element requires traversing all n nodes in the worst case (O(n)).',
        topic: 'Linked Lists & Sequential Search',
      },
      {
        id: 'q2',
        question: 'Which abstract data structure adheres strictly to the LIFO (Last-In, First-Out) discipline for insertion and deletion?',
        options: ['Queue', 'Stack', 'Min-Heap', 'Binary Search Tree'],
        correct_index: 1,
        hint: 'Think of a stack of plates: the most recently placed plate is the first one you pick up.',
        explanation: 'A Stack enforces LIFO semantics: elements are pushed onto the top and popped from the same top location.',
        topic: 'Stacks & LIFO Operations',
      },
      {
        id: 'q3',
        question: 'In a self-balancing Binary Search Tree such as an AVL or Red-Black Tree, what is the maximum time complexity for inserting a new key?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'],
        correct_index: 1,
        hint: 'Tree height invariants ensure that the tree height h never exceeds c * log2(n).',
        explanation: 'Self-balancing binary trees maintain the tree height bounded at O(log n) through rotation invariants, ensuring searching, insertion, and deletion all take O(log n) time.',
        topic: 'Binary Search Trees & Rotations',
      },
    ];
  };

  const [questions, setQuestions] = useState<QuizQuestion[]>(() =>
    getQuestionsForCourse(course)
  );

  useEffect(() => {
    // Reset to setup stage and fresh syllabus questions on subject switch
    setQuizStage('setup');
    setUserAnswers({});
    setActiveHints({});
    setEvaluation(null);
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);
    setShowExitConfirm(false);
    setGenerationError(null);
    setQuestions(getQuestionsForCourse(course).slice(0, questionCount));
  }, [course.id, course.code]);

  const handleStartQuiz = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);
    setUserAnswers({});
    setActiveHints({});
    setEvaluation(null);
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);

    try {
      const res = await fetch('/api/assessments/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: course.code,
          unitId: selectedUnitId,
          count: questionCount,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        setIsAiGenerated(Boolean(data.isAiGenerated));
        setQuizStage('taking');
      } else {
        const fallback = getQuestionsForCourse(course).slice(0, questionCount);
        setQuestions(fallback);
        setQuizStage('taking');
      }
    } catch (_err) {
      const fallback = getQuestionsForCourse(course).slice(0, questionCount);
      setQuestions(fallback);
      setQuizStage('taking');
    } finally {
      setIsGenerating(false);
    }
  };

  // Backward-compatibility alias
  const fetchDynamicQuestions = async (countVal: number, unitVal: string) => {
    setSelectedUnitId(unitVal);
    setQuestionCount(countVal);
    await handleStartQuiz();
  };

  const handleBackToAssessments = () => {
    if (quizStage === 'taking' && Object.keys(userAnswers).length > 0 && !isSubmitted) {
      setShowExitConfirm(true);
    } else {
      setQuizStage('setup');
      setUserAnswers({});
      setActiveHints({});
      setCurrentQuestionIndex(0);
      setShowExitConfirm(false);
    }
  };

  const confirmExitQuiz = () => {
    setQuizStage('setup');
    setUserAnswers({});
    setActiveHints({});
    setCurrentQuestionIndex(0);
    setShowExitConfirm(false);
  };

  const handleOptionSelect = (qId: string, optionIdx: number) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  };

  const toggleHint = (qId: string) => {
    setActiveHints((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let correctCount = 0;
      const weakTopics: string[] = [];
      const evalDetails: any[] = [];

      questions.forEach((q) => {
        const selected = userAnswers[q.id];
        const isCorrect = selected === q.correct_index;
        if (isCorrect) {
          correctCount++;
        } else {
          if (!weakTopics.includes(q.topic)) {
            weakTopics.push(q.topic);
          }
        }

        evalDetails.push({
          id: q.id,
          question: q.question,
          selected_option: selected !== undefined ? q.options[selected] : 'Unanswered',
          correct_option: q.options[q.correct_index],
          is_correct: isCorrect,
          explanation: q.explanation,
          topic: q.topic,
        });
      });

      const score = correctCount * 10;
      const totalScore = questions.length * 10;
      const percentage = Math.round((score / totalScore) * 100);

      const remediationAdvice =
        weakTopics.length > 0
          ? `Focus targeted revision on: ${weakTopics.join(
              ', '
            )}. Ask your AI Tutor for step-by-step concept walkthroughs.`
          : 'Outstanding performance! You have demonstrated high mastery of these curriculum concepts.';

      const evalResult = {
        score,
        total_score: totalScore,
        percentage,
        weak_topics: weakTopics,
        remediation_advice: remediationAdvice,
        eval_details: evalDetails,
      };

      setEvaluation(evalResult);
      setIsSubmitted(true);
      setQuizStage('results');

      try {
        const res = await fetch('/api/assessments/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: user.id,
            courseCode: course.code,
            score,
            totalScore,
            unitTitle:
              selectedUnitId === 'all'
                ? 'Comprehensive (All Units)'
                : course.units.find((u) => u.id === selectedUnitId)?.title || 'Unit Assessment',
            details: evalResult,
          }),
        });
        const data = await res.json();
        if (onAssessmentCompleted && data.result) {
          onAssessmentCompleted(data.result);
        }
      } catch (_err) {
        // Offline fallback
      }

      if (percentage >= 75) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(userAnswers).length;
  const selectedUnitObj = selectedUnitId === 'all' ? null : course.units.find((u) => u.id === selectedUnitId);
  const selectedUnitTitle = selectedUnitObj ? `Unit ${selectedUnitObj.unitNumber}: ${selectedUnitObj.title}` : 'Comprehensive (All Units)';

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. QUIZ-TAKING VIEW (Active Stepped Mode)                */}
      {/* ======================================================== */}
      {quizStage === 'taking' && (() => {
        const currentQ = questions[currentQuestionIndex] || questions[0];
        const isHintOpen = Boolean(currentQ && activeHints[currentQ.id]);
        const selectedOption = currentQ ? userAnswers[currentQ.id] : undefined;
        const progressPct = questions.length > 0
          ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100)
          : 0;

        return (
          <div className="space-y-5 max-w-4xl mx-auto">
            {/* Header Navigation Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBackToAssessments}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0"
                  title="Return to assessments setup"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Exit Quiz</span>
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {course.code}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {course.name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 hidden sm:inline">
                      {selectedDifficulty}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    {selectedUnitTitle}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="text-xs font-bold text-slate-700 font-mono">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                  {answeredCount}/{questions.length} Answered
                </span>
              </div>
            </div>

            {/* Progress & Jump Navigator */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Progress</span>
                <span className="font-bold text-blue-600 font-mono">{progressPct}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Question Jump Palette */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Questions:
                </span>
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex;
                  const isAnswered = userAnswers[q.id] !== undefined;

                  let pillStyle = 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100';
                  if (isCurrent) {
                    pillStyle = 'ring-2 ring-blue-600 bg-blue-600 text-white border-blue-600 font-bold shadow-xs';
                  } else if (isAnswered) {
                    pillStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
                  }

                  return (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center border transition-all ${pillStyle}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Question Card */}
            {currentQ && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      Topic: {currentQ.topic}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug pt-1">
                      {currentQ.question}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleHint(currentQ.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs ${
                      isHintOpen
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-white border-slate-200 hover:bg-amber-50 text-slate-600 hover:text-amber-800'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isHintOpen ? 'Hide Hint' : 'Need a Hint?'}</span>
                  </button>
                </div>

                {/* Pedagogical Hint */}
                {isHintOpen && currentQ.hint && (
                  <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <strong className="block font-bold text-amber-950">Pedagogical Guidance:</strong>
                      <p className="leading-relaxed">{currentQ.hint}</p>
                    </div>
                  </div>
                )}

                {/* Answer Options */}
                <div className="space-y-3 pt-1">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = selectedOption === optIdx;

                    let optStyle =
                      'bg-slate-50/70 hover:bg-slate-100/90 border-slate-200 text-slate-800';
                    let badgeStyle = 'bg-white border-slate-200 text-slate-600';

                    if (isSelected) {
                      optStyle =
                        'bg-blue-50/90 border-blue-600 text-blue-950 font-bold shadow-xs ring-1 ring-blue-500';
                      badgeStyle = 'bg-blue-600 border-blue-600 text-white font-bold';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleOptionSelect(currentQ.id, optIdx)}
                        className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-3 ${optStyle}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${badgeStyle}`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="leading-relaxed">{opt}</span>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Stepper Controls Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="text-xs font-medium text-slate-500 hidden sm:block">
                <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions completed
              </div>

              <div className="flex items-center gap-2">
                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))
                    }
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    disabled={isSubmitting || answeredCount === 0}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Evaluating...' : 'Submit Quiz'}</span>
                  </button>
                )}

                {currentQuestionIndex < questions.length - 1 && answeredCount > 0 && (
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    disabled={isSubmitting}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors hidden md:inline-flex items-center gap-1"
                    title="Submit completed questions now"
                  >
                    <span>Submit</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* 2. DEDICATED RESULTS VIEW                                */}
      {/* ======================================================== */}
      {quizStage === 'results' && evaluation && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Top Return Actions */}
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <button
              type="button"
              onClick={() => {
                setQuizStage('setup');
                setUserAnswers({});
                setEvaluation(null);
                setIsSubmitted(false);
                setCurrentQuestionIndex(0);
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Assessments Setup</span>
            </button>

            <button
              type="button"
              onClick={handleStartQuiz}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Another Quiz</span>
            </button>
          </div>

          {/* Evaluation Score Hero */}
          <div
            className={`p-6 rounded-2xl border transition-all ${
              evaluation.percentage >= 70
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Award
                    className={`w-6 h-6 ${
                      evaluation.percentage >= 70 ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  />
                  <h3 className="text-lg font-bold">Diagnostic Assessment Evaluation</h3>
                </div>
                <p className="text-xs mt-1.5 max-w-2xl leading-relaxed text-slate-700">
                  {evaluation.remediation_advice}
                </p>
              </div>

              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-xs shrink-0">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Score</div>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono">
                    {evaluation.score}/{evaluation.total_score}
                  </div>
                </div>
                <div className="text-sm font-bold text-blue-600 font-mono">
                  {evaluation.percentage}%
                </div>
              </div>
            </div>
          </div>

          {/* Weak Topics Card (if any) */}
          {evaluation.weak_topics && evaluation.weak_topics.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>Identified Knowledge Gaps ({evaluation.weak_topics.length})</span>
                </h3>
                <span className="text-xs text-slate-400 font-medium">Recommended for revision</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {evaluation.weak_topics.map((t: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/60 text-xs flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-rose-950">{t}</div>
                      <div className="text-[11px] text-rose-800/80 mt-0.5">Diagnosed gap in {course.code}</div>
                    </div>
                    {onAskTutor && (
                      <div className="flex items-center gap-2 pt-1 border-t border-rose-200/50">
                        <button
                          type="button"
                          onClick={() => onAskTutor(`Explain "${t}" from the ${course.name} syllabus step-by-step.`)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold text-[11px] transition-colors"
                        >
                          Ask Tutor
                        </button>
                        <button
                          type="button"
                          onClick={() => onAskTutor(`Guide me through "${t}" using Socratic progressive hints.`)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 font-semibold text-[11px] transition-colors"
                        >
                          Socratic Fix
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question Breakdown List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Detailed Question Evaluation ({questions.length} Questions)
            </h3>

            {questions.map((q, qIdx) => {
              const selectedOption = userAnswers[q.id];
              const isCorrect = selectedOption === q.correct_index;

              return (
                <div
                  key={q.id || qIdx}
                  className={`bg-white border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 ${
                    isCorrect ? 'border-emerald-200' : 'border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isCorrect
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          Question {qIdx + 1} • {q.topic}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 pt-1">
                        {q.question}
                      </h4>
                    </div>
                  </div>

                  {/* Options with results coloring */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedOption === optIdx;
                      const isAnswer = optIdx === q.correct_index;

                      let optStyle = 'bg-slate-50/60 border-slate-200 text-slate-700';
                      if (isAnswer) {
                        optStyle = 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold';
                      } else if (isSelected && !isAnswer) {
                        optStyle = 'bg-rose-50 border-rose-300 text-rose-950 font-medium line-through';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 ${optStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                          {isAnswer && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                          {isSelected && !isAnswer && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                      <span className="font-bold text-slate-900 block">Syllabus Explanation:</span>
                      <p className="leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="text-center pt-2 pb-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setQuizStage('setup');
                setUserAnswers({});
                setEvaluation(null);
                setIsSubmitted(false);
                setCurrentQuestionIndex(0);
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-colors"
            >
              Back to Assessments Setup
            </button>
            <button
              type="button"
              onClick={handleStartQuiz}
              disabled={isGenerating}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Another Diagnostic Quiz</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ASSESSMENTS SETUP & OVERVIEW MODE                     */}
      {/* ======================================================== */}
      {quizStage === 'setup' && (
        <>
          {/* 1. Header (Panel 6 from Reference Concept) */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assessments</h1>
              <p className="text-xs text-slate-500 mt-0.5">Test your understanding with AI-generated quizzes</p>
            </div>

            {/* Tab Pills */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAssessmentTab('take-quiz')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  assessmentTab === 'take-quiz'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Take Quiz
              </button>
              <button
                type="button"
                onClick={() => setAssessmentTab('my-results')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  assessmentTab === 'my-results'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Results
              </button>
              <button
                type="button"
                onClick={() => setAssessmentTab('weak-topics')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  assessmentTab === 'weak-topics'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weak Topics
              </button>
            </div>
          </div>

          {/* Tab 1: Take Quiz (Setup Form Only) */}
          {assessmentTab === 'take-quiz' && (
            <div className="space-y-4">
              {generationError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{generationError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGenerationError(null)}
                    className="text-xs font-bold text-rose-700 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* 2. Top Two-Column Control Section (Panel 6 Layout) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Card: Create a New Quiz */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">Create a New Quiz</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {course.code}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Subject */}
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Subject</label>
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 truncate">
                        {course.name} ({course.code})
                      </div>
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Unit Focus</label>
                      <select
                        value={selectedUnitId}
                        onChange={(e) => setSelectedUnitId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-600 cursor-pointer"
                      >
                        <option value="all">Comprehensive (All Units)</option>
                        {course.units.map((u) => (
                          <option key={u.id} value={u.id}>
                            Unit {u.unitNumber}: {u.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Question Count */}
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Number of Questions</label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-600 cursor-pointer"
                      >
                        <option value={5}>5 Questions</option>
                        <option value={10}>10 Questions</option>
                        <option value={15}>15 Questions</option>
                        <option value={20}>20 Questions</option>
                      </select>
                    </div>

                    {/* Difficulty */}
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Difficulty</label>
                      <select
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-600 cursor-pointer"
                      >
                        <option value="Easy">Easy (Fundamentals)</option>
                        <option value="Medium">Medium (Balanced)</option>
                        <option value="Hard">Hard (Advanced Proofs)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleStartQuiz}
                      disabled={isGenerating}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isGenerating ? 'Generating Quiz Questions...' : 'Generate Quiz ✨'}</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Past Performance & Weak Topics */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Past Performance Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Past Performance</h3>
                      <div className="text-2xl font-extrabold text-slate-900 mt-1">
                        {courseAverageScore !== null ? `${courseAverageScore}%` : '—'}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Average Diagnostic Score ({course.code})</p>
                    </div>

                    <div className="text-right">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs ml-auto mb-1">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        {courseGradedQuizzes.length} {courseGradedQuizzes.length === 1 ? 'Quiz' : 'Quizzes'}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {courseGradedQuizzes.length > 0 ? 'Evaluated' : 'Completed'}
                      </span>
                    </div>
                  </div>

                  {/* Weak Topics Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Weak Topics</h3>
                      {detectedWeakTopics.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setAssessmentTab('weak-topics')}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                        >
                          View All ({detectedWeakTopics.length})
                        </button>
                      )}
                    </div>

                    {detectedWeakTopics.length > 0 ? (
                      <div className="space-y-2">
                        {detectedWeakTopics.slice(0, 3).map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-rose-50/60 border border-rose-200/60 text-xs"
                          >
                            <div className="flex items-center gap-2 text-rose-900 font-semibold truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              <span className="truncate">{item.topic}</span>
                            </div>
                            {onAskTutor && (
                              <button
                                type="button"
                                onClick={() => onAskTutor(`Help me understand "${item.topic}" from the syllabus.`)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 shrink-0 ml-2"
                              >
                                Ask Tutor
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-slate-500">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                        <span className="font-semibold text-slate-700 block">
                          {courseGradedQuizzes.length > 0 ? 'No Critical Weak Topics' : 'No Quizzes Evaluated'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {courseGradedQuizzes.length > 0
                            ? 'All tested topics answered accurately'
                            : 'Generate a quiz to identify knowledge gaps'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* Tab 2: My Results */}
      {assessmentTab === 'my-results' && (() => {
        const displayedQuizzes =
          resultsCourseFilter === 'current'
            ? courseGradedQuizzes
            : allGradedQuizzes;

        const displayedAvg =
          displayedQuizzes.length > 0
            ? Math.round(
                displayedQuizzes.reduce((acc, q) => acc + q.percentage, 0) /
                  displayedQuizzes.length
              )
            : null;

        const highestScore =
          displayedQuizzes.length > 0
            ? Math.max(...displayedQuizzes.map((q) => q.percentage))
            : null;

        const lowestScore =
          displayedQuizzes.length > 0
            ? Math.min(...displayedQuizzes.map((q) => q.percentage))
            : null;

        return (
          <div className="space-y-6">
            {/* Filter and Overview */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Assessment History & Graded Attempts
                </h2>
                <p className="text-xs text-slate-500">
                  Review your actual scored diagnostic quizzes and detailed answer keys.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Filter:</span>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setResultsCourseFilter('current')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      resultsCourseFilter === 'current'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {course.code} ({courseGradedQuizzes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultsCourseFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      resultsCourseFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Subjects ({allGradedQuizzes.length})
                  </button>
                </div>
              </div>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">Average Score</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {displayedAvg !== null ? `${displayedAvg}%` : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Calculated across attempts</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">Quizzes Evaluated</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  {displayedQuizzes.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {resultsCourseFilter === 'current' ? `In ${course.code}` : 'All subjects'}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">Highest Score</div>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {highestScore !== null ? `${highestScore}%` : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Personal best</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">Lowest Score</div>
                <div className="text-2xl font-extrabold text-amber-600 mt-1">
                  {lowestScore !== null ? `${lowestScore}%` : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Revision baseline</div>
              </div>
            </div>

            {/* Attempts List */}
            {displayedQuizzes.length > 0 ? (
              <div className="space-y-4">
                {displayedQuizzes.map((item, idx) => {
                  const isExpanded = expandedResultId === item.id;
                  const isPassed = item.percentage >= 70;
                  const evalDetails = item.details?.eval_details;

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {item.courseCode}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900">
                              {item.unitTitle || 'Diagnostic Assessment'}
                            </h3>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                isPassed
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {isPassed ? 'Passed' : 'Needs Review'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Submitted: {item.submittedAt || 'Recent'} • Attempt ID: {item.id}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-xl font-extrabold text-slate-900 font-mono">
                              {item.score}/{item.totalScore}
                            </div>
                            <div className="text-xs font-bold text-blue-600 font-mono">
                              {item.percentage}%
                            </div>
                          </div>

                          {evalDetails && evalDetails.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedResultId(isExpanded ? null : item.id)
                              }
                              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <span>{isExpanded ? 'Hide' : 'Review'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {item.details?.remediation_advice && (
                        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed">
                          <strong className="text-slate-800">Remediation Feedback: </strong>
                          {item.details.remediation_advice}
                        </div>
                      )}

                      {/* Question by question evaluation breakdown */}
                      {isExpanded && evalDetails && (
                        <div className="pt-3 border-t border-slate-100 space-y-3">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Detailed Question Breakdown ({evalDetails.length} Questions)
                          </h4>

                          <div className="space-y-2.5">
                            {evalDetails.map((ed: any, qIdx: number) => (
                              <div
                                key={ed.id || qIdx}
                                className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                                  ed.is_correct
                                    ? 'bg-emerald-50/50 border-emerald-200/70'
                                    : 'bg-rose-50/50 border-rose-200/70'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {ed.is_correct ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                    )}
                                    <span className="font-semibold text-slate-900">
                                      Q{qIdx + 1}: {ed.question}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono px-2 py-0.5 bg-white rounded border border-slate-200 text-slate-600 shrink-0">
                                    {ed.topic}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                                    <span className="text-slate-400 font-medium">Your Answer: </span>
                                    <span
                                      className={`font-semibold ${
                                        ed.is_correct ? 'text-emerald-700' : 'text-rose-700'
                                      }`}
                                    >
                                      {ed.selected_option || 'None'}
                                    </span>
                                  </div>
                                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                                    <span className="text-slate-400 font-medium">Correct Answer: </span>
                                    <span className="font-semibold text-emerald-700">
                                      {ed.correct_option}
                                    </span>
                                  </div>
                                </div>

                                {ed.explanation && (
                                  <p className="text-[11px] text-slate-600 pt-1 leading-relaxed">
                                    <strong className="text-slate-700">Explanation: </strong>
                                    {ed.explanation}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                <Award className="w-10 h-10 text-purple-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  No Graded Assessments Found
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {resultsCourseFilter === 'current'
                    ? `You haven't completed any quizzes for ${course.name} (${course.code}) yet.`
                    : 'You haven\'t completed any quizzes yet.'}
                </p>
                <button
                  type="button"
                  onClick={() => setAssessmentTab('take-quiz')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start a Diagnostic Quiz</span>
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab 3: Weak Topics */}
      {assessmentTab === 'weak-topics' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Knowledge Gap Diagnostics ({course.code})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated detection of conceptual blind spots from your quiz results, paired with Socratic remediation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {detectedWeakTopics.length} Identified Gaps
                </span>
              </div>
            </div>
          </div>

          {detectedWeakTopics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {detectedWeakTopics.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                        {item.count > 1 ? `${item.count} Mistakes` : 'Diagnostic Gap'}
                      </span>
                      <span className="text-xs font-mono text-slate-400 font-semibold">
                        {course.code}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-2">
                      {item.topic}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      This concept was answered incorrectly during recent assessments. Review the underlying syllabus theory or work through guided hints.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    {onAskTutor && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            onAskTutor(
                              `Explain "${item.topic}" from the ${course.name} syllabus step-by-step with clear examples.`
                            )
                          }
                          className="flex-1 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <BrainCircuit className="w-3.5 h-3.5 text-blue-600" />
                          <span>Ask AI Tutor</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onAskTutor(
                              `Guide me through understanding "${item.topic}" using the Socratic progressive hint method.`
                            )
                          }
                          className="flex-1 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                          <span>Socratic Fix</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                {courseGradedQuizzes.length > 0
                  ? 'Zero Knowledge Gaps Detected!'
                  : 'No Assessments Completed Yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {courseGradedQuizzes.length > 0
                  ? `Your evaluated quiz attempts for ${course.name} showed 100% correct answers across tested topics.`
                  : `Complete a diagnostic quiz in ${course.code} to automatically analyze your conceptual strengths and diagnose knowledge gaps.`}
              </p>
              <button
                type="button"
                onClick={() => setAssessmentTab('take-quiz')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Take Diagnostic Quiz</span>
              </button>
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Exit Active Quiz?</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {answeredCount} of {questions.length} answered
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If you return to the assessment setup screen now, your current answers and progress for this quiz will be discarded.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              >
                Stay in Quiz
              </button>
              <button
                type="button"
                onClick={confirmExitQuiz}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
