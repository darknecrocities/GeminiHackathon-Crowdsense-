
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface Detection {
  id: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  label: string;
  confidence?: number;
}

export interface CrowdMetrics {
  peopleCount: number;
  density: number;
  flowRate: number;
  counterFlowCount: number;
  avgVelocity: number;
  congestionZoneCount: number;
  stampedeProbability: number;
  riskLevel: RiskLevel;
  // New Features
  agitationLevel: number; // 0-1 measure of erratic movement
  panicIndex: number; // Calculated from density + agitation
  objectCounts: Record<string, number>; // e.g., { "backpack": 2, "suitcase": 1 }
}

export interface AIReasoning {
  prediction: string;
  timeHorizon: string;
  probability: number;
  countermeasures: string[];
  explanation: string;
  scenarioDescription: string; // New: Visual description of what is happening
  alerts: string[];
}

export interface Countermeasure {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'deployed' | 'failed';
  priority: 'p1' | 'p2' | 'p3';
}
