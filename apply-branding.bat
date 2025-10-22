@echo off
echo 🚀 Aplicando cambios de iconos y configuración...
echo.

echo 📱 1. Generando iconos para Android...
node generate-icons.js
if %errorlevel% neq 0 (
    echo ❌ Error generando iconos
    pause
    exit /b 1
)

echo 🎨 2. Generando splash screens...
node generate-splash.js
if %errorlevel% neq 0 (
    echo ❌ Error generando splash screens
    pause
    exit /b 1
)

echo 📦 3. Construyendo aplicación web...
pnpm build
if %errorlevel% neq 0 (
    echo ❌ Error en build
    pause
    exit /b 1
)

echo 🔄 4. Sincronizando con Capacitor...
pnpm exec cap sync android
if %errorlevel% neq 0 (
    echo ❌ Error sincronizando Capacitor
    pause
    exit /b 1
)

echo ✅ ¡Todos los cambios aplicados correctamente!
echo.
echo 📱 Para ver los cambios en Android:
echo    pnpm exec cap open android
echo.
echo 🌐 Para probar en web:
echo    pnpm start
echo.
pause
