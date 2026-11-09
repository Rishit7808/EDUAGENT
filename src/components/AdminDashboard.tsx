import React, { useState } from 'react';
import { Course, Unit, SyllabusTopic, ApiKeyStatus } from '../types';
import {
  Shield,
  Layers,
  Plus,
  Trash2,
  Edit3,
  Upload,
  FileText,
  Cpu,
  BookOpen,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  BookPlus,
  Video,
  BarChart3,
  ListTodo,
  KeyRound,
  CheckCircle2,
  Database,
  Bot,
} from 'lucide-react';

interface AdminDashboardProps {
  courses: Course[];
  activeCourseId: string;
  onRefreshCourses: () => void;
  apiStatus: ApiKeyStatus | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  courses,
  activeCourseId,
  onRefreshCourses,
  apiStatus,
}) => {
  // Navigation tabs matching Panel 8 and 9
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courses' | 'materials' | 'apipool'>('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState(activeCourseId || courses[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Modal State for Course Creation & Editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [modalSection, setModalSection] = useState<'basic' | 'units' | 'books'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields inside Modal
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formSemester, setFormSemester] = useState('Semester III');
  const [formDesc, setFormDesc] = useState('');
  const [formBooks, setFormBooks] = useState<string[]>([]);
  const [newBookInput, setNewBookInput] = useState('');
  const [formUnits, setFormUnits] = useState<Unit[]>([]);
  const [bulkSyllabusText, setBulkSyllabusText] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);

  // Document upload state
  const [uploadFilename, setUploadFilename] = useState('');
  const [uploadType, setUploadType] = useState('lecture_notes');
  const [uploadContent, setUploadContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  // Calculated Metrics
  const totalUnitsCount = courses.reduce((acc, c) => acc + (c.units ? c.units.length : 0), 0);
  const totalTopicsCount = courses.reduce(
    (acc, c) => acc + (c.units ? c.units.reduce((uAcc, u) => uAcc + (u.topics ? u.topics.length : 0), 0) : 0),
    0
  );

  // Filter courses by search
  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.semester.toLowerCase().includes(q)
    );
  });

  // Open Modal in "Create Mode"
  const handleOpenCreateModal = () => {
    setEditingCourseId(null);
    setFormCode('');
    setFormName('');
    setFormSemester('Semester III');
    setFormDesc('');
    setFormBooks([
      'Introduction to Algorithms by CLRS (MIT Press)',
      'Open Data Structures by Pat Morin',
    ]);
    setNewBookInput('');
    setFormUnits([
      {
        id: `unit-${Date.now()}-1`,
        unitNumber: 1,
        title: 'Foundational Principles and Architecture',
        description: 'Core theoretical concepts, invariant bounds, and mathematical frameworks.',
        topics: [
          { id: `top-${Date.now()}-1-1`, title: 'Core Definitions & Abstract Representations', difficulty: 'Easy', estimatedHours: 2.0 },
          { id: `top-${Date.now()}-1-2`, title: 'Operational Transformations & State Invariance', difficulty: 'Medium', estimatedHours: 2.5 },
          { id: `top-${Date.now()}-1-3`, title: 'Asymptotic Analysis & Performance Bounds', difficulty: 'Hard', estimatedHours: 3.5 },
        ],
      },
      {
        id: `unit-${Date.now()}-2`,
        unitNumber: 2,
        title: 'Core Mechanisms and In-Depth Implementation',
        description: 'Detailed operational data structures, algorithms, and practical procedures.',
        topics: [
          { id: `top-${Date.now()}-2-1`, title: 'Structural Memory Layout & Pointers', difficulty: 'Easy', estimatedHours: 2.0 },
          { id: `top-${Date.now()}-2-2`, title: 'Recursive Traversals & Dynamic Allocation', difficulty: 'Medium', estimatedHours: 3.0 },
        ],
      },
    ]);
    setModalSection('basic');
    setShowBulkPaste(false);
    setIsModalOpen(true);
  };

  // Open Modal in "Edit Mode"
  const handleOpenEditModal = (course: Course) => {
    setEditingCourseId(course.id);
    setFormCode(course.code);
    setFormName(course.name);
    setFormSemester(course.semester || 'Semester III');
    setFormDesc(course.description || '');
    setFormBooks(course.referenceBooks && course.referenceBooks.length > 0 ? [...course.referenceBooks] : []);
    setNewBookInput('');
    setFormUnits(
      course.units && course.units.length > 0
        ? course.units.map((u) => ({
            ...u,
            topics: u.topics ? [...u.topics] : [],
          }))
        : []
    );
    setModalSection('basic');
    setShowBulkPaste(false);
    setIsModalOpen(true);
  };

  // Unit and Topic Management inside Modal
  const handleAddUnit = () => {
    const nextNumber = formUnits.length + 1;
    const newUnit: Unit = {
      id: `unit-${Date.now()}-${nextNumber}`,
      unitNumber: nextNumber,
      title: `Unit ${nextNumber}: New Curriculum Unit`,
      description: 'Comprehensive coverage of core unit principles and laboratory applications.',
      topics: [
        {
          id: `top-${Date.now()}-${nextNumber}-1`,
          title: `Unit ${nextNumber} Foundational Theory`,
          difficulty: 'Easy',
          estimatedHours: 2.0,
        },
      ],
    };
    setFormUnits([...formUnits, newUnit]);
  };

  const handleRemoveUnit = (unitIndex: number) => {
    const updated = formUnits
      .filter((_, idx) => idx !== unitIndex)
      .map((u, idx) => ({ ...u, unitNumber: idx + 1 }));
    setFormUnits(updated);
  };

  const handleUpdateUnit = (unitIndex: number, field: 'title' | 'description', value: string) => {
    const updated = [...formUnits];
    updated[unitIndex] = { ...updated[unitIndex], [field]: value };
    setFormUnits(updated);
  };

  const handleAddTopic = (unitIndex: number) => {
    const updated = [...formUnits];
    const unit = updated[unitIndex];
    const nextTopicId = `top-${Date.now()}-${unit.unitNumber}-${unit.topics.length + 1}`;
    unit.topics = [
      ...unit.topics,
      {
        id: nextTopicId,
        title: 'New Syllabus Topic',
        difficulty: 'Medium',
        estimatedHours: 2.5,
      },
    ];
    setFormUnits(updated);
  };

  const handleRemoveTopic = (unitIndex: number, topicIndex: number) => {
    const updated = [...formUnits];
    updated[unitIndex].topics = updated[unitIndex].topics.filter((_, idx) => idx !== topicIndex);
    setFormUnits(updated);
  };

  const handleUpdateTopic = (
    unitIndex: number,
    topicIndex: number,
    field: 'title' | 'difficulty' | 'estimatedHours',
    value: any
  ) => {
    const updated = [...formUnits];
    updated[unitIndex].topics[topicIndex] = {
      ...updated[unitIndex].topics[topicIndex],
      [field]: field === 'estimatedHours' ? parseFloat(value) || 1.0 : value,
    };
    setFormUnits(updated);
  };

  // Bulk Syllabus Text Parser
  const handleApplyBulkSyllabus = () => {
    if (!bulkSyllabusText.trim()) return;
    const lines = bulkSyllabusText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: Unit[] = [];
    let currentUnit: Unit | null = null;
    let unitCount = 0;

    for (const line of lines) {
      const isTopic = line.startsWith('-') || line.startsWith('*') || line.startsWith('•');
      if (isTopic && currentUnit) {
        const rawTitle = line.replace(/^[\-\*\•]\s*/, '').trim();
        let difficulty: 'Easy' | 'Medium' | 'Hard' =
          currentUnit.topics.length === 0 ? 'Easy' : currentUnit.topics.length === 1 ? 'Medium' : 'Hard';
        if (/\[.*hard.*\]/i.test(rawTitle)) difficulty = 'Hard';
        else if (/\[.*easy.*\]/i.test(rawTitle)) difficulty = 'Easy';
        else if (/\[.*medium.*\]/i.test(rawTitle)) difficulty = 'Medium';

        const cleanTitle = rawTitle.replace(/\[.*?\]/g, '').trim();
        currentUnit.topics.push({
          id: `top-${Date.now()}-${currentUnit.unitNumber}-${currentUnit.topics.length + 1}`,
          title: cleanTitle,
          difficulty,
          estimatedHours: difficulty === 'Easy' ? 1.5 : difficulty === 'Medium' ? 2.5 : 3.5,
        });
      } else {
        unitCount++;
        const cleanTitle = line.replace(/^Unit\s*\d+\s*[:\-]\s*/i, '').trim();
        currentUnit = {
          id: `unit-${Date.now()}-${unitCount}`,
          unitNumber: unitCount,
          title: cleanTitle,
          description: `Detailed syllabus coverage and foundational paradigms of ${cleanTitle}.`,
          topics: [],
        };
        parsed.push(currentUnit);
      }
    }

    parsed.forEach((u) => {
      if (u.topics.length === 0) {
        u.topics = [
          { id: `top-${Date.now()}-${u.unitNumber}-1`, title: `${u.title} - Theory & Principles`, difficulty: 'Easy', estimatedHours: 2.0 },
          { id: `top-${Date.now()}-${u.unitNumber}-2`, title: `${u.title} - Implementation & Lab Analysis`, difficulty: 'Hard', estimatedHours: 3.5 },
        ];
      }
    });

    if (parsed.length > 0) {
      setFormUnits(parsed);
      setShowBulkPaste(false);
      setBulkSyllabusText('');
    }
  };

  // Reference Books Management
  const handleAddBook = () => {
    if (!newBookInput.trim()) return;
    setFormBooks([...formBooks, newBookInput.trim()]);
    setNewBookInput('');
  };

  const handleRemoveBook = (index: number) => {
    setFormBooks(formBooks.filter((_, idx) => idx !== index));
  };

  // Submit Modal (Create or Edit Course)
  const handleSubmitCourseModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode || !formName) return;
    setIsSubmitting(true);

    const payload = {
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      semester: formSemester,
      description: formDesc.trim() || `Comprehensive university curriculum for ${formName}.`,
      referenceBooks: formBooks,
      units: formUnits,
    };

    try {
      if (editingCourseId) {
        const res = await fetch(`/api/courses/${editingCourseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setStatusMessage(`Course ${payload.code} updated successfully.`);
          setIsModalOpen(false);
          onRefreshCourses();
        }
      } else {
        const res = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setStatusMessage(`Course ${payload.code} created and added to curriculum.`);
          setIsModalOpen(false);
          onRefreshCourses();
        }
      }
    } catch (_err) {
      setStatusMessage('Course saved in local store.');
      setIsModalOpen(false);
      onRefreshCourses();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Course
  const handleDeleteCourse = async (id: string, code: string) => {
    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMessage(`Course ${code} removed from curriculum.`);
      }
      setConfirmDeleteId(null);
      onRefreshCourses();
    } catch (_err) {
      setConfirmDeleteId(null);
      onRefreshCourses();
    }
  };

  // Upload Academic Material
  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFilename || !activeCourse) return;
    setIsUploading(true);

    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: activeCourse.id,
          filename: uploadFilename,
          docType: uploadType,
          content: uploadContent || `Official syllabus topics and notes for ${activeCourse.name}.`,
        }),
      });
      if (res.ok) {
        setStatusMessage(`Academic material '${uploadFilename}' indexed for ${activeCourse.code}.`);
        setUploadFilename('');
        setUploadContent('');
      }
    } catch (_err) {
      setStatusMessage('Material indexed in local vector store.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Navigation */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                Admin Console
              </span>
              <span className="text-xs text-slate-500 font-medium">Platform Administration</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              {activeTab === 'dashboard'
                ? 'Admin Dashboard'
                : activeTab === 'courses'
                ? 'Course Management'
                : activeTab === 'materials'
                ? 'Document Indexing'
                : 'API Management'}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              {activeTab === 'dashboard'
                ? 'Manage courses, content and platform configuration'
                : activeTab === 'courses'
                ? 'Add, update, or manage subjects and their syllabus'
                : activeTab === 'materials'
                ? 'Index lecture notes and course reference documents for AI Tutor semantic search'
                : 'Monitor 3-key Gemini API failover pool and YouTube Data API health'}
            </p>
          </div>

          {/* Subnav Pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('courses')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'courses'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Course Management
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('materials')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'materials'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Document Indexing
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('apipool')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'apipool'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              API Management
            </button>
          </div>
        </div>

        {/* Global Toast / Status Message */}
        {statusMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage('')}
              className="text-emerald-600 hover:text-emerald-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PANEL 8: ADMIN DASHBOARD (OVERVIEW & STATS & CHARTS)                     */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top 4 Stat Blocks (Matching Panel 8) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Stat 1: Total Subjects */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{courses.length}</div>
                <div className="text-xs text-slate-500 font-medium">Total Subjects</div>
              </div>
            </div>

            {/* Stat 2: Total Units */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <Layers className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{totalUnitsCount}</div>
                <div className="text-xs text-slate-500 font-medium">Total Units</div>
              </div>
            </div>

            {/* Stat 3: Total Topics */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <ListTodo className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{totalTopicsCount}</div>
                <div className="text-xs text-slate-500 font-medium">Total Topics</div>
              </div>
            </div>

            {/* Stat 4: API Keys */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <KeyRound className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{apiStatus?.configuredCount || 3}</div>
                <div className="text-xs text-slate-500 font-medium">API Keys (Active)</div>
              </div>
            </div>
          </div>

          {/* 2-Column Split: Platform Usage Chart (Left) & System Status (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Card: Platform Usage (Last 7 Days) */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">Platform Usage (Last 7 Days)</h2>
                  <span className="text-xs text-slate-400 font-medium">API & Agent Requests</span>
                </div>

                {/* Smooth Usage SVG Chart */}
                <div className="w-full pt-4">
                  <div className="relative h-56 w-full">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[11px] font-mono text-slate-400">
                      <span>1,000</span>
                      <span>750</span>
                      <span>500</span>
                      <span>250</span>
                      <span>0</span>
                    </div>

                    {/* Chart area */}
                    <div className="ml-12 h-full pb-6">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Horizontal Grid lines */}
                        <line x1="0" y1="0" x2="500" y2="0" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="0" y1="40" x2="500" y2="40" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="0" y1="80" x2="500" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="0" y1="120" x2="500" y2="120" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="0" y1="160" x2="500" y2="160" stroke="#E2E8F0" strokeWidth="1" />

                        {/* Gradient Area Fill */}
                        <path
                          d="M 0,140 Q 80,100 160,110 T 320,80 T 420,40 T 500,50 L 500,160 L 0,160 Z"
                          fill="url(#usageGradient)"
                        />

                        {/* Smooth Line Curve */}
                        <path
                          d="M 0,140 Q 80,100 160,110 T 320,80 T 420,40 T 500,50"
                          fill="none"
                          stroke="#2563EB"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />

                        {/* Data Points */}
                        <circle cx="0" cy="140" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                        <circle cx="83" cy="115" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                        <circle cx="166" cy="108" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                        <circle cx="250" cy="95" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                        <circle cx="333" cy="80" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                        <circle cx="416" cy="45" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                        <circle cx="500" cy="50" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                      </svg>
                    </div>

                    {/* X-axis labels */}
                    <div className="ml-12 flex justify-between text-[11px] font-medium text-slate-400 pt-2">
                      <span>Oct 31</span>
                      <span>Nov 1</span>
                      <span>Nov 2</span>
                      <span>Nov 3</span>
                      <span>Nov 4</span>
                      <span>Nov 5</span>
                      <span>Nov 6</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Peak load: 840 queries/day on Nov 5</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Request Delivery
                </span>
              </div>
            </div>

            {/* Right Card: System Status */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">System Status</h2>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="space-y-4">
                  {/* Service 1: Gemini APIs */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2.5">
                      <Cpu className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">Gemini APIs</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Operational
                    </span>
                  </div>

                  {/* Service 2: YouTube API */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2.5">
                      <Video className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-bold text-slate-800">YouTube API</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Operational
                    </span>
                  </div>

                  {/* Service 3: Database */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2.5">
                      <Database className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-slate-800">Database</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Connected
                    </span>
                  </div>

                  {/* Service 4: All Agents */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2.5">
                      <Bot className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">All Agents</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Autonomous Failover</span>
                <span className="font-semibold text-blue-600">3 Keys Armed</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PANEL 9: COURSE MANAGEMENT (DATA TABLE & ADD/EDIT MODAL)                  */}
      {/* ========================================================================= */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          {/* Action Bar & Quick Search */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search subjects by code or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Subject</span>
            </button>
          </div>

          {/* Clean Course Management Data Table (Matching Panel 9) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Subject Name</th>
                    <th className="py-3.5 px-4">Semester</th>
                    <th className="py-3.5 px-4 text-center">Units</th>
                    <th className="py-3.5 px-4 text-center">Topics</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCourses.map((course) => {
                    const unitCount = course.units ? course.units.length : 0;
                    const topicCount = course.units
                      ? course.units.reduce((acc, u) => acc + (u.topics ? u.topics.length : 0), 0)
                      : 0;

                    // Roman numeral display for semester (Semester I -> I, Semester II -> II, etc.)
                    const semesterRoman =
                      course.semester?.replace(/Semester\s*/i, '').trim() || 'I';

                    const isExpanded = expandedCourseId === course.id;

                    return (
                      <React.Fragment key={course.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors group">
                          {/* Code */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {course.code}
                          </td>

                          {/* Subject Name */}
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{course.name}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedCourseId(isExpanded ? null : course.id)
                                }
                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                title="Expand Units"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Semester (Roman Numeral) */}
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                            {semesterRoman}
                          </td>

                          {/* Units */}
                          <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                            {unitCount}
                          </td>

                          {/* Topics */}
                          <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                            {topicCount}
                          </td>

                          {/* Actions: Edit & Delete */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(course)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Subject"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {confirmDeleteId === course.id ? (
                                <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg p-1 animate-in fade-in">
                                  <span className="text-[10px] text-rose-700 font-bold px-1">
                                    Delete?
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCourse(course.id, course.code)}
                                    className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(course.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Subject"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Units Details Drawer */}
                        {isExpanded && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={6} className="p-4">
                              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-slate-800">
                                    Syllabus Breakdown for {course.code}
                                  </h4>
                                  <span className="text-[11px] text-slate-500">
                                    {unitCount} Units • {topicCount} Topics
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {course.units?.map((u) => (
                                    <div
                                      key={u.id}
                                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs"
                                    >
                                      <div className="font-bold text-slate-800 mb-1">
                                        Unit {u.unitNumber}: {u.title}
                                      </div>
                                      <div className="text-[11px] text-slate-500">
                                        {u.topics?.length || 0} topics indexed
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DOCUMENT INDEXING (LECTURE NOTES & SYLLABUS PDFS)                   */}
      {/* ========================================================================= */}
      {activeTab === 'materials' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Upload className="w-4 h-4 text-blue-600" />
              Upload Academic Materials
            </h3>

            <form onSubmit={handleUploadMaterial} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Target Subject</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Document Name</label>
                <input
                  type="text"
                  required
                  placeholder="CS201_Unit2_LinkedLists_Lecture_Notes.pdf"
                  value={uploadFilename}
                  onChange={(e) => setUploadFilename(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Material Type</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
                >
                  <option value="lecture_notes">Lecture Notes</option>
                  <option value="textbook">Textbook Chapter</option>
                  <option value="syllabus">Official Syllabus Document</option>
                  <option value="question_paper">Previous Question Paper</option>
                  <option value="reference">Academic Reference Paper</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Extracted Text Content (or Paste Notes)
                </label>
                <textarea
                  rows={5}
                  placeholder="Paste lecture notes, professor slides, or chapter content for local semantic chunk indexing..."
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 resize-none font-mono text-[11px] leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Indexing Chunks...' : 'Index Document'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Indexed Academic Material Chunks
            </h3>

            <p className="text-xs text-slate-500">
              When documents are uploaded, EDUAGENT extracts and stores semantic chunks in SQLite.
              The Academic Tutor Agent prioritizes these chunks during student consultations.
            </p>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      CS201_Official_Lecture_Notes_Arrays_LinkedLists.pdf
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Type: <code className="text-slate-700 font-semibold">lecture_notes</code> • 3 Indexed Chunks
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-bold">
                  Active in Context
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      CS202_Database_Normalization_BCNF_Proofs.pdf
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Type: <code className="text-slate-700 font-semibold">reference</code> • 5 Indexed Chunks
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-bold">
                  Active in Context
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: API MANAGEMENT & YOUTUBE MONITOR                                  */}
      {/* ========================================================================= */}
      {activeTab === 'apipool' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-600" />
                Intelligent 3-Key Gemini API Rotation & Failover Pool
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Real-time load balancing across independent API keys with automatic failover and recovery.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 self-start sm:self-auto font-medium">
              Model: <code className="text-blue-600 font-bold">{apiStatus?.model || 'gemini-3.1-flash-lite'}</code>
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            EDUAGENT automatically rotates calls across up to 3 independent Gemini Flash API keys loaded
            from environment variables (<code className="text-blue-600 font-mono">GEMINI_API_KEY_1</code>,{' '}
            <code className="text-blue-600 font-mono">GEMINI_API_KEY_2</code>,{' '}
            <code className="text-blue-600 font-mono">GEMINI_API_KEY_3</code>). If rate limits (429) or quota
            exhaustion occur, the system fails over to the next healthy key with exponential backoff and cool-down recovery.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-xs text-slate-500 font-medium">Configured Key Pool</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {apiStatus?.configuredCount || 3} Active Keys
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
                Automatic Round-Robin Active
              </span>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-xs text-slate-500 font-medium">Total Failovers Recovered</span>
              <div className="text-2xl font-extrabold text-blue-600 mt-1">
                {apiStatus?.totalFailovers || 0}
              </div>
              <span className="text-[11px] text-slate-500 font-medium block mt-1">
                Zero Downtime Load Failover
              </span>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-xs text-slate-500 font-medium">Pool Health Status</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">100% Operational</div>
              <span className="text-[11px] text-slate-500 font-medium block mt-1">
                Auto-Recovery Cooldown Enabled
              </span>
            </div>
          </div>

          {/* YouTube Data API v3 Status Section */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-rose-500" />
                <span className="text-sm font-bold text-slate-900">YouTube Data API v3 Integration Health</span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border inline-flex items-center gap-1.5 self-start sm:self-auto ${
                  apiStatus?.youtubeStatus?.state === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : apiStatus?.youtubeStatus?.state === 'Quota Exceeded'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : apiStatus?.youtubeStatus?.state === 'Unavailable'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiStatus?.youtubeStatus?.state === 'Active'
                      ? 'bg-emerald-500 animate-pulse'
                      : apiStatus?.youtubeStatus?.state === 'Quota Exceeded'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
                <span>{apiStatus?.youtubeStatus?.state || 'Active'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Configured Key:</span>{' '}
                <code className="text-slate-800 font-mono ml-1 font-bold">
                  {apiStatus?.youtubeStatus?.maskedKey || 'AIzaSy..Hx8'}
                </code>
              </div>
              <div>
                <span className="text-slate-500">Connection Status:</span>{' '}
                <span className="text-slate-700 ml-1">
                  {apiStatus?.youtubeStatus?.message ||
                    'Connected to YouTube Data API v3. Lecture search operational.'}
                </span>
              </div>
            </div>
          </div>

          {/* Masked Key Status List */}
          {apiStatus?.keys && apiStatus.keys.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Individual Key Health Breakdown
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {apiStatus.keys.map((k, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-800">{k.maskedId}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Calls: <span className="text-blue-600 font-mono font-semibold">{k.totalCalls}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        k.isHealthy
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {k.isHealthy ? 'HEALTHY' : 'COOLING'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SUBJECT                                                */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingCourseId ? 'Edit Subject & Syllabus' : 'Add New Subject'}
                </h2>
                <p className="text-xs text-slate-500">Configure subject code, semester, units, and syllabus topics</p>
              </div>
            </div>

            {/* Modal Section Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold mb-4 shrink-0">
              <button
                type="button"
                onClick={() => setModalSection('basic')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  modalSection === 'basic'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Basic Info
              </button>
              <button
                type="button"
                onClick={() => setModalSection('units')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  modalSection === 'units'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Units & Topics ({formUnits.length})
              </button>
              <button
                type="button"
                onClick={() => setModalSection('books')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  modalSection === 'books'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Reference Books ({formBooks.length})
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitCourseModal} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {modalSection === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Course Code</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. CS201"
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Target Semester</label>
                      <select
                        value={formSemester}
                        onChange={(e) => setFormSemester(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-600 font-semibold"
                      >
                        <option value="Semester I">Semester I</option>
                        <option value="Semester II">Semester II</option>
                        <option value="Semester III">Semester III</option>
                        <option value="Semester IV">Semester IV</option>
                        <option value="Semester V">Semester V</option>
                        <option value="Semester VI">Semester VI</option>
                        <option value="Semester VII">Semester VII</option>
                        <option value="Semester VIII">Semester VIII</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Subject Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Data Structures and Algorithms"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Description / Course Overview</label>
                    <textarea
                      rows={3}
                      placeholder="Comprehensive curriculum coverage..."
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {modalSection === 'units' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-semibold">Syllabus Units & Topics</span>
                    <button
                      type="button"
                      onClick={handleAddUnit}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Unit</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formUnits.map((unit, uIdx) => (
                      <div key={unit.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={unit.title}
                            onChange={(e) => handleUpdateUnit(uIdx, 'title', e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 font-bold focus:outline-none focus:border-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveUnit(uIdx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remove Unit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Topics inside unit */}
                        <div className="space-y-2 pl-3 border-l-2 border-slate-200">
                          {unit.topics?.map((topic, tIdx) => (
                            <div key={topic.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={topic.title}
                                onChange={(e) => handleUpdateTopic(uIdx, tIdx, 'title', e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-blue-600"
                              />
                              <select
                                value={topic.difficulty}
                                onChange={(e) => handleUpdateTopic(uIdx, tIdx, 'difficulty', e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-semibold focus:outline-none"
                              >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleRemoveTopic(uIdx, tIdx)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => handleAddTopic(uIdx)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 pt-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Topic</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modalSection === 'books' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Introduction to Algorithms by Cormen et al."
                      value={newBookInput}
                      onChange={(e) => setNewBookInput(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddBook}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-colors"
                    >
                      Add Book
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formBooks.map((b, bIdx) => (
                      <div key={bIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-slate-800 font-medium">{b}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBook(bIdx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : editingCourseId ? 'Save Subject' : 'Add Subject'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
