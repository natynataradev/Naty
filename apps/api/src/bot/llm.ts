import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

export interface LLMProvider {
  complete(systemPrompt: string, history: ChatTurn[], userMessage: string): Promise<string>;
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

class GeminiProvider implements LLMProvider {
  private _client: GoogleGenerativeAI | null = null;

  private get client(): GoogleGenerativeAI {
    if (!this._client) {
      this._client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
    return this._client;
  }

  async complete(systemPrompt: string, history: ChatTurn[], userMessage: string): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: history.map((t) => ({
        role: t.role,
        parts: [{ text: t.text }],
      })),
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  }
}

export const llm: LLMProvider = new GeminiProvider();
