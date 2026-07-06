-- Naty · Row Level Security Policies
-- Ejecutar en Supabase SQL Editor DESPUÉS del schema.sql
-- Permite que usuarios autenticados accedan a los datos de su school_id

-- =============================================
-- Helper: usuarios autenticados con perfil
-- =============================================

-- =============================================
-- TABLA: users
-- =============================================
-- Un usuario puede leer su propio perfil
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Un usuario puede actualizar su propio perfil
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Un admin puede leer usuarios del mismo school_id
CREATE POLICY "users_select_school" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.school_id = users.school_id
    )
  );

-- Un admin puede actualizar usuarios del mismo school_id
CREATE POLICY "users_update_school" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.school_id = users.school_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.school_id = users.school_id
    )
  );

-- =============================================
-- TABLA: contacts
-- =============================================
CREATE POLICY "contacts_select" ON contacts
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "contacts_insert" ON contacts
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

-- =============================================
-- TABLA: conversations
-- =============================================
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

-- =============================================
-- TABLA: messages
-- =============================================
CREATE POLICY "messages_select" ON messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE c.school_id IN (
        SELECT school_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE c.school_id IN (
        SELECT school_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE c.school_id IN (
        SELECT school_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLA: campaigns
-- =============================================
CREATE POLICY "campaigns_select" ON campaigns
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "campaigns_insert" ON campaigns
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "campaigns_update" ON campaigns
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

-- =============================================
-- TABLA: templates (crear si no existe + políticas)
-- =============================================
CREATE TABLE IF NOT EXISTS templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL,
  name        TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_by  UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_school_id ON templates(school_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(school_id, created_at DESC);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select" ON templates
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "templates_insert" ON templates
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "templates_update" ON templates
  FOR UPDATE
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "templates_delete" ON templates
  FOR DELETE
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()
    )
  );
