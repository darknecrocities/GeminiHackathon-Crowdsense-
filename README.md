
# CrowdSense™ Intelligence Suite
### *Enterprise Real-Time Crowd Risk Intelligence*

![CrowdSense Dashboard Preview](https://via.placeholder.com/1200x600/0f172a/22d3ee?text=CrowdSense+Dashboard+Preview)

> **Hackathon Track:** Safety & Security / AI Agents  
> **Powered By:** Google Gemini 3.0 Flash & Edge-Based Computer Vision

---

## 🚨 The Problem
Managing large crowds at stadiums, transport hubs, and public events is traditionally **reactive**. Security teams rely on raw video feeds and intuition, leading to:
1.  **Information Overload:** Operators cannot track hundreds of individuals simultaneously.
2.  **Delayed Response:** Critical density thresholds are often noticed only *after* congestion begins.
3.  **Privacy Risks:** Sending live video streams to the cloud for analysis is costly and violates privacy compliance (GDPR/CCPA).

## 💡 The Solution: Hybrid Intelligence
**CrowdSense™** solves this by splitting the workload:
1.  **The Eyes (Edge AI):** A local YOLO model runs directly in the browser via WebAssembly to detect people and calculate density metrics in real-time. **No video leaves the device.**
2.  **The Brain (Gemini 3.0):** Only anonymized mathematical metadata (flow rates, density vectors) is sent to **Gemini 3.0 Flash**. The AI acts as a "Strategic Commander," predicting stampede risks and generating tactical protocols.

---

## ✨ Dynamic Feature Ecosystem

### 🧠 Core Intelligence (Gemini 3.0)
1.  **Predictive Stampede Modeling:** Uses historical flow data to forecast density spikes up to 90 seconds in advance, giving staff time to react *before* critical mass is reached.
2.  **Visual Scenario Narrator:** Converts raw pixel data into vivid, natural language Situation Reports (e.g., "Crowd is stagnating at the West Exit; high agitation detected"), bridging the gap between raw metrics and human understanding.
3.  **Interactive Crisis Checklists:** Dynamic Standard Operating Procedures (SOPs) that evolve in real-time. If Gemini detects a blockage, the UI instantly generates tasks like "Deploy Barrier Team A" or "Open Emergency Gate 4."
4.  **Adaptive "Defcon" Risk Logic:** The system autonomously adjusts alert sensitivity based on context—differentiating between a "celebratory mosh pit" (high density, low risk) and a "crush" (high density, high risk) via context awareness.

### 👁️ Advanced Vision (Edge AI)
5.  **Panic Vector Analysis:** Tracks the *variance* in crowd velocity (Agitation Index). It distinguishes between a fast commute and a chaotic panic run using frame-to-frame centroid deltas.
6.  **Object-Based Threat Recon:** Goes beyond people counting to detect safety anomalies: abandoned luggage (suspicious packages), weapons (bats/knives), or mass smartphone recording (distraction events).
7.  **Counter-Flow Detection:** Specifically identifies individuals or groups moving against the primary flow of traffic—often the earliest warning sign of a blockage or emergency upstream.
8.  **BYOM (Bring Your Own Model):** A hot-swappable inference engine. Security teams can drag-and-drop custom trained `.onnx` models (YOLOv8/v10/v11) to optimize for specific environments (e.g., thermal cameras or drone footage).

### 🛠️ Operational Resilience
9.  **Synthetic Scenario Engine:** A built-in "Digital Twin" simulator that generates GPU-accelerated crowd particles. This allows commanders to stress-test their response protocols against theoretical surges without risking real lives.
10. **Legacy Protocol Bridge:** A smart ingestion layer that modernizes old infrastructure. It intelligently transcodes and buffers RTSP/MJPEG streams from aging IP cameras, allowing 10-year-old CCTV systems to run state-of-the-art AI.

---

## 🛠️ Tech Stack

### Artificial Intelligence
- **Reasoning Engine:** Google Gemini API (`gemini-3-flash-preview`)
- **Computer Vision:** YOLOv8 (ONNX Format)
- **Runtime:** ONNX Runtime Web (WebGL Execution Provider)

### Frontend & Visualization
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS (Glassmorphism UI)
- **Charts:** Recharts
- **Video Processing:** HTML5 Canvas + HLS.js

---

## 🚀 How It Works

1.  **Ingestion:** Video is captured via Webcam, File Upload, or IP Camera Stream (HTTP/MJPEG).
2.  **Detection:** The browser extracts frames and passes them to the local ONNX model.
3.  **Metrics Calculation:** The app calculates `People Count`, `Density (p/m²)`, and `Flow Velocity`.
4.  **Reasoning Loop:**
    - Every few seconds (or on trigger), metadata is JSON-serialized.
    - **Gemini 3.0** analyzes the metadata against safety heuristics.
    - A structured JSON response returns predictions and countermeasures.
5.  **Action:** The UI updates the Risk Gauge and populates the "Response Protocol" checklist.

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- A valid Google Gemini API Key

### Installation

1.  **Clone the repo**
    ```bash
    git clone https://github.com/yourusername/crowdsense.git
    cd crowdsense
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up API Key**
    The app uses the Google AI Studio client integration. You will be prompted to select your key via the secure popup upon launching the app.

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

---

## 🔮 Future Roadmap
- [ ] **Multi-Camera Fusion:** Stitching views from multiple IP cams into a single floor plan.
- [ ] **Audio Ambience Analysis:** Using Gemini 3.0 Multimodal capabilities to detect screams or panic in audio streams.
- [ ] **IoT Integration:** Automatically triggering electronic gates or signage based on Gemini's "Countermeasures" output.

---

*Built with ❤️ for the Gemini API Developer Competition.*
