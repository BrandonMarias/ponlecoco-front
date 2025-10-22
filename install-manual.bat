@echo off
echo 🔧 Instalación manual de APK...
echo.

echo 📱 Verificando dispositivo conectado...
adb devices
if %errorlevel% neq 0 (
    echo ❌ ADB no encontrado o dispositivo no conectado
    echo.
    echo 💡 Asegúrate de:
    echo    1. Tener las opciones de desarrollador habilitadas
    echo    2. Depuración USB activada
    echo    3. Cable USB conectado
    echo    4. Haber aceptado el diálogo de depuración USB
    pause
    exit /b 1
)

echo.
echo 📦 Instalando aplicación...
adb install -r "android\app\build\outputs\apk\debug\app-debug.apk"
if %errorlevel% neq 0 (
    echo.
    echo ❌ Error en instalación. Probando forzar instalación...
    adb install -r -d "android\app\build\outputs\apk\debug\app-debug.apk"
)

echo.
echo ✅ ¡Instalación completada!
echo    La app debería aparecer en tu dispositivo como "PonleCoco"
echo.
pause
