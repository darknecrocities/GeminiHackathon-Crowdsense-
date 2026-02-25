
import React, { useState } from 'react';
import { mobileNetService } from '../services/mobileNetService';

export const ModelManager: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [modelSource, setModelSource] = useState<'default' | 'custom'>('default');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    const loadDefaultModel = async () => {
      setStatus('loading');
      setErrorMessage(null);
      try {
        const success = await mobileNetService.loadModelFromUrl('/model/person_detection.onnx');
        setStatus(success ? 'success' : 'error');
        if (success) {
          setModelSource('default');
        } else {
          setErrorMessage("Failed to load model/mobilenet.onnx. Verify the file exists in public/model/");
        }
      } catch (e: any) {
        setStatus('error');
        setErrorMessage(`LOAD ERROR: ${e.message || "Unknown"}`);
      }
    };
    loadDefaultModel();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('loading');
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const success = await mobileNetService.loadModel(reader.result as ArrayBuffer);
        setStatus(success ? 'success' : 'error');
        if (success) {
          setModelSource('custom');
        } else {
          setErrorMessage("Failed to initialize the uploaded ONNX file.");
        }
      } catch (e: any) {
        setStatus('error');
        setErrorMessage(e.message || "Unknown error during initialization.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="glass p-6 rounded-2xl border border-cyan-500/20 flex flex-col gap-5">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MobileNet SSD Engine</h4>
          <p className="text-[9px] text-cyan-500/70 font-mono mt-0.5">HIGH-EFFICIENCY OBJECT TRACKING</p>
        </div>
        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-white/5 text-slate-500'
          }`}>
          {status === 'success' ? (modelSource === 'default' ? 'ENGINE: ACTIVE (DEFAULT)' : 'ENGINE: ACTIVE (CUSTOM)') : 'ENGINE: STANDBY'}
        </span>
      </div>

      <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 space-y-2">
        <h5 className="text-[9px] font-bold text-slate-400 uppercase">Detection Architecture</h5>
        <p className="text-[10px] text-slate-500 leading-tight">
          Optimized for low-latency browser tracking using MobileNet V2 SSD + ByteTrack Persistence.
        </p>
      </div>

      <div className="relative group">
        <input
          type="file"
          accept=".onnx"
          onChange={handleUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="border-2 border-dashed border-slate-700 group-hover:border-cyan-500/50 p-6 rounded-xl transition-all text-center bg-slate-800/20">
          <p className="text-xs text-slate-400 font-medium">Upload Custom .onnx File</p>
          <p className="text-[9px] text-slate-600 mt-1 uppercase tracking-tighter">Optimized for MobileNet SSD</p>
        </div>
      </div>

      {status === 'loading' && (
        <div className="flex items-center justify-center gap-3 py-2">
          <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] font-mono uppercase text-cyan-400">Loading Model (WASM)...</span>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-1">
          <p className="text-[9px] text-red-400 font-mono text-center">Initialization Error</p>
          {errorMessage && (
            <p className="text-[8px] text-red-500/70 font-mono text-center leading-tight break-words">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
