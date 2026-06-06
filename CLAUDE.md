# Contexto del Proyecto: Taller de Motoimplementos (SaaS Privado)

Sistema de gestión interno y privado para taller de reparaciones de motoimplementos (motosierras, motoguadañas, grupos electrógenos, etc.). Permite el control de ingresos, presupuestos, estados de reparación y automatización de alertas. Multi-dispositivo con sincronización en tiempo real.

## 🛠️ Stack Tecnológico
- **Frontend:** React (Vite) / Next.js (Tailwind CSS) - Diseñado como PWA para PC y Mobile.
- **Backend/Base de Datos:** Supabase (PostgreSQL con Realtime habilitado vía WebSockets).
- **Notificaciones:** API de WhatsApp (Evolution API / Baileys) y Servicio de Mail (Resend / Nodemailer).

---

## 📐 Reglas de Negocio Estrictas

### 1. Filtro de Presupuesto ($100.000)
- **Monto <= $100.000:** La reparación se aprueba **automáticamente**. El estado pasa directo de `Presupuestado` a `En Reparación`. Se envía WhatsApp/Mail informativo al cliente sin botones de acción.
- **Monto > $100.000:** Requiere aprobación explícita del cliente. El estado pasa a `Esperando Aprobación`. El cliente recibe un link único para Aceptar o Rechazar.

### 2. Políticas de Retiro y Guarda (Cláusula Legal)
- **Caso Rechazado:** El cliente tiene 15 días corridos para retirar el equipo sin costo. Pasado ese plazo, se calcula automáticamente un canon de **$20.000 mensuales por guarda** (máximo 6 meses). Luego de los 6 meses, el equipo pasa a ser propiedad de la empresa.
- **Caso Finalizado:** Una vez reparado, el cliente tiene 15 días corridos para retirar. Pasado ese tiempo, aplica la misma penalidad de guarda ($20.000/mes).

### 3. Sincronización
- Todo cambio de estado debe impactar en tiempo real en todos los dispositivos conectados mediante las suscripciones de Supabase.

---

## 🔄 Flujo y Mutación de Estados (StateMachine)
El campo `estado` en la tabla `equipos` debe seguir estrictamente este flujo:
1. `Ingreso`: Registro inicial del equipo y cliente.
2. `Presupuestado`: Técnico carga diagnóstico y monto.
3. `Esperando Aprobación`: (Solo si monto > $100k) Esperando respuesta del cliente.
4. `Aceptado`: Cliente aprobó desde la web (gatilla alerta al taller).
5. `Rechazado`: Cliente rechazó (gatilla timer de 15 días para retiro/guarda).
6. `En Reparación`: Trabajo en progreso (automático si monto <= $100k o tras estado `Aceptado`).
7. `Finalizado`: Equipo listo (gatilla aviso de retiro y timer de 15 días).
8. `Entregado`: Cliente retira y abona. Fin del ciclo.

---

## 🗃️ Esquema de Base de Datos Esencial

### Tabla: `clientes`
- `id` (uuid, PK)
- `nombre_apellido` (text)
- `direccion` (text)
- `whatsapp` (text)
- `email` (text)

### Tabla: `equipos`
- `id` (int8/serial, PK) -> Número de ingreso secuencial visible para el cliente.
- `cliente_id` (uuid, FK -> clientes.id)
- `tipo` (text) -> Motosierra, motoguadaña, etc.
- `marca` (text), `modelo` (text), `cilindrada` (text)
- `descripcion_falla_inicial` (text)
- `diagnostico_tecnico` (text, nullable)
- `monto_presupuesto` (numeric, default 0)
- `estado_actual` (enum, default 'Ingreso')
- `created_at` (timestamp con zona horaria)
- `fecha_finalizado` (timestamp, nullable)

### Tabla: `historial_estados`
- `id` (uuid, PK)
- `equipo_id` (int8, FK -> equipos.id)
- `estado` (enum)
- `fecha_cambio` (timestamp)
- `nota` (text)

---

## 💻 Comandos del Proyecto
*(Modificar según las herramientas exactas que uses)*

### Desarrollo
- `npm run dev` o `bun dev` -> Iniciar servidor de desarrollo frontend.
- `supabase start` -> Iniciar entorno local de Supabase.

### Testing & Build
- `npm run build` -> Compilar para producción (PWA).
- `supabase db lint` -> Validar consistencia de la base de datos.

---

## 🎯 Guía de Estilo y Patrones
- **UI:** Diseñar pensando primero en *Mobile-First*. Los técnicos usan el celular en el taller con las manos sucias; botones grandes, legibles y acciones rápidas.
- **Backend:** Mantener la lógica pesada (como el cálculo de los 15 días y mutación automática) del lado del servidor o mediante Database Functions/Triggers en PostgreSQL si es posible, para asegurar consistencia.
- **Mensajería:** Toda función que envíe notificaciones debe usar templates dinámicos que inyecten el `#` de ingreso, nombre del cliente y montos.