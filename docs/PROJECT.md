# Naty — PROJECT.md
> Diavolo Agency · Cliente: Natara La Cima · v1.0

---

## Visión

Naty es un sistema de atención al cliente y comunicación masiva para escuelas de natación, construido sobre WhatsApp Business API (Meta Cloud API). La v1 es el piloto en Natara La Cima; el objetivo estratégico es escalar a un CRM completo multi-sucursal.

---

## Objetivos del Sistema

1. Automatizar la atención al cliente de Natara vía WhatsApp, reduciendo carga operativa del staff
2. Capturar prospectos entrantes y registrarlos automáticamente en la base de datos
3. Facilitar el agendado de clases muestra sin intervención humana en casos estándar
4. Permitir el envío de comunicados masivos segmentados desde un panel web
5. Proveer un panel de gestión premium, escalable a CRM completo multi-sucursal

---

## Principios No Negociables

Estas reglas no pueden ser violadas bajo ninguna circunstancia. Cualquier conflicto con ellas detiene el sprint y notifica al Director.

1. **Zero cost operativo** — ninguna decisión técnica puede introducir costos recurrentes no contemplados en la tabla de costos del PROJECT.md sin autorización explícita del Director
2. **Aviso de privacidad obligatorio** — ningún dato personal puede ser almacenado si el contacto no ha respondido ACEPTO en el flujo de privacidad
3. **Stack cerrado** — no se instalan dependencias fuera del stack aprobado sin autorización del Director
4. **Abstracción del LLM** — el cliente de Gemini debe vivir en un módulo independiente (`/api/src/bot/llm.ts`) para permitir migración de proveedor sin tocar lógica de flujos
5. **Abstracción de mensajería** — el cliente de Twilio/Meta debe estar aislado en `/api/src/messaging/` para facilitar la migración Twilio → Meta Cloud API
6. **Sin valores hardcodeados** — todas las credenciales y configuraciones viven en variables de entorno
7. **Multi-tenant preparado** — el esquema de base de datos debe incluir `school_id` desde el inicio para soportar múltiples sucursales sin refactoring
8. **Roles respetados** — el panel nunca expone funciones de Administrador a usuarios con rol Operador

---

## Scope v1

### 1. Chatbot WhatsApp (Naty)
- Plataforma: **Meta Cloud API** directo sobre el WABA existente del cliente
- Inbound: atención al cliente automatizada (información, precios, horarios)
- Agendado de clase muestra
- Apoyo al cierre de venta
- Handoff a humano cuando el bot llega a su límite
- Captura automática de prospectos → base de datos
- Aviso de privacidad con aceptación explícita (`ACEPTO`) en primer contacto

### 2. Panel Web (Dashboard)
- Mass messaging a segmentos de la base de datos
- Historial de envíos (quién, cuándo, qué, estado)
- Gestión de base de datos de contactos
- Prospectos nuevos agregados automáticamente por Naty
- 3 usuarios · 2 roles: **Administrador** y **Operador**

---

## Roadmap de Migración Técnica

### Etapa 1 — Pruebas (actual)
| Componente | Plataforma | Notas |
|---|---|---|
| WhatsApp | Twilio Sandbox | Sin costo, número de prueba compartido |
| LLM | Google Gemini Flash 2.0 | Capa gratuita, evaluando rendimiento |
| Dashboard | Vercel | Servidor de producción definitivo |

### Etapa 2 — Producción
| Componente | Plataforma | Notas |
|---|---|---|
| WhatsApp | Meta Cloud API directo | Migrar número WABA del cliente, eliminar Twilio |
| LLM | Google Gemini Flash 2.0 | Mantener si el rendimiento es satisfactorio |
| Dashboard | Vercel | Sin cambios |

### Migraciones pendientes a evaluar

**Twilio → Meta Cloud API**
- Requiere acceso al Meta Business Manager del cliente
- Migrar el número existente del cliente a Cloud API
- Reconfigurar webhooks del backend (cambio de endpoint y formato de payload)
- Eliminar dependencia de Twilio completamente

**Gemini → Anthropic Claude (condicional)**
- Migrar si Gemini Flash no cubre los casos de uso con suficiente calidad
- El cliente LLM está abstraído en un módulo independiente (`/api/src/bot/llm.ts`)
- El cambio es un swap de proveedor sin afectar la lógica de flujos
- Implica costo operativo (~$2–5 USD/mes con claude-haiku-4-5)

> **Nota de arquitectura:** El módulo LLM debe desarrollarse como una abstracción independiente del proveedor desde el inicio, para que cualquier migración sea un cambio de configuración, no de código.

| Componente | Plataforma | Plan | Costo |
|---|---|---|---|
| Chatbot LLM | Google Gemini Flash 2.0 | Free (1,500 req/día) | $0 |
| WhatsApp prueba | Twilio Sandbox | Free | $0 |
| WhatsApp producción | Meta Cloud API | 1,000 conv/mes gratis | $0 |
| Base de datos + Auth | Supabase | Free (500 MB) | $0 |
| Backend API | Railway | Free ($5 USD crédito/mes) | $0 |
| Dashboard | Vercel | Free | $0 |

> Costo operativo total estimado: **$0/mes** para el volumen de La Cima.
> Costos absorbidos por Diavolo durante los primeros 6 meses.

---

## Stack Técnico

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **Base de datos:** Supabase (PostgreSQL)
- **WhatsApp:** Meta Cloud API (Webhooks)
- **Deploy:** Railway

### Frontend (Panel)
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Deploy:** Vercel

### Integraciones
- **Google Gemini Flash 2.0** — procesamiento de lenguaje natural del chatbot (capa gratuita, 1,500 requests/día)
- **Twilio** — envío/recepción de mensajes WhatsApp (etapa de prueba)
- **Meta Cloud API** — plataforma objetivo producción (post-prueba)
- **Supabase Auth** — autenticación del panel

---

## Estructura del Proyecto

```
naty/
├── apps/
│   ├── api/                    # Backend Express + Node.js
│   │   ├── src/
│   │   │   ├── webhooks/       # Recepción de mensajes Meta
│   │   │   ├── bot/            # Lógica del chatbot Naty
│   │   │   │   ├── flows/      # Flujos de conversación
│   │   │   │   ├── handoff.ts  # Lógica de transferencia a humano
│   │   │   │   └── privacy.ts  # Flujo aviso de privacidad
│   │   │   ├── messaging/      # Envío de mensajes (inbound/outbound)
│   │   │   ├── contacts/       # Gestión de base de datos
│   │   │   └── campaigns/      # Mass messaging
│   │   └── package.json
│   │
│   └── dashboard/              # Frontend Next.js
│       ├── app/
│       │   ├── (auth)/         # Login
│       │   ├── contacts/       # Base de datos de contactos
│       │   ├── campaigns/      # Envío masivo
│       │   ├── history/        # Historial de envíos
│       │   └── settings/       # Configuración y usuarios
│       └── package.json
│
├── packages/
│   └── shared/                 # Tipos compartidos TypeScript
│
└── PROJECT.md
```

---

## Base de Datos (Supabase)

### Tablas principales

**contacts**
```
id, phone, name, email, status, source, accepted_privacy, accepted_at, created_at, updated_at
```
- `status`: prospect | active | inactive
- `source`: whatsapp_inbound | manual | import
- `accepted_privacy`: boolean

**conversations**
```
id, contact_id, wa_conversation_id, started_at, last_message_at, status, handoff_at, handoff_reason
```
- `status`: active | closed | handoff

**messages**
```
id, conversation_id, direction, content, type, wa_message_id, timestamp, status
```
- `direction`: inbound | outbound
- `status`: sent | delivered | read | failed

**campaigns**
```
id, name, template_id, segment, sent_count, delivered_count, failed_count, created_by, sent_at, status
```

**users**
```
id, email, name, role, created_at
```
- `role`: admin | operator

---

## Flujos del Chatbot

### Flujo 1 — Primer contacto (Aviso de Privacidad)
```
Usuario escribe por primera vez
→ Naty: mensaje de bienvenida + resumen aviso + link + solicita ACEPTO
→ Usuario responde ACEPTO
→ Naty: continúa al flujo principal
→ Usuario NO responde ACEPTO en 24h
→ Conversación cerrada, contacto no procesado
```

### Flujo 2 — Atención general
```
→ Información general (horarios, ubicación, precios)
→ Inscripción / clase muestra → agendado
→ Consulta de estado de inscripción
→ Handoff a humano (ventas / casos complejos)
```

### Flujo 3 — Captura de prospecto
```
Usuario interactúa → Naty extrae: nombre, teléfono, interés
→ INSERT en contacts con source = whatsapp_inbound
→ Notificación interna (panel)
```

---

## Panel Web — Vistas

### /contacts
- Tabla de contactos con filtros (status, source, fecha)
- Búsqueda por nombre / teléfono
- Vista de detalle de contacto + historial de conversación
- Exportar segmento

### /campaigns
- Nuevo envío: seleccionar segmento → elegir template → preview → enviar
- Programación de envíos (fecha/hora)

### /history
- Historial de campañas enviadas
- Métricas por campaña: enviados / entregados / fallidos

### /settings (solo Admin)
- Gestión de usuarios (crear, editar, desactivar)
- Configuración de templates de Meta
- Configuración de webhooks

---

## Roles y Permisos

| Función | Admin | Operador |
|---|---|---|
| Ver contactos | ✓ | ✓ |
| Editar contactos | ✓ | ✓ |
| Enviar campaña | ✓ | ✓ |
| Ver historial | ✓ | ✓ |
| Gestionar usuarios | ✓ | ✗ |
| Configuración sistema | ✓ | ✗ |

---

## Variables de Entorno

```env
# Twilio (etapa de prueba)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# Meta Cloud API (producción — post-prueba)
META_ACCESS_TOKEN=
META_PHONE_NUMBER_ID=
META_WEBHOOK_VERIFY_TOKEN=
META_WABA_ID=

# Google Gemini Flash 2.0
GEMINI_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# App
NODE_ENV=
PORT=3000
DASHBOARD_URL=
```

---

## UI / Diseño

- Estética: **plataforma SaaS premium** — dark mode, tipografía limpia, datos densos pero legibles
- Componentes: shadcn/ui como base, customizados al estilo Naty

### Paleta de Colores Naty

| Token | Hex | Uso |
|---|---|---|
| `--naty-green` | `#6BBF4E` | Primario, CTAs, acciones principales |
| `--naty-blue` | `#3AABCE` | Secundario, headers, acentos |
| `--naty-sky` | `#5BC8E8` | Fondos suaves, hover states |
| `--naty-dark` | `#1A1A2E` | Fondo base del panel (dark mode) |
| `--naty-white` | `#FFFFFF` | Texto principal, superficies |
| `--naty-gray` | `#F4F6F8` | Fondos neutros, filas de tablas |

> Fondo oscuro (`--naty-dark`) como base del panel. Acentos en verde y azul Natara. Consistente con la identidad visual del cliente.

---

## Criterios de Éxito v1

- [ ] Webhook de Meta recibe y procesa mensajes correctamente
- [ ] Flujo de aviso de privacidad funciona y registra aceptación
- [ ] Naty responde preguntas frecuentes con coherencia
- [ ] Handoff a humano se activa en los casos definidos
- [ ] Prospectos nuevos aparecen en el panel automáticamente
- [ ] Mass messaging llega correctamente a segmento seleccionado
- [ ] Historial de campañas registra métricas básicas
- [ ] Login y roles funcionan correctamente

---

## Notas Estratégicas

- La Cima es piloto gratuito. Real Center es el cliente pagador objetivo.
- El sistema debe estar listo para multi-tenant (agregar sucursales sin refactoring mayor)
- Costos operativos absorbidos por Diavolo hasta diciembre 2026
- Retainer comienza enero 2027

---

*Generado por Diavolo Agency · diavolo.me*

## Convenciones de Código

### Idioma
- **Código:** inglés (variables, funciones, archivos, comentarios técnicos)
- **UI / Interfaz:** español (labels, mensajes, textos visibles al usuario)
- **Mensajes de Naty:** español mexicano, tono amigable y profesional

### Naming
- **Archivos:** kebab-case (`whatsapp-client.ts`, `privacy-flow.ts`)
- **Variables y funciones:** camelCase (`handleIncomingMessage`, `sendTemplate`)
- **Clases e interfaces:** PascalCase (`ContactRepository`, `MessagePayload`)
- **Constantes:** UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT`)
- **Tablas de BD:** snake_case plural (`contacts`, `conversations`, `campaigns`)

### Estructura de imports
```typescript
// 1. Node built-ins
// 2. Dependencias externas
// 3. Módulos internos (ruta absoluta desde src/)
// 4. Tipos
```

### Commits
Formato: `type(scope): descripción en español`
```
feat(bot): agregar flujo de aviso de privacidad
fix(webhook): corregir validación de firma Twilio
refactor(llm): abstraer cliente Gemini en módulo independiente
chore(db): agregar migración tabla campaigns
```
Tipos: `feat` | `fix` | `refactor` | `chore` | `test` | `docs`

### Variables de entorno
- Siempre accedidas vía módulo centralizado (`/api/src/config/env.ts`)
- Nunca acceder `process.env` directamente en lógica de negocio
- Validar presencia al arrancar la aplicación — fallo rápido si falta alguna

### Tests
- Un test por criterio de aceptación del sprint
- Nomenclatura: `[módulo].test.ts`
- Los tests deben fallar antes de escribir el código (TDD)

---

## Log de Cambios

| Fecha | Sprint | Cambio | Motivo | Autorizado por |
|---|---|---|---|---|
| 2026-06-03 | — | Versión inicial | Sesión de definición con Director | Giorgio |
