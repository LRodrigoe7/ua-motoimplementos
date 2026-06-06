-- =============================================
-- SCHEMA INICIAL: Sistema de Taller Motoimplementos
-- =============================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum de estados
CREATE TYPE estado_equipo AS ENUM (
  'Ingreso',
  'Presupuestado',
  'Esperando Aprobación',
  'Aceptado',
  'Rechazado',
  'En Reparación',
  'Finalizado',
  'Entregado'
);

-- =============================================
-- Tabla: clientes
-- =============================================
CREATE TABLE clientes (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_apellido  text NOT NULL,
  direccion        text NOT NULL DEFAULT '',
  whatsapp         text NOT NULL DEFAULT '',
  email            text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Índice para búsqueda por nombre
CREATE INDEX idx_clientes_nombre ON clientes (nombre_apellido);

-- =============================================
-- Tabla: equipos
-- =============================================
CREATE TABLE equipos (
  id                        bigserial PRIMARY KEY, -- Número de ingreso visible
  cliente_id                uuid NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  tipo                      text NOT NULL,          -- Motosierra, motoguadaña, etc.
  marca                     text NOT NULL DEFAULT '',
  modelo                    text NOT NULL DEFAULT '',
  cilindrada                text NOT NULL DEFAULT '',
  descripcion_falla_inicial text NOT NULL,
  diagnostico_tecnico       text,
  monto_presupuesto         numeric(12,2) NOT NULL DEFAULT 0,
  estado_actual             estado_equipo NOT NULL DEFAULT 'Ingreso',
  token_aprobacion          text UNIQUE,            -- Token único para link de cliente
  created_at                timestamptz NOT NULL DEFAULT now(),
  fecha_presupuesto         timestamptz,
  fecha_finalizado          timestamptz,
  fecha_entregado           timestamptz,
  fecha_rechazo             timestamptz             -- Para calcular los 15 días de retiro
);

CREATE INDEX idx_equipos_cliente ON equipos (cliente_id);
CREATE INDEX idx_equipos_estado  ON equipos (estado_actual);
CREATE INDEX idx_equipos_token   ON equipos (token_aprobacion) WHERE token_aprobacion IS NOT NULL;

-- =============================================
-- Tabla: historial_estados
-- =============================================
CREATE TABLE historial_estados (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipo_id   bigint NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  estado      estado_equipo NOT NULL,
  fecha_cambio timestamptz NOT NULL DEFAULT now(),
  nota        text NOT NULL DEFAULT ''
);

CREATE INDEX idx_historial_equipo ON historial_estados (equipo_id, fecha_cambio DESC);

-- =============================================
-- Función: registrar cambio de estado + historial automático
-- =============================================
CREATE OR REPLACE FUNCTION fn_cambiar_estado(
  p_equipo_id bigint,
  p_nuevo_estado estado_equipo,
  p_nota text DEFAULT ''
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Registrar en historial
  INSERT INTO historial_estados (equipo_id, estado, nota)
  VALUES (p_equipo_id, p_nuevo_estado, p_nota);

  -- Actualizar equipo con timestamps condicionales
  UPDATE equipos
  SET
    estado_actual       = p_nuevo_estado,
    fecha_presupuesto   = CASE WHEN p_nuevo_estado = 'Presupuestado'   THEN now() ELSE fecha_presupuesto  END,
    fecha_finalizado    = CASE WHEN p_nuevo_estado = 'Finalizado'      THEN now() ELSE fecha_finalizado   END,
    fecha_entregado     = CASE WHEN p_nuevo_estado = 'Entregado'       THEN now() ELSE fecha_entregado    END,
    fecha_rechazo       = CASE WHEN p_nuevo_estado = 'Rechazado'       THEN now() ELSE fecha_rechazo      END
  WHERE id = p_equipo_id;
END;
$$;

-- =============================================
-- Trigger: registrar Ingreso en historial al crear equipo
-- =============================================
CREATE OR REPLACE FUNCTION fn_trigger_ingreso()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO historial_estados (equipo_id, estado, nota)
  VALUES (NEW.id, 'Ingreso', 'Equipo ingresado al sistema');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_equipo_ingreso
AFTER INSERT ON equipos
FOR EACH ROW EXECUTE FUNCTION fn_trigger_ingreso();

-- =============================================
-- RLS (Row Level Security)
-- Por ser un sistema privado/interno, se usa service_role para todas las ops del servidor.
-- El anon key solo puede leer la página de aprobación pública.
-- =============================================
ALTER TABLE clientes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_estados ENABLE ROW LEVEL SECURITY;

-- Política: service_role tiene acceso total (backend)
CREATE POLICY "service_role_all" ON clientes        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON equipos         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON historial_estados FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Política: anon puede leer equipo por token (página pública de aprobación)
CREATE POLICY "anon_read_by_token" ON equipos
  FOR SELECT TO anon
  USING (token_aprobacion IS NOT NULL);

-- =============================================
-- Realtime: habilitar publicaciones
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE equipos;
ALTER PUBLICATION supabase_realtime ADD TABLE historial_estados;
