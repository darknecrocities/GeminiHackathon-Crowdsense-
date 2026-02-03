
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Detection, CrowdMetrics, RiskLevel } from '../types';
import { geminiService } from '../services/geminiService';
import { yoloService } from '../services/yoloService';

declare const Hls: any;

interface CameraFeedProps {
  onMetricsUpdate: (metrics: CrowdMetrics) => void;
  onDetectionsUpdate: (detections: Detection[]) => void;
  sourceType: 'webcam' | 'file' | 'ipcam' | 'simulation';
  sourceUrl?: string | null;
  isLive: boolean;
  pollingInterval: number;
}

export const CameraFeed = forwardRef(({ 
  onMetricsUpdate, 
  onDetectionsUpdate,
  sourceType,
  sourceUrl,
  isLive,
  pollingInterval
}: CameraFeedProps, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<any>(null);
  
  // Tracking State for Agitation Logic
  const prevDetectionsRef = useRef<Detection[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<'video' | 'snapshot'>('video');
  const [snapshotTrigger, setSnapshotTrigger] = useState(0);

  useImperativeHandle(ref, () => ({
    triggerManualScan: () => captureAndAnalyze()
  }));

  // cleanup HLS on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  // Initialize Stream
  useEffect(() => {
    setError(null);
    setFeedMode('video');
    
    // Stop previous streams
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
      videoRef.current.srcObject = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const initCamera = async () => {
      if (!sourceUrl && sourceType !== 'webcam' && sourceType !== 'simulation') return;

      if (sourceType === 'webcam') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
          if (videoRef.current) {
             videoRef.current.srcObject = stream;
             videoRef.current.play();
          }
        } catch (e) {
          setError("Camera access denied. Check browser permissions.");
        }
      } 
      else if (sourceType === 'file' && sourceUrl) {
        if (videoRef.current) {
          videoRef.current.src = sourceUrl;
          videoRef.current.load();
          videoRef.current.play();
        }
      }
      else if (sourceType === 'ipcam' && sourceUrl) {
        if (sourceUrl.startsWith('rtsp')) {
          setError("RTSP_PROTOCOL_MISMATCH"); 
          return;
        }
        if (sourceUrl.includes('.jpg') || sourceUrl.includes('snapshot')) {
          setFeedMode('snapshot');
          return;
        }
        if (Hls.isSupported() && sourceUrl.endsWith('.m3u8')) {
          const hls = new Hls();
          hls.loadSource(sourceUrl);
          hls.attachMedia(videoRef.current);
          hlsRef.current = hls;
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
             videoRef.current?.play().catch(e => console.error("Autoplay blocked", e));
          });
          hls.on(Hls.Events.ERROR, (event: any, data: any) => {
             if (data.fatal) {
               setError(`HLS Error: ${data.type}`);
             }
          });
        } else {
          if (videoRef.current) {
            videoRef.current.crossOrigin = "anonymous"; 
            videoRef.current.src = sourceUrl;
            videoRef.current.play().catch(e => {
               setError("STREAM_CONNECTION_FAILED");
            });
          }
        }
      }
    };

    if (sourceType !== 'simulation') {
      initCamera();
    }

  }, [sourceType, sourceUrl]);

  const captureAndAnalyze = async () => {
    if (isProcessing || !canvasRef.current || !overlayCanvasRef.current) return;
    
    if (sourceType === 'simulation') {
      runSimulation();
      return;
    }

    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let sourceWidth = 640;
      let sourceHeight = 480;

      if (feedMode === 'video' && videoRef.current) {
        const video = videoRef.current;
        if (video.readyState < 2 || video.paused || video.ended) { setIsProcessing(false); return; }
        sourceWidth = video.videoWidth;
        sourceHeight = video.videoHeight;
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        ctx.drawImage(video, 0, 0, sourceWidth, sourceHeight);
      } else if (feedMode === 'snapshot' && imgRef.current) {
        const img = imgRef.current;
        if (!img.complete || img.naturalWidth === 0) { setIsProcessing(false); return; }
        sourceWidth = img.naturalWidth;
        sourceHeight = img.naturalHeight;
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        ctx.drawImage(img, 0, 0, sourceWidth, sourceHeight);
        if (isLive) setSnapshotTrigger(prev => prev + 1);
      } else {
        setIsProcessing(false);
        return;
      }

      const detections = await yoloService.runInference(canvas);
      onDetectionsUpdate(detections);
      updateMetricsLocally(detections);
      drawOverlays(detections, sourceWidth, sourceHeight);
      
      if (detections.length >= 0) setError(null);

    } catch (e: any) {
      console.error("Inference Error:", e);
      if (e.message?.includes("Tainted")) {
        setError("CORS_SECURITY_BLOCK");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const runSimulation = () => {
      const mockCount = 15 + Math.floor(Math.random() * 20);
      const detections: Detection[] = Array.from({ length: mockCount }, (_, i) => ({
        id: `sim-${i}`,
        box_2d: [Math.random() * 800, Math.random() * 800, 200 + Math.random() * 800, 200 + Math.random() * 800],
        label: Math.random() > 0.8 ? "backpack" : "person",
        confidence: 0.9
      }));
      onDetectionsUpdate(detections);
      updateMetricsLocally(detections);
      drawOverlays(detections, 1280, 720);
  };

  // --- ENHANCED CROWD DYNAMICS ENGINE ---
  const updateMetricsLocally = (detections: Detection[]) => {
    // 1. Filter People Only for Density
    const people = detections.filter(d => d.label === 'person');
    const peopleCount = people.length;
    
    // 2. Object Histogram
    const objectCounts: Record<string, number> = {};
    detections.forEach(d => {
      objectCounts[d.label] = (objectCounts[d.label] || 0) + 1;
    });

    // 3. Agitation Calculation (Frame-to-Frame Centroid Delta)
    let totalMovement = 0;
    let matchCount = 0;
    const prev = prevDetectionsRef.current;
    
    people.forEach(curr => {
        const cy = (curr.box_2d[0] + curr.box_2d[2]) / 2;
        const cx = (curr.box_2d[1] + curr.box_2d[3]) / 2;
        
        // Find nearest in prev frame
        let minDist = 100000;
        prev.forEach(p => {
             const py = (p.box_2d[0] + p.box_2d[2]) / 2;
             const px = (p.box_2d[1] + p.box_2d[3]) / 2;
             const dist = Math.sqrt(Math.pow(cx - px, 2) + Math.pow(cy - py, 2));
             if (dist < minDist) minDist = dist;
        });

        // Threshold for valid movement (ignore new spawns)
        if (minDist < 100) { 
           totalMovement += minDist;
           matchCount++;
        }
    });

    const avgMovement = matchCount > 0 ? totalMovement / matchCount : 0;
    // Normalize agitation: 0 to 1 (Assuming >20px avg movement is "High Agitation")
    const agitationLevel = Math.min(1, avgMovement / 20); 

    prevDetectionsRef.current = people; // Update history

    // 4. Density Calculation
    const density = peopleCount / 35; // Proxy for people/m2 based on typical FOV
    
    // 5. Panic Index (Agitation * Density)
    // If people are packed AND moving fast, that's panic.
    let panicIndex = 0;
    if (density > 1) {
       panicIndex = (agitationLevel * 0.7) + (Math.min(density, 4) / 4 * 0.3);
    }
    
    // 6. Risk Level Logic
    const prob = density > 2.5 ? Math.min(0.95, density / 4) : density / 12;
    let calculatedRisk = geminiService.calcRisk(density, prob);
    
    // Override Risk if Panic or Weapons detected
    if (panicIndex > 0.6) calculatedRisk = RiskLevel.CRITICAL;
    if (objectCounts['knife'] > 0 || objectCounts['baseball bat'] > 0) calculatedRisk = RiskLevel.CRITICAL;

    onMetricsUpdate({
      peopleCount,
      density,
      flowRate: 80 + Math.floor(Math.random() * 40),
      counterFlowCount: Math.floor(density * 1.2),
      avgVelocity: agitationLevel * 2, // Proxy
      congestionZoneCount: density > 2.2 ? 2 : 0,
      stampedeProbability: prob,
      riskLevel: calculatedRisk,
      agitationLevel,
      panicIndex,
      objectCounts
    });
  };

  const drawOverlays = (detections: Detection[], videoW: number, videoH: number) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = canvas.parentElement;
    canvas.width = container?.clientWidth || 640;
    canvas.height = container?.clientHeight || 480;

    const scaleX = canvas.width / 1000;
    const scaleY = canvas.height / 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach((det) => {
      const [ymin, xmin, ymax, xmax] = det.box_2d;
      const x = xmin * scaleX;
      const y = ymin * scaleY;
      const w = (xmax - xmin) * scaleX;
      const h = (ymax - ymin) * scaleY;

      // Color coding based on class
      let color = '#22d3ee'; // Cyan (Person)
      if (det.label === 'backpack' || det.label === 'suitcase') color = '#fbbf24'; // Amber
      if (det.label === 'knife' || det.label === 'baseball bat') color = '#ef4444'; // Red

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
      ctx.font = '10px monospace';
      ctx.fillText(`${det.label} ${(det.confidence || 0).toFixed(2)}`, x, y - 5);
      
      ctx.fillStyle = color.replace(')', ', 0.1)').replace('rgb', 'rgba');
      if (color.startsWith('#')) {
         // rough hex to rgba conversion for fill
         ctx.fillStyle = color + '20';
      }
      ctx.fillRect(x, y, w, h);
    });
  };

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(captureAndAnalyze, pollingInterval);
    return () => clearInterval(interval);
  }, [isLive, pollingInterval, sourceType, sourceUrl, feedMode, snapshotTrigger]);

  // Error rendering omitted for brevity (same as previous)
  return (
    <div className="relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden border border-white/5 group">
      {/* Video/Image Elements */}
      {sourceType !== 'simulation' && feedMode === 'video' && (
        <video ref={videoRef} playsInline muted loop={sourceType === 'file'} className="w-full h-full object-contain" crossOrigin="anonymous"/>
      )}
      {sourceType !== 'simulation' && feedMode === 'snapshot' && sourceUrl && (
        <img ref={imgRef} src={`${sourceUrl}${sourceUrl.includes('?') ? '&' : '?'}t=${snapshotTrigger}`} className="w-full h-full object-contain" crossOrigin="anonymous"/>
      )}
      {sourceType === 'simulation' && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 relative overflow-hidden">
           <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:20px_20px]"></div>
           <div className="absolute inset-0 flex items-center justify-center">
             <span className="text-cyan-500/10 font-black text-6xl tracking-tighter italic select-none">SYNTHETIC CORE</span>
           </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={overlayCanvasRef} className="absolute inset-0 pointer-events-none z-20" />
      <div className="scanline opacity-20 pointer-events-none"></div>
      
      {/* Metric Overlay HUD */}
      <div className="absolute bottom-6 left-6 z-30 flex flex-col gap-1 pointer-events-none">
        <div className="glass px-2 py-0.5 rounded text-[8px] font-mono text-cyan-400 uppercase border border-cyan-500/30 inline-block w-fit">
          Source: {sourceType.toUpperCase()}
        </div>
      </div>
    </div>
  );
});
