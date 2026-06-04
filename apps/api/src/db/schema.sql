-- Naty · Esquema inicial de base de datos
-- Ejecutar en Supabase SQL Editor
-- Todas las tablas incluyen school_id para soporte multi-tenant

-- =============================================
-- TABLA: contacts
-- =============================================
CREATE TABLE IF NOT EXISTS contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL,
  phone         TEXT NOT NULL,
  name          TEXT,
  email         TEXT,
  status        TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'active', 'inactive')),
  source        TEXT NOT NULL CHECK (source IN ('whatsapp_inbound', 'manual', 'import')),
  accepted_privacy BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_contacts_school_id ON contacts(school_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(school_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(school_id, source);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(school_id, created_at DESC);

-- =============================================
-- TABLA: conversations
-- =============================================
CREATE TABLE IF NOT EXISTS conversations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID NOT NULL,
  contact_id          UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  wa_conversation_id  TEXT,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'handoff')),
  handoff_at          TIMESTAMPTZ,
  handoff_reason      TEXT
);

CREATE INDEX IF NOT EXISTS idx_conversations_school_id ON conversations(school_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(school_id, status);

-- =============================================
-- TABLA: messages
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content         TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'document', 'template')),
  wa_message_id   TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(conversation_id, timestamp DESC);

-- =============================================
-- TABLA: campaigns
-- =============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL,
  name            TEXT NOT NULL,
  template_id     TEXT NOT NULL,
  segment         JSONB NOT NULL DEFAULT '{}',
  sent_count      INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL,
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_school_id ON campaigns(school_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(school_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(school_id, created_at DESC);

-- =============================================
-- TABLA: users (perfil extendido de Supabase Auth)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL,
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);

-- =============================================
-- TRIGGER: updated_at automático en contacts
-- =============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- RLS: habilitar Row Level Security
-- =============================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
