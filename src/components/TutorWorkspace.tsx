import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Course,
  ChatMessage,
  AgentExecutionStep,
  User,
  StudentLearningProfile,
  LearningMode,
  SocraticState,
  SocraticAction,
} from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  Send,
  BrainCircuit,
  User as UserIcon,
  Trash2,
  Copy,
  Check,
  Sparkles,
  HelpCircle,
  Code2,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Layers,
  Loader2,
  RotateCcw,
  AlertTriangle,
  X,
  Award,
  TrendingUp,
  AlertCircle,
  BookOpen,
  Video,
  ExternalLink,
  Target,
  Lightbulb,
  Eye,
} from 'lucide-react';

interface TutorWorkspaceProps {
  user: User;
  course: Course;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onNavigateToQuiz?: () => void;
  initialMode?: LearningMode;
}

export const TutorWorkspace: React.FC<TutorWorkspaceProps> = ({
  user,
  course,
  initialPrompt,
  onClearInitialPrompt,
  onNavigateToQuiz,
  initialMode,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState(initialPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrievingHistory, setIsRetrievingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePipelineSteps, setActivePipelineSteps] = useState<AgentExecutionStep[]>([]);
  const [expandedTraceIds, setExpandedTraceIds] = useState<Record<string, boolean>>({});
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Learning Mode State (Normal vs Socratic Mode)
  const [learningMode, setLearningMode] = useState<LearningMode>(() => {
    if (initialMode) return initialMode;
    try {
      const saved = localStorage.getItem(`eduagent_mode_${user.id}`);
      return (saved === 'socratic' ? 'socratic' : 'normal') as LearningMode;
    } catch {
      return 'normal';
    }
  });

  useEffect(() => {
    if (initialMode && initialMode !== learningMode) {
      setLearningMode(initialMode);
    }
  }, [initialMode]);

  const handleModeChange = (mode: LearningMode) => {
    setLearningMode(mode);
    try {
      localStorage.setItem(`eduagent_mode_${user.id}`, mode);
    } catch {}
  };

  // Active Socratic Stage State
  const [activeSocraticState, setActiveSocraticState] = useState<SocraticState | null>(null);

  // Personalized Learning Profile states
  const [learningProfile, setLearningProfile] = useState<StudentLearningProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isWeakTopicsModalOpen, setIsWeakTopicsModalOpen] = useState(false);

  // Fetch real-time student performance profile for active course
  const fetchLearningProfile = useCallback(async () => {
    if (!user?.id || !course?.code) return;
    setIsLoadingProfile(true);
    try {
      const res = await fetch(
        `/api/student/learning-profile/${encodeURIComponent(user.id)}/${encodeURIComponent(course.code)}`,
        {
          headers: {
            'x-user-id': user.id,
            'x-user-role': user.role,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.profile) {
          setLearningProfile(data.profile);
        }
      }
    } catch (_err) {
      // Graceful fallback
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user.id, user.role, course.code]);

  useEffect(() => {
    fetchLearningProfile();
  }, [fetchLearningProfile]);

  // References to guard against race conditions during rapid course/unit switching
  const latestFetchId = useRef<number>(0);
  const currentScopeRef = useRef<{ courseId: string; unitId: string }>({
    courseId: course.id,
    unitId: 'all',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep scope ref synchronized
  useEffect(() => {
    currentScopeRef.current = { courseId: course.id, unitId: selectedUnitId };
  }, [course.id, selectedUnitId]);

  const toggleTrace = (msgId: string) => {
    setExpandedTraceIds((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Helper to generate unit-specific welcome message
  const getWelcomeMessage = useCallback(
    (c: Course, uId: string, mode: LearningMode = 'normal'): ChatMessage => {
      const activeUnit = uId !== 'all' ? c.units.find((u) => u.id === uId) : null;
      const unitLabel = activeUnit ? `Unit ${activeUnit.unitNumber}: ${activeUnit.title}` : 'Full Course Curriculum';
      if (mode === 'socratic') {
        return {
          id: `welcome-${c.id}-${uId}-socratic`,
          role: 'assistant',
          content: `Welcome to **Socratic Guided Learning** for **${c.code}: ${c.name}**!\n\nActive Scope: **${unitLabel}**.\n\nIn this mode, I will guide you with thought-provoking questions, stepping stones, and progressive hints (up to 3 levels) so you can discover solutions on your own. What curriculum topic or problem would you like to investigate?`,
          timestamp: 'Just now',
          mode: 'socratic',
        };
      }
      return {
        id: `welcome-${c.id}-${uId}`,
        role: 'assistant',
        content: `Welcome! I am your Academic Tutor Agent for **${c.code}: ${c.name}**.\n\nActive Scope: **${unitLabel}**.\n\nAll explanations are strictly grounded in your syllabus. What would you like to explore or solve today?`,
        timestamp: 'Just now',
        mode: 'normal',
      };
    },
    []
  );

  // Fetch persistent conversation history for student + course + unit
  const fetchConversationHistory = useCallback(
    async (courseId: string, unitId: string) => {
      const fetchId = ++latestFetchId.current;
      setIsRetrievingHistory(true);

      try {
        const res = await fetch(
          `/api/tutor/history/${encodeURIComponent(user.id)}/${encodeURIComponent(courseId)}/${encodeURIComponent(
            unitId
          )}`,
          {
            headers: {
              'x-user-id': user.id,
              'x-user-role': user.role,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        // Discard stale response if the user has switched course or unit in the meantime
        if (fetchId !== latestFetchId.current) return;

        if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
          const lastWithSocratic = [...data.messages]
            .reverse()
            .find((m) => m.role === 'assistant' && m.socraticState);
          if (lastWithSocratic?.socraticState) {
            setActiveSocraticState(lastWithSocratic.socraticState);
          } else {
            setActiveSocraticState(null);
          }
        } else {
          setMessages([getWelcomeMessage(course, unitId, learningMode)]);
          setActiveSocraticState(null);
        }
      } catch (_err) {
        if (fetchId !== latestFetchId.current) return;
        // Retain fresh default welcome on retrieval failure without deleting data
        setMessages([getWelcomeMessage(course, unitId)]);
      } finally {
        if (fetchId === latestFetchId.current) {
          setIsRetrievingHistory(false);
        }
      }
    },
    [user.id, user.role, course, getWelcomeMessage]
  );

  // Load history whenever student, course, or unit changes
  useEffect(() => {
    fetchConversationHistory(course.id, selectedUnitId);
  }, [course.id, selectedUnitId, fetchConversationHistory]);

  // Handle auto-fill prompt from external components (e.g. "Ask Tutor" buttons)
  useEffect(() => {
    if (initialPrompt) {
      setInputQuery(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt, onClearInitialPrompt]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (!isRetrievingHistory) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activePipelineSteps, isLoading, isRetrievingHistory]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to persist message directly to backend
  const persistMessage = async (courseId: string, unitId: string, msg: ChatMessage) => {
    try {
      await fetch('/api/tutor/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-role': user.role,
        },
        body: JSON.stringify({
          studentId: user.id,
          courseId,
          unitId,
          message: msg,
        }),
      });
    } catch (_err) {
      // Background save error handled safely
    }
  };

  // Socratic Mode: Request progressive hint
  const handleRequestHint = async () => {
    if (isLoading || isRetrievingHistory || !activeSocraticState || activeSocraticState.hintCount >= 3) return;

    const targetCourseId = course.id;
    const targetCourseCode = course.code;
    const targetCourseName = course.name;
    const targetUnitId = selectedUnitId;
    const nextCount = activeSocraticState.hintCount + 1;

    const activeUnit = course.units.find((u) => u.id === targetUnitId);
    const unitTitle = activeUnit ? `Unit ${activeUnit.unitNumber}: ${activeUnit.title}` : 'All Units';
    const syllabusTopics = activeUnit
      ? activeUnit.topics.map((t) => t.title)
      : course.units.flatMap((u) => u.topics.map((t) => t.title));

    const userMsg: ChatMessage = {
      id: `msg-u-hint-${Date.now()}`,
      role: 'user',
      content: `💡 Request Hint (${nextCount}/3) for "${activeSocraticState.originalQuery}"`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'socratic',
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    persistMessage(targetCourseId, targetUnitId, userMsg);

    setActivePipelineSteps([
      { step: 'Analysing Socratic Request', description: `Requesting progressive Hint #${nextCount} of 3`, status: 'running' },
    ]);

    try {
      const res = await fetch('/api/agent/coordinate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-role': user.role,
        },
        body: JSON.stringify({
          query: activeSocraticState.originalQuery,
          courseName: targetCourseName,
          courseCode: targetCourseCode,
          unitTitle,
          syllabusTopics,
          studentId: user.id,
          learningMode: 'socratic',
          socraticAction: 'request_hint',
          socraticState: activeSocraticState,
        }),
      });

      const data = await res.json();
      if (data.steps) setActivePipelineSteps(data.steps);

      const assistantMsg: ChatMessage = {
        id: `msg-a-hint-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        steps: data.steps,
        selectedAgent: data.selectedAgent,
        personalization: data.personalization,
        mode: 'socratic',
        socraticState: data.socraticState,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      persistMessage(targetCourseId, targetUnitId, assistantMsg);
      if (currentScopeRef.current.courseId === targetCourseId && currentScopeRef.current.unitId === targetUnitId) {
        setMessages((prev) => [...prev, assistantMsg]);
        if (data.socraticState) {
          setActiveSocraticState(data.socraticState);
        }
      }
    } catch (_err) {
      const fallbackHint =
        nextCount === 1
          ? `💡 **Hint 1 of 3 (Conceptual Foundation):**\nIn ${targetCourseName}, check the base preconditions of this operation. What invariant condition is this mechanism protecting from degradation?`
          : nextCount === 2
          ? `💡 **Hint 2 of 3 (Structural Guidance):**\nLook at how pointers or states transition during execution. Notice that updating one element requires synchronizing neighboring references.`
          : `💡 **Hint 3 of 3 (Stepping Stone):**\nHere is the key blueprint: The operation rearranges the immediate nodes so that the deepest branch becomes balanced, preserving asymptotic bounds.`;

      const fallbackState: SocraticState = {
        stage: `hint_${nextCount}` as any,
        hintCount: nextCount,
        maxHints: 3,
        originalQuery: activeSocraticState.originalQuery,
        currentGuidingQuestion: activeSocraticState.currentGuidingQuestion,
        isSolutionRevealed: false,
      };

      const assistantMsg: ChatMessage = {
        id: `msg-a-hint-${Date.now()}`,
        role: 'assistant',
        content: fallbackHint,
        mode: 'socratic',
        socraticState: fallbackState,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      persistMessage(targetCourseId, targetUnitId, assistantMsg);
      if (currentScopeRef.current.courseId === targetCourseId && currentScopeRef.current.unitId === targetUnitId) {
        setMessages((prev) => [...prev, assistantMsg]);
        setActiveSocraticState(fallbackState);
      }
    } finally {
      setIsLoading(false);
      setActivePipelineSteps([]);
    }
  };

  // Socratic Mode: Reveal complete solution
  const handleRevealSolution = async () => {
    if (isLoading || isRetrievingHistory || !activeSocraticState || activeSocraticState.isSolutionRevealed) return;

    const targetCourseId = course.id;
    const targetCourseCode = course.code;
    const targetCourseName = course.name;
    const targetUnitId = selectedUnitId;

    const activeUnit = course.units.find((u) => u.id === targetUnitId);
    const unitTitle = activeUnit ? `Unit ${activeUnit.unitNumber}: ${activeUnit.title}` : 'All Units';
    const syllabusTopics = activeUnit
      ? activeUnit.topics.map((t) => t.title)
      : course.units.flatMap((u) => u.topics.map((t) => t.title));

    const userMsg: ChatMessage = {
      id: `msg-u-rev-${Date.now()}`,
      role: 'user',
      content: `📖 Reveal Complete Solution for "${activeSocraticState.originalQuery}"`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'socratic',
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    persistMessage(targetCourseId, targetUnitId, userMsg);

    setActivePipelineSteps([
      { step: 'Synthesizing Full Solution', description: `Generating formal curriculum walkthrough for "${activeSocraticState.originalQuery}"`, status: 'running' },
    ]);

    try {
      const res = await fetch('/api/agent/coordinate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-role': user.role,
        },
        body: JSON.stringify({
          query: activeSocraticState.originalQuery,
          courseName: targetCourseName,
          courseCode: targetCourseCode,
          unitTitle,
          syllabusTopics,
          studentId: user.id,
          learningMode: 'socratic',
          socraticAction: 'reveal_solution',
          socraticState: activeSocraticState,
        }),
      });

      const data = await res.json();
      if (data.steps) setActivePipelineSteps(data.steps);

      const assistantMsg: ChatMessage = {
        id: `msg-a-rev-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        steps: data.steps,
        selectedAgent: data.selectedAgent,
        personalization: data.personalization,
        mode: 'socratic',
        socraticState: data.socraticState,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      persistMessage(targetCourseId, targetUnitId, assistantMsg);
      if (currentScopeRef.current.courseId === targetCourseId && currentScopeRef.current.unitId === targetUnitId) {
        setMessages((prev) => [...prev, assistantMsg]);
        if (data.socraticState) {
          setActiveSocraticState(data.socraticState);
        }
      }
    } catch (_err) {
      const fallbackState: SocraticState = {
        stage: 'solution_revealed',
        hintCount: activeSocraticState.hintCount,
        maxHints: 3,
        originalQuery: activeSocraticState.originalQuery,
        isSolutionRevealed: true,
      };

      const assistantMsg: ChatMessage = {
        id: `msg-a-rev-${Date.now()}`,
        role: 'assistant',
        content: `### ${targetCourseName} — Complete Solution Walkthrough\n\n**Topic:** ${activeSocraticState.originalQuery}\n\n**1. Core Academic Definition:**\nIn ${targetCourseName}, this concept satisfies core algorithmic invariants defined in your curriculum.\n\n**2. Step-by-Step Breakdown:**\n- **Invariance:** Verifies base preconditions and inductive steps.\n- **Complexity:** Analyzed under asymptotic notation (Big-O).\n- **Implementation:** Handles edge cases safely.`,
        mode: 'socratic',
        socraticState: fallbackState,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      persistMessage(targetCourseId, targetUnitId, assistantMsg);
      if (currentScopeRef.current.courseId === targetCourseId && currentScopeRef.current.unitId === targetUnitId) {
        setMessages((prev) => [...prev, assistantMsg]);
        setActiveSocraticState(fallbackState);
      }
    } finally {
      setIsLoading(false);
      setActivePipelineSteps([]);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToSend = (customQuery || inputQuery).trim();
    if (!queryToSend || isLoading || isRetrievingHistory) return;

    // Pin scope parameters at the exact moment of request
    const targetCourseId = course.id;
    const targetCourseCode = course.code;
    const targetCourseName = course.name;
    const targetUnitId = selectedUnitId;

    const isSocratic = learningMode === 'socratic';
    const isAnswerSubmission = isSocratic && activeSocraticState && !activeSocraticState.isSolutionRevealed;
    const socraticAction: SocraticAction = isAnswerSubmission ? 'submit_answer' : 'ask';

    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      content: queryToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: learningMode,
    };

    // Optimistically update message stream
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    // Persist user message to backend immediately
    persistMessage(targetCourseId, targetUnitId, userMsg);

    // Initial coordination trace animation
    setActivePipelineSteps([
      {
        step: 'Analysing Student Request',
        description: isAnswerSubmission
          ? `Evaluating student reasoning: "${queryToSend.slice(0, 60)}"`
          : `Evaluating query: "${queryToSend.slice(0, 60)}" [${learningMode.toUpperCase()} MODE]`,
        status: 'running',
      },
    ]);

    // Extract unit & syllabus topics
    const activeUnit = course.units.find((u) => u.id === targetUnitId);
    const unitTitle = activeUnit ? `Unit ${activeUnit.unitNumber}: ${activeUnit.title}` : 'All Units';
    const syllabusTopics = activeUnit
      ? activeUnit.topics.map((t) => t.title)
      : course.units.flatMap((u) => u.topics.map((t) => t.title));

    try {
      const res = await fetch('/api/agent/coordinate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-role': user.role,
        },
        body: JSON.stringify({
          query: queryToSend,
          courseName: targetCourseName,
          courseCode: targetCourseCode,
          unitTitle,
          syllabusTopics,
          studentId: user.id,
          learningMode,
          socraticAction,
          socraticState: activeSocraticState,
          studentAnswer: isAnswerSubmission ? queryToSend : undefined,
        }),
      });

      const data = await res.json();

      if (data.steps) {
        setActivePipelineSteps(data.steps);
      }

      const assistantMsg: ChatMessage = {
        id: `msg-a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'assistant',
        content: data.response,
        steps: data.steps,
        selectedAgent: data.selectedAgent,
        personalization: data.personalization,
        mode: learningMode,
        socraticState: data.socraticState,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Always persist to backend under target scope
      persistMessage(targetCourseId, targetUnitId, assistantMsg);

      // Only append to active UI stream if user hasn't switched away to another course or unit
      if (
        currentScopeRef.current.courseId === targetCourseId &&
        currentScopeRef.current.unitId === targetUnitId
      ) {
        setMessages((prev) => [...prev, assistantMsg]);
        if (data.socraticState) {
          setActiveSocraticState(data.socraticState);
        }
      }
    } catch (_err) {
      // Deterministic pedagogical fallback tailored to student mastery & mode
      let fallbackContent = '';
      let fallbackSocraticState: SocraticState | null = null;

      if (isSocratic) {
        if (isAnswerSubmission) {
          fallbackContent = `### 📝 Concept Evaluation & Next Step\n\n**Feedback on your reasoning:**\nYou have identified an essential part of the mechanism! In **${targetCourseName}**, paying close attention to state transitions and preconditions is key to correct design.\n\n**Next Guiding Question:**\nNow take the next step: How does this mechanism ensure that edge cases (such as duplicate entries, empty containers, or resource exhaustion) do not cause unexpected failures or state corruption?\n\n*💬 Respond with your thoughts, or click **Reveal Complete Solution** if you are ready to review the full academic walkthrough!*`;
          fallbackSocraticState = {
            stage: 'answered',
            hintCount: activeSocraticState?.hintCount || 0,
            maxHints: 3,
            originalQuery: activeSocraticState?.originalQuery || queryToSend,
            currentGuidingQuestion: `Next step on ${activeSocraticState?.originalQuery || queryToSend}`,
            isSolutionRevealed: false,
          };
        } else {
          fallbackContent = `### 💡 Socratic Guide: ${queryToSend}\n\nInstead of jumping straight to the final answer, let's build your intuition step-by-step so you can solve similar problems on your own.\n\n**Core Conceptual Checkpoint:**\nIn **${targetCourseName}**, this topic is designed to solve a specific performance bottleneck or preserve consistency.\n\n**Guiding Question 1:**\nWhat is the fundamental precondition or rule that this concept enforces? What would break if this rule were violated?\n\n*💬 Type your thoughts below, or click **Get Hint (1/3)** if you would like a guiding clue!*`;
          fallbackSocraticState = {
            stage: 'initial_question',
            hintCount: 0,
            maxHints: 3,
            originalQuery: queryToSend,
            currentGuidingQuestion: `Guiding Question for ${queryToSend}`,
            isSolutionRevealed: false,
          };
        }
      } else {
        if (learningProfile?.masteryLevel === 'Needs Attention') {
          fallbackContent = `### ${targetCourseName} — Step-by-Step Remedial Walkthrough\n\n**Topic:** ${queryToSend}\n\n**1. Intuitive Foundation (Why This Matters):**\nIn ${targetCourseName}, this concept can seem tricky at first, but its core purpose is simple: maintaining data invariants and state consistency during operations.\n\n**2. Step-by-Step Breakdown:**\n- **Step 1 (Preconditions):** Verify base states (null pointer, empty boundary, or single item).\n- **Step 2 (The Operation):** Perform the transition one pointer or variable at a time so no data is lost.\n- **Step 3 (Common Trap):** Forgetting to recalculate balance factors or update child pointers.\n\n**3. Guided Example:**\n\`\`\`text\nInitial State: [Unbalanced / Target Node]\n     ↓ Apply Transition\nResult State:  [Balanced & Correct Invariant]\n\`\`\`\n\n**4. Gentle Self-Check:**\nCan you describe what happens to the child subtrees during this transition? Ask me if you'd like to trace an example together!`;
        } else if (learningProfile?.masteryLevel === 'Mastery') {
          fallbackContent = `### ${targetCourseName} — Advanced Systems & Theoretical Analysis\n\n**Topic:** ${queryToSend}\n\n**1. Theoretical Formalism & Mathematical Bounds:**\nIn ${targetCourseName}, this mechanism guarantees an asymptotic upper bound of $\\mathcal{O}(\\log n)$ runtime and $\\mathcal{O}(n)$ space under strict structural invariants.\n\n**2. Low-Level Invariants & Architectural Trade-offs:**\n- **Memory Locality & Cache Penalties:** Pointer indirection introduces CPU cache line misses compared to contiguous memory buffers.\n- **Amortized Analysis:** Structural rebalancing costs are strictly bounded and amortized over sequential operation streams.\n- **Concurrency Hazards:** Requires fine-grained lock coupling or lock-free transactional primitives to prevent data races during mutation.\n\n**3. Advanced Engineering Challenge:**\nHow would you redesign this structure using SIMD-aligned vector blocks to minimize L1/L2 cache misses on modern 64-bit multi-core processors?`;
        } else {
          fallbackContent = `### ${targetCourseName} — Conceptual Walkthrough\n\n**Regarding:** ${queryToSend}\n\n**1. Theoretical Formulation:**\nIn ${targetCourseName}, this concept satisfies core algorithmic invariants defined in your curriculum.\n\n**2. Key Properties:**\n- Analyzed under asymptotic notation (Big-O).\n- Designed for predictable memory and pointer navigation.\n\n**3. Check Understanding:**\nWould you like a diagnostic quiz to verify your comprehension?`;
        }
      }

      const assistantMsg: ChatMessage = {
        id: `msg-a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'assistant',
        content: fallbackContent,
        mode: learningMode,
        socraticState: fallbackSocraticState || undefined,
        personalization: learningProfile
          ? {
              masteryLevel: learningProfile.masteryLevel,
              explanationMode:
                learningProfile.masteryLevel === 'Needs Attention'
                  ? 'Simplified & Step-by-Step Remedial Guidance'
                  : learningProfile.masteryLevel === 'Mastery'
                  ? 'Advanced Engineering & Theoretical Exposition'
                  : 'Balanced Conceptual & Practical Breakdown',
              courseScore: learningProfile.courseAverageScore,
              totalQuizzes: learningProfile.courseAssessmentsCount,
              weakTopics: learningProfile.weakTopics.map((w) => w.topic),
              repeatedMistakes: learningProfile.repeatedMistakes,
              strongTopics: learningProfile.strongTopics,
              recommendations: learningProfile.recommendations,
            }
          : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      persistMessage(targetCourseId, targetUnitId, assistantMsg);

      if (
        currentScopeRef.current.courseId === targetCourseId &&
        currentScopeRef.current.unitId === targetUnitId
      ) {
        setMessages((prev) => [...prev, assistantMsg]);
        if (fallbackSocraticState) {
          setActiveSocraticState(fallbackSocraticState);
        }
      }
    } finally {
      setIsLoading(false);
      setActivePipelineSteps([]);
    }
  };

  // Clear conversation with backend synchronization
  const handleConfirmClearChat = async () => {
    setIsClearing(true);
    try {
      await fetch(
        `/api/tutor/history/${encodeURIComponent(user.id)}/${encodeURIComponent(course.id)}/${encodeURIComponent(
          selectedUnitId
        )}`,
        {
          method: 'DELETE',
          headers: {
            'x-user-id': user.id,
            'x-user-role': user.role,
          },
        }
      );
    } catch (_err) {}

    setActiveSocraticState(null);
    setMessages([getWelcomeMessage(course, selectedUnitId, learningMode)]);
    setActivePipelineSteps([]);
    setIsClearing(false);
    setIsClearModalOpen(false);
  };

  const activeUnit = course.units.find((u) => u.id === selectedUnitId);
  const activeUnitLabel = activeUnit ? `Unit ${activeUnit.unitNumber}: ${activeUnit.title}` : 'All Units';

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* 1. Header (Panel 4 from Reference Concept) */}
      <div className="p-4 px-6 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI Tutor</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {course.code}
            </span>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">• {activeUnitLabel}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {learningMode === 'socratic'
              ? 'Socratic Mode active: Explore concepts through guiding questions and progressive hints.'
              : 'Ask any academic question from your syllabus. History is automatically saved per unit.'}
          </p>
        </div>

        {/* Mode Selector, Unit Selector & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Learning Mode Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => handleModeChange('normal')}
              disabled={isLoading || isRetrievingHistory}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                learningMode === 'normal'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Normal Mode: Direct, authoritative academic explanations"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Normal</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('socratic')}
              disabled={isLoading || isRetrievingHistory}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                learningMode === 'socratic'
                  ? 'bg-amber-500 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Socratic Mode: Guided discovery with progressive hints"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Socratic</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              disabled={isLoading || isRetrievingHistory}
              className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer disabled:opacity-60"
            >
              <option value="all">All Syllabus Units</option>
              {course.units.map((u) => (
                <option key={u.id} value={u.id}>
                  Unit {u.unitNumber}: {u.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsClearModalOpen(true)}
            disabled={isLoading || isRetrievingHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors disabled:opacity-50"
            title="Start new conversation and clear unit history"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* 1.5. Compact Learning-Context Indicator Strip */}
      <div className="bg-slate-50/90 border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-blue-600" />
            Learning Profile:
          </span>

          {/* Mastery Status Badge */}
          {learningProfile?.masteryLevel === 'Mastery' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <Award className="w-3 h-3 text-emerald-600" />
              Mastery ({learningProfile.courseAverageScore}% Avg)
            </span>
          )}
          {learningProfile?.masteryLevel === 'Developing' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
              <TrendingUp className="w-3 h-3 text-blue-600" />
              Developing ({learningProfile.courseAverageScore}% Avg)
            </span>
          )}
          {learningProfile?.masteryLevel === 'Needs Attention' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              Needs Attention ({learningProfile.courseAverageScore}% Avg)
            </span>
          )}
          {(!learningProfile || learningProfile?.masteryLevel === 'Unassessed') && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              <BookOpen className="w-3 h-3 text-slate-500" />
              New Learner (No Quizzes Yet)
            </span>
          )}

          {/* Weak Topics Indicator Chip */}
          {learningProfile && learningProfile.weakTopics.length > 0 && (
            <button
              type="button"
              onClick={() => setIsWeakTopicsModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer shadow-2xs"
              title="Click to view detected weak topics and review reasons"
            >
              <AlertTriangle className="w-3 h-3 text-red-600" />
              <span>
                {learningProfile.weakTopics.length} Weak Topic{learningProfile.weakTopics.length > 1 ? 's' : ''}
              </span>
              <span className="underline ml-0.5 font-normal">View & Revise</span>
            </button>
          )}

          {learningProfile && learningProfile.hasHistory && learningProfile.weakTopics.length === 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
              <Check className="w-3 h-3 text-emerald-600" />
              No critical weak topics
            </span>
          )}
        </div>

        {/* Quick Recommended Action */}
        <div className="flex items-center gap-2.5 text-[11px]">
          {learningProfile?.recommendations?.conceptToRevise ? (
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-slate-400 font-medium hidden sm:inline">Priority Revision:</span>
              <button
                type="button"
                onClick={() =>
                  handleSendMessage(
                    undefined,
                    `I need step-by-step remediation on "${learningProfile.recommendations.conceptToRevise}". Please break down the core invariant and common mistakes.`
                  )
                }
                className="font-bold text-red-600 hover:text-red-700 underline truncate max-w-[180px] sm:max-w-[220px]"
                title={learningProfile.recommendations.revisionReason}
              >
                {learningProfile.recommendations.conceptToRevise}
              </button>
            </div>
          ) : learningProfile?.recommendations?.nextTopicToStudy ? (
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-slate-400 font-medium hidden sm:inline">Next in Syllabus:</span>
              <button
                type="button"
                onClick={() =>
                  handleSendMessage(
                    undefined,
                    `Explain the core concepts and applications of "${learningProfile.recommendations.nextTopicToStudy}" from our syllabus.`
                  )
                }
                className="font-bold text-blue-600 hover:text-blue-700 underline truncate max-w-[180px] sm:max-w-[220px]"
              >
                {learningProfile.recommendations.nextTopicToStudy}
              </button>
            </div>
          ) : null}

          {onNavigateToQuiz && (
            <button
              type="button"
              onClick={onNavigateToQuiz}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px] transition-colors shadow-2xs"
            >
              Take Quiz
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#F8FAFC]/60">
        <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl w-full mx-auto space-y-6">
          {/* Loading Previous Messages Indicator */}
          {isRetrievingHistory ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Restoring Saved Conversation</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Loading history for {course.code} ({activeUnitLabel})...
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 w-full ${
                  msg.role === 'user' ? 'justify-end' : ''
                }`}
              >
                {/* User Message */}
                {msg.role === 'user' ? (
                  <div className="flex items-start gap-2.5 sm:gap-3 max-w-xl sm:max-w-2xl lg:max-w-3xl ml-auto flex-row-reverse">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 text-blue-950 p-4 sm:p-5 rounded-2xl rounded-tr-xs shadow-2xs text-xs sm:text-sm leading-relaxed">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-[10px] text-blue-500 font-mono block text-right mt-1.5">{msg.timestamp}</span>
                    </div>
                  </div>
                ) : (
                  /* Assistant Message: Expands across the balanced centered container */
                  <div className="flex items-start gap-3 sm:gap-3.5 w-full">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <BrainCircuit className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-5 sm:p-6 shadow-xs text-slate-800">
                      {/* Assistant Header Tag */}
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              msg.mode === 'socratic' || msg.socraticState
                                ? 'text-amber-800 bg-amber-50 border-amber-200'
                                : 'text-blue-700 bg-blue-50 border-blue-200'
                            }`}
                          >
                            {msg.mode === 'socratic' || msg.socraticState
                              ? '💡 Socratic Guide Agent'
                              : msg.selectedAgent || 'Academic Tutor Agent'}
                          </span>

                          {msg.socraticState && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                              {msg.socraticState.isSolutionRevealed
                                ? 'Full Solution'
                                : msg.socraticState.hintCount > 0
                                ? `Hint ${msg.socraticState.hintCount}/3`
                                : 'Guiding Question'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Content Rendering with KaTeX and Markdown */}
                      <div className="overflow-x-auto">
                        <MarkdownRenderer content={msg.content} />
                      </div>

                      {/* Optional Collapsed Technical Details Section */}
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => toggleTrace(msg.id)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                          >
                            <span>Multi-Agent Coordination Trace ({msg.steps.length} Stages)</span>
                            {expandedTraceIds[msg.id] ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {expandedTraceIds[msg.id] && (
                            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              {msg.steps.map((st, sIdx) => (
                                <div key={sIdx} className="flex items-start gap-2 text-[11px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                  <div>
                                    <strong className="text-slate-800">{st.step}:</strong>{' '}
                                    <span className="text-slate-600">{st.description}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Personalized Learning Guidance & Adaptive Recommendations */}
                      {msg.personalization && (
                        <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                              <span>Personalized Next Steps</span>
                            </div>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              Adapted for {msg.personalization.masteryLevel}: {msg.personalization.explanationMode}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {/* What to Study Next */}
                            {msg.personalization.recommendations?.nextTopicToStudy && (
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2">
                                <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                    What to Study Next
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSendMessage(
                                        undefined,
                                        `Explain the core concepts and applications of "${msg.personalization?.recommendations.nextTopicToStudy}" from our syllabus.`
                                      )
                                    }
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline text-left truncate block w-full mt-0.5 cursor-pointer"
                                  >
                                    {msg.personalization.recommendations.nextTopicToStudy} →
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Concept to Revise (Weak Topic) */}
                            {msg.personalization.recommendations?.conceptToRevise && (
                              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2">
                                <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                                    Concept to Revise
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSendMessage(
                                        undefined,
                                        `I need step-by-step remediation on "${msg.personalization?.recommendations.conceptToRevise}". Please explain the common mistakes and how to solve problems on this concept.`
                                      )
                                    }
                                    className="text-xs font-semibold text-amber-900 hover:text-amber-950 hover:underline text-left truncate block w-full mt-0.5 cursor-pointer"
                                  >
                                    {msg.personalization.recommendations.conceptToRevise} →
                                  </button>
                                  {msg.personalization.recommendations.revisionReason && (
                                    <p className="text-[10px] text-amber-700 mt-0.5 truncate">
                                      {msg.personalization.recommendations.revisionReason}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Interactive Practice Challenge */}
                            {msg.personalization.recommendations?.practiceQuestionPrompt && (
                              <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/70 flex items-start gap-2">
                                <FileQuestion className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                                    Recommended Practice
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSendMessage(
                                        undefined,
                                        msg.personalization?.recommendations.practiceQuestionPrompt || ''
                                      )
                                    }
                                    className="text-xs font-semibold text-indigo-900 hover:text-indigo-950 hover:underline text-left block w-full mt-0.5 line-clamp-2 cursor-pointer"
                                  >
                                    "{msg.personalization.recommendations.practiceQuestionPrompt}" →
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Recommended University Lecture */}
                            {msg.personalization.recommendations?.recommendedLecture && (
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2">
                                <Video className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                    University Lecture
                                  </span>
                                  <a
                                    href={msg.personalization.recommendations.recommendedLecture.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-slate-900 hover:text-blue-600 hover:underline truncate block mt-0.5 flex items-center gap-1"
                                  >
                                    <span className="truncate">{msg.personalization.recommendations.recommendedLecture.title}</span>
                                    <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 inline" />
                                  </a>
                                  <span className="text-[10px] text-slate-500 block mt-0.5">
                                    {msg.personalization.recommendations.recommendedLecture.channel} •{' '}
                                    {msg.personalization.recommendations.recommendedLecture.duration}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Live Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 w-full">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-xs shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 animate-spin text-blue-600" />
              </div>
              <div className="flex-1 bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl rounded-tl-xs shadow-xs text-xs sm:text-sm text-slate-600 flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping shrink-0" />
                <span>Coordinating with Academic AI agents and synthesizing syllabus guidance...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 3. Bottom Input Box & Socratic Action Bar */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl w-full mx-auto space-y-2.5">
          {/* Socratic Mode Interactive Action Bar */}
          {learningMode === 'socratic' && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 rounded-xl bg-amber-50/90 border border-amber-200 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="p-1.5 rounded-lg bg-amber-500 text-white shrink-0 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-950">
                      {activeSocraticState?.isSolutionRevealed
                        ? 'Complete Solution Revealed'
                        : activeSocraticState
                        ? activeSocraticState.hintCount > 0
                          ? `Hint Level ${activeSocraticState.hintCount} of 3`
                          : 'Guiding Question Active'
                        : 'Socratic Guided Discovery'}
                    </span>

                    {/* Progressive Hint Level Dots */}
                    {activeSocraticState && !activeSocraticState.isSolutionRevealed && (
                      <div className="flex items-center gap-1 ml-1" title={`Hint Progress: ${activeSocraticState.hintCount}/3`}>
                        <span className={`w-2 h-2 rounded-full ${activeSocraticState.hintCount >= 1 ? 'bg-amber-500' : 'bg-amber-200'}`} />
                        <span className={`w-2 h-2 rounded-full ${activeSocraticState.hintCount >= 2 ? 'bg-amber-500' : 'bg-amber-200'}`} />
                        <span className={`w-2 h-2 rounded-full ${activeSocraticState.hintCount >= 3 ? 'bg-amber-500' : 'bg-amber-200'}`} />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-amber-800/80 block">
                    {activeSocraticState?.isSolutionRevealed
                      ? 'Full academic solution is visible. Ask follow-up questions to test deep comprehension.'
                      : activeSocraticState
                      ? 'Type your reasoning below to evaluate your hypothesis, or request progressive clues.'
                      : 'Pose an academic topic or question to begin structured step-by-step reasoning.'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                {/* Request Progressive Hint Button */}
                {activeSocraticState && !activeSocraticState.isSolutionRevealed && (
                  <button
                    type="button"
                    onClick={handleRequestHint}
                    disabled={isLoading || isRetrievingHistory || activeSocraticState.hintCount >= 3}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-amber-900 hover:bg-amber-100 border border-amber-300 transition-colors shadow-2xs disabled:opacity-40"
                    title={
                      activeSocraticState.hintCount >= 3
                        ? 'All 3 progressive hints have been provided'
                        : `Get next progressive hint (${activeSocraticState.hintCount + 1}/3)`
                    }
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {activeSocraticState.hintCount >= 3
                        ? 'Max Hints (3/3)'
                        : `Get Hint (${activeSocraticState.hintCount + 1}/3)`}
                    </span>
                  </button>
                )}

                {/* Reveal Full Solution Button */}
                {activeSocraticState && !activeSocraticState.isSolutionRevealed && (
                  <button
                    type="button"
                    onClick={handleRevealSolution}
                    disabled={isLoading || isRetrievingHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-800 hover:bg-slate-100 border border-slate-300 transition-colors shadow-2xs disabled:opacity-40"
                    title="Reveal complete syllabus explanation"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Reveal Full Solution</span>
                  </button>
                )}

                {/* Exit Socratic Mode Button */}
                <button
                  type="button"
                  onClick={() => handleModeChange('normal')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-800 hover:text-amber-950 hover:bg-amber-100/80 transition-colors"
                  title="Switch back to Normal Learning Mode"
                >
                  Exit Socratic
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isLoading || isRetrievingHistory}
              placeholder={
                learningMode === 'socratic'
                  ? activeSocraticState && !activeSocraticState.isSolutionRevealed
                    ? 'Type your reasoning or answer to the guiding question...'
                    : `Ask a topic to explore with Socratic guidance in ${course.code}...`
                  : `Ask an academic question about ${course.code} (${activeUnitLabel})...`
              }
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white shadow-2xs transition-all disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading || isRetrievingHistory}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors shrink-0"
              aria-label="Send query"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Quick prompt suggestions */}
          <div className="flex items-center gap-2 overflow-x-auto text-[11px] text-slate-500 pb-0.5">
            <span className="font-semibold text-slate-400 shrink-0">Try asking:</span>
            {(learningMode === 'socratic'
              ? [
                  'Guide me through AVL tree rotations step-by-step',
                  'Help me deduce Dijkstra algorithm invariants',
                  'Lead me to solve deadlock conditions in Operating Systems',
                ]
              : [
                  'Explain core concepts with clear step-by-step examples',
                  'Derive key formulas and state computational bounds',
                  'Provide a sample practice problem with detailed analysis',
                ]
            ).map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(undefined, prompt)}
                disabled={isLoading || isRetrievingHistory}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 whitespace-nowrap transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Clear Conversation Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsClearModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Clear Conversation History?</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {course.code} • {activeUnitLabel}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              This will permanently delete the saved conversation history for this specific unit. Other units and subjects will remain unaffected.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearChat}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isClearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Clear History</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Weak Topics Diagnosis & Targeted Revision Modal */}
      {isWeakTopicsModalOpen && learningProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsWeakTopicsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Academic Weakness Diagnosis</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {course.code}: {course.name} • {learningProfile.weakTopics.length} Areas Requiring Revision
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Based on your actual assessment submissions, the following curriculum topics had incorrect answers or repeated mistakes. Select any topic to receive targeted step-by-step remediation from the AI Tutor.
            </p>

            <div className="space-y-3 mb-6">
              {learningProfile.weakTopics.map((wt, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-amber-200/90 bg-amber-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900">{wt.topic}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                        {wt.missedCount} Miss{wt.missedCount > 1 ? 'es' : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">{wt.reasons[0]}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsWeakTopicsModalOpen(false);
                      handleSendMessage(
                        undefined,
                        `I need step-by-step remediation on "${wt.topic}". Please explain the core invariant, common pitfalls, and a guided worked example.`
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Revise Topic</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              {onNavigateToQuiz && (
                <button
                  type="button"
                  onClick={() => {
                    setIsWeakTopicsModalOpen(false);
                    onNavigateToQuiz();
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FileQuestion className="w-3.5 h-3.5" />
                  <span>Practice with Adaptive Assessment</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsWeakTopicsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors ml-auto cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
