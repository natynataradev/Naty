import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

export interface LLMProvider {
  complete(systemPrompt: string, history: ChatTurn[], userMessage: string): Promise<string>;
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

class GeminiProvider implements LLMProvider {
  private _client: GoogleGenAI | null = null;

  private get client(): GoogleGenAI {
    if (!this._client) {
      this._client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
    return this._client;
  }

  async complete(systemPrompt: string, history: ChatTurn[], userMessage: string): Promise<string> {
    const contents = [
      ...history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
      { role: 'user' as const, parts: [{ text: userMessage }] },
    ];

    const response = await this.client.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      config: { systemInstruction: systemPrompt },
      contents,
    });

    return response.text ?? '';
  }
}

export const llm: LLMProvider = new GeminiProvider();
