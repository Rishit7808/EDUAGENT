import React from 'react';
import { User, Course, ApiKeyStatus } from '../types';
import { BookOpen, KeyRound, LogOut, Menu, Search, Shield, ChevronDown } from 'lucide-react';

interface HeaderProps {
  user: User;
  courses: Course[];
  activeCourseId: string;
  onSelectCourse: (id: string) => void;
  onLogout: () => void;
  onOpenApiModal: () => void;
  apiStatus: ApiKeyStatus | null;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  courses,
  activeCourseId,
  onSelectCourse,
  onLogout,
  onOpenApiModal,
  apiStatus,
  onToggleSidebar,
  isSidebarCollapsed,
}) => {
  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 lg:px-6 h-16 flex items-center justify-between">
      {/* Brand identity & Sidebar Hamburger */}
      <div className="flex items-center gap-3">
        {user.role === 'student' && onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-slate-900">EDUAGENT</span>
            {user.role === 'admin' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Active Course Switcher (Student Only) */}
      {courses.length > 0 && user.role !== 'admin' && (
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 max-w-xs md:max-w-md">
          <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
          <select
            aria-label="Active Academic Course"
            value={activeCourseId}
            onChange={(e) => onSelectCourse(e.target.value)}
            className="bg-transparent text-xs text-slate-800 focus:outline-none w-full cursor-pointer truncate font-semibold"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id} className="bg-white text-slate-800">
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Right Actions: Search, Admin 3-Key indicator, User Profile & Logout */}
      <div className="flex items-center gap-3">
        {/* Admin Only 3-Key API Pool Status */}
        {user.role === 'admin' && (
          <button
            type="button"
            onClick={onOpenApiModal}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-colors"
            title="View 3-Key Gemini Pool Status"
          >
            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
            <span>3-Key Pool</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </button>
        )}

        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
            {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-none">{user.name}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 leading-none">
              {user.role === 'admin' ? 'Administrator' : user.semester || 'Semester III'}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={onLogout}
          title="Sign Out"
          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
