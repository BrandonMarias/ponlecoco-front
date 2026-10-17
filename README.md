# 🎯 PonleCoco - Trivias y Ruletas Interactivas

Una aplicación web y móvil para crear y jugar trivias personalizadas y ruletas de preguntas con amigos. Sistema de puntuación automática, múltiples equipos y diversión garantizada.

## 📱 Características

- ✅ **Trivias personalizadas** con preguntas y respuestas ilimitadas
- ✅ **Ruleta de preguntas** interactiva 
- ✅ **Sistema de puntuación** automática
- ✅ **Múltiples equipos** y jugadores
- ✅ **Google Sign-In** integrado
- ✅ **PWA** (Progressive Web App)
- ✅ **App Android nativa** con Capacitor
- ✅ **Safe area** optimizada para móviles
- ✅ **Modo oscuro** y diseño responsive

## 🛠️ Stack Tecnológico

- **Frontend**: Angular 17+ (Standalone Components + Signals)
- **Styling**: Tailwind CSS
- **Mobile**: Capacitor 7.4.3
- **Authentication**: JWT + Google OAuth
- **Build**: Angular CLI + pnpm
- **Deployment**: Netlify (Frontend) + VPS (Backend)

## 📋 Prerequisitos

### Para Desarrollo Web:
- **Node.js** 18+ ([Descargar aquí](https://nodejs.org/))
- **pnpm** package manager:
  ```bash
  npm install -g pnpm
  ```

### Para Desarrollo Android:
- **Android Studio** ([Descargar aquí](https://developer.android.com/studio))
- **Java JDK 17** (incluido con Android Studio)
- **Android SDK** (se instala con Android Studio)
- **Dispositivo Android** o emulador configurado

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/BrandonMarias/jeopardimania-front-angular.git
cd jeopardimania-front-angular
```

### 2. Instalar dependencias
```bash
pnpm install
```

### 3. Configurar variables de entorno

Crear archivo `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  googleClientId: '793028581863-65tpjck5m6p356553362jlqelst8v74k.apps.googleusercontent.com'
};
```

## 🌐 Desarrollo Web

### Ejecutar en modo desarrollo
```bash
pnpm start
```
La aplicación estará disponible en `http://localhost:4200`

### Construir para producción
```bash
pnpm build
```

### Ejecutar tests
```bash
pnpm test
```

## 📱 Desarrollo Android

### 1. Preparar la aplicación
```bash
# Construir la aplicación web
pnpm build

# Sincronizar con Capacitor
pnpm exec cap sync android

# Generar iconos y splash screens personalizados
node generate-icons.js
node generate-splash.js
```

### 2. Abrir en Android Studio
```bash
pnpm exec cap open android
```

### 3. Configurar dispositivo para testing

#### Habilitar opciones de desarrollador:
1. **Configuración** → **Acerca del teléfono** → Tocar **"Número de compilación"** 7 veces
2. **Configuración** → **Opciones de desarrollador** → Activar:
   - ✅ **Depuración USB**
   - ✅ **Instalar aplicaciones vía USB**

#### Conectar dispositivo:
1. Conectar cable USB
2. Aceptar diálogo **"¿Permitir depuración USB?"**
3. En Android Studio, presionar ▶️ **Run**

### 4. Instalación manual (si hay problemas)
```bash
# Script automático
.\install-manual.bat

# O comando directo
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## 🎨 Personalización de Branding

### Aplicar iconos y splash screens personalizados
```bash
.\apply-branding.bat
```

Este script:
1. 📱 Genera iconos en todas las densidades Android (incluyendo adaptive icons)
2. 🎨 Crea splash screens personalizados
3. 📦 Construye la aplicación web
4. 🔄 Sincroniza con Capacitor

### Cambiar logo
1. Reemplazar `public/media/img/logo.png` con tu logo (recomendado: 512x512px)
2. Ejecutar `.\apply-branding.bat`

## 🔧 Scripts Disponibles

```bash
# Desarrollo
pnpm start                    # Servidor de desarrollo
pnpm build                    # Build de producción
pnpm test                     # Ejecutar tests

# Android
pnpm exec cap sync android    # Sincronizar con Capacitor
pnpm exec cap open android    # Abrir Android Studio
pnpm exec cap run android     # Build y ejecutar en dispositivo

# Branding
node generate-icons.js        # Generar iconos (con adaptive icons)
node generate-splash.js       # Generar splash screens
.\apply-branding.bat          # Aplicar branding completo
.\install-manual.bat          # Instalación manual Android
```

## 🐛 Solución de Problemas Comunes

### Error: "INSTALL_FAILED_USER_RESTRICTED"
- **Solución**: Habilitar "Instalar aplicaciones vía USB" en opciones de desarrollador

### Error: "Duplicate resources ic_launcher_background"
- **Solución**: Ejecutar `.\apply-branding.bat` para regenerar recursos

### Google Sign-In no funciona en Android
- **Verificar**: Cliente ID correcto en `capacitor.config.ts`
- **Verificar**: SHA-1 fingerprint registrado en Google Console

### App no muestra logo personalizado
- **Solución**: Ejecutar `node generate-icons.js` y `pnpm exec cap sync android`
- **Nota**: Android 8+ usa adaptive icons que necesitan foreground separado

### Problemas de safe area en Android
- **Verificar**: CSS classes `.auth-page`, `.content-page`, `.safe-area-header` aplicadas

---

**¿Listo para crear trivias increíbles? 🎯**

```bash
pnpm start
# ¡A jugar! 🎉
```

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
