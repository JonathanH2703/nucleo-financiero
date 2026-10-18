# =====================================================================
# NÚCLEO FINANCIERO - SCRIPT DE INICIALIZACIÓN DE ENTORNO LOCAL
# =====================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     NUCLEO FINANCIERO - INICIALIZADOR DE ENTORNO LOCAL   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Comprobar Node.js
Write-Host "`n[1/5] Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node -v 2>$null
if ($nodeVersion) {
    Write-Host "  -> Node.js detectado: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  -> ERROR: Node.js no está instalado o no se encuentra en el PATH." -ForegroundColor Red
    exit 1
}

# 2. Comprobar archivo .env
Write-Host "`n[2/5] Verificando variables de entorno (.env)..." -ForegroundColor Yellow
$envPath = Join-Path $PSScriptRoot "..\.env"
$envExamplePath = Join-Path $PSScriptRoot "..\.env.example"
if (-Not (Test-Path $envPath)) {
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Host "  -> Archivo .env generado a partir de .env.example" -ForegroundColor Green
    } else {
        Write-Host "  -> ERROR: No se encontró .env ni .env.example" -ForegroundColor Red
    }
} else {
    Write-Host "  -> Archivo .env verificado." -ForegroundColor Green
}

# 3. Instalar dependencias de Node
Write-Host "`n[3/5] Verificando dependencias npm..." -ForegroundColor Yellow
$nodeModulesPath = Join-Path $PSScriptRoot "..\node_modules"
if (-Not (Test-Path $nodeModulesPath)) {
    Write-Host "  -> Instalando paquetes npm... (esto puede tardar unos segundos)" -ForegroundColor Cyan
    Push-Location (Join-Path $PSScriptRoot "..")
    npm install
    Pop-Location
    Write-Host "  -> Paquetes instalados con éxito." -ForegroundColor Green
} else {
    Write-Host "  -> node_modules ya existe. (Omite npm install)" -ForegroundColor Green
}

# 4. Comprobar Docker y levantar servicios (PostgreSQL + MinIO)
Write-Host "`n[4/5] Verificando Docker y contenedores..." -ForegroundColor Yellow
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    Write-Host "  -> Docker detectado. Levantando Postgres y MinIO..." -ForegroundColor Green
    Push-Location (Join-Path $PSScriptRoot "..")
    docker compose up -d
    Pop-Location
    Write-Host "  -> Contenedores levantados en segundo plano." -ForegroundColor Green
    Write-Host "     - Base de Datos Postgres: localhost:5432" -ForegroundColor Gray
    Write-Host "     - API S3 MinIO:           http://localhost:9000" -ForegroundColor Gray
    Write-Host "     - Consola Web MinIO:      http://localhost:9001 (Usuario: minioadmin / Clave: minioadmin123)" -ForegroundColor Cyan
} else {
    Write-Host "  -> ADVERTENCIA: Docker no está instalado en este sistema o no está en el PATH." -ForegroundColor Yellow
    Write-Host "     Para desarrollo local tienes dos opciones:" -ForegroundColor White
    Write-Host "     A) Instalar Docker Desktop o habilitar WSL2." -ForegroundColor White
    Write-Host "     B) Usar MinIO standalone instalable con winget:" -ForegroundColor White
    Write-Host "        winget install MinIO.Server" -ForegroundColor Cyan
    Write-Host "        minio.exe server C:\minio_data --console-address :9001" -ForegroundColor Cyan
    Write-Host "        Y conectar un PostgreSQL local en el puerto 5432." -ForegroundColor White
}

# 5. Resumen
Write-Host "`n[5/5] Entorno preparado." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Para iniciar el servidor de desarrollo ejecuta:" -ForegroundColor Green
Write-Host "    npm run dev" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
