import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: parseInt(optionalEnv('PORT', '3000'), 10),
  DASHBOARD_URL: optionalEnv('DASHBOARD_URL', 'http://localhost:3001'),

  SUPABASE_URL: requireEnv('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),

  TWILIO_ACCOUNT_SID: optionalEnv('TWILIO_ACCOUNT_SID', ''),
  TWILIO_AUTH_TOKEN: optionalEnv('TWILIO_AUTH_TOKEN', ''),
  TWILIO_WHATSAPP_NUMBER: optionalEnv('TWILIO_WHATSAPP_NUMBER', ''),

  META_ACCESS_TOKEN: optionalEnv('META_ACCESS_TOKEN', ''),
  META_PHONE_NUMBER_ID: optionalEnv('META_PHONE_NUMBER_ID', ''),
  META_WEBHOOK_VERIFY_TOKEN: optionalEnv('META_WEBHOOK_VERIFY_TOKEN', ''),
  META_WABA_ID: optionalEnv('META_WABA_ID', ''),
  META_TEMPLATE_LANGUAGE: optionalEnv('META_TEMPLATE_LANGUAGE', 'es_MX'),

  GEMINI_API_KEY: optionalEnv('GEMINI_API_KEY', ''),
  GEMINI_MODEL: optionalEnv('GEMINI_MODEL', 'gemini-2.5-flash'),

  ANTHROPIC_API_KEY: optionalEnv('ANTHROPIC_API_KEY', ''),
  ANTHROPIC_MODEL: optionalEnv('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001'),

  LLM_PROVIDER: optionalEnv('LLM_PROVIDER', 'gemini'),

  MESSAGING_PROVIDER: optionalEnv('MESSAGING_PROVIDER', 'twilio'),

  PRIVACY_POLICY_URL: optionalEnv('PRIVACY_POLICY_URL', ''),

  DEFAULT_SCHOOL_ID: optionalEnv('DEFAULT_SCHOOL_ID', ''),
} as const;

if (!env.GEMINI_API_KEY && !env.ANTHROPIC_API_KEY) {
  throw new Error('✗ Naty API Startup Error: Al menos una clave de API para LLM (GEMINI_API_KEY o ANTHROPIC_API_KEY) debe estar configurada en las variables de entorno.');
}
