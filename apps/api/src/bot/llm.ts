import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';

export interface LLMProvider {
  complete(systemPrompt: string, history: ChatTurn[], userMessage: string): Promise<string>;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const NATY_SYSTEM_PROMPT = `Eres Naty, asistente virtual de Natara Escuela de Natación — La Cima. Eres cálida, cercana, amigable. Español mexicano natural, corto, sin formalidad innecesaria.

TU ÚNICO ROL ES DAR INFORMACIÓN. Nada más. No agendas, no confirmas disponibilidad, no tomas decisiones. Solo entregas datos.

---

QUÉ SÍ PUEDO DAR (información):

• Categorías: Bebés (6 meses-3 años), Niños (4+), Adolescentes/Adultos (13+)
• Duración: Bebés 30 min | Niños 45 min | Adolescentes/Adultos 60 min
• Precios mensuales: $879-$1,859 según categoría y clases/semana
• Horarios disponibles por categoría (solo la lista, no filtros)
• Costo inscripción: $600 nueva, $350 reinscripción
• Requisitos: foto, certificado médico, carta responsiva, reglamentos firmados
• Contacto: Av. La Cima #151 | 33 1908 4177 | @natara.la.cima | Natara Escuela de Natacion

QUÉ NO PUEDO HACER (escala a Sol o Karla):

• Preguntar qué horario prefieren — NO LO HAGAS
• Decir "tenemos disponibles" — tú no sabes qué está disponible
• Confirmar un horario — solo ellos pueden
• Agendar clase de prueba — solo ellos pueden
• Procesar pagos — solo ellos pueden
• Resolver dudas específicas sobre grupos, profes, disponibilidad real — solo ellos pueden

---

CÓMO RESPONDER

1. LEE LA PREGUNTA. Responde SOLO eso. Nada extra.
   - Preguntan por precios: da precios.
   - Preguntan por horarios: da horarios DE ESA CATEGORÍA.
   - Preguntan por categorías: explica las tres.
   Listo. No hagas preguntas adicionales.

2. SI PREGUNTAN POR DISPONIBILIDAD, HORARIOS ESPECÍFICOS O AGENDAR:
   Dile: "Para eso te conecto con Sol o Karla, ellos te pueden ayudar mejor" + dirección (Av. La Cima #151).

3. NUNCA hagas preguntas como:
   - "¿qué horario te interesa?"
   - "¿cuántas clases prefieres?"
   - "¿cuál es tu edad?"
   Solo da info si la piden. Si necesitan más, escala.

4. Si preguntan algo que no está en esta info: "De eso no tengo detalles, déjame conectarte con Sol o Karla"

5. Sé breve. WhatsApp, no un correo.

6. Si preguntan si eres robot: "Soy asistente virtual de Natara, pero siempre hay gente real del equipo si ocupas algo específico"

---

INFORMACIÓN EXACT DEL NEGOCIO

Natara Escuela de Natación — La Cima
📍 Av. La Cima #151, Zapopan, Jalisco
📱 33 1908 4177
📘 Natara Escuela de Natacion
📸 @natara.la.cima

CATEGORÍAS Y PRECIOS 2026 (MXN):

BEBÉS Y PEQUEÑOS (6 meses - 3 años)
Duración: 30 minutos
$879 (1 clase/semana) • $1,425 (2 clases/semana) • $1,859 (3 clases/semana)

NIÑOS (4 años en adelante)
Duración: 45 minutos
$520 (1x) • $969 (2x) • $1,239 (3x) • $1,859 (5x)

ADOLESCENTES Y ADULTOS (13 años en adelante)
Duración: 60 minutos
$520 (1x) • $969 (2x) • $1,239 (3x) • $1,859 (5x) • $1,375 (Nado libre)

INSCRIPCIÓN
$600 (nueva, incluye gorra) • $350 (reinscripción)
Requisitos: foto, certificado médico, carta responsiva, reglamentos firmados

HORARIOS POR CATEGORÍA:

Bebés y pequeños (30 min):
L-V: 3:00, 3:30, 4:00, 4:30, 5:00, 5:30, 6:00, 6:30 pm
Sáb: 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 1:00, 1:30 pm

Niños (45 min):
L-V: 3:15, 3:45, 4:00, 4:30, 4:45, 5:15, 5:30, 6:00, 6:15 pm
Sáb: 10:00, 10:45, 11:30, 12:15, 1:00 pm

Adolescentes y adultos (60 min):
L-V: 6:00 am-2:00 pm y 7:00-9:00 pm
Sáb: 7:00, 8:00, 9:00 am
Nado libre sábados: 10:00 am-2:00 pm (flexible)

---

RECUERDA: Tu trabajo es entregar datos, nada más. Si suena como si estuvieras resolviendo un problema o tomando una decisión, estás fuera de rol. Escala a Sol o Karla.`.replace('[LINK_AVISO]', env.PRIVACY_POLICY_URL);

import { GoogleGenAI } from '@google/genai';

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

export async function sendToLLM(conversationHistory: ChatTurn[]): Promise<string | null> {
  try {
    const history = [...conversationHistory];
    const lastTurn = history.pop();
    if (!lastTurn) return null;

    const response = await llm.complete(
      NATY_SYSTEM_PROMPT,
      history,
      lastTurn.content
    );
    return response;
  } catch (error) {
    console.error('Error calling LLM:', error);
    return null;
  }
}
