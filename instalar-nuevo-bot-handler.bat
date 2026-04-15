@echo off
REM ============================================================
REM  Instala el nuevo handler de menús en el bot WhatsApp local
REM  Ejecutar desde: docks-mantenimiento-app\
REM ============================================================

SET BOT_DIR=C:\Users\jcbru\whatsapp-claude-gpt

echo.
echo ========================================
echo  Instalando nuevo handler del bot v2.0
echo ========================================
echo.

REM Verificar que el directorio del bot existe
IF NOT EXIST "%BOT_DIR%" (
    echo [ERROR] No se encontro el directorio del bot en:
    echo         %BOT_DIR%
    echo Ajusta la variable BOT_DIR en este archivo si la ruta es distinta.
    pause
    exit /b 1
)

REM Copiar el nuevo handler
echo [1/3] Copiando bot-local-handler.js a %BOT_DIR%\src\messageHandler.js ...
IF NOT EXIST "%BOT_DIR%\src" mkdir "%BOT_DIR%\src"
copy /Y "bot-local-handler.js" "%BOT_DIR%\src\messageHandler.js"
IF ERRORLEVEL 1 (
    echo [ERROR] No se pudo copiar el archivo.
    pause
    exit /b 1
)
echo       OK

REM Verificar si ya tiene BOT_API_URL en .env
echo [2/3] Verificando .env del bot ...
findstr /C:"BOT_API_URL" "%BOT_DIR%\.env" >nul 2>&1
IF ERRORLEVEL 1 (
    echo       Agregando BOT_API_URL y BOT_API_KEY al .env del bot ...
    echo. >> "%BOT_DIR%\.env"
    echo # Servidor Docks del Puerto >> "%BOT_DIR%\.env"
    echo BOT_API_URL=http://localhost:3001 >> "%BOT_DIR%\.env"
    echo BOT_API_KEY=clave-secreta-para-el-bot-whatsapp >> "%BOT_DIR%\.env"
    echo       OK - variables agregadas
) ELSE (
    echo       Ya tiene BOT_API_URL configurado
)

REM Mostrar instruccion final
echo [3/3] Paso manual requerido:
echo.
echo   Abrí %BOT_DIR%\index.js (o el archivo principal del bot)
echo   y asegurate de que llame al nuevo handler así:
echo.
echo       require('./src/messageHandler')(client)
echo.
echo   Reemplaza cualquier client.on('message', ...) existente.
echo.
echo ========================================
echo  Instalacion completada.
echo  Reinicia el bot con: pm2 restart all
echo ========================================
echo.
pause
