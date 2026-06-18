type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: { message?: string };
};

const OPENER_SYSTEM_PROMPT =
  "You write a single opening bullet for a World Cup prediction pool daily recap. " +
  "Tone: British humour, dry, deadpan, understated, factual, lightly sarcastic but never cruel. " +
  "Mix straight facts (who picked what, points earned) with a wry aside. Mention every player named in the data. " +
  "CRITICAL: deliberate 1-1 picks (chosen before kickoff) are NOT the same as auto-default 1-1 (missed deadline, half points). " +
  "Mock missed deadlines; treat chosen 1-1s as a deliberate tactic. " +
  "Never use em dashes. Use commas, semicolons, or full stops instead. " +
  "Always finish with a complete sentence. Never stop mid-thought. " +
  "Output exactly ONE line starting with '- '. No other lines, no markdown, no quotes around the bullet.";

export function getGeminiConfig() {
  return {
    model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash",
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS ?? 30_000),
  };
}

export async function generateOpenerBullet(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const { model, timeoutMs } = getGeminiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: OPENER_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.78,
            maxOutputTokens: 1024,
          },
        }),
        signal: controller.signal,
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Gemini request failed (${response.status}): ${errorBody.slice(0, 200)}`
      );
    }

    const payload = (await response.json()) as GeminiResponse;
    if (payload.error?.message) {
      throw new Error(payload.error.message);
    }

    const candidate = payload.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      throw new Error("Gemini returned an empty opener bullet");
    }

    if (candidate?.finishReason === "MAX_TOKENS") {
      throw new Error("Gemini opener was truncated");
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}
