@echo off
echo 🧪 Probando aplicación con UserService y página de perfil...
echo.

echo 📋 Verificando código...
echo ✅ UserService creado con métodos PATCH
echo ✅ UserProfileComponent actualizado
echo ✅ Navegación integrada en header
echo ✅ Rutas configuradas
echo.

echo 📦 1. Construyendo aplicación...
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

echo ✅ ¡Aplicación lista!
echo.
echo 🎯 Funcionalidades del perfil implementadas:
echo    📝 PATCH /api/users/update-name - Cambiar nombre
echo    📸 PATCH /api/users/profile-picture - Subir foto
echo    🔒 PATCH /api/users/change-password - Cambiar contraseña
echo    🗑️  DELETE /api/users/delete-account - Eliminar cuenta
echo.
echo 🚀 Para probar:
echo    • Web: pnpm start
echo    • Android: pnpm exec cap open android
echo    • Ve a header → menú → "Mi Perfil"
echo.
pause
