
import { GoogleGenAI, Type } from "@google/genai";
import { CrowdMetrics, AIReasoning, Detection, RiskLevel, ChatMessage } from "../types";

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY! });
  }

  // Core Strategic Analysis
  async getStrategicFeedback(metrics: CrowdMetrics, detections: Detection[]): Promise<AIReasoning> {
    const ai = this.getClient();
    try {
      const summary = this.formatMetricsForAI(metrics);

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
              scenarioDescription: { type: Type.STRING, description: "A vivid description of what is likely happening on camera based on the data." },
              timeHorizon: { type: Type.STRING },
              probability: { type: Type.NUMBER },
              countermeasures: { type: Type.ARRAY, items: { type: Type.STRING } },
              explanation: { type: Type.STRING },
              alerts: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["prediction", "scenarioDescription", "timeHorizon", "probability", "countermeasures", "explanation", "alerts"]
          }
        }
      });

      return JSON.parse(response.text || "{}");
    } catch (error: any) {
      console.error("Strategic Analysis Error:", error);
      return this.getFallbackReasoning();
    }
  }

  // Feature: AI Commander Chat
  async chatWithCommander(history: ChatMessage[], currentMetrics: CrowdMetrics, query: string): Promise<string> {
    const ai = this.getClient();
    const context = `
      Current Live Telemetry:
      ${this.formatMetricsForAI(currentMetrics)}
      
      You are the AI Tactical Commander for this venue. Answer the operator's question briefly and professionally.
      Focus on safety, crowd flow, and immediate risks.
    `;

    try {
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: context
        },
        history: history.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
        }))
      });

      const result = await chat.sendMessage({ message: query });
      return result.text || "I cannot provide an answer at this time.";
    } catch (e) {
      return "Commander Uplink Offline.";
    }
  }

  // Feature: Shift Report Generation
  async generateShiftReport(metricHistory: CrowdMetrics[]): Promise<string> {
    const ai = this.getClient();
    
    // Sample history to avoid token limits
    const samples = metricHistory.filter((_, i) => i % 10 === 0); 
    const peakDensity = Math.max(...metricHistory.map(m => m.density));
    const avgRisk = metricHistory[Math.floor(metricHistory.length / 2)]?.riskLevel || "LOW";

    const prompt = `
      Generate a formal Security Shift Report based on this session data:
      - Duration Samples: ${samples.length} (representing session time)
      - Peak Density Recorded: ${peakDensity.toFixed(2)} p/m2
      - Average Risk Level: ${avgRisk}
      
      Include:
      1. Executive Summary
      2. Key Incident Timeline (simulated based on density spikes)
      3. Recommendations for next shift
      
      Format as Markdown.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      return response.text || "Report generation failed.";
    } catch (e) {
      return "Error generating report.";
    }
  }

  private formatMetricsForAI(metrics: CrowdMetrics): string {
    return `
      - People Count: ${metrics.peopleCount}
      - Crowd Density: ${metrics.density.toFixed(2)} p/m2
      - Agitation Level: ${(metrics.agitationLevel * 100).toFixed(1)}%
      - Audio Level (Simulated): ${metrics.audioLevel.toFixed(1)} dB
      - Zone Violations: ${metrics.zoneViolations}
      - Visible Objects: ${JSON.stringify(metrics.objectCounts)}
      - Risk Level: ${metrics.riskLevel}
    `;
  }

  private getFallbackReasoning(): AIReasoning {
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

  calcRisk(density: number, prob: number): RiskLevel {
    if (density > 4 || prob > 0.8) return RiskLevel.CRITICAL;
    if (density > 2.5 || prob > 0.5) return RiskLevel.HIGH;
    if (density > 1.5) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }
}

export const geminiService = new GeminiService();
