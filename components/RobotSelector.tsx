/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


interface RobotSelectorProps {
  gizmoStats: { pos: string, rot: string } | null;
  isDarkMode: boolean;
}

/**
 * RobotSelector
 * Overlay displaying current robot info.
 */
export function RobotSelector({ gizmoStats, isDarkMode }: RobotSelectorProps) {
  const panelStyle = isDarkMode ? "bg-slate-900/80 border-white/10 text-slate-100 shadow-slate-900/20" : "bg-white/70 border-white/80 text-slate-800 shadow-slate-100/10";
  const labelStyle = isDarkMode ? "text-slate-400" : "text-slate-400";
  const valueStyle = isDarkMode ? "text-slate-300" : "text-slate-600";

  return (
    // Changed: left-1/2 -translate-x-1/2 for mobile centering, min-[660px]:left-10 min-[660px]:translate-x-0 for desktop
    <div className="absolute top-10 left-1/2 -translate-x-1/2 min-[660px]:left-10 min-[660px]:translate-x-0 z-20 flex flex-col gap-4">
      <div className={`glass-panel px-8 py-5 rounded-[2rem] min-w-[240px] shadow-2xl ${panelStyle}`}>
        <h1 className="text-xl font-bold tracking-tight leading-none text-center">Franka Panda</h1>
      </div>
      
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
