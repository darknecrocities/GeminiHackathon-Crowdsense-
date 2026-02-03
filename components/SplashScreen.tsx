
import React, { useEffect, useState } from 'react';

export const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [status, setStatus] = useState("INITIALIZING KERNEL");

  useEffect(() => {
    const steps = [
      { p: 15, msg: "LOADING YOLO-V8 QUANTIZED" },
      { p: 35, msg: "MOUNTING WEBASSEMBLY RUNTIME" },
      { p: 60, msg: "ESTABLISHING GEMINI UPLINK" },
      { p: 85, msg: "CALIBRATING OPTICAL SENSORS" },
      { p: 100, msg: "SYSTEM READY" }
    ];

    let currentStep = 0;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setOpacity(0);
            setTimeout(onComplete, 800); 
          }, 500);
          return 100;
        }

        // Update status text based on progress
        if (currentStep < steps.length && prev > steps[currentStep].p) {
            setStatus(steps[currentStep].msg);
            currentStep++;
        }

        return prev + (Math.random() * 2);
      });
    }, 30);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div 
      className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center z-[100] transition-opacity duration-1000"
      style={{ opacity }}
    >
      <div className="relative mb-8">
        <div className="absolute -inset-8 bg-cyan-500/10 blur-2xl rounded-full animate-pulse"></div>
        <h1 className="relative text-6xl md:text-8xl font-black italic tracking-tighter text-white">
          CROWD<span className="text-cyan-400">SENSE</span>
          <span className="absolute -top-4 -right-8 text-xs font-mono text-cyan-600 bg-cyan-900/20 px-2 py-1 rounded border border-cyan-800">V3.0</span>
        </h1>
      </div>
      
      <div className="flex items-center gap-4 mb-16">
        <div className="h-[1px] w-8 md:w-16 bg-gradient-to-r from-transparent to-slate-600"></div>
        <p className="text-xs md:text-sm font-mono text-cyan-500 uppercase tracking-[0.4em] text-center">
          AI Powered Crowd Intelligence
        </p>
        <div className="h-[1px] w-8 md:w-16 bg-gradient-to-l from-transparent to-slate-600"></div>
      </div>

      <div className="w-64 md:w-96 h-1 bg-slate-900 rounded-full overflow-hidden relative border border-white/5">
        <div 
          className="h-full bg-cyan-500 shadow-[0_0_15px_#22d3ee] transition-all duration-100 ease-out relative"
          style={{ width: `${progress}%` }}
        >
            <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_white]"></div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between w-64 md:w-96 font-mono text-[10px] text-slate-500 uppercase">
        <span>{status}</span>
        <span>{Math.floor(progress)}%</span>
      </div>

      {/* Grid Background Effect */}
      <div className="absolute inset-0 z-[-1] opacity-20 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}></div>
    </div>
  );
};
