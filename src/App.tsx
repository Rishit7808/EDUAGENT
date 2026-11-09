import React, { useState, useEffect } from 'react';
import { User, Course, AssessmentResult, ApiKeyStatus } from './types';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { CourseWorkspace } from './components/CourseWorkspace';
import { TutorWorkspace } from './components/TutorWorkspace';
import { BookLibrary } from './components/BookLibrary';
import { VideoLibrary } from './components/VideoLibrary';
import { SemesterPlanner } from './components/SemesterPlanner';
import { Assessments } from './components/Assessments';
import { ProgressAnalytics } from './components/ProgressAnalytics';
import { ApiStatusModal } from './components/ApiStatusModal';
import {
  LayoutDashboard,
  BookOpen,
  BrainCircuit,
  Library,
  Video,
  Calendar,
  FileQuestion,
  TrendingUp,
  Settings,
  Shield,
  KeyRound,
  Lightbulb,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string>('');
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>(['top-1-1', 'top-1-2']);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentResult[]>([]);
  const [apiStatus, setApiStatus] = useState<ApiKeyStatus | null>(null);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [tutorInitialPrompt, setTutorInitialPrompt] = useState<string>('');

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileDrawerOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  // Fetch courses (filtered by student semester if applicable)
  const loadCourses = async (user?: User | null) => {
    try {
      const activeUser = user !== undefined ? user : currentUser;
      let url = '/api/courses';
      if (activeUser && activeUser.role === 'student' && activeUser.semester) {
        url = `/api/courses?semester=${encodeURIComponent(activeUser.semester)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data && Array.isArray(data.courses)) {
        setCourses(data.courses);
        if (data.courses.length > 0) {
          if (!data.courses.some((c: Course) => c.id === activeCourseId)) {
            setActiveCourseId(data.courses[0].id);
          }
        } else {
          setActiveCourseId('');
        }
      }
    } catch (_err) {
      // Fallback handled in backend
    }
  };

  const loadApiStatus = async (user?: User | null) => {
    const activeUser = user !== undefined ? user : currentUser;
    // Only administrators fetch internal API status
    if (!activeUser || activeUser.role !== 'admin') {
      setApiStatus(null);
      return;
    }
    try {
      const res = await fetch('/api/system/api-keys', {
        headers: {
          'x-user-role': activeUser.role,
          'x-user-id': activeUser.id,
        },
      });
      const data = await res.json();
      if (data.success) {
        setApiStatus(data);
      }
    } catch (_err) {
      // Offline fallback
    }
  };

  const loadStudentProgress = async (studentId: string, courseId: string) => {
    try {
      const res = await fetch(`/api/progress/${studentId}/${courseId}`);
      const data = await res.json();
      if (data.completedTopicIds) {
        setCompletedTopicIds(data.completedTopicIds);
      }
    } catch (_err) {}
  };

  const loadAssessmentHistory = async (studentId: string) => {
    try {
      const res = await fetch(`/api/assessments/history/${studentId}`);
      const data = await res.json();
      if (data.history) {
        setAssessmentHistory(data.history);
      }
    } catch (_err) {}
  };

  useEffect(() => {
    loadCourses(currentUser);
    loadApiStatus(currentUser);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.id && activeCourseId) {
      loadStudentProgress(currentUser.id, activeCourseId);
      loadAssessmentHistory(currentUser.id);
    }
  }, [currentUser, activeCourseId]);

  const handleToggleTopic = async (topicId: string, isCompleted: boolean) => {
    if (!currentUser) return;
    setCompletedTopicIds((prev) =>
      isCompleted ? [...prev, topicId] : prev.filter((id) => id !== topicId)
    );

    try {
      await fetch('/api/progress/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentUser.id,
          topicId,
          isCompleted,
        }),
      });
    } catch (_err) {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveSection('dashboard');
  };

  if (!currentUser) {
    return <AuthModal onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  const totalCourseTopics = activeCourse?.units.reduce((acc, u) => acc + u.topics.length, 0) || 0;
  const completedInActiveCourse =
    activeCourse?.units.reduce(
      (acc, u) => acc + u.topics.filter((t) => completedTopicIds.includes(t.id)).length,
      0
    ) || 0;
  const completionPercentage =
    totalCourseTopics > 0
      ? Math.round((completedInActiveCourse / totalCourseTopics) * 100)
      : 0;

  // Student Navigation Items (Linear & EdTech Redesign)
  const studentNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'tutor', label: 'AI Tutor', icon: BrainCircuit },
    { id: 'socratic', label: 'Socratic Learning', icon: Lightbulb },
    { id: 'assessments', label: 'Assessments', icon: FileQuestion },
    { id: 'progress', label: 'Learning Analytics', icon: TrendingUp },
    { id: 'planner', label: 'Semester Planner', icon: Calendar },
    { id: 'books', label: 'Research', icon: Library },
    { id: 'videos', label: 'Video Library', icon: Video },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <Header
        user={currentUser}
        courses={courses}
        activeCourseId={activeCourseId}
        onSelectCourse={(id) => setActiveCourseId(id)}
        onLogout={handleLogout}
        onOpenApiModal={() => setIsApiModalOpen(true)}
        apiStatus={apiStatus}
        onToggleSidebar={handleToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Mobile Drawer Overlay for Small/Tablet Screens (< lg) */}
      {currentUser.role === 'student' && isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Menu */}
          <div className="fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 p-5 shadow-2xl flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                    EA
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Student Portal</div>
                    <div className="text-[11px] text-slate-500">{currentUser.name}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  aria-label="Close Navigation"
                >
                  ✕
                </button>
              </div>

              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                Navigation
              </div>

              <nav className="space-y-1">
                {studentNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveSection(item.id);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-200 px-2 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium block">
                Enrolled: <strong className="text-slate-800">{currentUser.semester || 'Semester III'}</strong>
              </span>
              <span className="text-[11px] text-slate-400 font-mono block">
                ID: {currentUser.id}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-7xl 2xl:max-w-[1600px] w-full mx-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-6">
        {/* Desktop Collapsible Sidebar for Students */}
        {currentUser.role === 'student' && (
          <aside
            className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${
              isSidebarCollapsed ? 'w-20' : 'w-60'
            }`}
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sticky top-22 shadow-xs">
              {!isSidebarCollapsed ? (
                <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Navigation</span>
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-semibold">
                    6 Agents
                  </span>
                </div>
              ) : (
                <div className="text-center py-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" title="Agents Online" />
                </div>
              )}

              <nav className="space-y-1 mt-1">
                {studentNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all group ${
                        isSidebarCollapsed
                          ? 'justify-center p-3 relative'
                          : 'gap-3 px-3.5 py-2.5'
                      } ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      {!isSidebarCollapsed && <span>{item.label}</span>}

                      {/* Tooltip on collapsed desktop view */}
                      {isSidebarCollapsed && (
                        <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-lg font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {!isSidebarCollapsed ? (
                <div className="mt-6 pt-4 border-t border-slate-200 px-3">
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Semester: <strong className="text-slate-800">{currentUser.semester || 'Semester III'}</strong>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                    ID: {currentUser.id}
                  </span>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-center">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    SEM
                  </span>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Main Content Pane */}
        <main className="flex-1 min-w-0 transition-all duration-300">
          {currentUser.role === 'admin' ? (
            <AdminDashboard
              courses={courses}
              activeCourseId={activeCourseId}
              onRefreshCourses={loadCourses}
              apiStatus={apiStatus}
            />
          ) : (
            <>
              {activeSection === 'dashboard' && (
                <StudentDashboard
                  user={currentUser}
                  courses={courses}
                  activeCourse={activeCourse}
                  completionPercentage={completionPercentage}
                  completedTopicsCount={completedInActiveCourse}
                  totalTopicsCount={totalCourseTopics}
                  completedTopicIds={completedTopicIds}
                  assessmentHistory={assessmentHistory}
                  onNavigate={(sec) => setActiveSection(sec)}
                  onAskTutorPrompt={(prompt) => {
                    setTutorInitialPrompt(prompt);
                    setActiveSection('tutor');
                  }}
                />
              )}

              {activeSection === 'courses' && activeCourse && (
                <CourseWorkspace
                  course={activeCourse}
                  courses={courses}
                  onSelectCourse={(id) => setActiveCourseId(id)}
                  completedTopicIds={completedTopicIds}
                  onToggleTopic={handleToggleTopic}
                  onAskTutor={(prompt) => {
                    setTutorInitialPrompt(prompt);
                    setActiveSection('tutor');
                  }}
                />
              )}

              {(activeSection === 'tutor' || activeSection === 'socratic') && activeCourse && (
                <TutorWorkspace
                  user={currentUser}
                  course={activeCourse}
                  initialPrompt={tutorInitialPrompt}
                  initialMode={activeSection === 'socratic' ? 'socratic' : 'normal'}
                  onClearInitialPrompt={() => setTutorInitialPrompt('')}
                  onNavigateToQuiz={() => setActiveSection('assessments')}
                />
              )}

              {activeSection === 'books' && activeCourse && (
                <BookLibrary course={activeCourse} />
              )}

              {activeSection === 'videos' && activeCourse && (
                <VideoLibrary course={activeCourse} />
              )}

              {activeSection === 'planner' && activeCourse && (
                <SemesterPlanner
                  user={currentUser}
                  courses={courses}
                  activeCourse={activeCourse}
                  onTopicToggled={(topicId, isCompleted) => {
                    handleToggleTopic(topicId, isCompleted);
                  }}
                />
              )}

              {activeSection === 'assessments' && activeCourse && (
                <Assessments
                  user={currentUser}
                  course={activeCourse}
                  assessmentHistory={assessmentHistory}
                  onAssessmentCompleted={(newRes) => {
                    setAssessmentHistory((prev) => [newRes, ...prev]);
                  }}
                  onAskTutor={(prompt) => {
                    setTutorInitialPrompt(prompt);
                    setActiveSection('tutor');
                  }}
                />
              )}

              {activeSection === 'progress' && activeCourse && (
                <ProgressAnalytics
                  user={currentUser}
                  courses={courses}
                  activeCourse={activeCourse}
                  completedTopicIds={completedTopicIds}
                  assessmentHistory={assessmentHistory}
                />
              )}

              {activeSection === 'settings' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-blue-600" />
                      Student Profile & Academic Configuration
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Manage your academic credentials and enrolled semester preferences.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 font-medium">Student Name</span>
                      <div className="text-sm font-bold text-slate-900 mt-1">{currentUser.name}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 font-medium">Academic Email</span>
                      <div className="text-sm font-bold text-slate-900 mt-1">{currentUser.email}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 font-medium">Registered Semester</span>
                      <div className="text-sm font-bold text-blue-600 mt-1">
                        {currentUser.semester || 'Semester III'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">ID: {currentUser.id}</span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold transition-colors"
                    >
                      Log Out of Workspace
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* 3-Key API Status Modal */}
      <ApiStatusModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        status={apiStatus}
      />
    </div>
  );
}
