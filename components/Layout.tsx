
import React from 'react';

declare const window: any;

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handleSwitchKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center font-bold text-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            C
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">CrowdSense<span className="text-cyan-400">™</span></h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Enterprise Intelligence Suite</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={handleSwitchKey}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all group"
          >
            <span className="text-xs font-mono text-slate-400 group-hover:text-cyan-400">KEY CONFIG</span>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1 rounded uppercase">Manage</span>
          </button>
          
          <div className="hidden md:flex gap-4 font-mono text-xs border-l border-white/10 pl-6">
            <div className="flex flex-col items-end">
              <span className="text-slate-500">EDGE ENGINE</span>
              <span className="text-emerald-400">YOLO-ONNX</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-slate-500">REASONING</span>
              <span className="text-cyan-400">GEMINI-3 FLASH</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 relative overflow-hidden flex">
        {children}
      </main>
    </div>
  );
};
