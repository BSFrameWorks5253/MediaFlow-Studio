$ErrorActionPreference = "Stop"

$SUBJECT     = "CN=B2B152C3-5239-413B-BE54-035AA6AFF1E"
$CERT_PASS   = "BSFrameWorks2026!"
$CERT_PFX    = "build\PartnerStore_Signing.pfx"
$CERT_CER    = "build\PartnerStore_Signing.cer"
$APPX_FILE   = "release\MediaFlow Studio_Store_v5.0.0.appx"
$SIGNTOOL    = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe"

Write-Host "=== Setting up Certificate for Store AppX Local Testing ===" -ForegroundColor Cyan

# 1. Look for existing cert or create a new one matching Publisher CN
$existing = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -eq $SUBJECT } | Select-Object -First 1
if ($existing) {
    Write-Host "[OK] Existing certificate found: $($existing.Thumbprint)" -ForegroundColor Green
    $cert = $existing
} else {
    Write-Host "[INFO] Generating code signing certificate matching $SUBJECT..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate `
        -Subject $SUBJECT `
        -Type CodeSigningCert `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -KeyUsage DigitalSignature `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -HashAlgorithm SHA256 `
        -NotAfter (Get-Date).AddYears(10) `
        -FriendlyName "BS.Framework Partner Store Local Signing"
    Write-Host "[OK] Created certificate: $($cert.Thumbprint)" -ForegroundColor Green
}

# 2. Export PFX and CER
$securePass = ConvertTo-SecureString -String $CERT_PASS -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $CERT_PFX -Password $securePass | Out-Null
Export-Certificate   -Cert $cert -FilePath $CERT_CER  -Type CERT | Out-Null
Write-Host "[OK] Exported PFX and CER to build\" -ForegroundColor Green

# 3. Add to CurrentUser TrustedPeople (does not require admin rights!)
$userStore = New-Object System.Security.Cryptography.X509Certificates.X509Store(
    [System.Security.Cryptography.X509Certificates.StoreName]::TrustedPeople,
    [System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser
)
$userStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
$found = $userStore.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
if (-not $found) {
    $userStore.Add($cert)
    Write-Host "[OK] Added certificate to CurrentUser\TrustedPeople store" -ForegroundColor Green
} else {
    Write-Host "[OK] Certificate already present in CurrentUser\TrustedPeople" -ForegroundColor DarkGreen
}
$userStore.Close()

# 4. Sign the AppX file
if (Test-Path $APPX_FILE) {
    Write-Host "[INFO] Signing $APPX_FILE..." -ForegroundColor Yellow
    & "$SIGNTOOL" sign /fd SHA256 /a /p "$CERT_PASS" /f "$CERT_PFX" "$APPX_FILE"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] AppX signed successfully with matching publisher identity!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Signing failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[ERROR] AppX file not found: $APPX_FILE" -ForegroundColor Red
    exit 1
}
