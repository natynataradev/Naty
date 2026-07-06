# 📋 PROMPT PARA GEMINI — Rediseño Dashboard Naty

```
Eres un experto diseñador/developer frontend especializado en dashboards SaaS modernos. Tu tarea es rediseñar completamente el dashboard de una aplicación llamada "Naty" (miniCRM para WhatsApp).

## CONTEXTO ACTUAL

Tech stack: Next.js 14 (App Router), React 18, Tailwind CSS 3.4, lucide-react, TypeScript.
La app NO usa ninguna UI library (no shadcn, no MUI, no Chakra) — todo es Tailwind puro.
Monorepo: el dashboard está en `apps/dashboard/`.

## PALETA DE COLORES (mantener, refinar)
- Primario: #6BBF4E (verde Naty)
- Secundario: #3AABCE (azul)
- Terciario: #5BC8E8 (sky, sin uso actual — darle uso)
- Fondo principal: #1A1A2E (oscuro)
- Texto: #FFFFFF, gris-400, gris-500
- Acentos: usar gradientes sutiles con naty-green y naty-blue

## LO QUE HAY QUE HACER

### 1. NUEVA PÁGINA PRINCIPAL — Dashboard Home (`/`)
Actualmente `/` redirige a `/contacts`. Cambiar para que muestre un Dashboard Home moderno con:
- **Header**: "Bienvenido de vuelta, {userName}" con fecha actual, y un selector de período (hoy, esta semana, este mes).
- **4 KPI Cards** en grid:
  - Total contactos (icono Users, color green)
  - Conversaciones activas (icono MessageCircle, color blue)
  - Mensajes enviados hoy (icono Send, color sky)
  - Tasa de entrega (porcentaje, color green si >80% azul si <80%)
  Cada card debe tener: icono con fondo circular semitransparente, el número grande en bold, una etiqueta pequeña, y un indicador de tendencia (+X% vs período anterior — puede ser mock data).
- **Sección "Actividad reciente"**: lista de las últimas 10 conversaciones/mensajes con avatar/círculo con iniciales, nombre, último mensaje truncado, timestamp relativo (hace 5 min, hace 1 hr, etc.), y un badge del estado.
- **Sección "Contactos recientes"**: mini-tabla con los últimos 5 contactos registrados, con badges de estado.
- **Layout**: 2 columnas en desktop — KPIs arriba full-width, luego actividad reciente (izquierda, 60%) y contactos recientes (derecha, 40%).
- **NOTA**: Esta página consume datos del backend API. Para los KPIs y actividad reciente, crea llamadas a los endpoints existentes (`/contacts`, `/campaigns`) o usa datos mock con un comentario `// TODO: conectar a endpoint real`. Prefiero que funcione con datos reales donde sea posible.

### 2. SIDEBAR REDESIGN (`src/components/sidebar.tsx`)
- Mantener w-60 pero mejorar visualmente:
  - Logo area: icono verde más elaborado (puedes usar un div con gradiente verde como logo placeholder) + "Naty" en bold + "Natara La Cima" más pequeño debajo
  - Nav items: agregar un indicador visual más moderno — una barra lateral izquierda de 3px en naty-green cuando está activo, el fondo activo debe ser un gradiente sutil `bg-gradient-to-r from-naty-green/10 to-transparent`
  - Agregar item "Dashboard" (Home/LayoutDashboard icon) como primer item, apuntando a `/`
  - Cada nav item: icono en un círculo semitransparente cuando está activo, icono suelto cuando inactivo
  - Footer del sidebar: avatar circular con iniciales del usuario (gradiente green-blue), nombre y rol, botón de logout más sutil
  - Agregar separadores de sección con label pequeño ("Principal", "Gestión", etc.)
  - Collapsible en mobile: agregar un botón hamburguesa que toggle el sidebar en pantallas pequeñas (slide-in desde izquierda con overlay)

### 3. HEADER DE PÁGINA (nuevo componente `src/components/page-header.tsx`)
Crear un componente reutilizable para el header de cada página:
- Breadcrumb (Home > Contactos, Home > Campañas, etc.)
- Título de página (h1 grande, bold)
- Descripción subtítulo
- Área de acciones a la derecha (botones, búsqueda global)
- Debe aceptar children para actions custom

### 4. REDISEÑO — Página Contactos (`src/app/(dashboard)/contacts/page.tsx`)
- Usar el nuevo PageHeader
- Filtros: mover a una barra horizontal compacta con chips/badges estilo "filter pills" en vez de dropdowns separados
- Tabla:
  - Agregar checkbox para selección múltiple (columna izquierda)
  - Filas con hover más suave (transición, fondo ligeramente azul)
  - Avatar con iniciales antes del nombre
  - Acciones inline al hacer hover (ver, mensaje iconos)
  - Better spacing y padding
- Paginación: estilo más moderno con números de página + prev/next

### 5. REDISEÑO — Página Detalle de Contacto (`src/app/(dashboard)/contacts/[id]/page.tsx`)
- Layout a 3 columnas: info contacto (izquierda estrecha), conversaciones (centro ancho), panel de acciones rápido (derecha estrecha)
- Info del contacto: avatar grande con iniciales y gradiente, nombre grande, los datos en cards pequeñas agrupadas (Datos personales, Privacidad, etc.)
- Conversaciones: estilo chat de WhatsApp moderno — burbujas con sombra, timestamp, indicador de dirección (flechas o color)
- Panel derecho: acciones rápidas (Enviar mensaje, Marcar como activo/inactivo, Ver privacidad) como botones con iconos
- SendMessageForm: textarea más grande, con botón de enviar con ícono, style tipo input de chat

### 6. REDISEÑO — Página Campañas (`src/app/(dashboard)/campaigns/page.tsx`)
- Usar PageHeader
- Cards de resumen arriba (total campañas, enviadas, programadas, fallidas)
- Tabla con mejor styling: badge de status con dot indicator (punto colored antes del texto), progress bar de entrega inline
- Botón "Nueva campaña" más prominente con gradiente

### 7. REDISEÑO — Página Historial (`src/app/(dashboard)/history/page.tsx`)
- Las SummaryCards existentes: agregar iconos con fondo circular, bordes con color sutil (border-l-4 colored)
- Tabla: agregar barra de progreso de entrega más elaborada con porcentaje
- Fechas mejor formateadas

### 8. REDISEÑO — Página Settings (`src/app/(dashboard)/settings/page.tsx`)
- Grid de cards en vez de sections verticales
- Cada card con ícono de header
- Tabla de usuarios: agregar avatar con iniciales
- Toggle buttons más modernos (switch toggle estilo iOS)

### 9. COMPONENTES GLOBALES MEJORADOS

**Badge** (`src/components/badge.tsx`):
- Agregar un dot indicator opcional (punto colored antes del label)
- Variantes mejoradas con bordes sutiles

**globals.css**:
- Agregar animaciones sutiles:
  ```css
  @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slide-in-left { from { transform: translateX(-100%); } to { transform: translateX(0); } }
  @keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
  ```
- Agregar scrollbar styling para dark mode (scrollbar delgada, track oscuro, thumb gris)
- Agregar utilidad `.glass-card` o definir en Tailwind

**Tailwind config** (`tailwind.config.ts`):
- Agregar animaciones: `fadeIn`, `slideInLeft`, `pulseSoft`
- Agregar `backdropBlur` si no existe
- Agregar keyframes para las animaciones

### 10. LAYOUT MEJORADO (`src/app/(dashboard)/layout.tsx` y `src/components/auth-guard.tsx`)
- El main content area debe tener padding consistente y max-width
- Agregar transición de página (fade-in al cargar)
- El sidebar debe tener z-index alto para el overlay en mobile

## ARCHIVOS QUE DEBES CREAR O MODIFICAR

**NUEVOS:**
- `src/app/(dashboard)/page.tsx` — Dashboard Home
- `src/components/page-header.tsx` — Componente reutilizable
- `src/app/(dashboard)/page.module.css` — Si necesitas animaciones CSS específicas

**MODIFICAR:**
- `src/components/sidebar.tsx` — Rediseño completo
- `src/components/auth-guard.tsx` — Layout mejorado, soporte mobile
- `src/components/badge.tsx` — Variante con dot
- `src/app/globals.css` — Animaciones, scrollbar, utilidades
- `tailwind.config.ts` — Animaciones, keyframes
- `src/app/(dashboard)/contacts/page.tsx` — Rediseño
- `src/app/(dashboard)/contacts/[id]/page.tsx` — Rediseño
- `src/app/(dashboard)/contacts/_components/contacts-filters.tsx` — Filter pills
- `src/app/(dashboard)/contacts/_components/pagination.tsx` — Paginación moderna
- `src/app/(dashboard)/contacts/[id]/_components/send-message-form.tsx` — Chat style
- `src/app/(dashboard)/campaigns/page.tsx` — Rediseño
- `src/app/(dashboard)/history/page.tsx` — Rediseño
- `src/app/(dashboard)/settings/page.tsx` — Rediseño
- `src/app/(dashboard)/settings/_components/toggle-user-button.tsx` — Switch toggle

## REGLAS IMPORTANTES
1. NO instalar nuevas dependencias. Usar solo lo que ya existe: Tailwind, lucide-react, React.
2. NO usar shadcn ni ninguna UI library. Todo es Tailwind puro.
3. Mantener el patrón "use client" / server components tal como está.
4. Mantener toda la funcionalidad existente — no romper nada.
5. Todo el texto de la UI en ESPAÑOL (es-MX).
6. El tema es dark mode por defecto (ya está configurado).
7. Mantener la funcionalidad de roles (admin ve Settings, operador no).
8. Las llamadas al backend API usan `api.get<T>(url)` — mantener ese patrón.
9. Proveer código COMPLETO para cada archivo, no snippets parciales.
10. El sidebar colapsable en mobile debe funcionar con state de React (useState), no necesitas una librería.
```
