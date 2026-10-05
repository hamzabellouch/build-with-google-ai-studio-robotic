/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { BoxSelect, Cpu, FastForward, Grab, History, Loader2, MousePointer2, Send, X } from 'lucide-react';
import { useState } from 'react';
import { LogOverlay } from '../App';
import { DetectedItem, DetectType, LogEntry } from '../types';

interface UnifiedSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (prompt: string, type: DetectType) => void;
  onPickup: () => void;
  isLoading: boolean;
  hasDetectedItems: boolean;
  logs: LogEntry[];
  onOpenLog: (log: LogEntry) => void;
  isDarkMode: boolean;
  isPickingUp?: boolean;
  playbackSpeed?: number;
}

/**
 * UnifiedSidebar
 * The main control panel for the application.
 */
export function UnifiedSidebar({ 
  isOpen, 
  onClose, 
  onSend, 
  onPickup, 
  isLoading, 
  hasDetectedItems, 
  logs, 
  onOpenLog, 
  isDarkMode,
  isPickingUp = false,
  playbackSpeed = 1
}: UnifiedSidebarProps) {
  const [prompt, setPrompt] = useState('all cubes');
  const [type, setType] = useState<DetectType>('2D bounding boxes');

  if (!isOpen) return null;

  const panelBase = isDarkMode ? "bg-slate-900/80 border-white/10 text-slate-100 shadow-slate-950/40" : "bg-white/70 border-white/80 text-slate-800 shadow-slate-200/40";
  const headerBorder = isDarkMode ? "border-white/5 bg-white/5" : "border-slate-100 bg-white/40";
  const inputBg = isDarkMode ? "bg-slate-950 border-white/5 text-slate-100 focus:ring-indigo-400/20 shadow-none" : "bg-white/50 border-slate-200 text-slate-800 focus:ring-indigo-500/5 shadow-inner";
  const selectorBg = isDarkMode ? "bg-slate-800/40 border-white/5" : "bg-slate-100/50 border-slate-200/50";
  const selectorActive = isDarkMode ? "bg-slate-700 text-indigo-400" : "bg-white text-indigo-600 shadow-sm";
  const logCardBg = isDarkMode ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-white/40 border-slate-100 hover:bg-white hover:shadow-md";

  return (
    // Changed positioning: centered on mobile (left-4 right-4), positioned right on desktop (min-[660px]:right-10 min-[660px]:w-96)
    <div className={`absolute top-4 bottom-4 left-4 right-4 min-[660px]:left-auto min-[660px]:top-10 min-[660px]:right-10 min-[660px]:bottom-10 min-[660px]:w-96 glass-panel rounded-[2.5rem] flex flex-col z-40 overflow-hidden shadow-2xl transition-all border border-white/20 ${panelBase}`}>
      
      {/* Header */}
      <div className={`p-6 border-b flex justify-between items-center ${headerBorder}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold leading-tight">Robot Spatial Algorithm</h2>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                100% Offline
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Analytical IK & Physics Geometry
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200/20 rounded-full transition-colors text-slate-400 shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pt-3 pb-6 space-y-3">
        
        {/* Detection Type Selector */}
        <section className="space-y-1.5">
          <div className={`p-1.5 rounded-2xl flex border ${selectorBg}`}>
              {(['2D bounding boxes', 'Points'] as DetectType[]).map((t) => {
                const isActive = type === t;
                
                return (
                  <button 
                    key={t}
                    onClick={() => setType(t)}
                    title={
                      t === '2D bounding boxes' ? 'Boxes: 2D Bounding Boxes of objects' : 
                      'Points: Centroid Coordinates of objects'
                    }
                    className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      isActive 
                        ? selectorActive
                        : 'text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    {t === '2D bounding boxes' && <BoxSelect className="w-4 h-4" />}
                    {t === 'Points' && <MousePointer2 className="w-4 h-4" />}
                    <span className="text-[9px] font-bold uppercase tracking-tight">
                      {t === '2D bounding boxes' ? 'Boxes' : 'Points'}
                    </span>
                  </button>
                );
              })}
          </div>
        </section>

        {/* Prompt Input & Action Row */}
        <section className="space-y-2">
          <div className="relative group">
            <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className={`w-full rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all resize-none h-12 border ${inputBg}`}
                placeholder="Filter targets (e.g. red cubes, cyan, or all)..."
            />
          </div>
          
          <div className="flex gap-3">
            <button 
                onClick={() => onSend(prompt, type)}
                disabled={isLoading}
                title="Detect cubes using analytical spatial geometry"
                className={`flex-1 py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  isLoading 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 active:scale-[0.98]'
                }`}
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                {isLoading ? 'Computing...' : 'Detect'}
            </button>

            <button 
                onClick={() => {
                  onPickup();
                  // Check if mobile (width < 660px matches standard md breakpoint) and close sidebar
                  if (window.innerWidth < 660) {
                    onClose();
                  }
                }}
                disabled={(!hasDetectedItems && !isPickingUp) || isLoading}
                title={isPickingUp ? `Click to increase simulation speed (Current: ${playbackSpeed}x)` : "Start pickup sequence for detected items"}
                className={`flex-1 py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] ${
                  (!hasDetectedItems && !isPickingUp) || isLoading 
                    ? (isDarkMode ? 'bg-slate-800 text-slate-600 cursor-not-allowed shadow-none' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none')
                    : (isPickingUp 
                        ? (isDarkMode ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/10' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100')
                        : (isDarkMode ? 'bg-slate-900 hover:bg-black text-white' : 'bg-slate-900 hover:bg-black text-white')
                      )
                }`}
            >
                {isPickingUp ? (
                  <>
                    <FastForward className="w-4 h-4" /> 
                    <span>Speed {playbackSpeed > 1 ? `(${playbackSpeed}x)` : ''}</span>
                  </>
                ) : (
                  <>
                    <Grab className="w-4 h-4" /> 
                    <span>Start Pickup</span>
                  </>
                )}
            </button>
          </div>
        </section>

        {/* History / Logs Section */}
        <section className="space-y-2 pt-2">
          <div className="flex items-center gap-2 px-1">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Execution History</h3>
          </div>
          
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className={`text-center py-10 border-2 border-dashed rounded-[2rem] text-xs italic ${isDarkMode ? 'border-white/5 text-slate-600' : 'border-slate-100 text-slate-400'}`}>
                No previous history
              </div>
            ) : (
              logs.map((log) => {
                const typeLabel = log.type === '2D bounding boxes' ? 'Bounding Boxes' : log.type.split(' ')[0];
                const itemResult = log.result as DetectedItem[] | null;
                const errorResult = log.result as { error: string } | null;
                const errorMessage = errorResult?.error;
                
                return (
                  <div 
                    key={log.id} 
                    onClick={() => onOpenLog(log)}
                    className={`group flex gap-4 p-3 border rounded-2xl transition-all cursor-pointer ${logCardBg}`}
                  >
                    <div className={`relative w-20 rounded-xl overflow-hidden shrink-0 border self-start ${isDarkMode ? 'bg-slate-950 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                      <img src={log.imageSrc} className="w-full h-auto block" alt="Log" />
                      <LogOverlay log={log} />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-slate-400">{log.timestamp.toLocaleTimeString()}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                          {typeLabel}
                        </span>
                      </div>
                      <p className="text-xs font-bold truncate mb-1">{log.prompt || "All cubes"}</p>
                      
                      {errorMessage ? (
                        <p className="text-[10px] text-red-500 font-medium truncate">{errorMessage}</p>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${itemResult ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                          <span className="text-[10px] text-slate-400">
                            {itemResult ? `${itemResult.length} cubes detected` : 'Processing...'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

      </div>
    </div>
  );
}