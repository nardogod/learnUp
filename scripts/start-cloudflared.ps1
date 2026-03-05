# Baixa e executa cloudflared para expor localhost:3000
# Uso: .\scripts\start-cloudflared.ps1

$cloudflaredPath = "$PSScriptRoot\..\cloudflared.exe"
$cloudflaredUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"

if (-not (Test-Path $cloudflaredPath)) {
    Write-Host "Baixando cloudflared..."
    Invoke-WebRequest -Uri $cloudflaredUrl -OutFile $cloudflaredPath -UseBasicParsing
    Write-Host "Download concluido."
}

Write-Host ""
Write-Host "Iniciando tunel para http://localhost:3000"
Write-Host "Copie a URL https://xxx.trycloudflare.com e execute:"
Write-Host "  npm run webhook:local -- https://SUA_URL.trycloudflare.com"
Write-Host ""
& $cloudflaredPath tunnel --url http://localhost:3000
