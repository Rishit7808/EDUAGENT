import React, { useState, useEffect } from 'react';
import { Course, StudyPlan, StudyTask, User } from '../types';
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  CheckCircle2,
  Circle,
  RefreshCw,
  AlertCircle,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Check,
  CheckSquare,
} from 'lucide-react';

interface SemesterPlannerProps {
  user: User;
  courses: Course[];
  activeCourse: Course;
  onTopicToggled?: (topicId: string, isCompleted: boolean) => void;
}

export const SemesterPlanner: React.FC<SemesterPlannerProps> = ({
  user,
  courses,
  activeCourse,
  onTopicToggled,
}) => {
  const [dailyHours, setDailyHours] = useState<number>(3.0);
  const [examDate, setExamDate] = useState<string>('2026-12-15');
  const [weakSubject, setWeakSubject] = useState<string>(activeCourse?.code || 'CS201');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [planView, setPlanView] = useState<'weekly' | 'daily'>('weekly');
  const [showConfig, setShowConfig] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // Fetch persisted study plan on mount
  const fetchPlan = async () => {
    setIsLoadingPlan(true);
    try {
      const res = await fetch(`/api/planner/${user.id}`);
      const data = await res.json();
      if (data && data.success && data.plan) {
        setPlan(data.plan);
        if (data.plan.daily_hours) setDailyHours(data.plan.daily_hours);
        if (data.plan.exam_date) setExamDate(data.plan.exam_date);
      } else {
        handleGeneratePlan();
      }
    } catch (_err) {
      // fallback
    } finally {
      setIsLoadingPlan(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [user.id]);

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          dailyHours,
          examDate,
          weakSubject,
        }),
      });
      const data = await res.json();
      if (data.success && data.plan) {
        setPlan(data.plan);
        setShowConfig(false);
      }
    } catch (_err) {
      console.error('Failed to generate study plan', _err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    // Optimistic UI update
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                is_completed: nextStatus,
                status: nextStatus ? 'completed' : 'pending',
              }
            : t
        ),
      };
    });

    try {
      const res = await fetch('/api/planner/toggle-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          taskId,
          isCompleted: nextStatus,
        }),
      });
      const data = await res.json();
      if (data.success && data.plan) {
        setPlan(data.plan);
        const task = data.plan.tasks.find((t: any) => t.id === taskId);
        if (task && task.topic_id && onTopicToggled) {
          onTopicToggled(task.topic_id, nextStatus);
        }
      }
    } catch (_err) {
      console.error('Failed to toggle task completion', _err);
    }
  };

  const tasksList = plan?.tasks || [];
  const completedCount = tasksList.filter((t) => t.is_completed).length;
  const progressPct = tasksList.length > 0 ? Math.round((completedCount / tasksList.length) * 100) : 0;

  // Pagination for weekly view (7 tasks per week)
  const pageSize = planView === 'weekly' ? 7 : 3;
  const totalWeeks = Math.max(1, Math.ceil(tasksList.length / pageSize));
  const currentTasks = tasksList.slice(weekOffset * pageSize, (weekOffset + 1) * pageSize);

  const getSubjectBadgeStyle = (title: string, courseName?: string) => {
    if (title.startsWith('CS101') || title.startsWith('CS201')) return 'bg-teal-50 text-teal-700 border-teal-200';
    if (title.startsWith('CS202')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (title.startsWith('CS203')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (title.startsWith('CS204')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (title.startsWith('CS301') || title.toLowerCase().includes('os')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (title.startsWith('CS401')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (title.startsWith('CS489') || title.toLowerCase().includes('network')) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  if (isLoadingPlan && !plan) {
    return (
      <div className="p-16 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Synthesizing Personalized Syllabus Roadmap...</h3>
        <p className="text-xs text-slate-400 mt-1">Autonomous multi-agent scheduler balancing daily cognitive load.</p>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="space-y-6">
      {/* 1. Header (Panel 5 in Reference Concept) */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Semester Planner</h1>
          <p className="text-xs text-slate-500 mt-0.5">AI-generated personalized study schedule</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggles (Weekly / Daily) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setPlanView('weekly'); setWeekOffset(0); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                planView === 'weekly'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly Plan
            </button>
            <button
              type="button"
              onClick={() => { setPlanView('daily'); setWeekOffset(0); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                planView === 'daily'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Plan
            </button>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs text-xs font-semibold text-slate-700">
            <button
              type="button"
              disabled={weekOffset === 0}
              onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
              className="p-1 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[11px] whitespace-nowrap">
              {planView === 'weekly'
                ? `Week ${weekOffset + 1} of ${totalWeeks}`
                : `Day ${weekOffset + 1} of ${tasksList.length}`}
            </span>
            <button
              type="button"
              disabled={weekOffset >= totalWeeks - 1}
              onClick={() => setWeekOffset((prev) => Math.min(totalWeeks - 1, prev + 1))}
              className="p-1 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
              aria-label="Next week"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Settings Trigger */}
          <button
            type="button"
            onClick={() => setShowConfig((prev) => !prev)}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 shadow-2xs transition-colors"
            title="Configure Study Parameters"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Optional Configuration Drawer */}
      {showConfig && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Personalize Study Plan Parameters</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Auto-distributes syllabus topics</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Daily Study Hours: <span className="text-blue-600 font-bold">{dailyHours} hrs</span>
              </label>
              <input
                type="range"
                min={1}
                max={8}
                step={0.5}
                value={dailyHours}
                onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer mt-1"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Target Examination Date</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Prioritize Weak Subject</label>
              <select
                value={weakSubject}
                onChange={(e) => setWeakSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              {isGenerating ? 'Recalculating Schedule...' : 'Regenerate Study Schedule ✨'}
            </button>
          </div>
        </div>
      )}

      {/* 3. Progress Overview Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
            {progressPct}%
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              {completedCount} of {tasksList.length} Tasks Completed
            </div>
            <div className="text-[11px] text-slate-500">
              Target Exam Date: <strong className="text-slate-700">{plan.exam_date || examDate}</strong>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-64 bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(4, progressPct)}%` }}
          />
        </div>
      </div>

      {/* 4. Day-wise Study Tasks (Panel 5 Layout) */}
      <div className="space-y-3">
        {currentTasks.map((task) => {
          const badgeClass = getSubjectBadgeStyle(task.title, task.course_name);
          const isDone = task.is_completed;

          return (
            <div
              key={task.id}
              className={`bg-white border rounded-2xl p-4.5 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isDone ? 'border-slate-200/80 bg-[#FAFAFA]' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Left Day & Details */}
              <div className="flex items-start sm:items-center gap-4">
                {/* Date Tag */}
                <div className="w-24 shrink-0">
                  <span className="text-xs font-bold text-slate-800 block">
                    {task.date || `Day ${task.day_number}`}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize block">
                    {task.type} session
                  </span>
                </div>

                {/* Task Content */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}`}>
                      {task.course_name || 'Core Curriculum'}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        isDone ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>

                  {task.unit_title && (
                    <p className="text-[11px] text-slate-500 font-medium">
                      {task.unit_title}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Duration & Checkbox */}
              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-28 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1 font-semibold bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{task.duration_hours || 2.0} hrs</span>
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleTask(task.id, isDone)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-300 hover:border-slate-400 bg-white'
                  }`}
                  aria-label={isDone ? 'Mark task pending' : 'Mark task completed'}
                >
                  {isDone && <Check className="w-4 h-4 stroke-[3]" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
