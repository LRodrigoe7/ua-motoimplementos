# Diagnóstico: Evolution API — QR Code no se genera

## Contexto del proyecto

Aplicación web privada (Next.js 14 + Supabase) para gestionar un taller de reparaciones.
Usamos **Evolution API v2.2.3** como gateway de WhatsApp (Baileys) para enviar y recibir mensajes de clientes.

---

## Infraestructura actual

| Servicio | Plataforma | URL |
|---|---|---|
| App Next.js | Local (dev) | http://localhost:3000 |
| Evolution API | Railway (Hobby plan) | https://evolution-api-production-e510.up.railway.app |
| Base de datos app | Supabase (PostgreSQL) | zpbumrtjhaeculoyaelb.supabase.co |
| Base de datos Evolution API | Railway PostgreSQL | postgresql://... (Railway internal) |

---

## Variables de entorno en Railway (Evolution API)

```
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=<railway-postgres-url>
DATABASE_ENABLED=true
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_CHATS=true
AUTHENTICATION_TYPE=apikey
AUTHENTICATION_API_KEY=motoclave2024
QRCODE_LIMIT=30
CACHE_REDIS_ENABLED=false
CACHE_LOCAL_ENABLED=true
SERVER_TYPE=http
SERVER_PORT=8080
LOG_LEVEL=ERROR,WARN,INFO,LOG
LOG_BAILEYS=error
DEL_INSTANCE=false
CORS_ORIGIN=*
WA_VERSION=2.3000.1023141542
```

Docker image: `atendai/evolution-api:latest` (que resulta ser v2.2.3)

---

## El problema

**La instancia de WhatsApp nunca genera el QR code.**

### Lo que SÍ funciona
- Evolution API levanta correctamente (`{"status":200,"message":"Welcome to the Evolution API..."}`)
- La instancia se crea exitosamente via API (`POST /instance/create`)
- `GET /instance/fetchInstances` devuelve la instancia correctamente
- La base de datos tiene todas las tablas de Prisma creadas (31 tablas)
- Los webhooks de tipo `connection.update` SÍ llegan al destino configurado
- El Evolution Manager (UI) abre el diálogo "Scan the QR code" al clickear "Get QR Code"

### Lo que NO funciona
- `GET /instance/connect/motoimplementos` siempre devuelve `{"count":0}`
- Nunca llega un evento `QRCODE_UPDATED` al webhook
- La imagen del QR nunca aparece en el Evolution Manager (modal vacío)
- `POST /instance/pairingCode/motoimplementos` devuelve 404 (no existe en v2.2.3)

---

## Logs de Railway (patrón que se repite constantemente)

```
INFO  [ChannelStartupService] [motoimplementos] Browser: Evolution API,Chrome,6.18.15+deb13-cloud-amd64
INFO  [ChannelStartupService] [motoimplementos] Baileys version env: 2,3000,1015901307
INFO  [ChannelStartupService] [motoimplementos] Group Ignore: false
--- CRASH / RESTART (sin mensaje de error) ---
INFO  [ChannelStartupService] [motoimplementos] Browser: Evolution API,Chrome,6.18.15+deb13-cloud-amd64
... (se repite)
```

Después de "Group Ignore: false" el servicio se reinicia sin mostrar ningún ERROR en los logs.

---

## Todo lo que intentamos

1. **Redis desactivado** (`CACHE_REDIS_ENABLED=false`, `CACHE_LOCAL_ENABLED=true`) — antes había errores `redis disconnected`, ahora no hay errores pero el QR sigue sin generarse.

2. **Actualizar WA_VERSION** — agregamos `WA_VERSION=2.3000.1023141542` pensando que la versión vieja (`2,3000,1015901307`) era rechazada por WhatsApp. Sin cambios.

3. **Borrar y recrear la instancia** múltiples veces — siempre `{"count":0}`.

4. **Webhook a webhook.site** — los eventos `connection.update` SÍ llegaban con estado `"connecting"`. Nunca llegó ningún evento `QRCODE_UPDATED`. webhook.site terminó dando 429 por demasiadas requests de `connection.update`.

5. **Socket.IO desde consola del navegador** — falló: `WebSocket connection to 'wss://evolution-api-production-e510.up.railway.app/socket.io/...' failed`.

6. **`GET /instance/qrcode/motoimplementos?image=true`** — 404, endpoint no existe.

7. **Upgrade a Railway Hobby plan** — se hizo, pero el comportamiento es idéntico.

8. **`DATABASE_ENABLED=true`** — agregado, sin cambios.

9. **Endpoint propio con localtunnel** — actualmente en curso: creamos `/api/qr` en la app Next.js, lo exponemos con `npx localtunnel --port 3000` y configuramos el webhook de Evolution API para que envíe `QRCODE_UPDATED` ahí. Esperando resultado.

---

## Hipótesis actuales

### Hipótesis A — Railway/AWS IPs bloqueadas por WhatsApp
Railway usa infraestructura de AWS. WhatsApp bloquea activamente las IPs de datacenters conocidos para conexiones de Baileys (API no oficial). Esto explicaría por qué Baileys se conecta (estado "connecting") pero WhatsApp nunca envía el desafío QR.

### Hipótesis B — Crash silencioso en la inicialización de Baileys
El ChannelStartupService crashea justo después de "Group Ignore: false" sin loguear el error. Puede ser un problema con la inicialización del store de autenticación, un OOM (out of memory), o una excepción no capturada en la carga del módulo de Baileys.

### Hipótesis C — WA_VERSION desactualizada
La versión `2,3000,1015901307` es demasiado vieja y WhatsApp la rechaza antes de enviar el QR. Intentamos override con `WA_VERSION=2.3000.1023141542` pero puede ser que el formato o el valor no sea correcto.

---

## Pregunta concreta

¿Por qué Baileys nunca genera el evento `QRCODE_UPDATED` en este deployment?
¿Cómo forzar la generación del QR o conectar WhatsApp sin QR (pairing code) en Evolution API v2.2.3?
¿Qué env vars o configuración específica podría estar causando el crash silencioso después de "Group Ignore: false"?
