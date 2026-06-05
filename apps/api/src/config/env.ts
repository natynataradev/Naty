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

  ANTHROPIC_API_KEY: requireEnv('ANTHROPIC_API_KEY'),

  DEFAULT_SCHOOL_ID: optionalEnv('DEFAULT_SCHOOL_ID', ''),
} as const;
