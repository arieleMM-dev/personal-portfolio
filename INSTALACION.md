# Instalación voluntaria de skills externas para Codex

Los ejemplos de diseño/seguridad proceden de la revisión del 2026-10-25. La sección de ahorro de tokens y el CLI de skills se contrastaron documentalmente el 2026-11-10. **No se ejecutó ningún instalador** ni se comprobó el funcionamiento de herramientas externas en esta máquina.

## Primero: comprobar herramientas
- Revisa versiones y dependencias en sus fuentes: el [CLI de skills](https://github.com/vercel-labs/skills) declara Node.js 22.20+ en la revisión actual; otros paquetes tienen requisitos distintos.
- Ejecuta `codex --version` y verifica que tu versión admita Agent Skills.
- `npx skills --help` también puede descargar y ejecutar código si el CLI no está disponible. Requiere la misma revisión y autorización que una instalación; no es una comprobación local inocua.

## Ahorro de tokens: elegir antes de instalar

Lee [criterios y fuentes](.agents/skills/selector-de-skills/references/ahorro-tokens.md). Los siguientes bloques son opciones independientes, **no un script para ejecutar completo**. Revisa y fija una versión o revisión adecuada antes de instalarlos; no uses actualizaciones automáticas por ahorrar tokens.

### Caveman: solo la skill de respuestas

El [README del autor](https://github.com/JuliusBrussee/caveman) separa la skill del proxy. Para este objetivo basta evaluar la primera; no se requiere proxy, cuenta, cambio de proveedor ni credenciales.

```powershell
# Solo tras revisión y autorización; alcance del proyecto, una skill y Codex.
npx skills add JuliusBrussee/caveman --skill caveman -a codex
```

Después de comprobar su detección, invoca `$caveman` en Codex. Para volver al estilo normal, escribe `stop caveman`. Esta plantilla no lo activa automáticamente ni exige ese estilo para documentación.

### Graphify: CLI y skill, instaladas por separado

El [repositorio oficial](https://github.com/Graphify-Labs/graphify) usa el paquete PyPI **`graphifyy`**, con doble `y`, y Python 3.10+. No lo confundas con paquetes de nombre parecido. Si ya tienes `uv` revisado y disponible:

```powershell
# Solo tras revisión y autorización; instala la herramienta en un entorno aislado.
uv tool install graphifyy
# Registra su skill para Codex en el proyecto actual.
graphify install --project --platform codex
```

Verifica versión, archivos escritos y detección. La instalación de la herramienta y la de la skill son pasos diferentes. No añadas hooks ni servicios por defecto.

Solo en un repositorio de código donde construir el índice sea pertinente y esté dentro del alcance autorizado:

```powershell
# Construye un índice local de código; excluye documentos e imágenes del pase semántico.
graphify extract . --code-only
# Sustituye AuthModule por un símbolo real; respuesta limitada para esta consulta.
graphify query "AuthModule" --budget 1000
```

Los comandos siguen la [referencia del CLI](https://docs.graphify.com/open-source/configuration/cli). No indexar esta plantilla de Markdown como ensayo de ahorro. Un corpus mixto sin `--code-only` puede usar modelos y enviar contenido al proveedor configurado.

### RTK: herramienta opcional para salidas de comandos

El [autor](https://github.com/rtk-ai/rtk) documenta instalación nativa de Windows. No requiere instalar una skill llamada RTK.

```powershell
# Solo tras revisión y autorización, para Windows.
winget install rtk-ai.rtk
# Comprobar el binario instalado.
rtk --version
rtk gain
```

Evalúa primero un comando soportado de forma explícita. Para integración automática, consulta la [guía del agente](https://github.com/rtk-ai/rtk/blob/develop/docs/guide/getting-started/supported-agents.md): `rtk init --codex` modifica instrucciones e integración del proyecto. Revisa los cambios antes de aceptarlos; no lo ejecutes como mera verificación. El soporte de Codex CLI no demuestra que todos los hosts o comandos PowerShell se intercepten.

### GitNexus: alternativa, sujeta a licencia

Consulta [documentación](https://github.com/abhigyanpatwari/GitNexus/blob/main/gitnexus/README.md) y [licencia](https://github.com/abhigyanpatwari/GitNexus/blob/main/LICENSE) antes de elegirlo. La revisión actual muestra PolyForm Noncommercial; no asumir autorización para uso comercial.

No se propone un instalador predeterminado: `analyze` también puede escribir instrucciones, skills y hooks; `setup` configura editores. Si eliges esta alternativa y su licencia permite tu uso, revisa `analyze --index-only` para separar indexación de integración. No ejecutarlo junto con Graphify por rutina.

## Inicio recomendable: solo las necesarias

Ejemplos heredados de diseño/seguridad; volver a verificar cada fuente antes de usarlos.

```powershell
# Catálogo/referencia. El CLI de skills permite seleccionar por agente y proyecto.
npx skills add Dammyjay93/interface-design --skill interface-design -a codex
npx skills add Leonxlnx/taste-skill --skill design-taste-frontend -a codex
npx skills add tt-a1i/archify --skill archify -a codex
npx skills add cloudflare/security-audit-skill --skill security-audit -a codex

# Alternativas opcionales para tareas específicas
npx skills add Nutlope/hallmark -a codex
npx skills add oso95/scroll-world -a codex
npx skills add zarazhangrui/frontend-slides --skill frontend-slides -a codex
```

Instala solo la selección que necesites, no todo este bloque a ciegas. Para instalaciones personales que quieres reutilizar en otros repositorios, añade `-g` a los comandos aplicables después de revisarlos.

## UI UX Pro Max: CLI propia documentada

```powershell
npm install -g ui-ux-pro-max-cli
uipro init --ai codex
```

Revisa antes el código del CLI y sus dependencias; no instales el paquete ni ejecutes sus scripts desde un agente sin aprobación.

## Controles de seguridad del agente (instalación separada)

```powershell
# Ejemplo: consultar primero los comandos del CLI de CC Safety Net
npx -y cc-safety-net@latest --help
npx -y cc-safety-net@latest doctor
# Solo con autorización y después de revisar: instalar integración Codex según la ayuda del CLI.
```

`Agent Guard` advierte que Windows no está soportado actualmente; no lo uses allí como guardia efectiva sin confirmación nueva.

## Herramientas que requieren revisión específica
- **VBSEC**: https://github.com/tanviet12/vbsec (instalador con variante Codex).
- **Website Cloner**: https://github.com/luongnv89/skills/tree/main/skills/website-cloner (orquestador con skills hermanas y pasos de Git).
- **Trail of Bits**: https://github.com/trailofbits/skills (marketplace para Codex; instalar solo plugins concretos).
- **OWASP Playbook**: https://github.com/OWASP/secure-agent-playbook (colección con skills y agentes dependientes).
- **Ghost Security**: https://github.com/ghostsecurity/skills (marketplace enfocado en Claude Code).
- **Claude Cybersecurity**: https://github.com/AgriciDaniel/claude-cybersecurity (orientado a Claude Code).
- **Defending Code**: https://github.com/anthropics/defending-code-reference-harness (harness de referencia sin mantenimiento, no aconsejable como instalación general).
- **Bug Hunter**: https://github.com/codexstar69/bug-hunter (revisar instrucciones de su instalador específico de Codex).

## Verificación posterior

Con el CLI de skills ya revisado y autorizado (estos comandos pueden invocar `npx`):

```powershell
npx skills list
npx skills list -g
npx skills check
```

Comprueba la detección en el selector de skills de Codex (`/skills` en CLI/extensión). Para herramientas, comprueba también versión, una operación acotada y los archivos/configuración modificados. Tener una carpeta o ejecutar un instalador no demuestra funcionamiento ni ahorro. `skills check` consulta actualizaciones; no mide tokens ni demuestra compatibilidad.

## Cómo iniciar un proyecto nuevo

> Lee AGENTS.md. Usa la skill selector-de-skills para identificar qué skills están instaladas y cuáles resultan pertinentes para el producto. No instales nada. Antes de programar, define requisitos, límites del dominio, arquitectura inicial, módulos y criterios de aceptación. Recomienda un MVP y empieza por la primera tarea aprobada.

## Principio de control
NO instalar todas las skills por defecto. Evitar duplicación y confiar solo en verificaciones que realmente se ejecutaron. Los scripts de terceros requieren autorización y revisión previa.
