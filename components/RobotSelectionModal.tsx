/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Bot, 
  Check, 
  Cpu, 
  Zap, 
  Scale, 
  Compass, 
  ShieldCheck, 
  Search,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { FAMOUS_ROBOTS, RobotModelDef } from '../robotModels';

interface RobotSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRobot: (robot: RobotModelDef) => void;
  currentRobotId: string;
  isDarkMode: boolean;
  isSwitching?: boolean;
}

export const RobotSelectionModal: React.FC<RobotSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectRobot,
  currentRobotId,
  isDarkMode,
  isSwitching = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');

  if (!isOpen) return null;

  const filteredRobots = FAMOUS_ROBOTS.filter(r => {
    const matchesFilter = filterType === 'All' || 
      (filterType === 'SCARA' && r.dof === 4) ||
      (filterType === '7-DOF' && r.dof === 7) ||
      (filterType === '6-DOF' && r.dof === 6);

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      r.name.toLowerCase().includes(q) || 
      r.manufacturer.toLowerCase().includes(q) ||
      r.tag.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-5xl h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl border overflow-hidden transition-all ${
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
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">Select Robot Model</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase tracking-wider">
                    10 Famous Robots
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Choose between SCARA, Universal Robots UR5e, KUKA, Franka Panda, and other leading industrial manipulators.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors self-end sm:self-auto ${
              isDarkMode 
                ? 'bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-400 hover:text-white' 
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900'
            }`}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className={`px-5 sm:px-6 py-3 border-b flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
          isDarkMode ? 'border-white/5 bg-slate-900/60' : 'border-slate-100 bg-white'
        }`}>
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search robots (e.g. SCARA, UR5e, KUKA, 7-DOF)..."
              className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border focus:outline-none transition-all ${
                isDarkMode 
                  ? 'bg-slate-950/80 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {['All', 'SCARA', '7-DOF', '6-DOF'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap ${
                  filterType === tab
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDarkMode
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'All' ? 'All (10)' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Robot Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRobots.map(robot => {
              const isSelected = currentRobotId === robot.id;
              return (
                <div
                  key={robot.id}
                  onClick={() => onSelectRobot(robot)}
                  className={`group relative flex flex-col p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] shadow-sm ${
                    isSelected
                      ? (isDarkMode 
                          ? 'bg-indigo-950/40 border-indigo-500/70 ring-2 ring-indigo-500/40' 
                          : 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-200')
                      : (isDarkMode 
                          ? 'bg-slate-950/40 border-white/5 hover:border-indigo-500/30 hover:bg-slate-800/40' 
                          : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:shadow-md')
                  }`}
                >
                  {/* Top Header: Tag & DOF */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase tracking-wider">
                      {robot.tag}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {robot.dof} DOF • {robot.type}
                    </span>
                  </div>

                  {/* Robot Title & Manufacturer */}
                  <div className="mb-3">
                    <h3 className={`text-base font-bold transition-colors ${
                      isSelected ? 'text-indigo-500 dark:text-indigo-400' : 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                    }`}>
                      {robot.name}
                    </h3>
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {robot.manufacturer} • {robot.country}
                    </p>
                  </div>

                  {/* Description */}
                  <p className={`text-xs leading-relaxed mb-4 flex-1 ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {robot.description}
                  </p>

                  {/* Specifications Grid */}
                  <div className={`grid grid-cols-4 gap-2 p-3 rounded-xl mb-4 border text-center ${
                    isDarkMode ? 'bg-slate-900/80 border-white/5' : 'bg-slate-50 border-slate-200/60'
                  }`}>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Payload</span>
                      <span className="text-xs font-mono font-bold text-indigo-500 dark:text-indigo-400">{robot.payload}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Reach</span>
                      <span className="text-xs font-mono font-bold">{robot.reach}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Precision</span>
                      <span className="text-xs font-mono font-bold">{robot.repeatability}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Weight</span>
                      <span className="text-xs font-mono font-bold">{robot.weight}</span>
                    </div>
                  </div>

                  {/* Bottom Action Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200/60 dark:border-white/5">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {isSelected ? 'Currently Loaded in Workcell' : 'Ready to Deploy'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRobot(robot);
                      }}
                      disabled={isSwitching}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                        isSelected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Active Robot</span>
                        </>
                      ) : (
                        <>
                          <span>Select Robot</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-2 text-xs shrink-0 ${
          isDarkMode ? 'border-white/5 bg-slate-950/40 text-slate-400' : 'border-slate-100 bg-slate-50/50 text-slate-500'
        }`}>
          <div className="flex items-center gap-2 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Switching robots instantly re-configures kinematics, joints, end-effector sites, and physical dimensions.</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            Showing {filteredRobots.length} of {FAMOUS_ROBOTS.length}
          </span>
        </div>
      </div>
    </div>
  );
};
