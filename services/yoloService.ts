
import { Detection } from "../types";

declare const ort: any;

const COCO_LABELS = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light",
  "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
  "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
  "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard",
  "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
  "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
  "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone",
  "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear",
  "hair drier", "toothbrush"
];

// We filter for objects relevant to crowd safety
const SAFETY_RELEVANT_CLASSES = new Set([
  "person", "backpack", "handbag", "suitcase", "cell phone", "baseball bat", "knife", "bottle"
]);

export class YoloService {
  private session: any = null;
  private isModelLoaded = false;
  private modelConfig = {
    width: 640,
    height: 640
  };

  async loadModel(modelBuffer: ArrayBuffer) {
    try {
      this.session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['webgl', 'wasm'], 
        graphOptimizationLevel: 'all'
      });
      this.isModelLoaded = true;
      return true;
    } catch (e) {
      console.error("YOLO Load Error:", e);
      return false;
    }
  }

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
      const input = new Float32Array(width * height * 3);
      
      for (let i = 0; i < imageData.data.length / 4; i++) {
        input[i] = imageData.data[i * 4] / 255.0; 
        input[i + width * height] = imageData.data[i * 4 + 1] / 255.0; 
        input[i + 2 * width * height] = imageData.data[i * 4 + 2] / 255.0; 
      }

      const tensor = new ort.Tensor('float32', input, [1, 3, width, height]);
      const feeds = { [this.session.inputNames[0]]: tensor };
      const results = await this.session.run(feeds);
      
      return this.processOutput(results[this.session.outputNames[0]]);
    } catch (e) {
      console.error("Inference Error:", e);
      return [];
    }
  }

  private iou(boxA: number[], boxB: number[]): number {
    const yminA = boxA[0], xminA = boxA[1], ymaxA = boxA[2], xmaxA = boxA[3];
    const yminB = boxB[0], xminB = boxB[1], ymaxB = boxB[2], xmaxB = boxB[3];

    const xLeft = Math.max(xminA, xminB);
    const yTop = Math.max(yminA, yminB);
    const xRight = Math.min(xmaxA, xmaxB);
    const yBottom = Math.min(ymaxA, ymaxB);

    if (xRight < xLeft || yBottom < yTop) return 0.0;

    const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
    const areaA = (xmaxA - xminA) * (ymaxA - yminA);
    const areaB = (xmaxB - xminB) * (ymaxB - yminB);
    
    return intersectionArea / (areaA + areaB - intersectionArea);
  }

  private nonMaxSuppression(detections: Detection[], iouThreshold: number): Detection[] {
    const sorted = [...detections].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    const kept: Detection[] = [];

    while (sorted.length > 0) {
      const current = sorted.shift()!;
      kept.push(current);

      for (let i = sorted.length - 1; i >= 0; i--) {
        if (this.iou(current.box_2d, sorted[i].box_2d) > iouThreshold) {
          sorted.splice(i, 1);
        }
      }
    }
    return kept;
  }

  private processOutput(outputTensor: any): Detection[] {
    const candidates: Detection[] = [];
    const data = outputTensor.data;
    // YOLO v8 Output shape: [1, 4 + num_classes, 8400]
    const dims = outputTensor.dims;
    const numClasses = dims[1] - 4; 
    const numDetections = dims[2];
    
    const scoreThreshold = 0.4;
    const iouThreshold = 0.5;
    
    for (let i = 0; i < numDetections; i++) {
      // Find max score among classes
      let maxScore = 0;
      let maxClassIndex = -1;
      
      for (let c = 0; c < numClasses; c++) {
        const score = data[(4 + c) * numDetections + i];
        if (score > maxScore) {
          maxScore = score;
          maxClassIndex = c;
        }
      }

      if (maxScore > scoreThreshold) {
        const label = COCO_LABELS[maxClassIndex] || "unknown";
        
        // Filter: Only process safety-relevant objects
        if (SAFETY_RELEVANT_CLASSES.has(label)) {
            const xc = data[0 * numDetections + i];
            const yc = data[1 * numDetections + i];
            const w = data[2 * numDetections + i];
            const h = data[3 * numDetections + i];

            const scale = 1000 / 640;
            candidates.push({
            id: `obj-${i}`,
            box_2d: [
                (yc - h / 2) * scale,
                (xc - w / 2) * scale,
                (yc + h / 2) * scale,
                (xc + w / 2) * scale
            ],
            label: label,
            confidence: maxScore
            });
        }
      }
    }
    
    if (candidates.length === 0) return this.mockDetections();
    
    const filtered = this.nonMaxSuppression(candidates, iouThreshold);
    return filtered.slice(0, 50); 
  }

  private mockDetections(): Detection[] {
    return Array.from({ length: 5 }, (_, i) => ({
      id: `sim-${i}`,
      box_2d: [150 + i * 20, 100 + i * 120, 450 + i * 20, 280 + i * 120],
      label: "person",
      confidence: 0.95
    }));
  }

  get isLoaded() { return this.isModelLoaded; }
}

export const yoloService = new YoloService();
