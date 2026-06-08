-- ================================================================
-- MIGRACIÓN 002: Sistema de mensajes WhatsApp
-- Ejecutar en Supabase SQL Editor DESPUÉS de la migración 001
-- ================================================================

-- Tabla de mensajes (conversaciones bidireccionales por número WA)
CREATE TABLE IF NOT EXISTS mensajes (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id   uuid        REFERENCES clientes(id) ON DELETE SET NULL,
  equipo_id    bigint      REFERENCES equipos(id) ON DELETE SET NULL,
  whatsapp_id  text        UNIQUE,          -- ID de Evolution API (deduplicar)
  numero_wa    text        NOT NULL,        -- Número del cliente sin @s.whatsapp.net
  nombre_wa    text        NOT NULL DEFAULT '',
  remitente    text        NOT NULL CHECK (remitente IN ('cliente', 'taller')),
  contenido    text        NOT NULL,
  leido        boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_numero  ON mensajes (numero_wa, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensajes_cliente ON mensajes (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensajes_no_leidos ON mensajes (leido, remitente) WHERE leido = false AND remitente = 'cliente';

-- Tabla de suscripciones push (una por dispositivo/navegador)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint   text        UNIQUE NOT NULL,
  p256dh     text        NOT NULL,
  auth       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE mensajes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mensajes"         ON mensajes;
DROP POLICY IF EXISTS "anon_insert_push"             ON push_subscriptions;
DROP POLICY IF EXISTS "anon_select_push"             ON push_subscriptions;

CREATE POLICY "anon_select_mensajes" ON mensajes
  FOR SELECT TO anon USING (true);

-- El browser necesita poder insertar su suscripción push
CREATE POLICY "anon_insert_push" ON push_subscriptions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_select_push" ON push_subscriptions
  FOR SELECT TO anon USING (true);

-- Realtime para la bandeja de mensajes en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE mensajes;
