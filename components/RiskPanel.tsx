
import React from 'react';
import { RiskLevel, AIReasoning, CrowdMetrics } from '../types';

interface RiskPanelProps {
  metrics: CrowdMetrics;
  reasoning: AIReasoning | null;
  onTriggerReasoning: () => void;
  isAnalyzing: boolean;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({ metrics, reasoning, onTriggerReasoning, isAnalyzing }) => {
  const getRiskStatus = () => {
    switch(metrics.riskLevel) {
      case RiskLevel.CRITICAL: return { label: 'CRITICAL', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/50' };
      case RiskLevel.HIGH: return { label: 'HIGH', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/50' };
      case RiskLevel.MEDIUM: return { label: 'MEDIUM', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/50' };
      default: return { label: 'LOW', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/50' };
    }
  };

  const status = getRiskStatus();

  return (
    <div className="flex flex-col gap-4">
      {/* Risk Level Monitor */}
      <div className={`glass p-6 rounded-2xl border-2 ${status.border} ${status.bg} transition-all duration-500 shadow-xl`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Live Risk Level</span>
            <h2 className={`text-4xl font-black italic tracking-tighter ${status.color}`}>{status.label}</h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Panic Index</span>
            <div className={`text-2xl font-mono ${metrics.panicIndex > 0.5 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
               {(metrics.panicIndex * 100).toFixed(0)}%
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Agitation */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Crowd Agitation</div>
            <div className="flex items-center gap-2">
               <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                 <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${metrics.agitationLevel * 100}%` }}></div>
               </div>
               <span className="text-xs font-mono">{(metrics.agitationLevel * 100).toFixed(0)}%</span>
            </div>
          </div>
          
          {/* Audio Visualizer Proxy */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
             <div className="flex justify-between items-center mb-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Audio Proxy</div>
                <div className="text-[9px] text-slate-500 font-mono">~{metrics.audioLevel.toFixed(0)}dB</div>
             </div>
             <div className="flex items-end justify-between h-3 gap-0.5">
                {[...Array(10)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1 rounded-sm transition-all duration-100 ${
                        (i * 10) < metrics.audioLevel 
                          ? ((i * 10) > 80 ? 'bg-red-500' : 'bg-emerald-400') 
                          : 'bg-slate-800'
                      }`}
                      style={{ height: `${20 + Math.random() * 80}%` }}
                    />
                ))}
             </div>
          </div>
        </div>

        {/* Counter Flow & Zone Alerts */}
        <div className="grid grid-cols-2 gap-4 mt-4">
           <div className={`px-3 py-2 rounded-lg border flex items-center justify-between ${metrics.counterFlowCount > 2 ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-slate-800/50 border-white/5 text-slate-500'}`}>
              <span className="text-[10px] font-bold uppercase">Counter-Flow</span>
              <span className="text-xs font-mono">{metrics.counterFlowCount}</span>
           </div>
           <div className={`px-3 py-2 rounded-lg border flex items-center justify-between ${metrics.zoneViolations > 0 ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' : 'bg-slate-800/50 border-white/5 text-slate-500'}`}>
              <span className="text-[10px] font-bold uppercase">Zone Violation</span>
              <span className="text-xs font-mono">{metrics.zoneViolations}</span>
           </div>
        </div>
      </div>

      {/* Gemini Strategic Advisor */}
      <div className="glass p-6 rounded-2xl border border-cyan-500/20 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs">🤖</div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400">Gemini Intelligence Core</h3>
          </div>
          <span className="text-[9px] font-mono text-slate-600">STATIC MODE</span>
        </div>

        {reasoning ? (
          <div className="space-y-4 mb-6">
            {reasoning.scenarioDescription && (
              <div className="p-4 bg-white/5 rounded-xl border-l-2 border-cyan-500">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-widest">Visual Scenario Assessment</h4>
                <p className="text-sm text-white italic">"{reasoning.scenarioDescription}"</p>
              </div>
            )}
            <div className="p-4 bg-slate-800/50 rounded-xl border border-white/5 shadow-inner">
               <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-widest">Strategic Prediction</h4>
               <p className="text-xs leading-relaxed text-slate-300">{reasoning.prediction}</p>
            </div>
            <div className="p-4 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
              <h4 className="text-[10px] font-bold text-cyan-500 uppercase mb-2 tracking-widest">Tactical Explanation</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-mono">{reasoning.explanation}</p>
            </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">
             <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-white/5">
               <span className="text-xl">📡</span>
             </div>
             <p className="text-[11px] font-mono text-slate-500 uppercase tracking-tighter">Standby for scenario input</p>
          </div>
        )}

        <button 
          onClick={onTriggerReasoning}
          disabled={isAnalyzing}
          className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all relative overflow-hidden group ${
            isAnalyzing 
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
            : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 hover:scale-[1.02] active:scale-95'
          }`}
        >
          {isAnalyzing ? (
            <div className="flex items-center justify-center gap-2">
               <div className="w-3 h-3 border-2 border-slate-600 border-t-white rounded-full animate-spin"></div>
               <span>Reasoning...</span>
            </div>
          ) : (
            <span>Analyze Current Scenario</span>
          )}
        </button>
      </div>
    </div>
  );
};
