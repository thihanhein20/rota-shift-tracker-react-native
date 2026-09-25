// src/services/aiParser.ts
import { ParsedShift } from "../types";
import { getGeminiApiKey } from "./apiKey";
import { todayString } from "../utils/time";

export async function parseShiftWithAI(
  smsText: string,
): Promise<ParsedShift[]> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) throw new Error("MISSING_GEMINI_API_KEY");

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = `You are a shift SMS parser. Extract ALL shifts from the SMS below.
Today's date is ${todayString()}. And it is only for next coming week, don't calculate further week
Resolve relative days like "fri", "sat", "tomorrow", "next Monday" to real YYYY-MM-DD dates.
If multiple shifts are mentioned, return ALL of them.

SMS: "${smsText}"

if the time is 11-9 you have to extract between 2:30 PM to 4:00 PM because it is brake time
and it doesn't count as shift.

Return ONLY a raw JSON array — no markdown, no backticks, no explanation.
Even if there is only one shift, return an array:
[
  {
    "date": "YYYY-MM-DD",
    "startTime": "H:MM AM/PM",
    "endTime": "H:MM AM/PM",
    "location": "string or null",
    "role": "string or null",
    "notes": "string or null"
  }
]`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();

  const raw = data.candidates[0].content.parts[0].text
    .trim()
    .replace(/```json|```/g, "");

  const parsed = JSON.parse(raw);
  // Handle both array and single object responses
  return Array.isArray(parsed) ? parsed : [parsed];
}
