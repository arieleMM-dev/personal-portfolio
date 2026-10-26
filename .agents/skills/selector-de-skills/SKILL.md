---
name: selector-de-skills
description: Selecciona de forma justificada una o dos Agent Skills ya instaladas para comenzar un proyecto de software o ejecutar un workflow especializado de diseño UI/UX, arquitectura, depuración o seguridad. Usar cuando el usuario pida elegir/configurar skills, inicie un proyecto desde cero o una tarea abarque varios dominios. No instala skills automáticamente, no audita ni programa por sí sola.
---

# Selector de skills para Codex

Esta skill organiza la **selección** de capacidades, no sustituye a las skills originales.

## Procedimiento
1. Identifica la tarea concreta, el resultado esperado, el tipo de producto (landing, SaaS, ERP, API, etc.) y si se trata de creación, revisión, depuración o auditoría.
2. Lee `references/catalogo.md` **solo en la sección pertinente** para conocer nombres, enlaces de procedencia, disparadores y limitaciones.
3. Determina qué skills están realmente instaladas. Prioriza las skills anunciadas por Codex y las carpetas locales o de usuario con `SKILL.md` auténtico. Nunca infieras instalación solo porque exista un enlace en el catálogo.
4. Elige una skill principal apropiada, con un máximo de dos complementarias cuando tengan funciones claramente distintas. Puede haber tareas que no necesiten ninguna.
5. Si la skill elegida está instalada, lee su `SKILL.md` original y recursos necesarios. Respeta instrucciones de mayor prioridad y los límites del proyecto.
6. Si no está instalada, explica brevemente que no puede invocarse todavía. Ofrece un enlace oficial y una opción de instalación que el usuario puede autorizar, pero NO descargues, instales o ejecutes por iniciativa propia.
7. Si una herramienta es plugin, hook, CLI, harness o dependiente de Claude Code, NO la presentes como skill Codex lista para usar; verifica compatibilidad, instalación y permisos.
8. Si aparece conflicto entre skills, favorece la tarea explícita del usuario, la menor superficie de cambio, los procedimientos verificables y los controles de seguridad.
9. Evita convertir revisiones focalizadas en auditorías completas. Reserva las auditorías profundas para solicitudes explícitas.
10. Informa únicamente de las skills realmente utilizadas. No atribuyas sus recomendaciones a una ejecución que no ocurrió.

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

## Salida esperada al seleccionar
- Tarea identificada.
- Skill principal y, si procede, complementaria.
- Estado de disponibilidad (instalada/verificable, ausente, incompatibilidad no resuelta).
- Riesgos o dependencias, solo si aplican.
- Siguiente acción concreta. No uses una checklist extensa para trabajos triviales.
