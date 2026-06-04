# SDD_SYSTEM.md — Spec-Driven Development

> **Versión 15.1** · Framework universal · Diavolo
> Entregar este documento a Claude Code. Conduce entrevista → genera PROJECT.md → arranca desarrollo.

---

## REGLAS DE ORO — LEER PRIMERO

1. **Director es la única autoridad.** Nada generado simula su autorización.
2. **Sin PROJECT.md confirmado no hay código.**
3. **Agentes se derivan del proyecto, no se predefinen.**
4. **Auditoría antes de ejecución.**
5. **Un sprint, un goal. Sin excepciones.**
6. **Anclaje selectivo obligatorio antes de cada sprint.**
7. **Verificación doble: sprint + acumulativa resumida.**
8. **Verificación independiente: Verificador sin ver el proceso de generación.**
9. **Autorizaciones clasificadas: rutinarias = automático, estratégicas = pausa + Telegram.**
10. **Notificación inmediata en cada pausa. No al final del sprint.**
11. **Sin autorización no hay avance. Sin timeouts.**
12. **PROJECT.md es ley. Conflicto = DETENER y reportar.**
13. **Stack cerrado. Sin dependencias fuera del stack sin autorización.**
14. **Log incremental: INICIO antes, FIN después. Sin excepciones.**
15. **Decisiones técnicas documentadas en cada reporte.**

---

## 1. Protocolo de inicio

```
¿Existe PROJECT.md completo?
  NO → Ejecutar entrevista (sección 2)
  SÍ → Continuar

¿Existen TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID?
  NO → Configurar bot (sección 3)
  SÍ → Arranque del sistema (sección 5)
```

---

## 2. Entrevista guiada

Una pregunta a la vez. Sin jerga. Siempre ofrecer "recomiéndame" con justificación neutral en 2 líneas. No comentar respuestas — registrar y continuar.

**Bloque 1 — Producto**
1. Nombre del proyecto
2. Qué hace (lenguaje simple)
3. Qué problema resuelve
4. Quién lo usa (rol, industria, nivel técnico)
5. Usuarios esperados: inicio y 12 meses

**Bloque 2 — Modelo de negocio**
6. ¿Cómo genera dinero? (suscripción / pago por uso / licencia / freemium / interno)
7. ¿Múltiples clientes o uno solo? → si hay posibilidad de escalar: recomendar multi-tenant

**Consecuencias automáticas:**
```
Múltiples clientes     → Sprint "Multi-tenant y RLS" + Sprint "Alta de cliente"
No estoy seguro        → Sprint "Arquitectura preparada para multi-tenant"
Datos muy sensibles    → Sprint "Auditoría y cumplimiento" + RLS estricta
Regulación (RGPD etc.) → Sprint "Cumplimiento [REGULACIÓN]"
Servicios de pago      → Sprint "Dashboard de costos" + rastreo en notificaciones
Suscripción/pago uso   → Sprint "Billing y suscripciones"
Usuarios > 1000/12m    → Sprint "Pruebas de carga"
Plazo crítico          → Señalar sprints en riesgo en hoja de ruta
```

**Bloque 3 — Stack**
8. Tipo de interfaz (web / móvil / escritorio / API / chatbot)
9. Framework de interfaz (presentar opciones con pros/contras/costo)
10. Base de datos (presentar opciones)
11. Hosting (presentar opciones según framework)
12. Servicios externos (checklist: auth / storage / email / pagos / IA / mapas / SMS / analytics)

**Bloque 4 — Seguridad**
13. Sensibilidad de datos (muy sensible / moderada / baja)
14. Regulación aplicable (RGPD / LFPDPPP / HIPAA / CCPA / ninguna)

**Bloque 5 — Módulos**
15. Partes principales del sistema (en palabras del Director)
16. Integraciones técnicas específicas ya definidas

**Bloque 6 — Convenciones**
17. Idioma de la interfaz
18. Idioma del código (sin preferencia → recomendar inglés para código, español para UI)

**Bloque 7 — Pendientes**
19. Dudas técnicas, de negocio o diseño sin resolver
20. Plazos o restricciones de tiempo

**Al terminar:** generar PROJECT.md → mostrar → "¿Correcto? ¿Algo que ajustar?" → confirmar → arrancar.

---

## 3. Configuración del bot de Telegram

Una sola vez. Antes del Sprint 1.

```
PASO 1 — Crear bot
"Abre Telegram → busca @BotFather → escribe /newbot
 Sigue las instrucciones. Pega el token aquí."
→ Guardar: TELEGRAM_BOT_TOKEN=<token>

PASO 2 — Obtener CHAT_ID
"Escríbele cualquier mensaje a tu bot.
 Abre: https://api.telegram.org/bot<TOKEN>/getUpdates
 Busca: result > message > chat > id. Pégalo aquí."
→ Guardar: TELEGRAM_CHAT_ID=<id>

PASO 3 — Guardar y verificar
→ Guardar en .env.local
→ Verificar que .env.local está en .gitignore
→ Crear lib/notify.js y lib/wait-approval.js (sección 3.1)

PASO 4 — Prueba bidireccional (obligatoria antes de arrancar)
El sistema verifica que puede ENVIAR y RECIBIR antes de iniciar cualquier sprint.

  a) Claude Code envía y espera en un solo comando:
     node lib/notify.js "Prueba de conexion SDD. Responde: si" && node lib/wait-approval.js

  b) Director escribe "si" desde Telegram en su celular
     IMPORTANTE: responder DESPUES de ver el mensaje en Telegram, nunca antes.
     Las palabras de aprobacion son: si / sí / ok / yes / autorizar / autorizado
     "listo" NO es palabra de aprobacion — el script lo interpreta como rechazo.

  Si recibe respuesta (exit 0):
  → "Comunicación bidireccional verificada.
     Puedes autorizar desde Telegram o desde Claude Code.
     Arrancamos con el Sprint 1."
  → Continuar al arranque del sistema

  Si timeout (exit 2 — sin respuesta en 5 minutos):
  → "No recibí respuesta desde Telegram.
     Posibles causas:
     - CHAT_ID incorrecto
     - No escribiste al bot antes de obtener el CHAT_ID
     - Token del bot incorrecto
     - Notificaciones del bot muteadas (revisar config en Telegram)"
  → Volver al PASO 1 y repetir configuración

  Si exit 1 con texto inesperado (falso rechazo):
  → El Director respondio antes de que wait-approval.js arrancara
  → Volver al paso a) y esperar a ver el mensaje en Telegram antes de responder

REGLA: el sistema no arranca hasta que la prueba bidireccional sea exitosa.
```

### 3.1 Scripts de Telegram

**lib/notify.js** — Enviar notificación:
```javascript
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const message = process.argv[2];
if (!message) { console.error('Falta mensaje'); process.exit(1); }
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
if (!token || !chatId) { console.error('Faltan credenciales'); process.exit(1); }
fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: chatId, text: message })
}).then(r => r.json()).then(d => {
  if (d.ok) console.log('Enviado');
  else { console.error('Error:', d.description); process.exit(1); }
}).catch(e => { console.error('Red:', e.message); process.exit(1); });
```

**lib/wait-approval.js** — Esperar autorización por polling:
```javascript
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
if (!token || !chatId) { console.error('Faltan credenciales'); process.exit(2); }

const POLL = 5000;
const TIMEOUT = Number(process.env.SDD_APPROVAL_TIMEOUT) || 4 * 60 * 60 * 1000;
const REMIND = 30 * 60 * 1000;
const APPROVE = ['si', 'sí', 'autorizar', 'autorizado', 'ok', 'yes'];
const fs = require('fs');

// Solo aceptamos mensajes enviados DESPUÉS de que arrancó el script (5s de margen)
const startTime = Math.floor(Date.now() / 1000) - 5;
let lastId = 0, elapsed = 0, lastRemind = 0;

async function initOffset() {
  // Avanzar al último update_id conocido para no leer mensajes anteriores al script
  try {
    const d = await (await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`)).json();
    if (d.ok && d.result.length) lastId = d.result[d.result.length - 1].update_id + 1;
  } catch {}
}
async function sendMsg(text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  }).catch(() => {});
}
async function poll() {
  try {
    const d = await (await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastId}&timeout=4`)).json();
    if (!d.ok) return null;
    for (const u of d.result) {
      lastId = u.update_id + 1;
      const msg = u.message;
      if (!msg || String(msg.chat.id) !== String(chatId)) continue;
      if (msg.date < startTime) continue; // ignorar mensajes anteriores al arranque
      const text = (msg.text || '').toLowerCase().trim();
      if (APPROVE.some(w => text.startsWith(w))) { console.log('Autorizado'); return 'approved'; }
      const comment = msg.text.replace(/^(no|rechazar|rechazado)\s*/i, '').trim();
      fs.mkdirSync('sdd', { recursive: true });
      fs.writeFileSync('sdd/.rejection_comment', comment || msg.text);
      console.log('Rechazado:', msg.text);
      return 'rejected';
    }
  } catch {}
  return null;
}
async function main() {
  await initOffset();
  console.log('Esperando autorizacion via Telegram...');
  let exitCode = 2;
  while (elapsed < TIMEOUT) {
    await new Promise(r => setTimeout(r, POLL));
    elapsed += POLL;
    if (elapsed - lastRemind >= REMIND) {
      lastRemind = elapsed;
      await sendMsg(`Esperando tu autorizacion para continuar con ${process.env.SDD_PROJECT || 'el proyecto'}.`);
    }
    const r = await poll();
    if (r === 'approved') { exitCode = 0; break; }
    if (r === 'rejected') { exitCode = 1; break; }
    console.log(`Esperando... ${Math.round(elapsed / 60000)} min`);
  }
  if (exitCode === 2) await sendMsg('4 horas sin respuesta. Sistema pausado.');
  // Salida limpia en Windows — evita assertion error de libuv
  setTimeout(() => process.exit(exitCode), 100);
}
main();
```

**Invocar en cada pausa — notify y wait-approval SIEMPRE en un solo comando `&&`:**
```bash
node lib/notify.js "mensaje" && node lib/wait-approval.js
# exit 0 = autorizado | exit 1 = rechazado (ver sdd/.rejection_comment) | exit 2 = timeout
```

**Reglas de invocación:**
- Los scripts cargan `.env.local` internamente vía dotenv — no se necesita prefijo de entorno.
- Usar `&&` para encadenar notify y wait-approval en un solo Bash: el offset se captura justo después de enviar el mensaje, antes de que el Director responda.
- Nunca llamar `notify.js` sin `wait-approval.js` inmediatamente después — enviar sin escuchar es un bug.
- El Director debe responder DESPUÉS de ver el mensaje en Telegram. El script ignora mensajes enviados antes de que arrancara.
- PALABRAS DE APROBACION: si / sí / ok / yes / autorizar / autorizado. Cualquier otra palabra (incluyendo "listo") se interpreta como rechazo.
- TIMING CRITICO: si el Director responde en Telegram antes de que wait-approval.js arranque, el mensaje tiene timestamp anterior a startTime y es ignorado. Resultado: falso timeout o falso rechazo. Solución: el Director espera a ver el mensaje antes de responder.
- FALSO POSITIVO: si el Director envió "si" en Telegram fuera de una sesión de wait-approval, ese mensaje puede ser capturado por el siguiente wait-approval si su timestamp cae dentro de la ventana de -5 segundos. No es un error grave, pero confirmar siempre que la autorización corresponde al mensaje correcto.
- En Windows Node.js puede emitir `Assertion failed: UV_HANDLE_CLOSING` al salir. Es cosmético — el exit code real (0/1/2) ya fue procesado. No indica fallo.
- NO usar `parse_mode` en los mensajes de Telegram. Caracteres como `—`, `(`, `)`, `.` rompen el parser de Markdown. Enviar siempre texto plano.
- Para que wait-approval corra sin pedir permiso al Director, el proyecto debe tener `.claude/settings.json` con los permisos allow correspondientes (ver sección 3.2).

### 3.2 Permisos Claude Code — .claude/settings.json

Crear una sola vez al arrancar el proyecto. Sin esto, cada ejecución de node pedirá aprobación manual.

```json
{
  "permissions": {
    "allow": [
      "Bash(node lib/notify.js*)",
      "Bash(node lib/wait-approval.js*)",
      "Bash(node lib/request-permission.js*)",
      "Bash(npm test*)",
      "Bash(npm run*)",
      "Bash(npm install*)",
      "Bash(npx*)",
      "Bash(pnpm*)",
      "Bash(node*)",
      "Bash(git status*)",
      "Bash(git log*)",
      "Bash(git diff*)",
      "Bash(git add*)",
      "Bash(git commit*)",
      "PowerShell(pnpm*)",
      "PowerShell(npm*)",
      "PowerShell(npx*)",
      "PowerShell(node*)",
      "PowerShell(git status*)",
      "PowerShell(git log*)",
      "PowerShell(git diff*)",
      "PowerShell(git add*)",
      "PowerShell(git commit*)"
    ]
  }
}
```

Este archivo va en `.claude/settings.json` (raíz del proyecto). No en `.gitignore` — es configuración del equipo.

**Por qué pre-aprobar comandos de desarrollo:**
En la extensión de VS Code, el hook `PermissionRequest` y el diálogo de VS Code se muestran simultáneamente. Cuando el Director responde "si" en Telegram, VS Code ya está mostrando su propio diálogo de aprobación y no recibe la respuesta del hook. Resultado: el Director aprueba en Telegram pero VS Code sigue bloqueado.

**Regla práctica:**
- Comandos de desarrollo conocidos y seguros (`npm test`, `npm run`, `node`, `git add/commit/log`) → pre-aprobar en la lista `allow`. Nunca van a Telegram.
- Operaciones sensibles o irreversibles (`git push`, `rm`, operaciones de DB, deploys) → no poner en la lista. Van al hook de Telegram donde el Director decide.

Esto garantiza que el flujo de Telegram solo se activa para decisiones que realmente requieren autorización explícita.

### 3.3 Hook PermissionRequest — autorizar desde Telegram

Cuando Claude Code necesita permiso para ejecutar cualquier herramienta, el hook envía una notificación a Telegram y espera la respuesta del Director. Sin necesidad de aprobar nada en Claude Code.

Script requerido: `lib/request-permission.js` — lee stdin con los detalles del permiso, notifica Telegram, hace polling cada 5 s, devuelve JSON con la decisión. Carga `.env.local` manualmente (sin dotenvx) para garantizar stdout limpio. Si las credenciales faltan, devuelve `"ask"` para que Claude Code muestre el prompt normal.

**lib/request-permission.js:**
```javascript
// Carga manual de .env.local — sin dotenvx para no contaminar stdout con su output
// El hook necesita JSON puro en stdout; cualquier texto extra lo corrompe
const fs = require('fs');
const path = require('path');
try {
  const lines = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch {}

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
if (!token || !chatId) { outputDecision('ask'); process.exit(0); }

const POLL = 5000;
const TIMEOUT = 4 * 60 * 60 * 1000;
const APPROVE = ['si', 'sí', 'autorizar', 'autorizado', 'ok', 'yes'];
const startTime = Math.floor(Date.now() / 1000) - 5;
let lastId = 0;

async function sendMsg(text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  }).catch(() => {});
}

async function initOffset() {
  try {
    const d = await (await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`)).json();
    if (d.ok && d.result.length) lastId = d.result[d.result.length - 1].update_id + 1;
  } catch {}
}

async function poll() {
  try {
    const d = await (await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastId}&timeout=4`)).json();
    if (!d.ok) return null;
    for (const u of d.result) {
      lastId = u.update_id + 1;
      const msg = u.message;
      if (!msg || String(msg.chat.id) !== String(chatId)) continue;
      if (msg.date < startTime) continue;
      const text = (msg.text || '').toLowerCase().trim();
      if (APPROVE.some(w => text.startsWith(w))) return 'approved';
      return 'rejected';
    }
  } catch {}
  return null;
}

function outputDecision(decision) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PermissionRequest',
      permissionDecision: decision
    }
  }));
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    // Timeout defensivo: si stdin no cierra en 2s, continuar con lo recibido
    const timer = setTimeout(() => resolve(data), 2000);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
      try { JSON.parse(data); clearTimeout(timer); resolve(data); } catch {}
    });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(data); });
    process.stdin.resume();
  });
}

async function main() {
  const input = await readStdin();

  let toolName = 'herramienta desconocida';
  let detail = '';
  try {
    const data = JSON.parse(input);
    toolName = data.tool_name || toolName;
    detail = data.tool_input?.command || data.tool_input?.file_path || JSON.stringify(data.tool_input || {}).slice(0, 120);
  } catch {}

  await initOffset();
  const proyecto = process.env.SDD_PROJECT || 'SDD';
  await sendMsg(`${proyecto} - Permiso requerido\n\nHerramienta: ${toolName}\nDetalle: ${detail}\n\nResponde si para autorizar o no para rechazar.`);

  let elapsed = 0;
  while (elapsed < TIMEOUT) {
    await new Promise(r => setTimeout(r, POLL));
    elapsed += POLL;
    const r = await poll();
    if (r === 'approved') { outputDecision('allow'); setTimeout(() => process.exit(0), 100); return; }
    if (r === 'rejected') { outputDecision('deny'); setTimeout(() => process.exit(0), 100); return; }
  }

  outputDecision('ask');
  setTimeout(() => process.exit(0), 100);
}

main();
```

**Reglas críticas del hook:**
- El hook escribe JSON puro a stdout — cualquier otro output (dotenvx, console.log) rompe la respuesta.
- Carga `.env.local` con parsing manual (regex), no con dotenvx, para evitar el output de dotenvx.
- `readStdin()` tiene timeout defensivo de 2 s para el caso en que Claude Code no cierre stdin.
- Respeta el mismo filtro `startTime` que `wait-approval.js` para ignorar mensajes anteriores.

Configuración en `.claude/settings.json`:
```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node lib/request-permission.js",
            "timeout": 14400,
            "shell": "powershell"
          }
        ]
      }
    ]
  }
}
```

**Nota Windows:** `"shell": "powershell"` es obligatorio en Windows sin Git Bash — asegura que el hook corra en el shell correcto.

**IMPORTANTE — recarga de configuración:** El hook solo se activa si `.claude/settings.json` existía cuando se inició la sesión de Claude Code. Si se creó o modificó durante la sesión, es necesario **reiniciar Claude Code** para que el hook tome efecto.

Si el hook no puede ejecutarse (Telegram no configurado), devuelve `"ask"` para que Claude Code muestre el prompt normal.

---

## 4. PROJECT.md — Secciones mínimas obligatorias

Si falta alguna → DETENER y notificar al Director qué completar.

```
OBLIGATORIAS (bloquean el arranque):
□ Descripción del producto
□ Objetivos del sistema
□ Stack tecnológico
□ Principios no negociables
□ Fases o módulos del desarrollo
□ Convenciones de código

RECOMENDADAS (no bloquean):
○ Servicios externos
○ Modelo de datos
○ Decisiones ya tomadas
○ Estimación de tiempos
```

---

## 5. Flujo completo

```
FASE 0A — ENTREVISTA (si no existe PROJECT.md)
  → Entrevista → PROJECT.md → Director confirma

FASE 0B — ARRANQUE
  → Analizar PROJECT.md
  → Derivar sprints + agentes + decisiones pendientes
  → Auditor de Plan revisa factibilidad
  → Informe de arranque → Telegram → PAUSA

FASE 0C — CONFIGURACIÓN BOT (si no está activo)
  → Guiar creación bot → credenciales → prueba → confirmar

FASE 1..N — SPRINTS
  Para cada sprint:
  0. ANCLAJE SELECTIVO (ver sección 6)
  1. Generador: PLANIFICAR → TESTS → CÓDIGO → REVISIÓN PROPIA
  2. Verificador: sprint + acumulativa resumida
  3. Si FAIL → iterar (máx 3) → si sigue: notificar Director
  4. Reporte + notify.js → wait-approval.js (PAUSA BLOQUEANTE — no continuar hasta recibir respuesta)
  5a. AUTORIZAR → siguiente sprint (vuelve a paso 0)
  5b. RECHAZAR → Generador itera con comentario

FASE FINAL
  → Verificación acumulativa final
  → Reporte de cierre → Telegram → PAUSA → Entrega
```

---

## 6. Anclaje selectivo — paso 0 de cada sprint

**Por qué selectivo:** releer el documento completo en cada sprint consume tokens innecesarios. El anclaje selectivo lee solo lo esencial para el sprint activo.

### Qué leer en cada anclaje

```
SIEMPRE (obligatorio):
→ Sección "REGLAS DE ORO" de SDD_SYSTEM.md
→ Sección "Principios no negociables" de PROJECT.md
→ Sección "Convenciones" de PROJECT.md
→ SDD_STATE.json completo
→ Último RESUMEN_ACUMULATIVO de SDD_LOG.json (no el log completo)

SOLO PARA ESTE SPRINT:
→ Definición completa del sprint activo (goal, scope, fuera de scope, criterios)
→ sdd/agents/[agente-del-sprint-activo].md — definición completa del agente
→ Sprint(s) del que depende (solo su entregable, no su código)
```

Si el archivo del agente no existe en sdd/agents/:
→ DETENER. El agente no fue persistido correctamente.
→ Re-derivar desde PROJECT.md, escribir el archivo y continuar.

### Confirmación obligatoria antes de escribir código

```
ANCLAJE — Sprint [ID]
─────────────────────────────────────────
Goal:          [una oración exacta]
Agente:        [nombre]
Depende de:    [sprint o "ninguno"]
Scope:         [lista]
Fuera de scope:[lista]
─────────────────────────────────────────
```

Si no puede confirmar los 5 puntos → DETENER y notificar.

### Mini-anclaje cada 10 acciones

```
→ Releer scope y fuera de scope del sprint activo
→ Confirmar: "Siguiente acción: [X]. Dentro del scope: SÍ/NO"
→ Si NO: DETENER y reportar
```

### Filtrado de contexto — señales de saturación

```
SEÑALES:
□ Repite información ya mencionada
□ Olvida instrucciones recientes
□ Outputs de herramientas truncados

AL DETECTAR:
1. DETENER
2. Releer REGLAS DE ORO + sprint activo
3. Reconstruir desde SDD_LOG.json
4. Resumir estado compacto:
   Goal | Completado | En progreso | Pendiente | Última decisión
5. Continuar desde el estado compacto
```

---

## 7. Protocolo del Agente Generador

Orden estricto. Sin saltarse pasos.

```
PASO 1 — PLANIFICAR
  → Lista de archivos a crear/modificar
  → Lista de funciones/componentes
  → Dependencias entre ellos
  → Puntos de fallo o ambigüedad detectados
  → Confirmación de scope
  Si hay ambigüedad → DETENER. Reportar. No asumir.

PASO 2 — TESTS PRIMERO (TDD)
  → Un test por criterio de aceptación
  → Tests deben fallar (código aún no existe)
  → Si pasan antes del código: los tests están mal

PASO 3 — CÓDIGO
  → Archivo por archivo según el plan
  → Log INICIO antes → Log FIN después
  → Ejecutar tests al terminar cada archivo
  → Si test falla: corregir antes de continuar
  → Sin avanzar con tests en rojo

PASO 4 — REVISIÓN PROPIA
  □ Todos los tests pasan
  □ Convenciones de PROJECT.md respetadas
  □ Sin valores hardcodeados
  □ Sin dependencias fuera del stack
  □ Scope no invadido
  □ Decisiones técnicas documentadas
  Si algo falla → corregir antes de pasar al Verificador
```

---

## 8. Derivación de sprints

```
Reglas:
- Un sprint = una unidad verificable independiente
- Un goal exacto por sprint
- Dependencias declaradas explícitamente
- Sin mezcla de módulos
- Si no puede verificarse en una sesión: dividir
```

```markdown
## Sprint [FASE]-[N]: [Nombre]
**Goal:** [una oración]
**Módulo:** [componente]
**Agente:** [nombre]
**Depende de:** [ID o "ninguno"]

### Scope
- [ ] [qué se crea o modifica]

### Criterios de aceptación
- [ ] [criterio verificable]

### Fuera de scope
- [lista explícita]

### Entregable
[qué existe al terminar]
```

---

## 9. Derivación y persistencia de agentes

El Orquestador construye el catálogo desde PROJECT.md y lo escribe en disco.
Los agentes no viven solo en el contexto de la sesión — persisten entre sesiones.

### 9.1 Proceso de derivación

```
1. Identificar módulos y capas del sistema desde PROJECT.md
2. Agrupar responsabilidades afines
3. Un agente por grupo coherente
4. Nombrar según función real en el proyecto
5. Definir scope, restricciones y criterios de verificación
6. Escribir cada agente en sdd/agents/[nombre-agente].md
7. Registrar en sdd/agents/INDEX.md
```

Un agente existe cuando sus responsabilidades:
- Requieren conocimiento especializado distinto al de otros agentes
- Operan sobre un subconjunto acotado del sistema
- Pueden verificarse de forma independiente

### 9.2 Formato de definición de agente

```markdown
## Agente: [NOMBRE]

**Responsabilidad:** [qué construye y mantiene]
**Scope:** [archivos, carpetas y módulos que puede tocar]
**Restricciones:** [qué no puede tocar ni decidir bajo ninguna circunstancia]
**Stack:** [tecnologías y librerías que usa]
**Criterios de verificación:** [qué valida el Verificador específicamente para este agente]
**Sprints asignados:** [lista de sprints donde actúa]
**Proyectos:** [proyectos donde se ha usado este agente]
```

### 9.3 Cómo se cargan los agentes en cada sprint

El anclaje selectivo carga el agente desde su archivo, no lo re-deriva:

```
Anclaje del sprint activo:
→ Leer sdd/agents/[agente-del-sprint-activo].md
→ Confirmar que el scope del agente es consistente con el scope del sprint
→ Si hay inconsistencia: DETENER y notificar al Director
→ Pasar la definición completa del agente al Generador como contexto
```

Esto garantiza que el agente tiene exactamente el mismo scope y restricciones
en todas las sesiones, independientemente de cuándo se ejecute el sprint.

### 9.4 Reutilización entre proyectos

Al arrancar un proyecto nuevo, el Orquestador revisa `sdd/agents/INDEX.md`:

```
1. Leer INDEX.md
2. Identificar agentes de proyectos anteriores que apliquen al proyecto actual
3. Incluir en el informe de arranque:
   "Agentes reutilizables disponibles:
    - [Agente A]: [responsabilidad] — usado en [proyecto]
    - [Agente B]: [responsabilidad] — usado en [proyecto]
    ¿Incorporar alguno al plan?"
4. Si el Director confirma: copiar el archivo del agente a sdd/agents/
   y ajustar scope y stack si el proyecto lo requiere
```

### 9.5 INDEX.md de agentes

```markdown
# Agentes disponibles — Diavolo

| Agente | Responsabilidad | Stack | Proyecto origen |
|--------|----------------|-------|-----------------|
| [nombre] | [desc breve] | [stack] | [proyecto] |
```

### 9.6 Estructura de carpetas

```
sdd/
├── SDD_STATE.json
├── SDD_LOG.json
├── .rejection_comment
├── agents/
│   ├── INDEX.md
│   └── [nombre-agente].md
└── skills/
    ├── INDEX.md
    └── [nombre-skill].md
```

---

## 10. Agente Auditor de Plan

Se activa una sola vez. Antes del primer sprint.

```
FACTIBILIDAD
□ Stack suficiente para los objetivos
□ Servicios externos accesibles y compatibles

COHERENCIA
□ Sprints cubren todos los módulos
□ Dependencias correctamente declaradas
□ Orden lógico sin bloqueos

COMPLETITUD
□ Principios no negociables cubiertos
□ Criterios de aceptación verificables objetivamente

RIESGOS
□ Dependencias críticas identificadas
□ Sprints de alta complejidad señalados
□ Cuellos de botella de integración identificados
```

Dictamen:
```
VIABLE | VIABLE_CON_OBSERVACIONES | NO_VIABLE
+ checklist + observaciones + riesgos + recomendación
```

---

## 11. Agente Verificador

### Verificación de sprint

```
□ Convenciones de PROJECT.md respetadas
□ Sin valores hardcodeados
□ Variables de entorno accedidas correctamente
□ Sin dependencias fuera del stack
□ Estructura de carpetas correcta
□ Principios de seguridad respetados
□ Scope no invadido
□ [Cada criterio de aceptación del sprint]
```

### Verificación acumulativa resumida

**Para reducir tokens:** el Verificador NO relee el código de todos los sprints anteriores.
Lee el **resumen acumulativo** del sprint anterior (guardado en SDD_LOG.json) y lo
actualiza con el sprint actual.

```
INTEGRACIÓN
□ Interfaces entre módulos consistentes
□ Sin duplicación de lógica
□ Sin deuda técnica bloqueante
□ Sin desviaciones del plan

CUELLOS DE BOTELLA
□ Dependencias que bloqueen sprints próximos
□ Inconsistencias que crecerán si no se corrigen
```

### Resumen acumulativo en SDD_LOG.json

Al terminar cada verificación, el Verificador escribe un resumen compacto:

```json
{
  "tipo": "RESUMEN_ACUMULATIVO",
  "sprint": "[FASE]-[N]",
  "timestamp": "[ISO]",
  "modulos_completados": ["lista"],
  "interfaces_activas": ["lista de contratos entre módulos"],
  "deuda_tecnica": ["lista o vacío"],
  "cuellos_de_botella": ["lista o vacío"],
  "estado_general": "SALUDABLE | CON_WARNINGS | CRITICO"
}
```

El siguiente sprint usa este resumen en lugar de releer todo el código anterior.

### Formato del reporte

```
Sprint [FASE]-[N]: PASS | FAIL | PASS_CON_WARNINGS
Acumulativo:       PASS | FAIL | PASS_CON_WARNINGS

Archivos: [lista]
Sprint:   [✅/❌ por criterio]
Acum.:    [✅/❌ integración, interfaces, deuda, desviaciones]

Issues: [descripción con archivo y línea]
Cuellos de botella: [lista]
Decisiones tomadas: [lista]
Recomendación: APROBAR | ITERAR
```

---

## 12. Clasificación de autorizaciones

### Rutinarias — ejecución automática

```
□ Abrir terminal / PowerShell / bash
□ Crear carpetas definidas en PROJECT.md
□ Instalar dependencias del stack aprobado
□ Ejecutar comandos estándar del framework
□ Crear archivos dentro del scope del sprint
□ Variables de entorno de PROJECT.md
□ Migraciones del sprint activo
□ Reiniciar servidor de desarrollo
□ Commits con el formato de PROJECT.md
```

Regla: dentro del scope + tecnología aprobada → ejecutar sin preguntar. Registrar en log.

### Estratégicas — pausa + Telegram inmediato

```
□ Elegir entre modelos o proveedores de IA
□ Librería fuera del stack de PROJECT.md
□ Cambiar proveedor de un servicio
□ Modificar arquitectura o estructura de carpetas
□ Decisión que afecta más de un sprint futuro
□ Ambigüedad que PROJECT.md no cubre
□ Enfoque planificado no viable técnicamente
□ Acción irreversible fuera del scope
```

Regla: afecta plan / stack / arquitectura / sprints futuros → pausa + Telegram ahora.

### Notificación de decisión estratégica

```
🔀 *[PROYECTO] — Decisión requerida*
Sprint: [ID] | Punto: [dónde está]

Decisión: [descripción]

A) [opción] ✅ [ventaja] ⚠️ [desventaja] 💰 [costo]
B) [opción] ✅ [ventaja] ⚠️ [desventaja] 💰 [costo]

Recomendación: [X] — [justificación en una línea]
Sistema pausado. Responde con la letra de tu elección.
```

### Mientras espera respuesta

```
→ NO continuar con el sprint activo
→ SÍ continuar con tareas independientes (si las hay)
→ Si bloqueado: log "BLOQUEADO: [descripción]"
→ Revisar Telegram cada 30 segundos (POLL = 30 s)
→ Recordatorio a Telegram cada 30 minutos sin respuesta
→ Timeout tras 4 horas sin respuesta → log + notificar Director
→ Al recibir respuesta: confirmar y continuar inmediatamente
```

---

## 13. Autorización del Director — canal dual

El primero en responder desbloquea el sistema.

### Canal 1 — Telegram (remoto)

Notifica en tiempo real en cada pausa — no solo al final del sprint.
Secuencia obligatoria: ejecutar notify.js → ejecutar wait-approval.js inmediatamente. Nunca separar los dos pasos.

```
🏗️ *[PROYECTO] — Sprint [FASE]-[N] completado*
Goal: [goal]
Sprint: ✅/⚠️/❌ | Acumulativo: ✅/⚠️/❌
Archivos: [N] | Completados: [N]/[Total]

Resumen: [2-3 líneas]
[⚠️ warnings si aplica]
[💰 costo si aplica]

¿Autorizas continuar al Sprint [N+1]?
```

### Canal 2 — Claude Code directo (local)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [PROYECTO] — Sprint [FASE]-[N]
  Goal: [goal]
  Sprint: ✅/⚠️/❌ | Acum: ✅/⚠️/❌
  [warnings si aplica]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ¿Autorizas? (si / no + comentario):
```

| Respuesta | Efecto |
|-----------|--------|
| `si` / `autorizar` / `✅` | Avanza al siguiente sprint |
| `no` / `rechazar` / `❌` | Solicita comentario, itera |
| Texto libre | Rechazo con instrucción, itera |

Si hay contradicción entre canales: **prevalece el rechazo.**
Si autoriza desde Claude Code: Telegram recibe confirmación automática.

---

## 14. Manejo de fallos

**Fallo verificación sprint:**
1. Verificador emite FAIL con issues específicos
2. Generador corrige → Verificador revisa → máx 3 intentos
3. Si sigue en FAIL: pausa + Telegram al Director

**Fallo acumulativo:**
1. Identificar cuello de botella y sprints afectados
2. Notificar Director con diagnóstico antes de actuar
3. Director autoriza enfoque → corregir → continuar

**Rechazo del Director:**
1. Pasar comentario al Generador como instrucción
2. Generador itera → Verificador valida → nueva notificación

**Ambigüedad detectada:**
1. DETENER inmediatamente
2. Reportar qué decisión se necesita y por qué
3. Notificar Director por Telegram → esperar → continuar
4. Nunca resolver conflicto con PROJECT.md por cuenta propia

---

## 15. Protocolo de rollback

```
TIPO A — Corrección local (no afecta interfaces):
→ Sprint de corrección sobre el módulo. Sin revertir anteriores.

TIPO B — Conflicto de integración (afecta interfaces):
→ Identificar sprints afectados → notificar Director → esperar autorización
→ Director decide: corrección puntual o reversión de sprint

TIPO C — Fallo estructural (invalida arquitectura):
→ DETENER completamente
→ Notificar Director con reporte detallado
→ Sin propuesta automática. Director decide el camino.
```

Notificación:
```
🔴 *[PROYECTO] — Problema en verificación acumulativa*
Tipo: A | B | C
Sprints afectados: [lista]
Descripción: [diagnóstico]

[A/B:] Propuesta: Sprint [ID]C. ¿Autorizas?
[C:] Sistema detenido. Se requiere tu instrucción.
```

Sprint de corrección:
```markdown
## Sprint [FASE]-[N]C: Corrección — [Módulo]
Tipo: Corrección | Problema: [desc] | Sprints afectados: [lista]
Criterios: issue original resuelto + acumulativa PASS sin warnings
```

---

## 16. Reanudación entre sesiones

**Al iniciar cualquier sesión nueva:**

```
PASO 1 — ANCLAJE MÍNIMO
→ Leer REGLAS DE ORO de SDD_SYSTEM.md
→ Leer PROJECT.md (solo principios + convenciones)
→ Sin estos: DETENER y solicitarlos

PASO 2 — ESTADO
→ Leer SDD_STATE.json
→ Si no existe: arranque nuevo → entrevista (sección 2)

PASO 3 — LOG
→ Leer último RESUMEN_ACUMULATIVO de SDD_LOG.json
→ Si hay sprint en curso: leer entradas del sprint activo
→ El log tiene prioridad sobre SDD_STATE.json

PASO 4 — DIAGNÓSTICO
  Primera acción siempre: notificar a Telegram que la sesión está activa.

  pendiente_autorizacion = true
  → node lib/notify.js "Sesion reanudada. Sprint [N] completado y verificado. Pendiente tu autorizacion. Si para continuar, no para reiniciar."
  → node lib/wait-approval.js
  → Esperar

  sprint_estado = "en_curso" con log incompleto
  → Reconstruir desde log que se completo y que no
  → node lib/notify.js "Sesion cortada durante Sprint [N]. Completado: [X]. Incompleto: [Y]. Pendiente: [Z]. Continuo desde aqui o reinicio el sprint?"
  → node lib/wait-approval.js
  → Esperar instruccion

  Todos completados y autorizados
  → node lib/notify.js "Sesion reanudada. Proximo sprint: [FASE]-[N] — [Goal]. Autoriza iniciar?"
  → node lib/wait-approval.js
  → Esperar

PASO 5 — CONTINUAR
→ Sprint nuevo: anclaje selectivo (sección 6)
→ Continuación: retomar desde último punto del log
```

---

## 17. Sistema de log incremental — SDD_LOG.json

```
Regla: LOG "INICIO" antes de cada acción + LOG "FIN" después.
INICIO sin FIN = acción incompleta cuando se cortó la sesión.
```

```json
{
  "timestamp": "[ISO]",
  "sesion": "[N]",
  "sprint": "[FASE]-[N]",
  "tipo": "INICIO | FIN | DECISION | ERROR | AUTORIZACION | RESUMEN_ACUMULATIVO",
  "accion": "[descripción]",
  "detalle": "[archivo, función o decisión]"
}
```

Qué se loguea:
```
□ INICIO y FIN de cada archivo creado o modificado
□ INICIO y FIN de cada función o componente
□ Cada decisión técnica (DECISION)
□ Resultados de verificación (FIN con PASS/FAIL)
□ Autorizaciones del Director (AUTORIZACION)
□ Errores y bloqueos (ERROR)
□ Resumen acumulativo tras cada verificación (RESUMEN_ACUMULATIVO)
```

Archivos operativos — en `.gitignore`:
```
sdd/
├── SDD_STATE.json         ← estado actual
├── SDD_LOG.json           ← historial + resúmenes acumulativos
├── .rejection_comment     ← comentario del Director al rechazar
├── agents/
│   ├── INDEX.md
│   └── [nombre-agente].md
└── skills/
    ├── INDEX.md
    └── [nombre-skill].md

lib/
├── notify.js              ← enviar notificacion a Telegram
├── wait-approval.js       ← esperar autorizacion por polling
└── request-permission.js  ← hook PermissionRequest para VS Code
```

### SDD_STATE.json

```json
{
  "sdd_version": "15.2",
  "proyecto": "[NOMBRE]",
  "agentes_derivados": [],
  "agentes_path": "sdd/agents/",
  "sprints_totales": 0,
  "sprint_activo": null,
  "sprint_estado": "pendiente | en_curso | verificacion | esperando_autorizacion | completado",
  "sesion_actual": 0,
  "sprints_completados": [],
  "decisiones_pendientes": [],
  "ultimo_autorizado_por": null,
  "ultima_autorizacion": null,
  "iteraciones_sprint_activo": 0,
  "pendiente_autorizacion": false,
  "cuellos_de_botella_activos": [],
  "costo_estimado_total": 0,
  "costo_acumulado": 0,
  "ultima_actualizacion": "[ISO]"
}
```

---

## 18. Estimación de costos operativos

Solo cuando el proyecto usa servicios de pago.

```
Rastrear: Replicate / OpenAI / Claude API / Stripe / Twilio / Resend / Mapbox / AWS
```

Alerta si costo acumulado > 80% del estimado:
```
⚠️ *[PROYECTO] — Alerta de presupuesto*
Acumulado: ~[X] € (>[80%] de ~[X] € estimado)
Sprints restantes: [N]

a) Continuar con el plan actual
b) Revisar sprints para reducir llamadas externas
c) Ajustar el presupuesto estimado
```

---

## 19. Biblioteca de skills reutilizables

Una skill es un patrón probado que resolvió un problema específico y puede
aplicarse en proyectos futuros.

```markdown
## Skill: [NOMBRE]
Problema: [desc] | Proyecto origen: [nombre] | Stack: [tecnologías]
Implementación: [cómo funciona]
Cuándo usar: [criterios] | Cuándo no usar: [criterios]
```

**Crear skill:**
```
Al terminar sprint evaluar:
□ ¿Resolvió algo no trivial?
□ ¿Aplicable en otros proyectos?
□ ¿Ahorraría tiempo documentado?
→ Si las tres son sí: crear skill en sdd/skills/[nombre].md + registrar en INDEX.md
```

**Aplicar skill:**
```
Al arrancar proyecto → leer sdd/skills/INDEX.md
→ Identificar skills aplicables
→ Incluir en informe de arranque:
  "Skills disponibles: [lista con problema que resuelven]
   ¿Incorporar alguna al plan?"
```

**INDEX.md:**
```markdown
| Skill | Problema | Stack | Proyecto origen |
|-------|----------|-------|-----------------|
```

---

## 20. Log de cambios al PROJECT.md

```
Cuándo actualizar:
- Director autoriza decisión no contemplada en el plan
- Director rechaza un enfoque y aprueba otro
- Agente detecta que una decisión no es viable y Director aprueba cambio
- Se confirman decisiones tentativas al cerrar una fase

Protocolo:
1. Detectar que decisión modifica el plan
2. Notificar: "Sprint [N] modifica el plan: [desc]. ¿Confirmas actualizar PROJECT.md?"
3. Director confirma → actualizar + agregar al log

Log en PROJECT.md:
| Fecha | Sprint | Cambio | Motivo | Autorizado por |
```

PROJECT.md siempre refleja el estado actual. El log es el registro histórico.

---

## 21. Informe de arranque

```
🗺️ *[PROYECTO] — Hoja de ruta lista*

Sprints: [N] en [M] fases
Agentes: [lista]
Duración estimada: [rango]
Auditoría: ✅ VIABLE | ⚠️ CON OBSERVACIONES | ❌ NO VIABLE

[Si hay observaciones:] ⚠️ [lista]
[Si hay decisiones pendientes:] 🔀 [opciones + recomendación]
[Si hay consecuencias de entrevista:] 📋 Sprints agregados: [lista]

¿Autorizas iniciar?
```

---

*Fin — SDD_SYSTEM.md v15.3 — Diavolo — Junio 2026*
*v15.1: Scripts cargan .env.local internamente. notify/wait-approval usan dotenvx; request-permission usa parsing manual para stdout limpio. Invocación simplificada. wait-approval: filtro startTime, poll 5s, salida limpia Windows. request-permission: readStdin con timeout defensivo, shell:powershell en hook. IMPORTANTE: reiniciar Claude Code tras crear/modificar settings.json.*
*v15.2: Allow list extendida en settings.json — comandos de desarrollo seguros pre-aprobados (npm test, npm run, node, git add/commit/log/diff/status). Razón: en VS Code extension el hook PermissionRequest y el diálogo de VS Code se muestran simultáneamente; la respuesta de Telegram no llega a VS Code. Solución: pre-aprobar comandos rutinarios, reservar Telegram para operaciones sensibles/irreversibles.*
*v15.3: Correcciones de setup descubiertas en proyecto Naty (sesion 1). (1) Palabras de aprobacion documentadas explicitamente: si/sí/ok/yes/autorizar/autorizado. "listo" es rechazo. (2) Timing critico documentado: Director debe responder DESPUES de ver el mensaje — startTime filtra mensajes anteriores al arranque del script. (3) Falso positivo documentado: "si" enviado fuera de sesion puede capturarse en siguiente wait-approval. (4) Prueba bidireccional actualizada para usar "si" en lugar de "listo". (5) Causas de notificaciones faltantes agregadas (bot muteado).*
*Uso: este documento → Claude Code → entrevista → PROJECT.md → desarrollo*
