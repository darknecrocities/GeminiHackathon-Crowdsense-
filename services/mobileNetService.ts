
import { Detection } from "../types";

declare const ort: any;

// Standard COCO Labels for MobileNet SSD (91 classes including background at 0)
// Indices based on COCO 2017 / SSD Mobilenet V1
const MOBILENET_LABELS = [
    "background", "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light",
    "fire hydrant", "street sign", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
    "elephant", "bear", "zebra", "giraffe", "hat", "backpack", "umbrella", "shoe", "eye glasses", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard",
    "tennis racket", "bottle", "plate", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "mirror", "dining table", "window", "desk", "toilet", "door", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone",
    "microwave", "oven", "toaster", "sink", "refrigerator", "blender", "book", "clock", "vase", "scissors", "teddy bear",
    "hair drier", "toothbrush", "hair brush"
];

const SAFETY_RELEVANT_CLASSES = new Set([
    "person", "backpack", "handbag", "suitcase", "cell phone", "baseball bat", "knife", "bottle"
]);

export class MobileNetService {
    private session: any = null;
    private isModelLoaded = false;
    private isCurrentlyLoading = false;
    private modelConfig = {
        width: 224,  // MediaPipe Person Detection expects 224x224
        height: 224
    };

    async loadModelFromUrl(url: string): Promise<boolean> {
        if (this.isCurrentlyLoading) {
            console.log("[MobileNet] Already loading, skipping duplicate request.");
            return false;
        }

        this.isCurrentlyLoading = true;
        try {
            // Standardizing the URL to ensure it's absolute for ORT
            const fullUrl = new URL(url, window.location.href).href;
            console.log(`[MobileNet] Attempting to load model via ORT from: ${fullUrl}`);

            // Pass the URL directly to the initializer
            const result = await this.loadModel(fullUrl);
            this.isCurrentlyLoading = false;
            return result;
        } catch (e: any) {
            this.isCurrentlyLoading = false;
            console.error("[MobileNet] Load failed:", e);
            throw e;
        }
    }

    async loadModel(modelSource: ArrayBuffer | string) {
        try {
            console.log("[MobileNet] Initializing ONNX InferenceSession...");

            if (typeof ort !== 'undefined') {
                // Use default CDN paths but ensure we don't block on proxy
                ort.env.wasm.numThreads = 1;
                ort.env.wasm.proxy = false; // Disable proxy to avoid serialization issues
            }

            this.session = await ort.InferenceSession.create(modelSource, {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all'
            });
            console.log("[MobileNet] SUCCESS: Model loaded and ready.");
            this.isModelLoaded = true;
            return true;
        } catch (e: any) {
            console.error("[MobileNet] CRITICAL: InferenceSession creation failed!");
            console.error("[MobileNet] Error details:", e);
            // Help the user see the exact error if it's an ONNX error
            if (e.message) console.error("[MobileNet] Message:", e.message);
            return false;
        }
    }

    private forceUint8 = false;

    async runInference(canvas: HTMLCanvasElement): Promise<Detection[]> {
        if (!this.isModelLoaded || !this.session) return [];

        try {
            const { width, height } = this.modelConfig;
            const ctx = document.createElement('canvas').getContext('2d');
            if (!ctx) return [];

            ctx.canvas.width = width;
            ctx.canvas.height = height;
            ctx.drawImage(canvas, 0, 0, width, height);

            const imageData = ctx.getImageData(0, 0, width, height);

            // Robust input discovery
            let inputShape = [1, 3, height, width];
            let inputName = this.session.inputNames[0];
            let isUint8 = this.forceUint8;

            try {
                const inputs = this.session.inputs;
                if (inputs && !isUint8) {
                    // Check by name or by index 0
                    const info = Array.isArray(inputs) ? inputs[0] : (inputs[inputName] || Object.values(inputs)[0]);
                    if (info) {
                        if (info.dims) inputShape = info.dims;
                        const typeStr = String(info.type || '').toLowerCase();
                        if (typeStr.includes('uint8') || info.type === 3) isUint8 = true; // 3 is U8 in some ORT versions
                    }
                }

                // Final fallback/shortcut for this specific model line
                if (!isUint8 && (inputName.includes('image_tensor') || inputName.includes('input'))) {
                    // We'll tentatively assume uint8 for these names if we've seen failures before
                    // or just leave it to the self-healing logic below
                }
            } catch (e) {
                console.warn("[MobileNet] Discovery error, using defaults.");
            }

            const isNHWC = inputShape[3] === 3;
            const inputSize = width * height * 3;
            const input = isUint8 ? new Uint8Array(inputSize) : new Float32Array(inputSize);

            if (isNHWC) {
                for (let i = 0; i < imageData.data.length / 4; i++) {
                    if (isUint8) {
                        input[i * 3] = imageData.data[i * 4];
                        input[i * 3 + 1] = imageData.data[i * 4 + 1];
                        input[i * 3 + 2] = imageData.data[i * 4 + 2];
                    } else {
                        // MediaPipe expects [-1, 1] normalization
                        input[i * 3] = (imageData.data[i * 4] - 127.5) / 127.5;
                        input[i * 3 + 1] = (imageData.data[i * 4 + 1] - 127.5) / 127.5;
                        input[i * 3 + 2] = (imageData.data[i * 4 + 2] - 127.5) / 127.5;
                    }
                }
            } else {
                for (let i = 0; i < imageData.data.length / 4; i++) {
                    if (isUint8) {
                        input[i] = imageData.data[i * 4];
                        input[i + width * height] = imageData.data[i * 4 + 1];
                        input[i + 2 * width * height] = imageData.data[i * 4 + 2];
                    } else {
                        // MediaPipe expects [-1, 1] normalization
                        input[i] = (imageData.data[i * 4] - 127.5) / 127.5;
                        input[i + width * height] = (imageData.data[i * 4 + 1] - 127.5) / 127.5;
                        input[i + 2 * width * height] = (imageData.data[i * 4 + 2] - 127.5) / 127.5;
                    }
                }
            }

            const tensor = new ort.Tensor(isUint8 ? 'uint8' : 'float32', input, inputShape);
            const feeds = { [inputName]: tensor };
            const results = await this.session.run(feeds);

            return this.processOutput(results);
        } catch (e: any) {
            const msg = e.message || '';
            if (msg.includes('expected: (tensor(uint8))')) {
                console.warn("[MobileNet] Data type mismatch detected. Self-healing: Switching to uint8 for next run.");
                this.forceUint8 = true;
            }
            console.error("MobileNet Inference Error:", e);
            return [];
        }
    }

    private processOutput(results: any): Detection[] {
        const outputNames = this.session.outputNames;

        let numDetectionsValue = 0;
        let boxesData: any = null;
        let scoresData: any = null;

        // Map outputs by name or by shape
        outputNames.forEach((name: string) => {
            const tensor = results[name];
            const dims = tensor.dims;

            // MediaPipe Person Detection (Identity:0 = [1, N, 12], Identity_1:0 = [1, N, 1])
            if (dims.length === 3 && dims[2] >= 4) {
                boxesData = tensor.data;
            } else if (dims.length === 3 && dims[2] === 1) {
                scoresData = tensor.data;
            } else if (dims.length === 2 && dims[0] === 1 && dims[1] > 100) {
                scoresData = tensor.data;
            }
        });

        if (!boxesData || !scoresData) return [];

        const detections: Detection[] = [];
        const scoreThreshold = 0.4;

        const numToProcess = scoresData.length;
        const lastDim = boxesData.length / scoresData.length;

        // Sigmoid fallback for models outputting logits
        let maxScore = -999;
        for (let i = 0; i < Math.min(scoresData.length, 100); i++) {
            if (scoresData[i] > maxScore) maxScore = scoresData[i];
        }
        const useSigmoid = maxScore < 5 && maxScore > -20;

        for (let i = 0; i < numToProcess; i++) {
            const rawScore = scoresData[i];
            const score = useSigmoid ? (1 / (1 + Math.exp(-rawScore))) : rawScore;

            if (score > scoreThreshold) {
                const offset = i * lastDim;

                detections.push({
                    id: `pd-${Date.now()}-${i}`,
                    box_2d: [
                        boxesData[offset] * 1000,
                        boxesData[offset + 1] * 1000,
                        boxesData[offset + 2] * 1000,
                        boxesData[offset + 3] * 1000
                    ],
                    label: 'person',
                    confidence: score
                });
            }
        }

        if (detections.length > 0) {
            console.log(`[PersonDetector] SUCCESS: Found ${detections.length} detections.`);
        }
        return detections;
    }

    get isLoaded() { return this.isModelLoaded; }
}

export const mobileNetService = new MobileNetService();
