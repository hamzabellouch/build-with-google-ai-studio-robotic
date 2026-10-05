/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Shuffle, 
  RotateCcw, 
  Check, 
  Layers, 
  Compass, 
  Cpu, 
  Sparkles, 
  Boxes
} from 'lucide-react';
import { CUBE_ARRANGEMENTS, CubeArrangement, ARRANGEMENT_CATEGORIES } from '../cubeArrangements';

interface ArrangementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectArrangement: (arrangement: CubeArrangement) => void;
  onResetDefault: () => void;
  currentArrangementId: string | null;
  isDarkMode: boolean;
}

// 4 standard cube colors in order
const CUBE_COLORS = ['#ef4444', '#06b6d4', '#10b981', '#eab308'];

/**
 * 2D Top-down Workcell Mini Radar
 * Renders the 20 cube positions around the robot base (0,0) and stack base (0.6, 0).
 */
const MiniWorkcellRadar: React.FC<{ positions: Array<{ x: number; y: number }>; isDarkMode: boolean }> = ({ positions, isDarkMode }) => {
  // World bounds: x from -0.8 to +0.8, y from -0.8 to +0.8
  const size = 100;
  const scale = size / 1.6; // 1.6m span (-0.8 to +0.8)

  return (
    <svg 
      viewBox={`0 0 ${size} ${size}`} 
      className={`w-full h-28 rounded-xl border transition-colors ${
        isDarkMode ? 'bg-slate-950/80 border-white/5' : 'bg-slate-50 border-slate-200/70'
      }`}
    >
      {/* Background grid concentric reach circles */}
      <circle cx={size / 2} cy={size / 2} r={0.35 * scale} fill="none" stroke={isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth="1" strokeDasharray="2,2" />
      <circle cx={size / 2} cy={size / 2} r={0.65 * scale} fill="none" stroke={isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth="1" />
      
      {/* Robot Base at (0, 0) */}
      <circle cx={size / 2} cy={size / 2} r="3.5" fill={isDarkMode ? '#818cf8' : '#6366f1'} />
      <circle cx={size / 2} cy={size / 2} r="6" fill="none" stroke={isDarkMode ? 'rgba(129,140,248,0.4)' : 'rgba(99,102,241,0.4)'} strokeWidth="1" />

      {/* Stacking Tray at (0.6, 0) */}
      <rect 
        x={size / 2 - 0 * scale - 7} 
        y={size / 2 - 0.6 * scale - 7} 
        width="14" 
        height="14" 
        rx="2"
        fill={isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} 
        stroke={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
        strokeWidth="1"
      />

      {/* Render 20 Cubes */}
      {positions.map((p, idx) => {
        const cx = size / 2 - p.y * scale;
        const cy = size / 2 - p.x * scale;
        const color = CUBE_COLORS[idx % 4];
        return (
          <g key={idx}>
            <rect 
              x={cx - 2.5} 
              y={cy - 2.5} 
              width="5" 
              height="5" 
              rx="1"
              fill={color}
              stroke={isDarkMode ? '#0f172a' : '#ffffff'}
              strokeWidth="0.8"
            />
          </g>
        );
      })}
    </svg>
  );
};

export const ArrangementsModal: React.FC<ArrangementsModalProps> = ({
  isOpen,
  onClose,
  onSelectArrangement,
  onResetDefault,
  currentArrangementId,
  isDarkMode
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All (108)');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pre-calculate positions map for all arrangements for instant mini-map rendering
  const arrangementPositions = useMemo(() => {
    const map = new Map<string, Array<{ x: number; y: number }>>();
    CUBE_ARRANGEMENTS.forEach(arr => {
      map.set(arr.id, arr.getPositions());
    });
    return map;
  }, []);

  // Filtered list based on category & search query
  const filteredArrangements = useMemo(() => {
    return CUBE_ARRANGEMENTS.filter(arr => {
      const matchesCategory = 
        selectedCategory === 'All (108)' || arr.category === selectedCategory;
      
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !query || 
        arr.name.toLowerCase().includes(query) || 
        arr.description.toLowerCase().includes(query) ||
        `#${arr.index}`.includes(query) ||
        arr.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleApply = (arr: CubeArrangement) => {
    onSelectArrangement(arr);
    showToast(`Applied: #${arr.index} ${arr.name}`);
  };

  const handleRandomApply = () => {
    const randomIndex = Math.floor(Math.random() * CUBE_ARRANGEMENTS.length);
    const randomArr = CUBE_ARRANGEMENTS[randomIndex];
    onSelectArrangement(randomArr);
    showToast(`Random Applied: #${randomArr.index} ${randomArr.name}`);
  };

  const handleReset = () => {
    onResetDefault();
    showToast('Reset to default procedural layout');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-5xl h-[92vh] flex flex-col rounded-[2.5rem] shadow-2xl border overflow-hidden transition-all ${
          isDarkMode ? 'bg-slate-900 border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 sm:p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 ${
          isDarkMode ? 'border-white/5 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
        }`}>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">Cube Arrangement Catalog</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase tracking-wider">
                    108 Possibilities
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Select any formation to procedurally arrange all 20 cubes in the Franka Panda workcell.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Quick Random Button */}
            <button
              onClick={handleRandomApply}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                isDarkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
              title="Pick a random arrangement from the 108 possibilities"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Random</span>
            </button>

            {/* Default Reset Button */}
            <button
              onClick={handleReset}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                isDarkMode 
                  ? 'bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-300' 
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
              }`}
              title="Reset simulation to default arrangement"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${
                isDarkMode 
                  ? 'bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-400 hover:text-white' 
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900'
              }`}
              title="Close catalog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls: Search & Category Tabs */}
        <div className={`px-5 sm:px-6 py-3 border-b flex flex-col gap-3 shrink-0 ${
          isDarkMode ? 'border-white/5 bg-slate-900/60' : 'border-slate-100 bg-white'
        }`}>
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search 108 formations by name, category, or number (e.g. Spiral, Heart, #42)..."
              className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border focus:outline-none transition-all ${
                isDarkMode 
                  ? 'bg-slate-950/80 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            {ARRANGEMENT_CATEGORIES.map(cat => {
              const count = cat === 'All (108)' 
                ? CUBE_ARRANGEMENTS.length 
                : CUBE_ARRANGEMENTS.filter(a => a.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all text-[11px] flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isDarkMode
                        ? 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected 
                      ? 'bg-indigo-800/60 text-indigo-100' 
                      : isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Catalog Grid View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {filteredArrangements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Boxes className="w-12 h-12 text-slate-400/40 mb-3 animate-pulse" />
              <p className="text-sm font-bold text-slate-400">No arrangements match your search</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('All (108)'); }}
                className="mt-3 text-xs text-indigo-500 hover:underline font-semibold"
              >
                Clear filters and show all 108
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredArrangements.map(arr => {
                const isCurrent = currentArrangementId === arr.id;
                const positions = arrangementPositions.get(arr.id) || [];
                return (
                  <div
                    key={arr.id}
                    onClick={() => handleApply(arr)}
                    className={`group relative flex flex-col p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.99] shadow-sm ${
                      isCurrent
                        ? (isDarkMode 
                            ? 'bg-indigo-950/40 border-indigo-500/60 ring-2 ring-indigo-500/30' 
                            : 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-200')
                        : (isDarkMode 
                            ? 'bg-slate-950/40 border-white/5 hover:border-indigo-500/40 hover:bg-slate-800/40' 
                            : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:shadow-md')
                    }`}
                  >
                    {/* Top Row: Index & Category */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold text-indigo-500">
                        #{String(arr.index).padStart(2, '0')}
                      </span>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                        isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {arr.category}
                      </span>
                    </div>

                    {/* 2D Mini-Radar Preview */}
                    <div className="mb-3">
                      <MiniWorkcellRadar positions={positions} isDarkMode={isDarkMode} />
                    </div>

                    {/* Title & Description */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-xs font-bold truncate transition-colors ${
                        isCurrent 
                          ? 'text-indigo-500 dark:text-indigo-400' 
                          : 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                      }`}>
                        {arr.name}
                      </h3>
                      <p className={`text-[10px] line-clamp-2 mt-1 leading-relaxed ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {arr.description}
                      </p>
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-3 pt-2.5 border-t border-dashed flex items-center justify-between border-slate-200/50 dark:border-white/5">
                      <span className="text-[9px] font-mono text-slate-400">
                        20 Cubes
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApply(arr);
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                          isCurrent
                            ? 'bg-emerald-500 text-white'
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}
                      >
                        {isCurrent ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <span>Apply</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className={`p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-2 text-xs shrink-0 ${
          isDarkMode ? 'border-white/5 bg-slate-950/40 text-slate-400' : 'border-slate-100 bg-slate-50/50 text-slate-500'
        }`}>
          <div className="flex items-center gap-2 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>All 108 formations are pre-validated to avoid obstacle overlaps and respect Franka Panda reach limits.</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            Showing {filteredArrangements.length} of 108
          </span>
        </div>
      </div>

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] px-4 py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
