# 🛡️ Informe de Auditoría Técnica — Sistema Naty v1.0
> **Fecha:** 24 de Junio, 2026  
> **Auditor:** Ingeniero Frontend Senior / Consultor de Seguridad Diavolo  
> **Proyecto:** Naty — Sistema de Atención al Cliente para Natara La Cima  

---

## 📋 Resumen Ejecutivo

Naty es un monorrepositorio basado en **pnpm, Turbo y TypeScript** que comprende una API en Express (`apps/api`), un panel de administración en Next.js (`apps/dashboard`), y un paquete compartido de tipos (`packages/shared`). 

El sistema está diseñado para actuar como un chatbot automatizado y un panel de gestión de clientes/campañas utilizando Supabase como base de datos y autenticación.

Tras una revisión profunda del código fuente, el esquema de base de datos y la configuración del entorno, se han detectado **debilidades de seguridad críticas** y **discrepancias significativas con la documentación arquitectónica** (`PROJECT.md`).

### Resumen de Hallazgos:
* 🔴 **Severidad Crítica:** El frontend del Dashboard hardcodea el rol del usuario a `admin` en el lado del cliente. Adicionalmente, se ha deshabilitado la protección del lado del servidor (`requireAdmin`) en la página `/settings`. Esto expone todas las herramientas de administración (como la creación de usuarios) a operadores o a cualquier sesión válida de Supabase.
* 🔴 **Severidad Crítica:** La API en Express (`apps/api`) **carece por completo de autenticación y autorización**. Está 100% expuesta; cualquier atacante que descubra la URL de Railway de la API puede invocar sus endpoints (`/users`, `/campaigns`, `/contacts`) para extraer datos o crear administradores en Supabase sin necesidad de token.
* 🟡 **Severidad Alta:** Discrepancia del LLM. `PROJECT.md` y `LLM_SETUP.md` especifican que el bot opera bajo Google Gemini (capa gratuita). Sin embargo, la implementación real del código (`/api/src/bot/llm.ts`) requiere obligatoriamente una clave de **Anthropic** e implementa `HaikuProvider` con Claude. Esto viola el principio no negociable de **"Zero cost operativo"** al introducir costos fijos.
* 🟡 **Severidad Alta:** Integración de Meta incompleta. La migración técnica a Meta Cloud API está a la mitad. Aunque existe un `MetaProvider` para el envío de mensajes, carece de implementación en el parser de mensajes entrantes (`parseIncoming`) y en el endpoint de webhook en Express, imposibilitando recibir mensajes directos de Meta.
* 🟢 **Severidad Baja:** Lógica de registro en campañas. Envíos masivos a contactos sin una conversación previa en la base de datos se envían a través del proveedor de mensajería, pero el historial no se registra al no tener un ID de conversación.

---

## 🔍 Análisis de Principios No Negociables

| Principio No Negociable | Estado | Diagnóstico / Observaciones |
| :--- | :---: | :--- |
| **1. Zero cost operativo** | ⚠️ *Parcial* | El código exige `ANTHROPIC_API_KEY` de forma obligatoria, rompiendo la promesa de gratuidad basada en Google Gemini Flash 2.0. |
| **2. Aviso de privacidad obligatorio** |  *Cumplido* | La lógica en `processMessage` y `privacy.ts` bloquea toda interacción hasta recibir un `ACEPTO` explícito del usuario. |
| **3. Stack cerrado** |  *Cumplido* | Las dependencias en los `package.json` coinciden con el stack tecnológico aprobado. |
| **4. Abstracción del LLM** | ⚠️ *Parcial* | Aislado en `/api/src/bot/llm.ts`, pero el adaptador está acoplado a Anthropic SDK. No se implementó el soporte para Gemini. |
| **5. Abstracción de mensajería** |  *Cumplido* | Se encuentra correctamente aislado en `/api/src/messaging/` con un patrón de proveedores intercambiables. |
| **6. Sin valores hardcodeados** |  *Cumplido* | Toda la configuración sensible es leída a través de variables de entorno (`env.ts`). |
| **7. Multi-tenant preparado** |  *Cumplido* | La base de datos incluye `school_id` en todas sus tablas principales y el código está parametrizado. |
| **8. Roles respetados** | ❌ *Roto* | El panel expone la vista de `/settings` (Administrador) a operadores debido a hardcoding en el cliente y desactivación de guardias en el servidor. |

---

## 🛠️ Diagnóstico de Seguridad Detallado

### 1. Hardcoding de Roles en `AuthGuard` (Cliente)
En el componente [auth-guard.tsx](file:///c:/Users/giorg/Documents/Naty2.0/apps/dashboard/src/components/auth-guard.tsx#L23-L30), el rol del usuario autenticado se sobrescribe directamente en el estado de React con el valor `'admin'`:

```typescript
supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session) {
    router.replace('/login');
  } else {
    setProfile({
      name: session.user.email?.split('@')[0] ?? 'Usuario',
      role: 'admin', // 🔴 ERROR CRÍTICO: Hardcodeado a admin
    });
  }
  setChecked(true);
});
```

Cualquier operador que se autentique exitosamente a través de Supabase obtendrá capacidades de administrador en la interfaz de usuario.

### 2. Desactivación de Seguridad en el Servidor (`/settings`)
En la página [settings/page.tsx](file:///c:/Users/giorg/Documents/Naty2.0/apps/dashboard/src/app/%28dashboard%29/settings/page.tsx#L1-L4), la validación de rol de administrador del lado del servidor se encuentra completamente comentada:

```typescript
// requireAdmin desactivado temporalmente — auth via AuthGuard (cliente)
// import { requireAdmin } from '@/lib/auth';
```

Por lo tanto, Next.js no valida el rol real del usuario que hace la solicitud para esta página. Dado que la base de datos de usuarios cuenta con roles bien diferenciados (`admin` y `operator`), desactivar esto permite la visualización libre de esta ruta.

### 3. Exposición Completa de la API Express
La API de Express no tiene ningún middleware de validación de tokens de sesión (JWT de Supabase). Los routers como [users-router.ts](file:///c:/Users/giorg/Documents/Naty2.0/apps/api/src/users/users-router.ts) procesan solicitudes CRUD libremente:

```typescript
usersRouter.get('/', async (_req: Request, res: Response) => {
  // Retorna todos los usuarios de la base de datos sin verificar identidad
});
```

Si la API se despliega públicamente en Railway (necesario para recibir Webhooks de WhatsApp), cualquiera con la URL de la API puede listar usuarios, insertar nuevos administradores con contraseñas personalizadas (usando `supabase.auth.admin.createUser`), o mandar mensajes masivos llamando a `/campaigns/:id/send`.

---

## ⚙️ Análisis de Arquitectura y Lógica de Negocio

### 1. Incoherencia en el Motor LLM
El archivo de variables de entorno de la API requiere obligatoriamente `ANTHROPIC_API_KEY`. Al arrancar el servidor localmente o en Railway, si no se provee esta variable, la aplicación falla inmediatamente:

```typescript
// apps/api/src/config/env.ts
ANTHROPIC_API_KEY: requireEnv('ANTHROPIC_API_KEY'),
```

La lógica de negocio describe en la documentación un fallback entre modelos de Gemini (`gemini-2.5-flash` y `gemini-2.0-flash`), pero el archivo `llm.ts` no contiene ningún import de Google Gen AI y su implementación de fallback no existe (solo se conecta con Anthropic).

### 2. Meta Cloud API Incompleto (Webhook Receptor)
La migración técnica a Meta Cloud API requiere la capacidad de parsear la carga útil (`payload`) de Meta en el webhook de entrada. Sin embargo, en [meta-provider.ts](file:///c:/Users/giorg/Documents/Naty2.0/apps/api/src/messaging/meta-provider.ts#L41-L48), el método `parseIncoming` está vacío:

```typescript
parseIncoming(payload: Record<string, string>): IncomingMessage {
  return {
    from: '',
    to: '',
    body: '',
    messageSid: '',
  };
}
```

Además, el webhook GET para la validación de suscripciones de Meta vive dentro del endpoint de Twilio `/webhook/twilio`, pero no hay un endpoint de entrada POST `/webhook/meta` configurado en Express para recibir los mensajes en formato JSON de Meta Graph API.

### 3. Registro Huérfano en Campañas de Envíos Masivos
En [mass-messaging.ts](file:///c:/Users/giorg/Documents/Naty2.0/apps/api/src/campaigns/mass-messaging.ts#L58-L82), la función `recordCampaignMessage` busca una conversación existente para registrar el mensaje saliente. Si no existe una conversación previa con ese contacto, la función simplemente retorna:

```typescript
const { data: conversation } = await supabase
  .from('conversations')
  .select('id')
  .eq('contact_id', contact.id)
  .order('started_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (!conversation) return; // 🔴 Si no hay conversación, no se registra el mensaje.
```

Esto causa que los mensajes de campaña enviados a nuevos contactos importados no dejen registro histórico en la tabla `messages`, haciendo invisible el historial de chat para los operadores del panel.

---

## 📈 Plan de Acción y Mitigaciones Recomendadas

### Prioridad Alta (Inmediata)
1. **Corregir `AuthGuard` y Habilitar `requireAdmin`**:
   - Reemplazar el hardcoding del rol en `AuthGuard` consumiendo el endpoint de la API `/users/me` o trayendo el perfil de Supabase usando el ID de usuario de la sesión.
   - Descomentar y restaurar la validación `requireAdmin` en `settings/page.tsx` para proteger la ruta del lado del servidor.
2. **Proteger la API Express**:
   - Implementar un middleware de autenticación en `apps/api` que valide el token de acceso JWT enviado en la cabecera `Authorization: Bearer <token>` usando Supabase Auth.
   - Modificar `api.ts` del Dashboard para enviar el token JWT de la sesión activa en todas las solicitudes del servidor y cliente.

### Prioridad Media (Siguiente Sprint)
3. **Implementar Gemini y Abstraer LLM**:
   - Integrar el SDK oficial de Google (`@google/genai`) en `llm.ts`.
   - Modificar `env.ts` para que `GEMINI_API_KEY` sea opcional o requerida en lugar de Anthropic, y permitir elegir el proveedor mediante una variable `LLM_PROVIDER=gemini|anthropic`.
   - Respetar la lógica de fallback descrita en `LLM_SETUP.md`.
4. **Completar Integración de Meta Cloud API**:
   - Crear un endpoint dedicado `POST /webhook/meta` en Express.
   - Implementar el parseo de mensajes JSON de Meta en `meta-provider.ts` para extraer el teléfono, el cuerpo del mensaje y el ID del mensaje.

### Prioridad Baja (Mantenimiento)
5. **Corrección de Trazabilidad en Campañas**:
   - Ajustar `recordCampaignMessage` para que, en caso de no existir una conversación, cree una nueva con estado `active` e inserte el mensaje de campaña en ella.
6. **Políticas RLS en Supabase**:
   - Escribir e inyectar las políticas de seguridad de Postgres en Supabase para proteger los datos contra accesos directos desde el cliente anónimo.

---
*Fin del Informe. Diavolo Agency v1.0.*
