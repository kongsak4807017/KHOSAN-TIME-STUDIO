$ErrorActionPreference = "Stop"
$Port = if ($env:KHOSAN_DEVSPACE_PORT) { $env:KHOSAN_DEVSPACE_PORT } else { "7676" }
$Domain = $env:KHOSAN_DEVSPACE_DOMAIN
if (-not $Domain) { throw "Set KHOSAN_DEVSPACE_DOMAIN to your static ngrok domain." }

$Ngrok = if ($env:KHOSAN_NGROK) { $env:KHOSAN_NGROK } else { "ngrok" }
& $Ngrok http "--url=$Domain" $Port "--log=stdout" "--pooling-enabled"
