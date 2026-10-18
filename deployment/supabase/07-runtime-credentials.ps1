[CmdletBinding(DefaultParameterSetName='Connect')]
param(
 [Parameter(ParameterSetName='Check')][switch]$Check,
 [Parameter(ParameterSetName='NewSecret')][switch]$NewSecret,
 [Parameter(ParameterSetName='CopyCa')][switch]$CopyCa,
 [Parameter(ParameterSetName='CopyConnection')][ValidateSet('app_web','app_mailer')][string]$CopyConnection,
 [Parameter(ParameterSetName='ClearClipboard')][switch]$ClearClipboard,
 [Parameter(ParameterSetName='Help')][switch]$Help
)
$ErrorActionPreference='Stop'
if ($Help) {
 Write-Output 'Run from the project terminal: powershell -NoProfile -File deployment/supabase/07-runtime-credentials.ps1 -Check'
 Write-Output 'Without a switch: open a private psql prompt to the pinned hosted project; no automatic password changes.'
 Write-Output '-NewSecret: copy one cryptographically random 64-character hex value to the Windows clipboard; never print/save it.'
 Write-Output '-CopyCa: copy the verified public Supabase root CA for DATABASE_CA_CERT; no value printed.'
 Write-Output '-CopyConnection app_web (or app_mailer): prompt privately and copy its encoded connection URL; no network/write/save.'
 Write-Output '-ClearClipboard: clear the clipboard after transferring your secrets to the password manager/provider settings.'
 return
}
if ($ClearClipboard) { Set-Clipboard -Value ''; Write-Output 'Clipboard cleared.'; return }
if ($NewSecret) {
 $runtimeSecretBytes=New-Object byte[] 32
 $runtimeSecretGenerator=[System.Security.Cryptography.RandomNumberGenerator]::Create()
 try {
  $runtimeSecretGenerator.GetBytes($runtimeSecretBytes)
  $runtimeClipboardSecret=[System.BitConverter]::ToString($runtimeSecretBytes).Replace('-','').ToLowerInvariant()
  Set-Clipboard -Value $runtimeClipboardSecret
 } finally { $runtimeSecretGenerator.Dispose();[System.Array]::Clear($runtimeSecretBytes,0,$runtimeSecretBytes.Length);$runtimeClipboardSecret=$null }
 Write-Output 'One NEW random secret copied to clipboard. Save it privately with its intended name before generating another. No value printed or written to a file.'
 return
}
$runtimeProjectRef='vdpflzhsohhvvwdrjzhd'
$runtimeExpectedHost='aws-0-eu-west-1.pooler.supabase.com'
$runtimeRepoRoot=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$runtimeReleaseRoot=Join-Path $runtimeRepoRoot ('.local/hosted-staging-'+$runtimeProjectRef)
$runtimeLinkedRef=(Get-Content -LiteralPath (Join-Path $runtimeReleaseRoot 'supabase/.temp/project-ref') -Raw).Trim()
if ($runtimeLinkedRef -ne $runtimeProjectRef) { throw 'Unexpected linked release project. No connection started.' }
if (Test-Path -LiteralPath (Join-Path $runtimeRepoRoot 'supabase/.temp/project-ref')) { throw 'The ordinary Podman checkout must remain unlinked.' }
$runtimePoolerUri=[uri](Get-Content -LiteralPath (Join-Path $runtimeReleaseRoot 'supabase/.temp/pooler-url') -Raw).Trim()
if ($runtimePoolerUri.Scheme -notin @('postgres','postgresql') -or $runtimePoolerUri.Host -ne $runtimeExpectedHost -or $runtimePoolerUri.Port -ne 5432 -or $runtimePoolerUri.AbsolutePath -ne '/postgres') { throw 'Unexpected hosted pooler configuration. No connection started.' }
$runtimePodman=Join-Path $env:LOCALAPPDATA 'Programs/Podman/podman.exe'
if (-not (Test-Path -LiteralPath $runtimePodman)) { throw 'Expected local Podman executable is unavailable.' }
if ($CopyConnection) {
 $runtimePrivateInput=Read-Host ('Enter the new '+$CopyConnection+' hosted database password') -AsSecureString
 $runtimePrivatePointer=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($runtimePrivateInput)
 try {
  $runtimePrivateValue=[System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($runtimePrivatePointer)
  if ([string]::IsNullOrEmpty($runtimePrivateValue)) { throw 'A database role password is required.' }
  $runtimePrivateUrl='postgresql://'+$CopyConnection+'.'+$runtimeProjectRef+':'+[uri]::EscapeDataString($runtimePrivateValue)+'@'+$runtimeExpectedHost+':5432/postgres'
  Set-Clipboard -Value $runtimePrivateUrl
 } finally {
  [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($runtimePrivatePointer)
  $runtimePrivateInput.Dispose();$runtimePrivateValue=$null;$runtimePrivateUrl=$null
 }
 $runtimeVariable=if ($CopyConnection -eq 'app_web') {'DATABASE_URL'} else {'MAILER_DATABASE_URL'}
 Write-Output ($runtimeVariable+' copied to clipboard. Paste only into its protected provider setting. No value printed/saved and no connection attempted.')
 return
}
$runtimeCaPath=Join-Path $runtimeReleaseRoot 'certs/supabase-root.crt'
$runtimeCaUrl='https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt'
# Public Supabase CA, from the official Studio ssl:certificate_url configuration.
# Fingerprint identifies a public trust anchor, not a credential.
$runtimeCaFileSha256='700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7'
if (-not (Test-Path -LiteralPath $runtimeCaPath)) {
 if ($Check) { throw 'Official Supabase CA is missing. Run the normal command to download it over verified HTTPS.' }
 New-Item -ItemType Directory -Path (Split-Path -Parent $runtimeCaPath) -Force | Out-Null
 Invoke-WebRequest -UseBasicParsing -Uri $runtimeCaUrl -OutFile $runtimeCaPath -TimeoutSec 15
}
if ((Get-FileHash -LiteralPath $runtimeCaPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $runtimeCaFileSha256) { throw 'Supabase CA fingerprint mismatch. Stop for review; no connection started.' }
$runtimeContainerCaPath='/tmp/abaynou-staging-vdpflzhsohhvvwdrjzhd-root.crt'
if ($CopyCa) { Set-Clipboard -Value (Get-Content -LiteralPath $runtimeCaPath -Raw).Trim(); Write-Output 'Verified public CA copied for DATABASE_CA_CERT. No database connection or secret change.'; return }
if ($Check) {
 Write-Output ('Ready: hosted project '+$runtimeProjectRef+'; session pooler '+$runtimeExpectedHost+':5432; TLS verify-full.')
 Write-Output 'Pinned target and official Supabase CA checksum checked offline. No database connection, password generation, clipboard access or database write performed.'
 return
}
& $runtimePodman cp $runtimeCaPath ('supabase_db_Abaynou_Tatawasal:'+$runtimeContainerCaPath)
if ($LASTEXITCODE -ne 0) { throw 'Unable to copy the public CA into the client container. No connection started.' }
Write-Output ('Opening the existing psql client for HOSTED project '+$runtimeProjectRef+' (Ireland).')
Write-Output 'The first hidden prompt requests the hosted postgres database password. No password is passed on the command line.'
Write-Output 'After verifying the connection, use: SET password_encryption = ''scram-sha-256'';'
Write-Output 'Then run \password app_web and \password app_mailer separately, using different new secrets saved in your password manager.'
Write-Output 'These are database service passwords, not Citizen/staff account passwords. Type \q when finished.'
& $runtimePodman exec -it -e PGSSLMODE=verify-full -e PGSSLROOTCERT=$runtimeContainerCaPath -e PGCONNECT_TIMEOUT=10 -e PSQL_HISTORY=/dev/null supabase_db_Abaynou_Tatawasal psql -X -W -v ON_ERROR_STOP=1 -P pager=off -h $runtimeExpectedHost -p 5432 -U ('postgres.'+$runtimeProjectRef) -d postgres
if ($LASTEXITCODE -ne 0) { throw 'psql did not finish successfully. Share only the safe error; do not weaken TLS verification or paste credentials.' }
