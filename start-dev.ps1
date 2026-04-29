# =====================================================
# URGmetEO - Script de demarrage developpement
# Usage: .\start-dev.ps1
# =====================================================

$ROOT = "c:\Users\SOLUTIONS\Documents\FDS_EN\Projet_Final\Projet-Final-EN"
$BACKEND = "$ROOT\code-source\meteoAPI"
$FRONTEND = "$ROOT\code-source\meteoUI\URGmetEO"
$ENV_FILE = "$FRONTEND\.env"
$TUNNEL_LOG = "$env:TEMP\urgmeteo-tunnel.log"
$HELPER_SCRIPT = "$env:TEMP\urgmeteo-tunnel-helper.ps1"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  URGmetEO - Demarrage environnement" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Arreter les anciens processus Node
Write-Host "[1/4] Arret des anciens processus..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
Write-Host "      OK" -ForegroundColor Green

# 2. Demarrer le backend
Write-Host "[2/4] Demarrage du backend API..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BACKEND'; Write-Host '=== Backend API ===' -ForegroundColor Cyan; node server.js"
Start-Sleep -Seconds 3
Write-Host "      Backend demarre sur http://localhost:3000" -ForegroundColor Green

# 3. Demarrer localtunnel via un script helper PowerShell
Write-Host "[3/4] Creation du tunnel public pour le backend..." -ForegroundColor Yellow
if (Test-Path $TUNNEL_LOG) { Remove-Item $TUNNEL_LOG -Force }

# Creer le script helper qui ecrit la sortie dans le log
$helperContent = @"
`$log = '$TUNNEL_LOG'
Write-Host '=== Tunnel Backend ===' -ForegroundColor Cyan
Write-Host 'Demarrage de localtunnel...' -ForegroundColor Yellow
npx localtunnel --port 3000 2>&1 | ForEach-Object {
    `$line = `$_.ToString()
    `$line | Out-File -FilePath `$log -Append -Encoding utf8
    Write-Host `$line
}
"@
Set-Content -Path $HELPER_SCRIPT -Value $helperContent -Encoding utf8

# Lancer le helper dans une nouvelle fenetre PowerShell
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $HELPER_SCRIPT

# Attendre que l'URL apparaisse dans le log
$tunnelUrl = $null
$attempts = 0
while (-not $tunnelUrl -and $attempts -lt 30) {
    Start-Sleep -Seconds 2
    $attempts++
    if (Test-Path $TUNNEL_LOG) {
        $content = Get-Content $TUNNEL_LOG -Raw -ErrorAction SilentlyContinue
        if ($content -match "your url is: (https://\S+)") {
            $tunnelUrl = $matches[1].Trim()
        }
    }
    Write-Host "      Attente tunnel... ($attempts/30)" -ForegroundColor DarkGray
}

if (-not $tunnelUrl) {
    Write-Host "      ERREUR: Impossible d'obtenir l'URL du tunnel" -ForegroundColor Red
    Write-Host "      Lance manuellement: npx localtunnel --port 3000" -ForegroundColor Red
    exit 1
}

Write-Host "      Tunnel actif: $tunnelUrl" -ForegroundColor Green

# 4. Mettre a jour le .env avec la nouvelle URL
Write-Host "[4/4] Mise a jour du .env frontend..." -ForegroundColor Yellow
$envContent = Get-Content $ENV_FILE -Raw -ErrorAction SilentlyContinue
if (-not $envContent) { $envContent = "" }
if ($envContent -match "EXPO_PUBLIC_API_URL=") {
    $envContent = $envContent -replace "EXPO_PUBLIC_API_URL=.*", "EXPO_PUBLIC_API_URL=$tunnelUrl"
} else {
    $envContent = $envContent.TrimEnd() + "`nEXPO_PUBLIC_API_URL=$tunnelUrl"
}
Set-Content $ENV_FILE $envContent.TrimEnd() -Encoding utf8
Write-Host "      EXPO_PUBLIC_API_URL=$tunnelUrl" -ForegroundColor Green

# 5. Demarrer Expo
Write-Host ""
Write-Host "Demarrage d'Expo (cache efface)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$FRONTEND'; Write-Host '=== Expo ===' -ForegroundColor Cyan; npx expo start --clear --tunnel"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Tout est demarre !" -ForegroundColor Green
Write-Host "  Backend  : http://localhost:3000" -ForegroundColor White
Write-Host "  Tunnel   : $tunnelUrl" -ForegroundColor White
Write-Host "  Expo     : Scanne le QR code" -ForegroundColor White
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
