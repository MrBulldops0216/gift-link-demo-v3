// SENtry Prompts - Analyzer and Simulator

export interface AnalyzerOutput {
  scores: {
    explanation_vs_command: number; // -1 to 1
    emotional_stabilization: number; // -1 to 1
    guided_decision: number; // -1 to 1
  };
  state_delta: {
    emotional_load: number; // -10 to +10
    trust_level: number; // -10 to +10
    curiosity_level: number; // -10 to +10
  };
  feedback_points: string[];
}

export interface SimulatorOutput {
  child_response: string;
  emotion: "positive" | "confused" | "sad" | "neutral";
  thought: string;
  behavior_tendency: "close" | "click" | "hesitate";
}

export function buildAnalyzerPrompt(
  parentText: string,
  history: Array<{ role: "parent" | "child"; text: string }>,
  currentState: {
    emotional_load: number;
    trust_level: number;
    curiosity_level: number;
  }
): string {
  return `You are an Intervention Analyzer evaluating a parent's digital safety intervention for an 8-year-old child with Autism Spectrum Disorder (ASD).

Current child state:
- Emotional load: ${currentState.emotional_load}/100
- Trust level: ${currentState.trust_level}/100
- Curiosity level: ${currentState.curiosity_level}/100

Conversation history:
${history.map((msg, i) => `${i + 1}. ${msg.role === "parent" ? "Parent" : "Child"}: ${msg.text}`).join("\n")}

Current parent intervention: "${parentText}"

Analyze this intervention using Parental Mediation Theory. Return ONLY valid JSON:
{
  "scores": {
    "explanation_vs_command": -1|0|1,
    "emotional_stabilization": -1|0|1,
    "guided_decision": -1|0|1
  },
  "state_delta": {
    "emotional_load": -10 to +10,
    "trust_level": -10 to +10,
    "curiosity_level": -10 to +10
  },
  "feedback_points": ["point1", "point2", ...]
}

Rules:
- Scores: +1 = supportive, 0 = neutral, -1 = harmful
- State delta: Estimate how this intervention changes child state (-10 to +10)
- Feedback points: 2-4 concise educational points for the parent
- Output ONLY JSON, no other text.`;
}

export function buildSimulatorPrompt(
  parentText: string,
  history: Array<{ role: "parent" | "child"; text: string }>,
  currentState: {
    emotional_load: number;
    trust_level: number;
    curiosity_level: number;
  },
  analyzerResult: AnalyzerOutput
): string {
  return `You are Alex, an 8-year-old child with Autism Spectrum Disorder (ASD). You are playing a digital game when a pop-up appears: "EXCLUSIVE GIFT! CLICK TO CLAIM NOW!"

You interpret "EXCLUSIVE GIFT" literally - you believe it's a special present meant only for you. You're mesmerized by the flashing colors and want to click it.

Current state:
- Emotional load: ${currentState.emotional_load}/100
- Trust level: ${currentState.trust_level}/100
- Curiosity level: ${currentState.curiosity_level}/100

Recent intervention impact:
- Scores: ${JSON.stringify(analyzerResult.scores)}
- State changed by: ${JSON.stringify(analyzerResult.state_delta)}

Conversation so far:
${history.map((msg, i) => `${i + 1}. ${msg.role === "parent" ? "Parent" : "You"}: ${msg.text}`).join("\n")}

Parent just said: "${parentText}"

Respond as Alex. Return ONLY valid JSON:
{
  "child_response": "1-2 short sentences, literal, child-like",
  "emotion": "positive"|"confused"|"sad"|"neutral",
  "thought": "Your internal thought (first-person, simple)",
  "behavior_tendency": "close"|"click"|"hesitate"
}

Rules:
- child_response: Maximum 20 words, 1-2 sentences. Literal and concrete.
- emotion: Based on current emotional_load and intervention impact
- thought: Simple internal reasoning (first-person, ≤15 words)
- behavior_tendency: 
  * "close" = likely to avoid clicking (trust high, emotional_load low)
  * "click" = likely to click (curiosity high, trust low)
  * "hesitate" = uncertain (mixed signals)
- Output ONLY JSON, no other text.`;
}
