# 🎮 Quick-Thinking: Guía Rápida de Uso

## 🚀 Navegación

### Para Jugadores
1. **Ir al Lobby**: Navegar a `/quick-thinking/lobby`
2. **Opción A - Crear Sala** (Anfitrión):
   - Seleccionar una trivia de la lista desplegable
   - Click en "Crear Sala"
   - Se genera un código de 6 caracteres (ej: `A1B2C3`)
   - Compartir código con amigos
   
3. **Opción B - Unirse a Sala** (Jugador):
   - Ingresar código de 6 caracteres
   - Click en "Unirse"
   - Esperar a que el anfitrión inicie

## 🎯 Controles del Anfitrión

| Acción | Cuándo | Ubicación |
|--------|--------|-----------|
| **Iniciar Juego** | Sala de espera (mín. 2 jugadores) | Botón azul central |
| **Lanzar Pregunta** | Después de iniciar o entre preguntas | Botón azul central |
| **Siguiente Pregunta** | Después de ver resultados | Botón azul inferior |
| **Cerrar Sala** | En cualquier momento | Botón rojo superior |

## 👥 Controles de Jugadores

| Acción | Cuándo | Ubicación |
|--------|--------|-----------|
| **Seleccionar Respuesta** | Durante pregunta activa | Click en opción A/B/C/D |
| **Enviar Respuesta** | Después de seleccionar | Botón verde "Enviar Respuesta" |
| **Salir de Sala** | En cualquier momento | Botón gris superior |

## 📊 Sistema de Puntos

- **1er lugar** (respuesta correcta más rápida): 300 puntos
- **2do lugar** (respuesta correcta): 200 puntos
- **3er lugar** (respuesta correcta): 100 puntos
- **Fuera del Top 3**: 0 puntos
- **Respuesta incorrecta**: 0 puntos

## ⏱️ Tiempos

- **Timer por pregunta**: 60 segundos
- **Reconexión permitida**: 30 segundos
- **Después de 30s desconectado**: Jugador eliminado permanentemente

## 🎨 Indicadores Visuales

### Estados de Jugadores
- **👑 Corona**: Anfitrión
- **⚠️ Triángulo**: Desconectado temporalmente
- **Borde amarillo**: Es el anfitrión
- **Borde rojo**: Desconectado
- **Borde gris**: Conectado normalmente

### Timer
- **Verde** (60-31s): Tiempo abundante
- **Amarillo** (30-11s): Tiempo medio
- **Rojo parpadeante** (10-0s): ¡Apúrate!

### Respuestas
- **Borde azul**: Respuesta seleccionada
- **Opacidad 50%**: Ya enviaste tu respuesta
- **Letras A/B/C/D**: Identificador de opción

## 📱 Compatibilidad

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Mobile (iOS Safari, Chrome Android)
- ✅ Tablet (iPadOS, Android)
- ✅ Dark Mode automático

## 🔔 Notificaciones (Toast)

| Color | Tipo | Ejemplo |
|-------|------|---------|
| **Verde** | Éxito | "✅ ¡Correcto! +300 puntos" |
| **Rojo** | Error | "❌ Incorrecto" |
| **Amarillo** | Advertencia | "⚠️ Jugador desconectado" |

## ⌨️ Atajos de Teclado

### En Pregunta Activa
- `1` - Seleccionar opción A
- `2` - Seleccionar opción B
- `3` - Seleccionar opción C
- `4` - Seleccionar opción D
- `Enter` - Enviar respuesta (si ya seleccionaste)

### General
- `Ctrl/Cmd + C` - Copiar código de sala (cuando esté visible)
- `Esc` - Cerrar modales

## 🐛 Solución de Problemas Comunes

### "No puedo unirme a la sala"
- ✅ Verifica el código (distingue mayúsculas/minúsculas)
- ✅ La sala puede estar llena (máx. 30 jugadores)
- ✅ La sala puede haber sido cerrada
- ✅ Verifica tu conexión a internet

### "Me desconecté del juego"
- ✅ Tienes 30 segundos para reconectar
- ✅ Regresa a `/quick-thinking/game-room/:codigo`
- ✅ Tu progreso se mantendrá si reconectas a tiempo

### "El anfitrión se desconectó"
- ❌ La sala se cierra automáticamente
- ✅ Regresa al lobby y crea una nueva sala

### "No veo el botón de iniciar"
- ✅ Solo el anfitrión ve este botón
- ✅ Se necesitan mínimo 2 jugadores
- ✅ Verifica que estés en "Sala de Espera"

## 📋 Checklist Pre-Juego

### Para Anfitriones
- [ ] Crear o seleccionar trivia con suficientes preguntas
- [ ] Compartir código de sala con jugadores
- [ ] Esperar a que se unan al menos 2 jugadores
- [ ] Verificar que todos estén listos
- [ ] Click en "Iniciar Juego"

### Para Jugadores
- [ ] Tener el código de sala a mano
- [ ] Unirse desde `/quick-thinking/lobby`
- [ ] Esperar confirmación de unión
- [ ] Esperar a que el anfitrión inicie

## 🎓 Consejos Pro

1. **Velocidad es clave**: Los primeros 3 en responder correctamente ganan puntos
2. **Lee completo**: Asegúrate de leer toda la pregunta antes de responder
3. **No te apresures demasiado**: Es mejor tomarse 5 segundos extra que responder mal
4. **Usa imágenes**: Si hay imagen, puede contener pistas importantes
5. **Mantén conexión estable**: WiFi es mejor que datos móviles
6. **Cierra otras pestañas**: Para mejor rendimiento

## 📊 Estadísticas en Vivo

Durante el juego puedes ver:
- Tu puntuación actual
- Puntuaciones de todos los jugadores
- Quién está conectado/desconectado
- Top 3 después de cada pregunta
- Tiempo restante en cada pregunta

## 🏆 Al Finalizar

Verás:
- **Ganador destacado** con puntuación
- **Tabla de posiciones completa**
- **Podio** (Top 3) resaltado
- Botón para volver al lobby

## 🔄 Empezar Nueva Partida

1. Desde la pantalla final, click en "Volver al Lobby"
2. El anfitrión puede crear una nueva sala
3. Todos los jugadores pueden unirse de nuevo
4. ¡A jugar otra vez!

---

**¿Necesitas ayuda?** Contacta al administrador del sistema.
**Versión:** 1.0.0
**Última actualización:** Noviembre 2025
