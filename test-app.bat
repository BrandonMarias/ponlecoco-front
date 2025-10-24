@echo off
echo 🚀 Probando aplicación con nuevos iconos y perfil de usuario...
echo.

echo 📦 1. Construyendo aplicación web...
pnpm build
if %errorlevel% neq 0 (
    echo ❌ Error en build
    pause
    exit /b 1
)

echo 🔄 2. Sincronizando con Capacitor...
pnpm exec cap sync android
if %errorlevel% neq 0 (
    echo ❌ Error sincronizando Capacitor
    pause
    exit /b 1
)

echo 📱 3. Abriendo en Android Studio...
pnpm exec cap open android

echo ✅ ¡Aplicación lista para probar!
echo.
echo 🎯 Nuevas funcionalidades disponibles:
echo    • Iconos personalizados con adaptive support
echo    • Página de perfil de usuario accesible desde el header
echo    • Cambio de nombre, foto de perfil y contraseña
echo    • Opción para eliminar cuenta
echo.
echo 🌐 Para probar en web:
echo    pnpm start
echo.
pause
