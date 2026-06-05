# 🤖 Cómo cambiar el "cerebro" del chatbot (sin saber programar)

## ¿Qué es el "cerebro"?

Tu bot Naty usa un servicio de Google llamado **Gemini** para generar respuestas. Es como el motor del bot. Google publica varios motores, y de vez en cuando cambia los nombres o deja de dar soporte a los viejos.

En este proyecto, el bot está preparado para:

1. **Usar el motor que tú le digas** (variable `GEMINI_MODEL`).
2. **Si ese motor falla**, probar automáticamente con otros de respaldo (lista interna en `llm.ts`).

---

## 🛠️ Cómo cambiar el motor en Railway (sin redeployar código)

1. Entra a [railway.com](https://railway.com) y abre tu proyecto.
2. Click en el servicio **`naty-api`**.
3. Ve a la pestaña **Variables**.
4. Click en **+ New Variable**.
5. Llena:
   - **Nombre:** `GEMINI_MODEL`
   - **Valor:** el modelo que quieras (ej. `gemini-2.5-flash`).
6. Click en **Add**.
7. Railway **reconstruye solo** el servicio. En 1-2 minutos ya está activo.

> 💡 **No necesitas tocar el código.** Solo agregar/cambiar esa variable.

---

## 📋 Modelos recomendados (junio 2026)

| Modelo | Velocidad | Costo | Cuándo usarlo |
|---|---|---|---|
| `gemini-2.5-flash` | ⚡ Rápido | Gratis con límites | **Por defecto. Mejor relación calidad/velocidad.** |
| `gemini-2.0-flash` | ⚡ Rápido | Gratis con límites | Si el de arriba no responde. |
| `gemini-2.5-pro` | 🐢 Más lento | De pago | Solo si necesitas respuestas más "inteligentes". |

> ⚠️ **No escribas `gemini-1.5-flash` ni `gemini-1.5-pro`**: Google los dio de baja en 2025.

---

## 🚨 ¿Qué pasa si el bot deja de responder?

1. Revisa los **Deploy Logs** de `naty-api` en Railway.
2. Si ves `Todos los modelos de Gemini fallaron`, significa que **ningún motor funcionó**. Posibles causas:
   - Se acabó la cuota gratuita de Google → ve a [aistudio.google.com](https://aistudio.google.com) y revisa tu plan.
   - La API key (`GEMINI_API_KEY`) está mal copiada o vencida.
3. Si ves un error 429 persistente → toca activar el plan de pago de Google o esperar al siguiente ciclo de cuota.

---

## 🔍 ¿Qué motor está usando el bot AHORA MISMO?

Mira los logs. Cuando hay fallback verás una línea como:

```
[llm] fallback usado. Modelos que fallaron: gemini-2.0-flash→429. Modelo activo: gemini-2.5-flash
```

Eso significa: el motor `gemini-2.0-flash` no tenía cuota, y el bot pasó automáticamente a `gemini-2.5-flash`, que sí funcionó. Todo bien. ✅

---

## ❓ Preguntas frecuentes

**¿Tengo que redeployar cada vez que cambio `GEMINI_MODEL`?**
No. Railway detecta el cambio de variable y reconstruye solo. Tú solo cambias el valor.

**¿Puedo dejar la variable vacía?**
Sí. Si la dejas vacía, el bot usa la lista interna en este orden: `gemini-2.5-flash` → `gemini-2.0-flash` → ...

**¿Y si quiero PROBAR un modelo nuevo sin borrar el actual?**
Solo cambia el valor de `GEMINI_MODEL`. Si el nuevo falla, el fallback automático entra en acción y usa los de la lista interna.

**¿Dónde consigo una API key de Gemini?**
En [aistudio.google.com/apikey](https://aistudio.google.com/app/apikey). Es gratis para empezar.
