
/**
 * AudioService - Real-time audio level analysis using Web Audio API
 * Captures audio from microphone or video/media elements and provides
 * normalized dB levels for the CrowdSense metrics engine.
 */
export class AudioService {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
    private stream: MediaStream | null = null;
    private dataArray: Uint8Array | null = null;
    private isActive = false;
    private lastLevel = 0;
    private connectedElements = new WeakSet<HTMLMediaElement>();

    /**
     * Start capturing audio from the user's microphone.
     */
    async startFromMicrophone(): Promise<boolean> {
        this.stop();
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn("AudioService: getUserMedia not available");
                return false;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                }
            });

            this.stream = stream;
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;

            this.source = this.audioContext.createMediaStreamSource(stream);
            this.source.connect(this.analyser);
            // Don't connect to destination — we don't want to play mic audio back

            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.isActive = true;

            console.log("AudioService: Microphone audio capture started");
            return true;
        } catch (e: any) {
            console.warn("AudioService: Microphone access failed:", e.message || e);
            return false;
        }
    }

    /**
     * Start capturing audio from a <video> or <audio> HTML element.
     * The element must NOT have crossOrigin issues.
     */
    startFromMediaElement(element: HTMLMediaElement): boolean {
        // Avoid double-connecting the same element
        if (this.connectedElements.has(element)) {
            return this.isActive;
        }

        this.stop();
        try {
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;

            this.source = this.audioContext.createMediaElementSource(element);
            this.source.connect(this.analyser);
            // Connect to destination so the user can still hear the video audio
            this.analyser.connect(this.audioContext.destination);

            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.isActive = true;
            this.connectedElements.add(element);

            console.log("AudioService: Media element audio capture started");
            return true;
        } catch (e: any) {
            console.warn("AudioService: Media element capture failed:", e.message || e);
            return false;
        }
    }

    /**
     * Get the current audio level as a normalized value (0-100).
     * This represents perceived loudness in a dB-like scale.
     */
    getLevel(): number {
        if (!this.isActive || !this.analyser || !this.dataArray) {
            return this.lastLevel;
        }

        // Resume context if suspended (browser autoplay policy)
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }

        this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);

        // Calculate RMS (Root Mean Square) for a more accurate loudness reading
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i] * this.dataArray[i];
        }
        const rms = Math.sqrt(sum / this.dataArray.length);

        // Normalize to 0-100 range
        // Byte frequency data is 0-255, so RMS max is ~255
        const normalized = Math.min(100, (rms / 255) * 150); // slight boost for sensitivity

        // Smooth the output to avoid jitter
        this.lastLevel = this.lastLevel * 0.3 + normalized * 0.7;

        return Math.round(this.lastLevel * 10) / 10;
    }

    /**
     * Get frequency spectrum data for visualization (optional advanced use).
     * Returns an array of 0-255 values across frequency bins.
     */
    getSpectrum(): Uint8Array {
        if (!this.isActive || !this.analyser) {
            return new Uint8Array(0);
        }
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(data);
        return data;
    }

    /**
     * Check if audio capture is currently active.
     */
    get active(): boolean {
        return this.isActive;
    }

    /**
     * Stop all audio capture and clean up resources.
     */
    stop(): void {
        if (this.source) {
            try { this.source.disconnect(); } catch (_) { }
            this.source = null;
        }
        if (this.analyser) {
            try { this.analyser.disconnect(); } catch (_) { }
            this.analyser = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            this.audioContext.close().catch(() => { });
            this.audioContext = null;
        }
        this.dataArray = null;
        this.isActive = false;
        this.lastLevel = 0;
    }
}

export const audioService = new AudioService();
