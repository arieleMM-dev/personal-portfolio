---
name: selector-de-skills
description: Selecciona skills disponibles para iniciar proyectos o elegir workflows de diseño, arquitectura, depuración, seguridad y ahorro de tokens. Usar al pedir elegir/configurar skills o reducir consumo de contexto. Distingue skills de herramientas; no instala ni ejecuta las opciones recomendadas.
---

# Selector de skills para Codex

Esta skill organiza la **selección** de capacidades, no sustituye a las skills originales.

## Procedimiento
1. Identifica la tarea concreta, el resultado esperado, el tipo de producto (landing, SaaS, ERP, API, etc.) y si se trata de creación, revisión, depuración o auditoría.
2. Localiza con búsqueda la sección pertinente de [catalogo.md](references/catalogo.md) y lee solo esa sección. Para ahorro de tokens, usa la sección D y el apartado aplicable de [ahorro-tokens.md](references/ahorro-tokens.md); no leas ambas referencias completas por defecto.
3. Determina qué skills están realmente instaladas. Prioriza las skills anunciadas por Codex y las carpetas locales o de usuario con `SKILL.md` auténtico. Nunca infieras instalación solo porque exista un enlace en el catálogo.
4. Elige una skill principal apropiada, con un máximo de dos complementarias cuando tengan funciones claramente distintas. Puede haber tareas que no necesiten ninguna. Cuenta también el coste de cargar instrucciones: una petición breve no necesita una skill adicional solo para contestar brevemente.
5. Si la skill elegida está instalada, lee su `SKILL.md` original y recursos necesarios. Respeta instrucciones de mayor prioridad y los límites del proyecto.
6. Si no está instalada, explica brevemente que no puede invocarse todavía. Ofrece un enlace oficial y una opción de instalación que el usuario puede autorizar, pero NO descargues, instales o ejecutes por iniciativa propia.
7. Si una herramienta es plugin, hook, CLI, harness o dependiente de Claude Code, NO la presentes como skill Codex lista para usar; verifica compatibilidad, instalación y permisos.
8. Si aparece conflicto entre skills, favorece la tarea explícita del usuario, la menor superficie de cambio, los procedimientos verificables y los controles de seguridad.
9. Evita convertir revisiones focalizadas en auditorías completas. Reserva las auditorías profundas para solicitudes explícitas.
10. Informa únicamente de las skills realmente utilizadas. No atribuyas sus recomendaciones a una ejecución que no ocurrió.

## Selección para ahorro de tokens
- Identifica el origen del gasto: respuesta extensa, lectura repetida, salida de comandos o reintentos. Usa primero búsquedas y lecturas acotadas sin dependencias adicionales.
- `caveman`: candidato para respuestas extensas cuando se busca concisión; no comprime entrada ni razonamiento. Conserva idioma, precisión y entregables completos. Consultar su estado no significa activarlo.
- `graphify`: candidato para relaciones y consultas repetidas con índice vigente. Sin índice y con una sola búsqueda, prefiere `rg`; si se solicita construirlo, respeta el alcance y considera primero código local sin extracción semántica.
- RTK: candidato cuando domina la salida de terminal. Verifica binario, integración y errores recuperables; no lo clasifiques como skill.
- GitNexus: alternativa a Graphify para navegación e impacto de cambios en código. Revisa licencia y dependencias antes de recomendarlo en un proyecto comercial. No cargues ambos índices por defecto.
- Si no hay mediciones, presenta el ahorro como hipótesis. Una comparación debe incluir preparación, actualizaciones y calidad del resultado; no inventes porcentajes.

## Tabla rápida de decisión
- Sitios de marketing / landing / portafolios: UI UX Pro Max o Taste Skill; Hallmark como alternativa.
- Interfaces de producto / SaaS / ERP: Interface Design; UI UX Pro Max como complemento.
- Diagramas / flujos / ERD: Archify.
- Presentaciones HTML: Frontend Slides.
- Sitio de referencia cuya recreación está autorizada: Website Cloner.
- Depuración: Bug Hunter compatible con Codex.
- Seguridad focalizada: controles OWASP y habilidad concreta compatible con Codex.
- Auditoría completa solicitada: Cloudflare Security Audit u otra auditoría especializada instalada.
- Seguridad de la terminal del agente: CC Safety Net / Agent Guard requieren instalación separada y verificación real.
- Ahorro de tokens: Caveman (salida), Graphify O GitNexus (contexto), RTK (comandos); ver criterios anteriores y referencia específica. Ninguno es obligatorio.

## Salida esperada al seleccionar
- Tarea identificada.
- Skill principal y, si procede, complementaria.
- Estado de disponibilidad (instalada/verificable, ausente, incompatibilidad no resuelta).
- Riesgos o dependencias, solo si aplican.
- Siguiente acción concreta. No uses una checklist extensa para trabajos triviales.
