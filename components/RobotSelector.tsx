/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bot, ChevronDown } from 'lucide-react';

interface RobotSelectorProps {
  gizmoStats: { pos: string; rot: string } | null;
  isDarkMode: boolean;
  robotName?: string;
  robotDof?: number;
  robotType?: string;
  onOpenRobotModal?: () => void;
}

/**
 * RobotSelector
 * Overlay displaying current robot model and gizmo telemetry.
 */
export function RobotSelector({ 
  gizmoStats, 
  isDarkMode, 
  robotName = 'Franka Emika Panda',
  robotDof = 7,
  robotType = 'Articulated Cobot',
  onOpenRobotModal
}: RobotSelectorProps) {
  const panelStyle = isDarkMode ? "bg-slate-900/80 border-white/10 text-slate-100 shadow-slate-900/20" : "bg-white/70 border-white/80 text-slate-800 shadow-slate-100/10";
  const labelStyle = isDarkMode ? "text-slate-400" : "text-slate-400";
  const valueStyle = isDarkMode ? "text-slate-300" : "text-slate-600";

  return (
    <div className="absolute top-10 left-1/2 -translate-x-1/2 min-[660px]:left-10 min-[660px]:translate-x-0 z-20 flex flex-col gap-3">
      {/* Robot Brand Card */}
      <div 
        onClick={onOpenRobotModal}
        className={`glass-panel px-6 py-4 rounded-[2rem] min-w-[250px] shadow-2xl transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${panelStyle}`}
        title="Click to switch robot model (SCARA, UR5e, KUKA, etc.)"
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
            Robot Spacial
          </span>
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
            isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
          }`}>
            {robotDof} DOF
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-500" />
            <h1 className="text-base font-bold tracking-tight leading-none truncate max-w-[190px]">
              {robotName}
            </h1>
          </div>
          {onOpenRobotModal && (
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0" />
          )}
        </div>
      </div>
      
      {/* Telemetry Stats */}
      {gizmoStats && (
        <div className={`glass-card px-5 py-3 rounded-2xl flex flex-col gap-2 shadow-sm ${isDarkMode ? 'bg-slate-800/60 border-white/5' : 'bg-white/40 border-white/50'}`}>
          <div className="font-mono text-[9px] space-y-0.5">
            <p className="flex justify-between gap-4"><span className={labelStyle}>POSITION:</span> <span className={`${valueStyle} font-semibold`}>{gizmoStats.pos}</span></p>
            <p className="flex justify-between gap-4"><span className={labelStyle}>ROTATION:</span> <span className={`${valueStyle} font-semibold`}>{gizmoStats.rot}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
