export type Emotion = "good" | "confused" | "sad" | "neutral";

export interface LLMResponse {
  kid_reply: string;
  emotion: Emotion;
  thought: string;
  is_positive: boolean;
}

export interface GameState {
  round: number;
  stars: number;
  strikes: number;
  ended: boolean;
  endType?: "success" | "failure";
}
