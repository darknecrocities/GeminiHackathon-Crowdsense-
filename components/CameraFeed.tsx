
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Detection, CrowdMetrics, RiskLevel } from '../types';
import { geminiService } from '../services/geminiService';
import { yoloService } from '../services/yoloService';
import { audioService } from '../services/audioService';

declare const Hls: any;
declare const JSMpeg: any;

interface CameraFeedProps {
  onMetricsUpdate: (metrics: CrowdMetrics) => void;
  onDetectionsUpdate: (detections: Detection[]) => void;
  sourceType: 'webcam' | 'file' | 'ipcam' | 'simulation';
  sourceUrl?: string | null;
  isLive: boolean;
  pollingInterval: number;
  audioEnabled?: boolean;
}

// Restricted Zone Definition (Normalized Coordinates 0-1)
// Top Right Corner box
const RESTRICTED_ZONE = { x: 0.6, y: 0.0, w: 0.4, h: 0.3 };

export const CameraFeed = forwardRef(({
  onMetricsUpdate,
  onDetectionsUpdate,
  sourceType,
  sourceUrl,
  isLive,
  pollingInterval,
  audioEnabled = false
}: CameraFeedProps, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasPlayerRef = useRef<HTMLCanvasElement>(null); // Dedicated player canvas
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<any>(null);
  const jsmpegRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Tracking State for Agitation & Flow
  const prevDetectionsRef = useRef<Detection[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<'video' | 'snapshot' | 'stream-ws'>('video');
  const [snapshotTrigger, setSnapshotTrigger] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  useImperativeHandle(ref, () => ({
    triggerManualScan: () => captureAndAnalyze()
  }));

  // cleanup HLS, streams, and audio on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (jsmpegRef.current) {
        jsmpegRef.current.destroy();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      audioService.stop();
    };
  }, []);

  // Initialize Stream
  useEffect(() => {
    setError(null);
    setFeedMode('video');
    setCameraReady(false);

    // Stop previous streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
      videoRef.current.srcObject = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (jsmpegRef.current) {
      jsmpegRef.current.destroy();
      jsmpegRef.current = null;
    }

    const initCamera = async () => {
      if (!sourceUrl && sourceType !== 'webcam' && sourceType !== 'simulation') return;

      if (sourceType === 'webcam') {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError("Camera API not available. Please use HTTPS or localhost.");
            return;
          }
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'environment'
            }
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(() => {
                setCameraReady(true);
                setError(null);
                // Start real audio capture from microphone
                audioService.startFromMicrophone();
              }).catch(e => {
                console.error("Play failed:", e);
                setError("Camera play failed. Click anywhere on the page first (browser autoplay policy).");
              });
            };
          }
        } catch (e: any) {
          console.error("Camera error:", e);
          if (e.name === 'NotAllowedError') {
            setError("Camera access denied. Please allow camera permission in your browser and refresh.");
          } else if (e.name === 'NotFoundError') {
            setError("No camera found. Please connect a camera and refresh.");
          } else if (e.name === 'NotReadableError') {
            setError("Camera is in use by another application. Close other apps using the camera.");
          } else {
            setError(`Camera error: ${e.message || e.name}`);
          }
        }
      }
      else if (sourceType === 'file' && sourceUrl) {
        if (videoRef.current) {
          videoRef.current.src = sourceUrl;
          videoRef.current.load();
          videoRef.current.onloadeddata = () => {
            setCameraReady(true);
            videoRef.current?.play();
            // Capture audio from video file
            if (videoRef.current) {
              audioService.startFromMediaElement(videoRef.current);
            }
          };
        }
      }
      else if (sourceType === 'ipcam' && sourceUrl) {
        // Transparent RTSP Support for IP Webcam App
        // If the user provides an RTSP link from "IP Webcam", we transparently
        // load the MJPEG stream from the same IP/Port, which browsers support.
        if (sourceUrl.startsWith('rtsp')) {
          const match = sourceUrl.match(/rtsp:\/\/([\d.]+):(\d+)/);
          if (match) {
            // We don't set an error. We just proceed. 
            // The <img> tag below will handle the display using a constructed HTTP URL.
          } else {
            setError("Invalid RTSP URL format.");
            return;
          }
        }
        // MJPEG snapshot mode
        if (sourceUrl.includes('.jpg') || sourceUrl.includes('snapshot') || sourceUrl.includes('mjpg')) {
          setFeedMode('snapshot');
          setCameraReady(true);
          return;
        }
        // HLS stream
        if (sourceUrl.endsWith('.m3u8')) {
          try {
            if (typeof Hls !== 'undefined' && Hls.isSupported()) {
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
              });
              hls.loadSource(sourceUrl);
              hls.attachMedia(videoRef.current);
              hlsRef.current = hls;
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setCameraReady(true);
                videoRef.current?.play().then(() => {
                  if (audioEnabled && videoRef.current) {
                    audioService.startFromMediaElement(videoRef.current);
                  }
                }).catch(e => console.error("Autoplay blocked", e));
              });
              hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
                if (data.fatal) {
                  setError(`HLS Stream Error: ${data.type}. Check the stream URL.`);
                }
              });
            } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
              // Native HLS support (Safari)
              videoRef.current.src = sourceUrl;
              videoRef.current.onloadeddata = () => {
                setCameraReady(true);
                videoRef.current?.play();
              };
            } else {
              setError("HLS.js library not loaded. Check your internet connection.");
            }
          } catch (e) {
            setError("Failed to initialize HLS stream.");
          }
        }
        // JSMpeg / WebSocket Bridge (Low Latency RTSP)
        else if (sourceUrl.startsWith('ws://')) {
          if (typeof JSMpeg !== 'undefined' && canvasPlayerRef.current) {
            setFeedMode('stream-ws');
            // Force 2D canvas execution context to avoid "Failed to get WebGL Context"
            // and ensure we can easily read the canvas data for YOLO inference
            try {
              jsmpegRef.current = new JSMpeg.Player(sourceUrl, {
                canvas: canvasPlayerRef.current,
                autoplay: true,
                audio: audioEnabled,
                disableGl: true, // Crucial for compatibility
                videoBufferSize: 1024 * 1024, // Increase buffer slightly
                onPlay: () => {
                  setCameraReady(true);
                  setError(null);
                }
              });
            } catch (e) {
              console.error("JSMpeg Init Failed:", e);
              setError("Failed to initialize RTSP Player. Check if proxy is running.");
            }
          } else {
            setError("JSMpeg library not loaded.");
          }
        }
        // Direct video stream (MJPEG over HTTP, etc.)
        else {
          if (videoRef.current) {
            videoRef.current.crossOrigin = "anonymous";
            videoRef.current.src = sourceUrl;
            videoRef.current.onloadeddata = () => {
              setCameraReady(true);
            };
            videoRef.current.onerror = () => {
              // Try as MJPEG snapshot instead
              setFeedMode('snapshot');
              setCameraReady(true);
            };
            videoRef.current.play().then(() => {
              if (audioEnabled && videoRef.current) {
                audioService.startFromMediaElement(videoRef.current);
              }
            }).catch(_e => {
              // If direct play fails, try snapshot mode
              setFeedMode('snapshot');
              setCameraReady(true);
            });
          }
        }
      }
    };

    if (sourceType !== 'simulation') {
      initCamera();
    } else {
      setCameraReady(true);
    }

  }, [sourceType, sourceUrl]);

  // Handle dynamic audio toggle while stream is running
  useEffect(() => {
    if (cameraReady && feedMode === 'video' && videoRef.current) {
      if (audioEnabled) {
        audioService.startFromMediaElement(videoRef.current);
      } else {
        audioService.stop();
      }
    }
  }, [audioEnabled, cameraReady, feedMode]);

  const captureAndAnalyze = useCallback(async () => {
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
      } else if (feedMode === 'snapshot' && (imgRef.current || jsmpegRef.current)) {
        // For JSMpeg, the canvas is already being drawn to by the library.
        // We just need to trigger inference on that same canvas.
        if (imgRef.current) {
          const img = imgRef.current;
          if (!img.complete || img.naturalWidth === 0) { setIsProcessing(false); return; }
          sourceWidth = img.naturalWidth;
          sourceHeight = img.naturalHeight;
          canvas.width = sourceWidth;
          canvas.height = sourceHeight;
          ctx.drawImage(img, 0, 0, sourceWidth, sourceHeight);
          if (isLive) setSnapshotTrigger(prev => prev + 1);
        } else {
          // JSMpeg Case: Use existing canvas data
          sourceWidth = canvas.width;
          sourceHeight = canvas.height;
        }
      } else {
        setIsProcessing(false);
        return;
      }

      const detections = await yoloService.runInference(canvas);
      onDetectionsUpdate(detections);
      updateMetricsLocally(detections, sourceWidth, sourceHeight);
      drawOverlays(detections, sourceWidth, sourceHeight);

      if (detections.length >= 0) setError(null);

    } catch (e: any) {
      console.error("Inference Error:", e);
      if (e.message?.includes("Tainted")) {
        setError("CORS blocked: The video source doesn't allow cross-origin access.");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, sourceType, feedMode, isLive, onDetectionsUpdate, onMetricsUpdate]);

  const runSimulation = () => {
    const mockCount = 15 + Math.floor(Math.random() * 20);
    const detections: Detection[] = Array.from({ length: mockCount }, (_, i) => ({
      id: `sim-${i}`,
      box_2d: [Math.random() * 800, Math.random() * 800, 200 + Math.random() * 800, 200 + Math.random() * 800],
      label: Math.random() > 0.8 ? "backpack" : "person",
      confidence: 0.9
    }));
    onDetectionsUpdate(detections);
    updateMetricsLocally(detections, 1280, 720);
    drawOverlays(detections, 1280, 720);
  };

  // --- ENHANCED PHYSICS ENGINE ---
  const updateMetricsLocally = (detections: Detection[], width: number, height: number) => {
    // 1. Filter
    const people = detections.filter(d => d.label === 'person');
    const peopleCount = people.length;

    // 2. Object Histogram
    const objectCounts: Record<string, number> = {};
    detections.forEach(d => {
      objectCounts[d.label] = (objectCounts[d.label] || 0) + 1;
    });

    // 3. Tracking & Vectors (Agitation + Counter-Flow)
    let totalMovement = 0;
    let matchCount = 0;
    const vectors: { dx: number, dy: number }[] = [];
    const prev = prevDetectionsRef.current;

    people.forEach(curr => {
      const cy = (curr.box_2d[0] + curr.box_2d[2]) / 2;
      const cx = (curr.box_2d[1] + curr.box_2d[3]) / 2;

      // Find nearest in prev frame (Greedy Match)
      let minDist = 100000;
      let matchedPrev: { px: number; py: number } | null = null;

      prev.forEach(p => {
        const py = (p.box_2d[0] + p.box_2d[2]) / 2;
        const px = (p.box_2d[1] + p.box_2d[3]) / 2;
        const dist = Math.sqrt(Math.pow(cx - px, 2) + Math.pow(cy - py, 2));
        if (dist < minDist) {
          minDist = dist;
          matchedPrev = { px, py };
        }
      });

      // Threshold for valid movement 
      if (minDist < 100 && matchedPrev) {
        totalMovement += minDist;
        vectors.push({ dx: cx - matchedPrev.px, dy: cy - matchedPrev.py });
        matchCount++;
      }
    });

    const avgMovement = matchCount > 0 ? totalMovement / matchCount : 0;
    const agitationLevel = Math.min(1, avgMovement / 20);

    // Counter Flow Logic (Feature: True Vector Analysis)
    let counterFlowCount = 0;
    let avgFlowAngle = 0;

    if (vectors.length > 2) {
      // Calculate Average Flow Vector
      const avgDx = vectors.reduce((acc, v) => acc + v.dx, 0) / vectors.length;
      const avgDy = vectors.reduce((acc, v) => acc + v.dy, 0) / vectors.length;
      avgFlowAngle = Math.atan2(avgDy, avgDx); // Radians

      // Check for deviants (>120 degrees offset)
      counterFlowCount = vectors.filter(v => {
        const angle = Math.atan2(v.dy, v.dx);
        const diff = Math.abs(angle - avgFlowAngle);
        return diff > (Math.PI * 0.66); // > 120 degrees
      }).length;
    }

    // Zone Fencing Logic (Feature: Zone Violation)
    let zoneViolations = 0;
    people.forEach(p => {
      const cy = (p.box_2d[0] + p.box_2d[2]) / 2;
      const cx = (p.box_2d[1] + p.box_2d[3]) / 2;
      // Normalize
      const nx = cx / width;
      const ny = cy / height;

      if (nx >= RESTRICTED_ZONE.x && nx <= (RESTRICTED_ZONE.x + RESTRICTED_ZONE.w) &&
        ny >= RESTRICTED_ZONE.y && ny <= (RESTRICTED_ZONE.y + RESTRICTED_ZONE.h)) {
        zoneViolations++;
      }
    });

    prevDetectionsRef.current = people;

    // Metrics Calculation
    const density = peopleCount / 35;
    let panicIndex = 0;
    if (density > 1) {
      panicIndex = (agitationLevel * 0.7) + (Math.min(density, 4) / 4 * 0.3);
    }

    // Feature: Live Audio Analysis via Web Audio API
    // Falls back to simulated proxy if mic is not available
    const audioLevel = audioService.active
      ? audioService.getLevel()
      : Math.min(100, (density * 10) + (agitationLevel * 80));

    const prob = density > 2.5 ? Math.min(0.95, density / 4) : density / 12;
    let calculatedRisk = geminiService.calcRisk(density, prob);

    if (panicIndex > 0.6 || zoneViolations > 3 || counterFlowCount > 3) calculatedRisk = RiskLevel.CRITICAL;
    if (objectCounts['knife'] > 0 || objectCounts['baseball bat'] > 0) calculatedRisk = RiskLevel.CRITICAL;

    onMetricsUpdate({
      peopleCount,
      density,
      flowRate: 80 + Math.floor(Math.random() * 40),
      counterFlowCount,
      avgVelocity: agitationLevel * 2,
      congestionZoneCount: density > 2.2 ? 2 : 0,
      stampedeProbability: prob,
      riskLevel: calculatedRisk,
      agitationLevel,
      panicIndex,
      objectCounts,
      audioLevel,
      zoneViolations,
      averageFlowDirection: avgFlowAngle * (180 / Math.PI)
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

    // Draw Restricted Zone
    const zw = RESTRICTED_ZONE.w * canvas.width;
    const zh = RESTRICTED_ZONE.h * canvas.height;
    const zx = RESTRICTED_ZONE.x * canvas.width;
    const zy = RESTRICTED_ZONE.y * canvas.height;

    // Zone Pattern
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(zx, zy, zw, zh);
    ctx.fillRect(zx, zy, zw, zh);
    ctx.fillStyle = '#ef4444';
    ctx.font = '10px monospace';
    ctx.fillText("RESTRICTED ZONE", zx + 5, zy + 15);
    ctx.setLineDash([]);

    // Draw Detections
    detections.forEach((det) => {
      const [ymin, xmin, ymax, xmax] = det.box_2d;
      const x = xmin * scaleX;
      const y = ymin * scaleY;
      const w = (xmax - xmin) * scaleX;
      const h = (ymax - ymin) * scaleY;

      // Color coding
      let color = '#22d3ee';
      if (det.label === 'backpack' || det.label === 'suitcase') color = '#fbbf24';
      if (det.label === 'knife' || det.label === 'baseball bat') color = '#ef4444';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
      ctx.font = '10px monospace';
      ctx.fillText(`${det.label} ${(det.confidence || 0).toFixed(2)}`, x, y - 5);

      ctx.fillStyle = color + '20'; // Hex to rgba approx
      ctx.fillRect(x, y, w, h);
    });
  };

  // Use ref-based interval to avoid stale closure issues
  const captureRef = useRef(captureAndAnalyze);
  captureRef.current = captureAndAnalyze;

  useEffect(() => {
    if (!isLive || !cameraReady) return;
    const interval = setInterval(() => captureRef.current(), pollingInterval);
    return () => clearInterval(interval);
  }, [isLive, pollingInterval, cameraReady]);

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden border border-white/5 group">
      {/* Video/Image Elements */}
      {sourceType !== 'simulation' && feedMode === 'video' && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={!audioEnabled}
          loop={sourceType === 'file'}
          className="w-full h-full object-contain"
        />
      )}
      {sourceType !== 'simulation' && feedMode === 'snapshot' && sourceUrl && !sourceUrl.startsWith('ws') && (
        <img
          ref={imgRef}
          src={
            sourceUrl.startsWith('rtsp')
              ? sourceUrl.replace('rtsp://', 'http://').replace(/\/.*$/, '/video') // Magic RTSP->MJPEG conversion
              : `${sourceUrl}${sourceUrl.includes('?') ? '&' : '?'}t=${snapshotTrigger}`
          }
          className="w-full h-full object-contain"
          crossOrigin="anonymous"
          onError={() => setError("Camera Unreachable. Check IP/Wi-Fi connection.")}
        />
      )}

      {/* Dedicated JSMpeg Canvas */}
      <canvas
        ref={canvasPlayerRef}
        className={`w-full h-full object-contain ${feedMode === 'stream-ws' ? 'block' : 'hidden'}`}
      />

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

      {/* Error Display */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass p-6 rounded-2xl border border-red-500/30 max-w-md text-center">
            <div className="text-red-400 text-3xl mb-3">⚠️</div>
            <h4 className="text-red-400 font-bold text-sm uppercase mb-2">Connection Error</h4>
            <p className="text-slate-300 text-xs leading-relaxed">{error}</p>

            <div className="mt-4 flex flex-col gap-2">
              <a
                href={sourceUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-cyan-400 underline hover:text-cyan-300"
              >
                Verify URL: Open stream in new tab
              </a>

              <div className="p-3 bg-red-950/20 rounded-lg border border-red-500/10 text-left">
                <h5 className="text-[9px] font-bold text-red-300 uppercase mb-1">Potential Fixes:</h5>
                <ul className="text-[9px] text-slate-400 space-y-1 list-disc ml-3 leading-tight">
                  <li>Ensure your phone and PC are on the <b>SAME Wi-Fi</b></li>
                  <li>Check if the URL works in a <b>VLC Player</b> first</li>
                  <li>Disable <b>HTTPS</b> (Browsers block local HTTP cams on HTTPS sites)</li>
                  <li>Install a "CORS Unblock" browser extension if you see "Tainted Canvas"</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => { setError(null); window.location.reload(); }}
              className="mt-4 w-full py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-bold uppercase hover:bg-red-500/30 transition-all"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Metric Overlay HUD */}
      <div className="absolute bottom-6 left-6 z-30 flex flex-col gap-1 pointer-events-none">
        <div className="glass px-2 py-0.5 rounded text-[8px] font-mono text-cyan-400 uppercase border border-cyan-500/30 inline-block w-fit">
          Source: {sourceType.toUpperCase()}
        </div>
        {cameraReady && (
          <div className="glass px-2 py-0.5 rounded text-[8px] font-mono text-emerald-400 uppercase border border-emerald-500/30 inline-block w-fit">
            ● CONNECTED
          </div>
        )}
      </div>
    </div>
  );
});
