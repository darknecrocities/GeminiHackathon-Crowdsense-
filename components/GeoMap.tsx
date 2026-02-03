
import React, { useMemo } from 'react';
import { Detection, CrowdMetrics } from '../types';

interface GeoMapProps {
  metrics: CrowdMetrics;
  detections: Detection[];
}

export const GeoMap: React.FC<GeoMapProps> = ({ metrics, detections }) => {
  // Normalize coordinates (assuming YOLO output 0-1000) to percentage 0-100%
  const heatPoints = useMemo(() => {
    return detections.map(d => ({
      // In YOLO coords: [ymin, xmin, ymax, xmax]
      // xmin is index 1. 0-1000 scale.
      x: d.box_2d[1] / 10,
      y: d.box_2d[0] / 10,
      id: d.id
    }));
  }, [detections]);

  return (
    <div className="w-full h-full relative glass rounded-3xl overflow-hidden border border-white/5 bg-slate-950 shadow-2xl">
      {/* Abstract Map Grid Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#22d3ee" strokeWidth="0.5"/>
              <rect width="2" height="2" fill="#22d3ee" x="0" y="0" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Sector Indicators */}
      <div className="absolute top-8 left-8 p-4 glass rounded-xl border-l-4 border-cyan-500 backdrop-blur-md">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sector Alpha</h4>
        <div className="text-xl font-bold font-mono text-white">ACTIVE MONITORING</div>
      </div>
      
      <div className="absolute top-8 right-8 p-4 glass rounded-xl border-l-4 border-red-500 backdrop-blur-md">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Density Alert</h4>
        <div className={`text-xl font-bold font-mono ${metrics.density > 2 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
          {metrics.density > 2 ? 'CONGESTED' : 'NOMINAL'}
        </div>
      </div>

      {/* Dynamic Heatmap Core */}
      <div className="absolute inset-0 z-10">
        {heatPoints.map((p) => (
          <div 
            key={p.id}
            className={`absolute rounded-full blur-xl transition-all duration-500 pointer-events-none mix-blend-screen ${
              metrics.riskLevel === 'CRITICAL' ? 'bg-red-500/40' : 
              metrics.riskLevel === 'HIGH' ? 'bg-orange-500/30' : 'bg-cyan-500/20'
            }`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: '60px',
              height: '60px',
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}
      </div>

      {/* Telemetry Overlay */}
      <div className="absolute bottom-8 right-8 text-right font-mono z-20 pointer-events-none">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 border-b border-white/10 pb-1 inline-block">Live Telemetry</div>
        <div className="flex flex-col gap-1">
          {detections.length > 0 ? detections.slice(0, 8).map(d => (
            <div key={d.id} className="text-[9px] text-cyan-400/70">
              ID_{d.id.slice(-4)}: [{(d.box_2d[1]).toFixed(0)}, {(d.box_2d[0]).toFixed(0)}]
            </div>
          )) : (
             <div className="text-[9px] text-slate-600 italic">No targets acquired</div>
          )}
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-3 glass p-4 rounded-xl border border-white/5 z-20">
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]"></div>
           <span className="text-[10px] font-bold text-slate-300 uppercase">Detection</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-red-500 blur-[2px]"></div>
           <span className="text-[10px] font-bold text-slate-300 uppercase">High Density</span>
        </div>
      </div>
    </div>
  );
};
