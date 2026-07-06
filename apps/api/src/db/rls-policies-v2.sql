-- Naty · RLS Policies v2 (FIX recursión)
-- Ejecutar en Supabase SQL Editor
-- Usa una función SECURITY DEFINER para evitar la recursión de RLS

-- =============================================
-- FUNCIÓN HELPER: obtiene school_id del usuario actual (bypass RLS)
-- =============================================
CREATE OR REPLACE FUNCTION current_school_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT school_id FROM users WHERE id = auth.uid();
$$;

-- =============================================
-- LIMPIAR POLÍTICAS ANTERIORES
-- =============================================
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_select_school" ON users;
DROP POLICY IF EXISTS "users_update_school" ON users;

DROP POLICY IF EXISTS "contacts_select" ON contacts;
DROP POLICY IF EXISTS "contacts_insert" ON contacts;
DROP POLICY IF EXISTS "contacts_update" ON contacts;
DROP POLICY IF EXISTS "contacts_delete" ON contacts;

DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;

DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;

DROP POLICY IF EXISTS "campaigns_select" ON campaigns;
DROP POLICY IF EXISTS "campaigns_insert" ON campaigns;
DROP POLICY IF EXISTS "campaigns_update" ON campaigns;

DROP POLICY IF EXISTS "templates_select" ON templates;
DROP POLICY IF EXISTS "templates_insert" ON templates;
DROP POLICY IF EXISTS "templates_update" ON templates;
DROP POLICY IF EXISTS "templates_delete" ON templates;

-- =============================================
-- TABLA: users
-- =============================================
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_select_school" ON users
  FOR SELECT USING (school_id = current_school_id() AND EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
  ));

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_school" ON users
  FOR UPDATE
  USING (school_id = current_school_id() AND EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
  ))
  WITH CHECK (school_id = current_school_id());

-- =============================================
-- TABLA: contacts
-- =============================================
CREATE POLICY "contacts_select" ON contacts
  FOR SELECT USING (school_id = current_school_id());

CREATE POLICY "contacts_insert" ON contacts
  FOR INSERT WITH CHECK (school_id = current_school_id());

CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE USING (school_id = current_school_id());

-- =============================================
-- TABLA: conversations
-- =============================================
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (school_id = current_school_id());

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (school_id = current_school_id());

CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

-- =============================================
-- TABLA: messages (vía conversation_id)
-- =============================================
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE school_id = current_school_id()
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE school_id = current_school_id()
    )
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE school_id = current_school_id()
    )
  );

-- =============================================
-- TABLA: campaigns
-- =============================================
CREATE POLICY "campaigns_select" ON campaigns
  FOR SELECT USING (school_id = current_school_id());

CREATE POLICY "campaigns_insert" ON campaigns
  FOR INSERT WITH CHECK (school_id = current_school_id());

CREATE POLICY "campaigns_update" ON campaigns
  FOR UPDATE USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

-- =============================================
-- TABLA: templates
-- =============================================
CREATE POLICY "templates_select" ON templates
  FOR SELECT USING (school_id = current_school_id());

CREATE POLICY "templates_insert" ON templates
  FOR INSERT WITH CHECK (school_id = current_school_id());

CREATE POLICY "templates_update" ON templates
  FOR UPDATE USING (school_id = current_school_id());

CREATE POLICY "templates_delete" ON templates
  FOR DELETE USING (school_id = current_school_id());
