import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

export interface LLMProvider {
  complete(systemPrompt: string, history: ChatTurn[], userMessage: string): Promise<string>;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

class HaikuProvider implements LLMProvider {
  private _client: Anthropic | null = null;

  private get client(): Anthropic {
    if (!this._client) {
      this._client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    return this._client;
  }

  async complete(systemPrompt: string, history: ChatTurn[], userMessage: string): Promise<string> {
    const messages = [
      ...history,
      { role: 'user' as const, content: userMessage },
    ];

    const response = await this.client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      temperature: 1.0,
      system: systemPrompt,
      messages,
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
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
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY no configurado');
    }

    const contents = history.map(turn => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    }));

    if (userMessage) {
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });
    }

    const response = await this.client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 1.0,
      },
    });

    return response.text ?? '';
  }
}

function getPrimaryProvider(): LLMProvider {
  if (env.LLM_PROVIDER === 'anthropic') {
    if (env.ANTHROPIC_API_KEY) return new HaikuProvider();
    if (env.GEMINI_API_KEY) {
      console.warn('[llm] LLM_PROVIDER es anthropic pero ANTHROPIC_API_KEY está vacía. Usando Gemini de respaldo.');
      return new GeminiProvider();
    }
  } else {
    if (env.GEMINI_API_KEY) return new GeminiProvider();
    if (env.ANTHROPIC_API_KEY) {
      console.warn('[llm] LLM_PROVIDER es gemini pero GEMINI_API_KEY está vacía. Usando Anthropic de respaldo.');
      return new HaikuProvider();
    }
  }
  throw new Error('No se pudo inicializar ningún proveedor de LLM. Revisa las claves de API.');
}

class FallbackLLMProvider implements LLMProvider {
  async complete(systemPrompt: string, history: ChatTurn[], userMessage: string): Promise<string> {
    const primary = getPrimaryProvider();
    try {
      return await primary.complete(systemPrompt, history, userMessage);
    } catch (err) {
      console.error(`[llm] Proveedor primario falló: ${(err as Error).message}. Activando fallback alternativo...`);
      
      let secondary: LLMProvider;
      if (primary instanceof GeminiProvider) {
        if (env.ANTHROPIC_API_KEY) {
          secondary = new HaikuProvider();
        } else {
          throw err;
        }
      } else {
        if (env.GEMINI_API_KEY) {
          secondary = new GeminiProvider();
        } else {
          throw err;
        }
      }

      console.log(`[llm] Usando fallback alternativo: ${secondary.constructor.name}`);
      return await secondary.complete(systemPrompt, history, userMessage);
    }
  }
}

// En modo test, permite inyectar un LLM mock desde globalThis.
const mocked = (globalThis as any).__NatyMockLlm as LLMProvider | undefined;
export const llm: LLMProvider = mocked ?? new FallbackLLMProvider();

