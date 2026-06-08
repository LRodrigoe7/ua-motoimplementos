-- Tabla para marcas, tipos de equipo y otros catálogos editables por el usuario
CREATE TABLE catalogo (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria text NOT NULL,
  valor text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (categoria, valor)
);

-- Valores iniciales (los mismos que estaban hardcodeados en el formulario)
INSERT INTO catalogo (categoria, valor) VALUES
  ('tipo_equipo', 'Motosierra'),
  ('tipo_equipo', 'Motoguadaña'),
  ('tipo_equipo', 'Grupo electrógeno'),
  ('tipo_equipo', 'Bordeadora'),
  ('tipo_equipo', 'Bomba de agua'),
  ('tipo_equipo', 'Motocultor'),
  ('marca', 'Stihl'),
  ('marca', 'Husqvarna'),
  ('marca', 'Dolmar'),
  ('marca', 'Echo'),
  ('marca', 'Honda'),
  ('marca', 'Yamaha'),
  ('marca', 'Briggs & Stratton');

ALTER TABLE catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalogo_all" ON catalogo FOR ALL USING (true) WITH CHECK (true);
