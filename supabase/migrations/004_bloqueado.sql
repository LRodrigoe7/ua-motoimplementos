-- Agrega campo bloqueado a clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false;
