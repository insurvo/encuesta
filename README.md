# Encuesta de validación para agentes de seguros · Insurvo

Encuesta anónima (Fase 0 de Insurvo) para agentes de seguros hispanos en EE. UU. y sus asistentes. Página estática publicada con GitHub Pages: **https://insurvo.github.io/encuesta/**

- `index.html`: la encuesta completa (HTML, CSS y JS en un solo archivo). Ocho secciones (versión `insurvo-3`): tu negocio, cómo trabajas hoy, problemas, renovaciones y comisiones, después de la venta, lo que te serviría, precio y cierre. Guarda el avance en el teléfono (`localStorage`) y envía al final.
- `apps-script/encuesta.gs`: script de Google Apps Script dedicado (hoja de cálculo + correo) para cuando se quiera separar la encuesta del formulario «Cotiza tu Seguro».
- `supabase.sql`: alternativa en Supabase (tabla `survey_responses` con seguridad por filas; la página solo puede insertar).

## Dónde llegan las respuestas (decisión `ENC-01`, 2026-10-31)

El tablero pedía Supabase como en Remsa, pero el proyecto de Supabase de Remsa **ya no existe** (su dominio no resuelve; los proyectos gratuitos se pausan y se eliminan por inactividad) y no se puede crear uno sin la cuenta del dueño. Por eso la encuesta usa hoy `BACKEND: 'apps-script'`: el **Google Apps Script del formulario «Cotiza tu Seguro»** del dueño, que ya está desplegado y acepta cualquier formulario por secciones.

Cada respuesta:
1. Se agrega como fila en la hoja **Solicitudes** de la hoja de cálculo del script (columnas con el texto de cada pregunta; las columnas nuevas se crean solas). Las filas de la encuesta se reconocen por la columna **Agente = «Encuesta Insurvo»** y la columna **Encuesta · Formulario**.
2. Llega por correo al dueño (`APPS_SCRIPT_AGENT: 'alirio'`) con un PDF con todas las respuestas, y una fila «Respuestas (JSON)» con los códigos crudos para analizarlas.

Para separar la encuesta en su propia hoja y correo: crear un proyecto nuevo en https://script.google.com, pegar `apps-script/encuesta.gs`, poner el correo en `CONFIG`, desplegar como aplicación web («Cualquier usuario») y copiar la URL en `CONFIG.APPS_SCRIPT_URL` de `index.html`.

### Cambiar a Supabase

1. Crear un proyecto en https://supabase.com y correr `supabase.sql` en el editor SQL.
2. En `index.html`, `CONFIG`: `BACKEND: 'supabase'`, `SUPABASE_URL` y `SUPABASE_ANON_KEY` (clave pública *anon*; solo puede insertar gracias a RLS).
3. Las respuestas se leen en el panel de Supabase (tabla `survey_responses`) filtrando por `survey_version = 'insurvo-3'`.

## Formato de una respuesta

```json
{ "survey_version": "insurvo-3", "answers": { "products": ["aca", "life"], "products_other": ["Seguros de viaje"], "team": "2_3", "pain_ratings": { "intake": 4, "documents": 5 }, "willingness_to_pay": "50_79" } }
```

Los códigos de cada pregunta y opción están en `SECTIONS` dentro de `index.html`. Las preguntas que dependen de otra (`showIf`) no se envían si estaban ocultas.

## Publicar

GitHub Pages desde la rama `main`, carpeta raíz (`.nojekyll` evita el procesado de Jekyll). Cada `git push` a `main` republica en un minuto.

## Probar

`python3 -m http.server 8765` en esta carpeta y abrir http://localhost:8765/. Con Playwright se recorren las ocho secciones, las validaciones, los `showIf`, «Otro», las opciones exclusivas, la persistencia local y el barrido responsive (320 a 1440 px). Para una prueba de envío real se cambia `CONFIG.SURVEY_VERSION` a `insurvo-test` desde la consola antes de enviar; esas filas se descartan al analizar.
