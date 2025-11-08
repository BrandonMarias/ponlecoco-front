# Instrucciones para GitHub Copilot

## Estándares de Código Angular
- Usar signals (`input()`, `output()`) en lugar de decoradores `@Input()`, `@Output()`
- Usar `inject()` en lugar de inyección por constructor
- Preferir componentes standalone
- Usar nueva sintaxis de control flow: `@if`, `@for`, `@switch`

## Patrones Prohibidos
- No usar `any` sin justificación
- No usar `console.log` en código de producción
- Evitar `var`, usar `const`/`let`

## Tailwind CSS
- Usar clases de Tailwind
- Dark mode: usar `dark:` prefix
- Responsive: `sm:`, `md:`, `lg:`, `xl:`

## Buenas Prácticas
- Escribir comentarios claros y concisos
- Seguir principios SOLID
- Seguir principios DRY y clean code

## Contexto Adicional
- No sugerir código que ha sido eliminado o modificado manualmente
- El proyecto usa Angular 20 y Tailwind CSS 4.1
