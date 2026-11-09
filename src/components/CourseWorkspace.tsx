import React, { useState } from 'react';
import { Course, Unit, SyllabusTopic } from '../types';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  BookmarkCheck,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  Clock,
  Layers,
  Search,
  Check,
} from 'lucide-react';

interface CourseWorkspaceProps {
  course: Course;
  courses?: Course[];
  onSelectCourse?: (courseId: string) => void;
  completedTopicIds: string[];
  onToggleTopic: (topicId: string, isCompleted: boolean) => void;
  onAskTutor: (prompt: string) => void;
}

export const CourseWorkspace: React.FC<CourseWorkspaceProps> = ({
  course,
  courses = [],
  onSelectCourse,
  completedTopicIds,
  onToggleTopic,
  onAskTutor,
}) => {
  // View mode: 'catalog' (Panel 3 overview) vs 'workspace' (single course drill-down)
  const [viewMode, setViewMode] = useState<'catalog' | 'workspace'>('catalog');
  const [selectedSemesterTab, setSelectedSemesterTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Single course units expanded state
  const [expandedUnitIds, setExpandedUnitIds] = useState<string[]>(
    course.units.map((u) => u.id)
  );

  React.useEffect(() => {
    setExpandedUnitIds(course.units.map((u) => u.id));
  }, [course.id]);

  const toggleUnit = (unitId: string) => {
    setExpandedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const getCourseCompletion = (c: Course) => {
    const total = c.units.reduce((acc, u) => acc + u.topics.length, 0);
    const completed = c.units.reduce(
      (acc, u) => acc + u.topics.filter((t) => completedTopicIds.includes(t.id)).length,
      0
    );
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const currentCourseTotalTopics = course.units.reduce((acc, u) => acc + u.topics.length, 0);
  const currentCourseCompleted = course.units.reduce(
    (acc, u) => acc + u.topics.filter((t) => completedTopicIds.includes(t.id)).length,
    0
  );
  const currentCoursePercentage =
    currentCourseTotalTopics > 0
      ? Math.round((currentCourseCompleted / currentCourseTotalTopics) * 100)
      : 0;

  // Filter courses for Panel 3 catalog view
  const displayCoursesList = courses.length > 0 ? courses : [course];
  const filteredCatalogCourses = displayCoursesList.filter((c) => {
    const matchesSemester =
      selectedSemesterTab === 'all'
        ? true
        : c.semester.toLowerCase().replace(/\s+/g, '') === selectedSemesterTab.toLowerCase().replace(/\s+/g, '');
    const matchesSearch =
      searchQuery === ''
        ? true
        : c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSemester && matchesSearch;
  });

  const getSemesterCount = (sem: string) => {
    if (sem === 'all') return displayCoursesList.length;
    return displayCoursesList.filter(
      (c) => c.semester.toLowerCase().replace(/\s+/g, '') === sem.toLowerCase().replace(/\s+/g, '')
    ).length;
  };

  const semesterTabs = [
    { id: 'all', label: `All (${getSemesterCount('all')})` },
    { id: 'Semester I', label: `Semester I (${getSemesterCount('Semester I')})` },
    { id: 'Semester II', label: `Semester II (${getSemesterCount('Semester II')})` },
    { id: 'Semester III', label: `Semester III (${getSemesterCount('Semester III')})` },
    { id: 'Semester IV', label: `Semester IV (${getSemesterCount('Semester IV')})` },
  ];

  // Helper color map for cards in Panel 3
  const getCourseBadgeColor = (code: string) => {
    if (code.includes('101') || code.includes('201')) return 'bg-teal-50 text-teal-700 border-teal-200';
    if (code.includes('202')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (code.includes('203')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (code.includes('204')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (code.includes('301')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (code.includes('401')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getProgressColor = (code: string) => {
    if (code.includes('101') || code.includes('201')) return 'bg-teal-500';
    if (code.includes('202')) return 'bg-purple-500';
    if (code.includes('301')) return 'bg-amber-500';
    return 'bg-blue-600';
  };

  return (
    <div className="space-y-6">
      {/* 1. VIEW MODE: CATALOG (Matches Panel 3 in Concept Image) */}
      {viewMode === 'catalog' ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Courses</h1>
              <p className="text-xs text-slate-500 mt-0.5">All subjects in your enrolled semester</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Filter Tabs (All, Semester I, II, III, IV) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
            {semesterTabs.map((tab) => {
              const isActive = selectedSemesterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedSemesterTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Course Cards Grid (Panel 3 Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCatalogCourses.map((c) => {
              const compPercent = getCourseCompletion(c);
              const totalUnits = c.units.length;
              const totalTopics = c.units.reduce((acc, u) => acc + u.topics.length, 0);
              const badgeColor = getCourseBadgeColor(c.code);
              const barColor = getProgressColor(c.code);

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (onSelectCourse) onSelectCourse(c.id);
                    setViewMode('workspace');
                  }}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${badgeColor}`}>
                        {c.code}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        {c.semester}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {c.name}
                    </h3>

                    <p className="text-xs text-slate-500 mt-2 font-medium">
                      {totalUnits} Units • {totalTopics} Topics
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Completion</span>
                      <span className="font-bold text-slate-900">{compPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`${barColor} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(6, compPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 2. VIEW MODE: SINGLE COURSE WORKSPACE (Detailed Syllabus Explorer) */
        <div className="space-y-6">
          {/* Breadcrumb & Navigation Back */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMode('catalog')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Courses</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">{course.semester}</span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                {course.code}
              </span>
            </div>
          </div>

          {/* Course Header Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">{course.name}</h1>
                <p className="text-xs md:text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed">
                  {course.description}
                </p>
              </div>

              {/* Progress Pill */}
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 shrink-0">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Syllabus Progress</div>
                  <div className="text-lg font-bold text-slate-900 font-mono">{currentCoursePercentage}%</div>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-blue-200 border-t-blue-600 flex items-center justify-center text-xs font-bold text-blue-700 font-mono">
                  {currentCourseCompleted}/{currentCourseTotalTopics}
                </div>
              </div>
            </div>

            {/* Reference Books */}
            {course.referenceBooks && course.referenceBooks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                  <BookmarkCheck className="w-3.5 h-3.5 text-blue-600" />
                  Recommended Reference Books & Syllabi
                </span>
                <div className="flex flex-wrap gap-2">
                  {course.referenceBooks.map((book, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium"
                    >
                      {book}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Unit-wise Syllabus Accordion */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Curriculum Units & Syllabus Topics</span>
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {course.units.length} Units • {currentCourseTotalTopics} Topics Total
              </span>
            </div>

            {course.units.map((unit) => {
              const isExpanded = expandedUnitIds.includes(unit.id);
              const unitTopicsCount = unit.topics.length;
              const unitCompletedCount = unit.topics.filter((t) =>
                completedTopicIds.includes(t.id)
              ).length;
              const unitPercentage =
                unitTopicsCount > 0
                  ? Math.round((unitCompletedCount / unitTopicsCount) * 100)
                  : 0;

              return (
                <div
                  key={unit.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs transition-all"
                >
                  {/* Unit Bar */}
                  <button
                    type="button"
                    onClick={() => toggleUnit(unit.id)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                        {unit.unitNumber}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Unit {unit.unitNumber}: {unit.title}
                        </h3>
                        {unit.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {unit.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-bold text-slate-800">{unitPercentage}%</span>
                        <span className="text-[11px] text-slate-400 block">
                          {unitCompletedCount}/{unitTopicsCount} done
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Topics List */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100 bg-[#FAFAFA]/50">
                      {unit.topics.map((topic) => {
                        const isDone = completedTopicIds.includes(topic.id);
                        return (
                          <div
                            key={topic.id}
                            className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-white transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={() => onToggleTopic(topic.id, !isDone)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                                  isDone
                                    ? 'bg-emerald-600 text-white'
                                    : 'border border-slate-300 hover:border-slate-400 bg-white'
                                }`}
                                aria-label={isDone ? 'Mark Incomplete' : 'Mark Complete'}
                              >
                                {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>

                              <span
                                className={`text-xs font-medium truncate ${
                                  isDone ? 'line-through text-slate-400' : 'text-slate-800'
                                }`}
                              >
                                {topic.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                  topic.difficulty === 'Easy'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : topic.difficulty === 'Medium'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {topic.difficulty}
                              </span>

                              <span className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1 font-medium">
                                <Clock className="w-3 h-3" />
                                {topic.estimatedHours}h
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  onAskTutor(
                                    `Explain the concept of "${topic.title}" from Unit ${unit.unitNumber} (${unit.title}) of ${course.name} with intuitive examples.`
                                  )
                                }
                                title="Ask AI Tutor about this topic"
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Sparkles className="w-3 h-3 text-blue-600" />
                                <span className="hidden md:inline">Ask Tutor</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
