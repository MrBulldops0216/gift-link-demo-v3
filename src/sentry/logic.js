// SENtry Game Logic - State Management

export interface ChildState {
  emotional_load: number; // 0-100
  trust_level: number; // 0-100
  curiosity_level: number; // 0-100
}

export interface GameState {
  stars: number; // 0-3
  errors: number; // 0-3
}

export interface AnalyzerOutput {
  scores: {
    explanation_vs_command: number;
    emotional_stabilization: number;
    guided_decision: number;
  };
  state_delta: {
    emotional_load: number;
    trust_level: number;
    curiosity_level: number;
  };
  feedback_points: string[];
}

export interface SimulatorOutput {
  child_response: string;
  emotion: "positive" | "confused" | "sad" | "neutral";
  thought: string;
  behavior_tendency: "close" | "click" | "hesitate";
}

export function defaultChildState(): ChildState {
  return {
    emotional_load: 30,
    trust_level: 50,
    curiosity_level: 70
  };
}

export function applyStateDelta(
  currentState: ChildState,
  delta: AnalyzerOutput["state_delta"]
): ChildState {
  return {
    emotional_load: Math.max(0, Math.min(100, currentState.emotional_load + delta.emotional_load)),
    trust_level: Math.max(0, Math.min(100, currentState.trust_level + delta.trust_level)),
    curiosity_level: Math.max(0, Math.min(100, currentState.curiosity_level + delta.curiosity_level))
  };
}

export function updateGameState(
  currentGame: GameState,
  analyzerResult: AnalyzerOutput,
  simulatorResult: SimulatorOutput,
  newChildState: ChildState
): GameState {
  const newGame = { ...currentGame };
  
  // Calculate positive score (sum of positive dimensions)
  const positiveScore = Object.values(analyzerResult.scores).filter(s => s === 1).length;
  const negativeScore = Object.values(analyzerResult.scores).filter(s => s === -1).length;
  
  // Deterministic rules for stars/errors
  // Star conditions:
  // 1. Positive score >= 2 AND behavior_tendency === "close"
  // 2. OR positive score >= 2 AND emotion === "positive"
  // 3. OR trust_level > 70 AND emotional_load < 30
  
  const shouldAwardStar = 
    (positiveScore >= 2 && simulatorResult.behavior_tendency === "close") ||
    (positiveScore >= 2 && simulatorResult.emotion === "positive") ||
    (newChildState.trust_level > 70 && newChildState.emotional_load < 30);
  
  // Error conditions:
  // 1. Negative score >= 2 AND behavior_tendency === "click"
  // 2. OR negative score >= 2 AND emotion === "sad"
  // 3. OR emotional_load > 70 AND trust_level < 30
  
  const shouldAwardError =
    (negativeScore >= 2 && simulatorResult.behavior_tendency === "click") ||
    (negativeScore >= 2 && simulatorResult.emotion === "sad") ||
    (newChildState.emotional_load > 70 && newChildState.trust_level < 30);
  
  // Only award one per turn (prioritize star over error)
  if (shouldAwardStar && newGame.stars < 3) {
    newGame.stars += 1;
  } else if (shouldAwardError && !shouldAwardStar && newGame.errors < 3) {
    newGame.errors += 1;
  }
  
  return newGame;
}

export function checkOutcome(gameState: GameState): {
  done: boolean;
  outcome: "success" | "failure" | null;
} {
  if (gameState.stars >= 3) {
    return { done: true, outcome: "success" };
  }
  if (gameState.errors >= 3) {
    return { done: true, outcome: "failure" };
  }
  return { done: false, outcome: null };
}

export function truncateChildResponse(text: string, maxWords: number = 20): string {
  if (!text || typeof text !== "string") return text;
  
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  
  // Try to end at sentence boundary
  const truncated = words.slice(0, maxWords).join(" ");
  const lastPeriod = truncated.lastIndexOf(".");
  const lastExclamation = truncated.lastIndexOf("!");
  const lastQuestion = truncated.lastIndexOf("?");
  
  const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  if (lastSentenceEnd > truncated.length * 0.5) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }
  
  return truncated + ".";
}
