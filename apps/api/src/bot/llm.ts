import Anthropic from '@anthropic-ai/sdk';
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
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
}

export const llm: LLMProvider = new HaikuProvider();
