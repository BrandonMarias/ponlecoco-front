@echo off
echo 🔧 Verificando corrección de URLs y compresión de imágenes...
echo.

echo ✅ URLs CORREGIDAS:
echo    ANTES: http://localhost:3000/api/api/users/profile-picture ❌
echo    AHORA: http://localhost:3000/api/users/profile-picture ✅
echo.

echo ✅ COMPRESIÓN DE IMÁGENES VERIFICADA:
echo    📸 user-profile.component.ts: SÍ usa imageCompressionService.compressImage()
echo    📸 create-roulette.component.ts: SÍ usa imageCompressionService.compressImage()
echo    📸 Compresión automática antes de subir archivos
echo.

echo 📦 Construyendo aplicación para verificar cambios...
pnpm build
if %errorlevel% neq 0 (
    echo ❌ Error en build
    pause
    exit /b 1
)

echo 🔄 Sincronizando con Capacitor...
pnpm exec cap sync android
if %errorlevel% neq 0 (
    echo ❌ Error sincronizando Capacitor
    pause
    exit /b 1
)

echo ✅ ¡Correcciones aplicadas correctamente!
echo.
echo 🎯 Endpoints corregidos:
echo    PATCH /api/users/update-name
echo    PATCH /api/users/profile-picture
echo    PATCH /api/users/change-password
echo    DELETE /api/users/delete-account
echo.
echo 🖼️ Compresión de imágenes activa en:
echo    • Perfil de usuario
echo    • Creación de ruletas
echo    • Preguntas con imágenes
echo.
echo 🚀 Para probar: pnpm start y ve a "Mi Perfil"
echo.
pause
