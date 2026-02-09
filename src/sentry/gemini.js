// Gemini API Client Wrapper

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiResponse {
  content: string;
  error?: string;
}

export async function generateJSON(
  systemInstruction: string,
  userContent: string,
  maxTokens: number = 500
): Promise<GeminiResponse> {
  if (!GEMINI_API_KEY) {
    return {
      content: "",
      error: "GEMINI_API_KEY not configured"
    };
  }
  
  const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: userContent }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json"
    }
  };
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini] API error ${response.status}:`, errorText.substring(0, 500));
      return {
        content: "",
        error: `Gemini API error ${response.status}: ${errorText.substring(0, 200)}`
      };
    }
    
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      console.error("[Gemini] No content in response:", JSON.stringify(data, null, 2));
      return {
        content: "",
        error: "No content in Gemini response"
      };
    }
    
    return { content };
    
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      console.error("[Gemini] Request timeout");
      return {
        content: "",
        error: "Gemini request timeout (30s)"
      };
    }
    console.error("[Gemini] Fetch error:", error.message);
    return {
      content: "",
      error: `Gemini fetch error: ${error.message}`
    };
  }
}
