# Instalación voluntaria de skills externas para Codex

Estos comandos son ejemplos orientativos revisados el 2026-10-25. **No se ejecutaron** y no implican que se haya comprobado su instalación en tu máquina.

## Primero: comprobar herramientas
- Instala Node.js según las versiones exigidas por cada herramienta.
- Ejecuta `codex --version` y verifica que tu versión admita Agent Skills.
- Consulta `npx skills --help`; evita ejecución automática en repositorios que no has revisado.

## Inicio recomendable: solo las necesarias

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

```powershell
npx skills list
npx skills list -g
npx skills check
```

Dentro de Codex utiliza `/skills` para comprobar la detección real. Tener una carpeta o ejecutar un instalador no demuestra que haya quedado activa y funcional.

## Cómo iniciar un proyecto nuevo

> Lee AGENTS.md. Usa la skill selector-de-skills para identificar qué skills están instaladas y cuáles resultan pertinentes para el producto. No instales nada. Antes de programar, define requisitos, límites del dominio, arquitectura inicial, módulos y criterios de aceptación. Recomienda un MVP y empieza por la primera tarea aprobada.

## Principio de control
NO instalar todas las skills por defecto. Evitar duplicación y confiar solo en verificaciones que realmente se ejecutaron. Los scripts de terceros requieren autorización y revisión previa.
