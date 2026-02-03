
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { Sidebar } from './components/Sidebar';
import { CameraFeed } from './components/CameraFeed';
import { RiskPanel } from './components/RiskPanel';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { CountermeasureChecklist } from './components/CountermeasureChecklist';
import { ModelManager } from './components/ModelManager';
import { GeoMap } from './components/GeoMap';
import { CrowdMetrics, Detection, AIReasoning, RiskLevel } from './types';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState<CrowdMetrics>({
    peopleCount: 0, 
    density: 0, 
    flowRate: 0, 
    counterFlowCount: 0,
    avgVelocity: 0, 
    congestionZoneCount: 0, 
    stampedeProbability: 0, 
    riskLevel: RiskLevel.LOW,
    agitationLevel: 0,
    panicIndex: 0,
    objectCounts: {}
  });
  const [history, setHistory] = useState<CrowdMetrics[]>([]);
  const [reasoning, setReasoning] = useState<AIReasoning | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Input Source State
  const [sourceType, setSourceType] = useState<'webcam' | 'file' | 'ipcam' | 'simulation'>('webcam');
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [ipInput, setIpInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (metrics.peopleCount > 0 || isLive) {
      setHistory(prev => [...prev.slice(-100), metrics]);
    }
  }, [metrics]);

  const handleManualReasoning = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const result = await geminiService.getStrategicFeedback(metrics, detections);
      setReasoning(result);
    } catch (e) {
      console.error("Manual Analysis Error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSourceUrl(url);
      setSourceType('file');
    }
  };

  const handleIpSubmit = () => {
    if (!ipInput) return;
    setSourceUrl(ipInput);
  };

  // Determines if the main visible view includes the camera, or if we need a background worker
  const isCameraVisible = activeTab === 'dashboard' || activeTab === 'camera';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full min-h-0">
              <div className="flex-1 min-h-0 relative">
                <CameraFeed 
                  onMetricsUpdate={setMetrics} 
                  onDetectionsUpdate={setDetections}
                  sourceType={sourceType}
                  sourceUrl={sourceUrl}
                  isLive={isLive}
                  pollingInterval={150} 
                />
              </div>
              <div className="h-1/3">
                 <AnalyticsPanel history={history} />
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto no-scrollbar pb-10">
              <RiskPanel metrics={metrics} reasoning={reasoning} onTriggerReasoning={handleManualReasoning} isAnalyzing={isAnalyzing} />
              <ModelManager />
              <CountermeasureChecklist suggestions={reasoning?.countermeasures || []} />
            </div>
          </div>
        );
      case 'camera':
        return (
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex-1 glass rounded-3xl overflow-hidden border border-white/10 relative">
              <CameraFeed 
                onMetricsUpdate={setMetrics} 
                onDetectionsUpdate={setDetections}
                sourceType={sourceType}
                sourceUrl={sourceUrl}
                isLive={isLive}
                pollingInterval={100} 
              />
            </div>
          </div>
        );
      case 'risk':
        return (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto no-scrollbar">
            <RiskPanel metrics={metrics} reasoning={reasoning} onTriggerReasoning={handleManualReasoning} isAnalyzing={isAnalyzing} />
            <div className="glass p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-6 italic text-cyan-400">Response Protocols</h3>
              <CountermeasureChecklist suggestions={reasoning?.countermeasures || []} />
            </div>
          </div>
        );
      case 'map':
        return <div className="flex-1 h-full"><GeoMap metrics={metrics} detections={detections} /></div>;
      case 'analytics':
        return (
          <div className="flex-1 glass p-8 rounded-3xl overflow-y-auto">
            <h3 className="text-2xl font-black italic mb-8">Full Intelligence Archive</h3>
            <div className="h-[500px] mb-8"><AnalyticsPanel history={history} /></div>
            <div className="grid grid-cols-3 gap-6">
               {history.slice(-3).map((h, i) => (
                 <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                   <div className="text-[10px] text-slate-500 uppercase">Snapshot t-{i}</div>
                   <div className="text-xl font-bold font-mono">{h.peopleCount} People</div>
                   <div className="text-xs text-cyan-500">{h.riskLevel} Risk</div>
                 </div>
               ))}
            </div>
          </div>
        );
      case 'simulation':
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-24 h-24 bg-cyan-500/20 rounded-full flex items-center justify-center text-4xl mb-6 animate-pulse">🧪</div>
            <h2 className="text-3xl font-black italic mb-4">Synthetic Scenario Engine</h2>
            <p className="max-w-md text-slate-400 mb-8">Stress test your crowd protocols using GPU-accelerated synthetic distributions.</p>
            <button 
              onClick={() => { setSourceType('simulation'); setActiveTab('dashboard'); }}
              className="px-8 py-3 bg-cyan-500 text-slate-950 font-bold rounded-xl uppercase tracking-widest hover:bg-cyan-400 transition-all"
            >
              Initialize Simulation
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden relative">
        {/* Unified Control Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="w-2 h-6 bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.4)]"></span>
                {activeTab.toUpperCase()}
              </h2>
              
              {/* Source Selection */}
              <div className="flex bg-slate-900 border border-white/5 rounded-xl p-1 gap-1">
                <button 
                  onClick={() => setSourceType('webcam')}
                  className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${sourceType === 'webcam' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Cam
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${sourceType === 'file' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Upload
                </button>
                <button 
                  onClick={() => setSourceType('ipcam')}
                  className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${sourceType === 'ipcam' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  IP-Stream
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
              </div>
            </div>

            <div className="flex items-center gap-3">
               <div className="glass px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                 <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Analytics Online</span>
               </div>
               <button 
                onClick={() => setIsLive(!isLive)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${
                  isLive ? 'border-red-500/50 text-red-500 bg-red-500/5' : 'border-slate-500 text-slate-500'
                }`}
              >
                {isLive ? '● Live Stream' : 'Stream Paused'}
              </button>
            </div>
          </div>

          {/* Dedicated IP Input Bar */}
          {sourceType === 'ipcam' && (
            <div className="flex items-center gap-2 p-2 bg-slate-900/50 border border-white/10 rounded-xl animate-in slide-in-from-top-2">
              <span className="text-xs ml-2 text-slate-400">🌐</span>
              <input 
                type="text" 
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                placeholder="Paste URL (e.g. http://192.168.1.5:8080/video)"
                className="flex-1 bg-transparent border-none text-xs font-mono text-cyan-400 placeholder-slate-600 focus:ring-0 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleIpSubmit()}
              />
              <button 
                onClick={handleIpSubmit}
                className="px-4 py-1.5 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase rounded-lg hover:bg-cyan-500/20 transition-all"
              >
                Connect
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        {renderContent()}

        {/* 
            Persistent Background Worker 
            Ensures that when we are in Map/Analytics/Risk views (where CameraFeed isn't visible),
            we still process the video stream to update metrics and detections.
        */}
        {!isCameraVisible && (
          <div className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
             <CameraFeed 
                onMetricsUpdate={setMetrics} 
                onDetectionsUpdate={setDetections}
                sourceType={sourceType}
                sourceUrl={sourceUrl}
                isLive={isLive}
                pollingInterval={200} // Slightly slower polling for background
             />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
