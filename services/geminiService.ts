
import { GoogleGenAI, Type } from "@google/genai";
import { CrowdMetrics, AIReasoning, Detection, RiskLevel } from "../types";

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY! });
  }

  async getStrategicFeedback(metrics: CrowdMetrics, detections: Detection[]): Promise<AIReasoning> {
    const ai = this.getClient();
    try {
      const summary = `
        Real-Time Telemetry:
        - People Count: ${metrics.peopleCount}
        - Crowd Density: ${metrics.density.toFixed(2)} p/m2
        - Agitation Level: ${(metrics.agitationLevel * 100).toFixed(1)}% (0=calm, 100=chaos)
        - Panic Index: ${(metrics.panicIndex * 100).toFixed(1)}%
        - Visible Objects: ${JSON.stringify(metrics.objectCounts)}
        - Risk Level: ${metrics.riskLevel}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a Crowd Dynamics Safety Commander. 
        Analyze the telemetry. High 'Agitation' indicates running/panic. High 'Density' indicates crushing.
        Specific objects (luggage, backpacks) might indicate travelers or abandoned items.
        
        Data: ${summary}
        
        Return JSON with prediction, scenario description, countermeasures, and alerts.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              prediction: { type: Type.STRING, description: "Strategic forecast of crowd behavior in 90 seconds" },
              scenarioDescription: { type: Type.STRING, description: "A vivid description of what is likely happening on camera based on the data (e.g. 'Commuters moving calmly', 'Panic detected in Sector 4')." },
              timeHorizon: { type: Type.STRING },
              probability: { type: Type.NUMBER },
              countermeasures: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tactical steps for ground units" },
              explanation: { type: Type.STRING, description: "Detailed analytic breakdown of the situation" },
              alerts: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["prediction", "scenarioDescription", "timeHorizon", "probability", "countermeasures", "explanation", "alerts"]
          }
        }
      });

      return JSON.parse(response.text || "{}");
    } catch (error: any) {
      console.error("Strategic Analysis Error:", error);
      return {
        prediction: "AI Reasoning Offline.",
        scenarioDescription: "Unable to analyze visual context.",
        timeHorizon: "N/A",
        probability: 0,
        countermeasures: ["Manual safety protocol implementation"],
        explanation: "Communication lost with Gemini Intelligence Core.",
        alerts: ["COMMUNICATION ERROR"]
      };
    }
  }

  calcRisk(density: number, prob: number): RiskLevel {
    if (density > 4 || prob > 0.8) return RiskLevel.CRITICAL;
    if (density > 2.5 || prob > 0.5) return RiskLevel.HIGH;
    if (density > 1.5) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }
}

export const geminiService = new GeminiService();
