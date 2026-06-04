import { env } from '../config/env.js';

export interface LLMProvider {
  complete(systemPrompt: string, history: ChatTurn[], userMessage: string): Promise<string>;
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

class GeminiProvider implements LLMProvider {
  async complete(systemPrompt: string, history: ChatTurn[], userMessage: string): Promise<string> {
    const contents = [
      ...history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
      { role: 'user' as const, parts: [{ text: userMessage }] },
    ];

    const response = await fetch(`${GEMINI_API_URL}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini ${response.status}: ${err.slice(0, 200)}`);
    }

    const data = await response.json() as {
      candidates: { content: { parts: { text: string }[] } }[];
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }
}

export const llm: LLMProvider = new GeminiProvider();
