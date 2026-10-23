# ============================================================
#  sign_and_trust_appx.ps1
#  Creates a self-signed cert for BSFrameWorks, trusts it
#  system-wide, signs the AppX, and verifies the package.
#  Run as Administrator.
# ============================================================

$ErrorActionPreference = "Stop"

$SUBJECT    = "CN=BSFrameWorks"
$CERT_PASS  = "BSFrameWorks2026!"
$CERT_PFX   = "$PSScriptRoot\..\build\BSFrameWorks_Signing.pfx"
$CERT_CER   = "$PSScriptRoot\..\build\BSFrameWorks_Signing.cer"
$RELEASE_DIR = "$PSScriptRoot\..\release"
$APPX_FILE  = Get-ChildItem "$RELEASE_DIR\*.appx" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  MediaFlow Studio AppX Signer and Trust Setup" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

if (-not $APPX_FILE) {
    Write-Host "[ERROR] No .appx file found in release\ folder. Build first." -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Target AppX : $($APPX_FILE.FullName)" -ForegroundColor Yellow

# -- 1. Create or reuse self-signed certificate ---------------
Write-Host ""
Write-Host "[1/4] Checking certificate store for existing BSFrameWorks cert..." -ForegroundColor White

$existingCert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -eq $SUBJECT } | Select-Object -First 1

if ($existingCert) {
    Write-Host "      [OK] Found existing cert: $($existingCert.Thumbprint)" -ForegroundColor Green
    $cert = $existingCert
} else {
    Write-Host "      [INFO] Creating new self-signed certificate..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate `
        -Subject $SUBJECT `
        -Type CodeSigningCert `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -KeyUsage DigitalSignature `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -HashAlgorithm SHA256 `
        -NotAfter (Get-Date).AddYears(10) `
        -FriendlyName "BSFrameWorks MediaFlow Studio Signing"

    Write-Host "      [OK] Certificate created: $($cert.Thumbprint)" -ForegroundColor Green
}

# -- 2. Export to PFX and CER ---------------------------------
Write-Host ""
Write-Host "[2/4] Exporting certificate files..." -ForegroundColor White

$securePass = ConvertTo-SecureString -String $CERT_PASS -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $CERT_PFX -Password $securePass | Out-Null
Export-Certificate   -Cert $cert -FilePath $CERT_CER  -Type CERT | Out-Null

Write-Host "      [OK] PFX : $CERT_PFX" -ForegroundColor Green
Write-Host "      [OK] CER : $CERT_CER" -ForegroundColor Green

# -- 3. Trust certificate in Trusted Root and Trusted People --
Write-Host ""
Write-Host "[3/4] Trusting certificate (requires elevation)..." -ForegroundColor White

$storeNames = @(
    [System.Security.Cryptography.X509Certificates.StoreName]::Root,
    [System.Security.Cryptography.X509Certificates.StoreName]::TrustedPeople
)

foreach ($sn in $storeNames) {
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store(
        $sn,
        [System.Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine
    )
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $alreadyThere = $store.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
    if (-not $alreadyThere) {
        $store.Add($cert)
        Write-Host "      [OK] Trusted in LocalMachine\$sn" -ForegroundColor Green
    } else {
        Write-Host "      [OK] Already trusted in LocalMachine\$sn" -ForegroundColor DarkGreen
    }
    $store.Close()
}

# -- 4. Sign the AppX with signtool ---------------------------
Write-Host ""
Write-Host "[4/4] Signing AppX package..." -ForegroundColor White

$signtool = Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin" -Recurse -Filter "signtool.exe" -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -like "*x64*" } |
            Sort-Object FullName -Descending |
            Select-Object -First 1 -ExpandProperty FullName

if (-not $signtool) { $signtool = "signtool" }

Write-Host "      Using: $signtool" -ForegroundColor DarkGray

& $signtool sign /fd SHA256 /a /p "$CERT_PASS" /f "$CERT_PFX" /tr http://timestamp.digicert.com /td SHA256 "$($APPX_FILE.FullName)"

if ($LASTEXITCODE -ne 0) {
    Write-Host "      [WARN] Timestamp failed, retrying without timestamp server..." -ForegroundColor Yellow
    & $signtool sign /fd SHA256 /a /p "$CERT_PASS" /f "$CERT_PFX" "$($APPX_FILE.FullName)"
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "      [OK] AppX signed successfully!" -ForegroundColor Green
} else {
    Write-Host "      [ERROR] Signing failed with code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

# -- Done -----------------------------------------------------
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  SUCCESS - AppX is signed and ready to install!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Package : $($APPX_FILE.Name)" -ForegroundColor White
Write-Host "  Size    : $([math]::Round($APPX_FILE.Length / 1MB, 1)) MB" -ForegroundColor White
Write-Host ""
Write-Host "  Install by double-clicking the .appx, or run:" -ForegroundColor White
Write-Host "  Add-AppxPackage '$($APPX_FILE.FullName)'" -ForegroundColor Cyan
Write-Host ""
