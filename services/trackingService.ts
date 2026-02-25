
import { Detection } from "../types";

export interface Track extends Detection {
    id: string;
    age: number;
    hits: number;
    timeSinceUpdate: number;
    velocity: { dx: number, dy: number };
    history: { x: number, y: number }[];
}

export class TrackingService {
    private tracks: Track[] = [];
    private nextId = 1;
    private maxAge = 30; // Frames to keep a lost track
    private minHits = 1;  // Frames to confirm a track (set to 1 for debugging)

    update(detections: Detection[]): Track[] {
        this.tracks.forEach(track => {
            track.timeSinceUpdate++;
            track.age++;
        });

        // 1. Prediction (Simple linear)
        this.tracks.forEach(track => {
            const last = track.history[track.history.length - 1];
            if (last && track.velocity.dx !== 0) {
                // We could predict here, but for ByteTrack-lite, we mostly rely on IoU matching
            }
        });

        const usedDetections = new Set<number>();
        const matchedTracks = new Set<number>();

        // 2. IoU Matching (High Confidence)
        const highConfDetections = detections
            .map((d, i) => ({ d, i }))
            .filter(item => (item.d.confidence || 0) > 0.5);

        this.match(highConfDetections, usedDetections, matchedTracks);

        // 3. IoU Matching (Low Confidence / Remaining)
        const remainingDetections = detections
            .map((d, i) => ({ d, i }))
            .filter(item => !usedDetections.has(item.i));

        this.match(remainingDetections, usedDetections, matchedTracks);

        // 4. Create new tracks for unmatched detections
        detections.forEach((det, i) => {
            if (!usedDetections.has(i) && (det.confidence || 0) > 0.3) {
                const center = this.getCenter(det.box_2d);
                this.tracks.push({
                    ...det,
                    id: `tr-${this.nextId++}`,
                    age: 1,
                    hits: 1,
                    timeSinceUpdate: 0,
                    velocity: { dx: 0, dy: 0 },
                    history: [center]
                });
            }
        });

        // 5. Clean up dead tracks
        this.tracks = this.tracks.filter(t => t.timeSinceUpdate < this.maxAge);

        if (detections.length > 0 || this.tracks.length > 0) {
            console.log(`[Tracking] In: ${detections.length} | Active Tracks: ${this.tracks.length}`);
        }

        return this.tracks.filter(t => t.hits >= this.minHits || t.timeSinceUpdate === 0);
    }

    private match(candidates: { d: Detection, i: number }[], usedDetections: Set<number>, matchedTracks: Set<number>) {
        candidates.forEach(cand => {
            let bestIou = 0.3;
            let bestTrackIdx = -1;

            this.tracks.forEach((track, tIdx) => {
                if (matchedTracks.has(tIdx)) return;
                if (track.label !== cand.d.label) return;

                const iou = this.calculateIoU(track.box_2d, cand.d.box_2d);
                if (iou > bestIou) {
                    bestIou = iou;
                    bestTrackIdx = tIdx;
                }
            });

            if (bestTrackIdx !== -1) {
                const track = this.tracks[bestTrackIdx];
                const oldCenter = this.getCenter(track.box_2d);
                const newCenter = this.getCenter(cand.d.box_2d);

                // Exponential Moving Average (EMA) for Smoothing
                const alpha = 0.3; // Smoothing factor (0.1 = very smooth, 0.9 = very reactive)
                track.box_2d = track.box_2d.map((val, idx) =>
                    val * (1 - alpha) + cand.d.box_2d[idx] * alpha
                ) as [number, number, number, number];

                track.confidence = cand.d.confidence;
                track.velocity = { dx: newCenter.x - oldCenter.x, dy: newCenter.y - oldCenter.y };
                track.history.push(newCenter);
                if (track.history.length > 30) track.history.shift();

                track.timeSinceUpdate = 0;
                track.hits++;

                usedDetections.add(cand.i);
                matchedTracks.add(bestTrackIdx);
            }
        });
    }

    private calculateIoU(boxA: number[], boxB: number[]): number {
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

    private getCenter(box: number[]) {
        return {
            y: (box[0] + box[2]) / 2,
            x: (box[1] + box[3]) / 2
        };
    }

    getTracks() { return this.tracks; }
}

export const trackingService = new TrackingService();
