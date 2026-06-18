type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: { message?: string };
};

const TAKE_SYSTEM_PROMPT =
  "You write The take for a World Cup prediction pool daily recap: exactly 3 bullet lines. " +
  "Voice: witty British TV commentator, dry, deadpan, lightly sarcastic but never cruel. " +
  "Summarise how players performed today: picks, points, exact scores, misses, missed deadlines. " +
  "Do not recap match results or final scores. Mention players by name. " +
  "Use fresh phrasing every day; vary vocabulary, rhythm, and sentence openings. " +
  "Never repeat stock phrases or echo recent recap lines provided in the prompt. " +
  "Spread the day's story across all 3 bullets. Never confuse deliberate 1-1 with auto-default 1-1. " +
  "Never use em dashes. Each line starts with '- '. Output exactly 3 lines, no markdown, no quotes.";

export function getGeminiConfig() {
  return {
    model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash",
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS ?? 30_000),
  };
}

export async function generateTakeBullets(prompt: string): Promise<string> {
  return generateWithSystemPrompt(TAKE_SYSTEM_PROMPT, prompt);
}

/** @deprecated use generateTakeBullets */
export async function generateOpenerBullet(prompt: string): Promise<string> {
  return generateTakeBullets(prompt);
}

async function generateWithSystemPrompt(systemPrompt: string, prompt: string): Promise<string> {
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
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.95,
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
