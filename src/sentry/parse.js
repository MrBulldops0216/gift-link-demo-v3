// Safe JSON Parsing

export function safeParseJSON<T>(text: string): { success: true; data: T } | { success: false; error: string } {
  if (!text || typeof text !== "string") {
    return { success: false, error: "Input is not a string" };
  }
  
  // Try direct parse first
  try {
    const parsed = JSON.parse(text.trim());
    return { success: true, data: parsed };
  } catch (e) {
    // Ignore, try extraction
  }
  
  // Extract first JSON object {...}
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return { success: true, data: parsed };
    } catch (e) {
      // Try cleaning common issues
      try {
        const cleaned = jsonMatch[0]
          .replace(/,\s*([\]}])/g, "$1") // Remove trailing commas
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'); // Quote unquoted keys
        const parsed = JSON.parse(cleaned);
        return { success: true, data: parsed };
      } catch (e2) {
        return { success: false, error: `JSON parse failed: ${e2 instanceof Error ? e2.message : String(e2)}` };
      }
    }
  }
  
  return { success: false, error: "No JSON object found in response" };
}
