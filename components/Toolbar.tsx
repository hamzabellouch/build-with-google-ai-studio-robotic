/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { Bot, Cpu, FastForward, Moon, PanelRight, Pause, Play, RotateCcw, Sparkles, Sun } from 'lucide-react';

interface ToolbarProps {
  isPaused: boolean; 
  togglePause: () => void; 
  onReset: () => void;
  onOpenArrangements: () => void;
  onOpenRobotModal: () => void;
  showSidebar: boolean;
  toggleSidebar: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onAutonomousRun: () => void;
  isPickingUp?: boolean;
  playbackSpeed?: number;
}

/**
 * Toolbar
 * Floating control bar for simulation actions.
 */
export function Toolbar({ 
  isPaused, 
  togglePause, 
  onReset,
  onOpenArrangements,
  onOpenRobotModal,
  showSidebar,
  toggleSidebar,
  isDarkMode,
  toggleDarkMode,
  onAutonomousRun,
  isPickingUp = false,
  playbackSpeed = 1
}: ToolbarProps) {
  const panelStyle = isDarkMode ? "bg-slate-900/80 border-white/10 text-slate-100" : "bg-white/70 border-white/80 text-slate-800";
  const iconFill = isDarkMode ? "fill-slate-100" : "fill-slate-800";

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 min-[660px]:left-10 min-[660px]:translate-x-0 flex items-center gap-3 z-30">
      
      {/* Autonomous Algorithmic Execution Button */}
      <button 
        onClick={onAutonomousRun} 
        className={`h-14 px-4 rounded-2xl glass-panel flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 shadow-xl font-bold text-xs select-none ${
          isPickingUp
            ? "bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/25 ring-2 ring-indigo-400"
            : isDarkMode
              ? "bg-indigo-950/70 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/80"
              : "bg-indigo-50/80 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
        }`}
        title={isPickingUp ? `Autonomous Stacking at ${playbackSpeed}x (Click to cycle speed)` : "Autonomous Pick & Place (Pure Algorithm)"}
      >
        {isPickingUp ? (
          <>
            <FastForward className="w-5 h-5 animate-pulse" />
            <span>{playbackSpeed}x Stacking</span>
          </>
        ) : (
          <>
            <Cpu className="w-5 h-5 text-indigo-500" />
            <span className="hidden sm:inline">Autonomous Run</span>
            <span className="sm:hidden">Auto</span>
          </>
        )}
      </button>

      {/* Play/Pause Button */}
      <button 
        onClick={togglePause} 
        className={`w-14 h-14 rounded-2xl glass-panel flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl ${panelStyle}`}
        title={isPaused ? "Resume" : "Pause"}
      >
        {isPaused ? <Play className={`w-6 h-6 ${iconFill}`} /> : <Pause className={`w-6 h-6 ${iconFill}`} />}
      </button>
      
      {/* Cube Arrangements & Formations Button (108 Possibilities) */}
      <button 
        onClick={onOpenArrangements} 
        className={`relative w-14 h-14 rounded-2xl glass-panel flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl ${panelStyle}`}
        title="Cube Arrangements (108 Possibilities)"
      >
        <RotateCcw className="w-6 h-6" />
        <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-md border border-white/20 tracking-tighter">
          108
        </span>
      </button>

      {/* Robot Selection Button (10 Famous Robots) */}
      <button 
        onClick={onOpenRobotModal} 
        className={`relative w-14 h-14 rounded-2xl glass-panel flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl ${panelStyle}`}
        title="Switch Robot Model (10 Famous Robots: SCARA, UR5e, KUKA...)"
      >
        <Bot className="w-6 h-6" />
        <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-md border border-white/20 tracking-tighter">
          10
        </span>
      </button>

      {/* Dark Mode Toggle */}
      <button 
        onClick={toggleDarkMode} 
        className={`w-14 h-14 rounded-2xl glass-panel flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl ${panelStyle}`}
        title={isDarkMode ? "Light Mode" : "Dark Mode"}
      >
        {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>

      {/* Sidebar Toggle */}
      <button 
        onClick={toggleSidebar} 
        className={`w-14 h-14 rounded-2xl glass-panel flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl ${showSidebar ? (isDarkMode ? 'text-indigo-400 bg-slate-800' : 'text-indigo-600 bg-white') : panelStyle}`}
        title="Toggle Analysis Panel"
      >
        <PanelRight className="w-6 h-6" />
      </button>
    </div>
  );
}
