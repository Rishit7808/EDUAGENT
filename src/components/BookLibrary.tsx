import React, { useState } from 'react';
import { Course, AcademicResource } from '../types';
import {
  Library,
  BookOpen,
  FileDown,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  BookMarked,
} from 'lucide-react';

interface BookLibraryProps {
  course: Course;
}

export const BookLibrary: React.FC<BookLibraryProps> = ({ course }) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'open_access' | 'official'>('all');

  // Verified academic catalog curated by Academic Research Agent
  const allResources: AcademicResource[] = [
    {
      title: 'Open Data Structures (in Pseudocode / Python / Java)',
      author: 'Pat Morin (Carleton University)',
      course: 'CS201 Data Structures and Algorithms',
      unit: 'Unit 1 & 2',
      description:
        'Authoritative open-access textbook covering asymptotic analysis, array-based lists, singly/doubly linked lists, skiplists, and hash tables with complete mathematical proofs.',
      source_website: 'opendatastructures.org',
      resource_type: 'open_access_pdf',
      is_open_access: true,
      url: 'https://opendatastructures.org/',
      pdf_url: 'https://opendatastructures.org/ods-python.pdf',
    },
    {
      title: 'Introduction to Algorithms (CLRS) — 4th Edition',
      author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
      course: 'CS201 Data Structures and Algorithms',
      unit: 'Unit 3, 4 & 5',
      description:
        'Standard university textbook for sorting networks, balanced binary search trees, dynamic programming, and greedy graph algorithms. Official portal with companion lecture slides.',
      source_website: 'MIT Press Official Publication Portal',
      resource_type: 'official_publisher',
      is_open_access: false,
      url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
      pdf_url: null,
    },
    {
      title: 'Algorithms and Data Structures: The Basic Toolbox',
      author: 'Kurt Mehlhorn & Peter Sanders (Max Planck Institute)',
      course: 'CS201 Data Structures and Algorithms',
      unit: 'Unit 4 & 5',
      description:
        'Legally open-access graduate level computer science text with empirical runtime analyses and real-world benchmark datasets.',
      source_website: 'Max-Planck-Institut für Informatik',
      resource_type: 'open_access_pdf',
      is_open_access: true,
      url: 'https://people.mpi-inf.mpg.de/~mehlhorn/Toolbox.html',
      pdf_url: 'https://people.mpi-inf.mpg.de/~mehlhorn/Toolbox.html',
    },
    {
      title: 'Stanford CS106B Lecture Course Reader: Programming Abstractions',
      author: 'Stanford University Computer Science Faculty',
      course: 'CS201 Data Structures and Algorithms',
      unit: 'Unit 2 & 3',
      description:
        'Public course handouts, pointer diagrams, recursive problem decompositions, and binary search tree implementations.',
      source_website: 'web.stanford.edu',
      resource_type: 'university_notes',
      is_open_access: true,
      url: 'https://web.stanford.edu/class/archive/cs/cs106b/',
      pdf_url: 'https://web.stanford.edu/class/archive/cs/cs106b/',
    },
    {
      title: 'Database System Concepts — 7th Edition',
      author: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan',
      course: 'CS202 Database Management Systems',
      unit: 'Unit 1 to 4',
      description:
        'Authoritative curriculum text on relational schemas, SQL-99/SQL-2008 standards, BCNF decomposition proofs, and strict concurrency control.',
      source_website: 'db-book.com (Author Portal)',
      resource_type: 'official_publisher',
      is_open_access: false,
      url: 'https://www.db-book.com/',
      pdf_url: null,
    },
    {
      title: 'Foundations of Databases: The Logical Level (Alice Book)',
      author: 'Serge Abiteboul, Richard Hull, Victor Vianu',
      course: 'CS202 Database Management Systems',
      unit: 'Unit 2 & 3',
      description:
        'Unrestricted open-access reference text covering relational calculus, relational algebra, datalog, and dependency theory.',
      source_website: 'INRIA Open Archives',
      resource_type: 'open_access_pdf',
      is_open_access: true,
      url: 'http://webdam.inria.fr/Alice/',
      pdf_url: 'http://webdam.inria.fr/Alice/',
    },
    {
      title: 'Think Python: How to Think Like a Computer Scientist (2nd/3rd Edition)',
      author: 'Allen B. Downey (Olin College of Engineering)',
      course: 'CS101 Introduction to Programming with Python',
      unit: 'Unit 1, 2 & 3',
      description:
        'Rigorous open-access foundational textbook introducing algorithmic thinking, control flow, functions, modular decomposition, and recursion.',
      source_website: 'Green Tea Press',
      resource_type: 'open_access_pdf',
      is_open_access: true,
      url: 'https://greenteapress.com/wp/think-python-2e/',
      pdf_url: 'https://greenteapress.com/thinkpython2/thinkpython2.pdf',
    },
    {
      title: 'Think Java: How to Think Like a Computer Scientist (2nd Edition)',
      author: 'Allen B. Downey & Chris Mayfield',
      course: 'CS203 Object-Oriented Programming',
      unit: 'Unit 1, 2 & 3',
      description:
        'Unrestricted peer-reviewed open textbook covering OOP class design, inheritance, interfaces, polymorphism, and object reference semantics.',
      source_website: 'Green Tea Press / O\'Reilly Media',
      resource_type: 'open_access_pdf',
      is_open_access: true,
      url: 'https://greenteapress.com/wp/think-java-2e/',
      pdf_url: 'https://greenteapress.com/thinkjava2/thinkjava2.pdf',
    },
    {
      title: 'Java: The Complete Reference — 12th Edition',
      author: 'Herbert Schildt',
      course: 'CS203 Object-Oriented Programming',
      unit: 'Unit 1 through 5',
      description:
        'Comprehensive authoritative guide covering the Java language, packages, checked/unchecked exception handling, multithreading, and collections framework.',
      source_website: 'McGraw-Hill Professional Education',
      resource_type: 'official_publisher',
      is_open_access: false,
      url: 'https://www.mheducation.com/highered/product/java-complete-reference-twelfth-edition-schildt/9781260440232.html',
      pdf_url: null,
    },
    {
      title: 'Computer Organization and Architecture: Designing for Performance (11th Edition)',
      author: 'William Stallings',
      course: 'CS204 Computer Organization and Architecture',
      unit: 'Unit 1, 2, 3 & 4',
      description:
        'Definitive academic curriculum text covering instruction sets, processor pipelines, cache hierarchies, virtual memory interfacing, and DMA bus protocols.',
      source_website: 'Pearson Higher Education Portal',
      resource_type: 'official_publisher',
      is_open_access: false,
      url: 'https://www.pearson.com/en-us/subject-catalog/p/computer-organization-and-architecture/P200000003264',
      pdf_url: null,
    },
    {
      title: 'Computer Architecture: A Quantitative Approach (6th Edition)',
      author: 'John L. Hennessy & David A. Patterson (Turing Award Laureates)',
      course: 'CS204 Computer Organization and Architecture',
      unit: 'Unit 2, 3 & 4',
      description:
        'The gold standard reference on pipelining, instruction-level parallelism (ILP), superscalar processing, and multi-core cache coherency models.',
      source_website: 'Morgan Kaufmann / Elsevier Portal',
      resource_type: 'official_publisher',
      is_open_access: false,
      url: 'https://www.elsevier.com/books/computer-architecture/hennessy/978-0-12-811905-1',
      pdf_url: null,
    },
    {
      title: 'Operating Systems: Three Easy Pieces (OSTEP)',
      author: 'Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau (University of Wisconsin-Madison)',
      course: 'CS301 Operating Systems',
      unit: 'Unit 1, 2, 3, 4 & 5',
      description:
        'Entirely free, authoritative open-access textbook covering virtualization (CPU & Memory), concurrency (threads, locks, condition variables, semaphores), and persistence (file systems, disks, RAID).',
      source_website: 'pages.cs.wisc.edu/~remzi/OSTEP',
      resource_type: 'open_access_pdf',
      is_open_access: true,
      url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/',
      pdf_url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/',
    },
    {
      title: 'Operating System Concepts — 10th Edition (Dinosaur Book)',
      author: 'Abraham Silberschatz, Peter B. Galvin, Greg Gagne',
      course: 'CS301 Operating Systems',
      unit: 'Unit 1 to 5',
      description:
        'Essential curriculum textbook covering process synchronization, deadlock handling, virtual memory management, secondary storage structure, and distributed systems security.',
      source_website: 'John Wiley & Sons Portal',
      resource_type: 'official_publisher',
      is_open_access: false,
      url: 'https://www.wiley.com/en-us/Operating+System+Concepts%2C+10th+Edition-p-9781119456339',
      pdf_url: null,
    },
    {
      title: 'Computer Networks: A Systems Approach (Open-Source 6th Edition)',
      author: 'Larry Peterson and Bruce Davie',
      course: 'CS489 Computer Networks and Protocols',
      unit: 'Unit 1 through 5',
      description:
        'Comprehensive open-source textbook covering the complete OSI and TCP/IP stack: packet switching, reliable transmission protocols (sliding window), IP routing, BGP, congestion control, and TLS cryptography.',
      source_website: 'book.systemsapproach.net',
      resource_type: 'open_access_pdf',
      is_open_access: true,
      url: 'https://book.systemsapproach.net/',
      pdf_url: 'https://book.systemsapproach.net/',
    },
    {
      title: 'Computer Networking: A Top-Down Approach (8th Edition)',
      author: 'James F. Kurose and Keith W. Ross',
      course: 'CS489 Computer Networks and Protocols',
      unit: 'Unit 1 through 5',
      description:
        'Worldwide standard university networking textbook emphasizing application layer protocols (HTTP, DNS), transport layer (TCP Tahoe/Reno, UDP), network layer, and link layer framing.',
      source_website: 'Pearson Higher Education Portal',
      resource_type: 'official_publisher',
      is_open_access: false,
      url: 'https://www.pearson.com/en-us/subject-catalog/p/computer-networking-a-top-down-approach/P200000003335',
      pdf_url: null,
    },
    {
      title: 'Software Engineering: A Practitioner’s Approach (9th Edition)',
      author: 'Roger S. Pressman & Bruce R. Maxim',
      course: 'CS401 Software Engineering',
      unit: 'Unit 1 to 5',
      description:
        'The de-facto industry and academic benchmark for software process lifecycles, Agile sprint methodologies, requirements modeling (SRS), and black-box/white-box verification.',
      source_website: 'McGraw-Hill Education Portal',
      resource_type: 'official_publisher',
      is_open_access: false,
      url: 'https://www.mheducation.com/highered/product/software-engineering-practitioner-s-approach-pressman-maxim/M9781259872976.html',
      pdf_url: null,
    },
    {
      title: 'Software Engineering (10th Edition)',
      author: 'Ian Sommerville',
      course: 'CS401 Software Engineering',
      unit: 'Unit 1, 2 & 4',
      description:
        'Authoritative academic text detailing system dependability, requirements engineering, architectural styles, and automated testing strategies.',
      source_website: 'Pearson Academic Education',
      resource_type: 'official_publisher',
      is_open_access: false,
      url: 'https://www.pearson.com/en-us/subject-catalog/p/software-engineering/P200000003445',
      pdf_url: null,
    },
  ];

  const filtered = allResources.filter((res) => {
    const matchesSearch =
      res.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      res.author.toLowerCase().includes(searchFilter.toLowerCase()) ||
      res.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
      res.course.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesType =
      filterType === 'all'
        ? true
        : filterType === 'open_access'
        ? res.is_open_access
        : !res.is_open_access;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Academic Research
              </span>
              <span className="text-xs text-slate-500 font-medium">Verified Academic Literature & Open Access</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Library className="w-6 h-6 text-blue-600" />
              Academic Research & Literature Library
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Curated peer-reviewed university textbooks, open-access monographs, and official publisher portals aligned with your curriculum syllabus.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shrink-0 flex items-center gap-2.5 text-xs text-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">OER & Copyright Compliant</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, author, or subject..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'all'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Resources ({allResources.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('open_access')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'open_access'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Free Open-Access PDFs
            </button>
            <button
              type="button"
              onClick={() => setFilterType('official')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'official'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Official Portals
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Discovered Books and Papers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((resource, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    {resource.unit}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                    {resource.course.split(' ')[0]}
                  </span>
                </div>

                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                    resource.is_open_access
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {resource.is_open_access ? 'Free Legal PDF' : 'Official Publisher'}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug">{resource.title}</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Author(s): {resource.author}</p>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed line-clamp-3">
                {resource.description}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Source: {resource.source_website}
              </span>

              <div className="flex items-center gap-2">
                {resource.is_open_access && resource.pdf_url && (
                  <a
                    href={resource.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-sm"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Open PDF</span>
                  </a>
                )}

                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
                >
                  <span>View Details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
