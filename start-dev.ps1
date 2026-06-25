$url = "https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip"
$zipPath = "$PSScriptRoot\node-portable-22.zip"
$nodeDir = "$PSScriptRoot\.node-portable"
$nodeExe = "$PSScriptRoot\.node-portable\node-v22.14.0-win-x64\node.exe"

if (!(Test-Path $nodeExe)) {
    Write-Host "Descargando Node.js v22.14.0..."
    Invoke-WebRequest -Uri $url -OutFile $zipPath
    Write-Host "Extrayendo... esto tomará unos segundos..."
    Expand-Archive -Path $zipPath -DestinationPath $nodeDir -Force
    Remove-Item $zipPath -Force
}

$env:PATH = "$PSScriptRoot\.node-portable\node-v22.14.0-win-x64;" + $env:PATH
Write-Host "Iniciando servidor de desarrollo con Vite..."
npm run dev
