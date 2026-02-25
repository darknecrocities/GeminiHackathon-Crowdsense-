import { ObjectDetector, FilesetResolver, Detection as MPDetection } from '@mediapipe/tasks-vision';
import { Detection } from '../types';

export class MediaPipeService {
    private detector: ObjectDetector | null = null;
    private isLoaded = false;

    async init() {
        if (this.isLoaded && this.detector) return;

        console.log("[MediaPipe] Initializing vision tasks (ESM)...");
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
            );

            this.detector = await ObjectDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "/model/detector.tflite",
                    delegate: "GPU"
                },
                scoreThreshold: 0.3,
                runningMode: "VIDEO",
                displayNamesLocale: "en"
            });

            this.isLoaded = true;
            console.log("[MediaPipe] Object Detector Ready (ESM).");
        } catch (e) {
            console.error("[MediaPipe] Initialization failed:", e);
        }
    }

    async runInference(imageSource: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement): Promise<Detection[]> {
        if (!this.detector) {
            await this.init();
            if (!this.detector) return [];
        }

        try {
            const startTimeMs = performance.now();
            const results = this.detector.detectForVideo(imageSource, startTimeMs);

            const detections: Detection[] = [];
            results.detections.forEach((det: any, i: number) => {
                const bbox = det.boundingBox;
                if (!bbox) return;

                const imgW = imageSource instanceof HTMLVideoElement ? imageSource.videoWidth : imageSource.width;
                const imgH = imageSource instanceof HTMLVideoElement ? imageSource.videoHeight : imageSource.height;

                // MediaPipe Tasks bounding boxes are usually in pixels. 
                // We normalize to 0-1000 for our renderer.
                const xmin = (bbox.originX / imgW) * 1000;
                const ymin = (bbox.originY / imgH) * 1000;
                const xmax = ((bbox.originX + bbox.width) / imgW) * 1000;
                const ymax = ((bbox.originY + bbox.height) / imgH) * 1000;

                detections.push({
                    id: `mp-${Date.now()}-${i}`,
                    box_2d: [ymin, xmin, ymax, xmax],
                    label: det.categories[0].categoryName || 'person',
                    confidence: det.categories[0].score
                });
            });

            return detections;
        } catch (e) {
            console.error("[MediaPipe] Inference error:", e);
            return [];
        }
    }
}

export const mediaPipeService = new MediaPipeService();
