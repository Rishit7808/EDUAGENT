import React, { useState } from 'react';
import { Course, VideoResource } from '../types';
import { Video, Play, ExternalLink, Clock, Sparkles, Filter, Search, CheckCircle2, Loader2 } from 'lucide-react';

interface VideoLibraryProps {
  course: Course;
}

export const VideoLibrary: React.FC<VideoLibraryProps> = ({ course }) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [liveVideos, setLiveVideos] = useState<VideoResource[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const curatedVideos: VideoResource[] = [
    {
      title: 'Introduction to Algorithms & Data Structures Full University Course',
      channel: 'freeCodeCamp.org',
      url: 'https://www.youtube.com/watch?v=8hly31xKli0',
      thumbnail:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
      duration: '5h 22m',
      course: course.name,
      unit: 'Unit 1: Introduction to Data Structures',
      relevance:
        'Comprehensive classroom lecture covering algorithmic bounds, asymptotic notation (Big-O, Omega, Theta), and memory efficiency.',
    },
    {
      title: 'Data Structures: Singly and Doubly Linked Lists Explained',
      channel: 'Abdul Bari',
      url: 'https://www.youtube.com/watch?v=lC-yftEDHua',
      thumbnail:
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
      duration: '48m 15s',
      course: course.name,
      unit: 'Unit 2: Arrays, Linked Lists and Stacks',
      relevance:
        'World-renowned animated whiteboard walkthrough of pointer allocation, node insertion, deletion, and stack memory representations.',
    },
    {
      title: 'Binary Trees, BST Property, and Recursive Traversals (Inorder, Preorder, Postorder)',
      channel: 'MIT OpenCourseWare (6.006)',
      url: 'https://www.youtube.com/watch?v=76dhtgZt38A',
      thumbnail:
        'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80',
      duration: '51m 40s',
      course: course.name,
      unit: 'Unit 3: Queues and Trees',
      relevance:
        'Rigorous MIT university lecture on height-balanced search trees, binary invariants, and amortized rotation analysis.',
    },
    {
      title: 'Graph Algorithms Full Course (BFS, DFS, Dijkstra, Bellman-Ford, Kruskal)',
      channel: 'WilliamFiset',
      url: 'https://www.youtube.com/watch?v=09_LlHjoEiY',
      thumbnail:
        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
      duration: '6h 44m',
      course: course.name,
      unit: 'Unit 4: Graphs and Graph Algorithms',
      relevance:
        'Detailed visual diagrams covering adjacency lists, shortest path algorithms, priority queue implementations, and minimum spanning trees.',
    },
    {
      title: 'Sorting Algorithms Compared: MergeSort, QuickSort, HeapSort in Depth',
      channel: 'CS50 / Harvard University',
      url: 'https://www.youtube.com/watch?v=kgBjXUE_Nwc',
      thumbnail:
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
      duration: '1h 12m',
      course: course.name,
      unit: 'Unit 5: Sorting and Searching',
      relevance:
        'Harvard CS50 demonstration of partition steps, recursion trees, and asymptotic comparison between O(n log n) and O(n^2) algorithms.',
    },
  ];

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setLiveVideos([]);
      setSearchFeedback(null);
      return;
    }

    setIsSearching(true);
    setSearchFeedback(null);
    try {
      const res = await fetch(
        `/api/videos/search?course=${encodeURIComponent(course.name)}&q=${encodeURIComponent(
          searchQuery
        )}&unit=${encodeURIComponent(selectedUnit !== 'all' ? selectedUnit : '')}`
      );
      const data = await res.json();
      if (data.success && data.videos && data.videos.length > 0) {
        setLiveVideos(data.videos);
        setSearchFeedback(null);
      } else {
        setLiveVideos([]);
        setSearchFeedback(
          'Live video search is temporarily resting. Showing accredited university lectures curated for this syllabus below.'
        );
      }
    } catch (_err) {
      setLiveVideos([]);
      setSearchFeedback(
        'Video search service is currently unavailable. Displaying core curriculum lectures below.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const displayedVideos = liveVideos.length > 0 ? liveVideos : curatedVideos;

  const filteredVideos =
    selectedUnit === 'all'
      ? displayedVideos
      : displayedVideos.filter((v) => v.unit.toLowerCase().includes(selectedUnit.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Banner Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                University Lecture Library
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Verified Academic Video Catalog
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Video className="w-6 h-6 text-blue-600" />
              Syllabus-Aligned Video Lectures & Playlists
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Curated university lectures (MIT OCW, Stanford, Harvard CS50, NPTEL) mapped directly to your course syllabus. Non-academic clickbait is systematically blocked.
            </p>
          </div>

          {/* Unit Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer font-semibold"
            >
              <option value="all">All Syllabus Units</option>
              <option value="Unit 1">Unit 1: Introduction</option>
              <option value="Unit 2">Unit 2: Lists & Stacks</option>
              <option value="Unit 3">Unit 3: Queues & Trees</option>
              <option value="Unit 4">Unit 4: Graphs</option>
              <option value="Unit 5">Unit 5: Sorting</option>
            </select>
          </div>
        </div>

        {/* Live Search Form */}
        <form onSubmit={handleSearch} className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lectures (e.g., 'Dijkstra shortest path', 'Red-black trees')..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>Search Lectures</span>
          </button>
          {liveVideos.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setLiveVideos([]);
                setSearchQuery('');
                setSearchFeedback(null);
              }}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              Reset
            </button>
          )}
        </form>

        {/* Status Feedback */}
        {searchFeedback && (
          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{searchFeedback}</span>
          </div>
        )}
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video, idx) => (
          <div
            key={idx}
            className="group bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all shadow-sm flex flex-col justify-between"
          >
            <div>
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

                {/* Duration Badge */}
                <span className="absolute bottom-2.5 right-2.5 bg-slate-900/90 text-white font-mono text-[11px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 backdrop-blur-sm">
                  <Clock className="w-3 h-3 text-slate-300" />
                  {video.duration}
                </span>

                {/* Play Overlay */}
                <a
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </a>
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 font-medium">
                  <span className="text-blue-600 font-semibold">{video.channel}</span>
                  <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    {video.unit.split(':')[0]}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                  {video.title}
                </h3>

                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                  {video.relevance}
                </p>
              </div>
            </div>

            {/* Bottom watch link */}
            <div className="p-4 pt-0">
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <span>Watch on YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
