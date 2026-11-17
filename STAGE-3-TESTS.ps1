# Run from the Nomadly repository root while `pnpm dev` is running.
# Credentials are prompted securely unless supplied through environment variables.
$ErrorActionPreference = "Stop"
$base = "http://localhost:4000/api/v1"

$email = $env:NOMADLY_TEST_EMAIL
if (-not $email) {
    $email = Read-Host "Nomadly test account email"
}

$password = $env:NOMADLY_TEST_PASSWORD
if (-not $password) {
    $securePassword = Read-Host "Nomadly test account password" -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try {
        $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
}

function Get-SessionIdFromJwt([string]$Token) {
    $parts = $Token.Split(".")
    if ($parts.Length -ne 3) { throw "The access token is not a valid JWT shape." }

    $payload = $parts[1].Replace("-", "+").Replace("_", "/")
    switch ($payload.Length % 4) {
        2 { $payload += "==" }
        3 { $payload += "=" }
        1 { throw "The access token payload has invalid base64url encoding." }
    }

    $json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload))
    return ($json | ConvertFrom-Json).sid
}

function New-NomadlySession {
    $jar = $null
    Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" `
        -Body (@{ email = $email; password = $password } | ConvertTo-Json) `
        -SessionVariable jar | Out-Null

    $access = ($jar.Cookies.GetCookies([uri]"http://localhost:4000/api/v1/auth/me") |
        Where-Object Name -eq "nomadly_access").Value
    $refresh = ($jar.Cookies.GetCookies([uri]"http://localhost:4000/api/v1/auth/refresh") |
        Where-Object Name -eq "nomadly_refresh").Value

    if (-not $access -or -not $refresh) {
        throw "Login did not issue both auth cookies. Check the API login response and cookie configuration."
    }

    return @{
        Jar = $jar
        Access = $access
        Refresh = $refresh
        SessionId = Get-SessionIdFromJwt $access
    }
}

function Get-HttpStatus([scriptblock]$Action) {
    try {
        & $Action | Out-Null
        return 200
    }
    catch {
        if ($_.Exception.Response) {
            return [int]$_.Exception.Response.StatusCode
        }
        throw
    }
}

function Get-RefreshStatus($Session) {
    return Get-HttpStatus {
        Invoke-WebRequest -Uri "$base/auth/refresh" -Method Post -Headers @{
            Cookie = "nomadly_refresh=$($Session.Refresh)"
            "X-Refresh-Request-Id" = [guid]::NewGuid().ToString()
        }
    }
}

Write-Host "Creating two fresh login sessions..."
$sessionA = New-NomadlySession
$sessionB = New-NomadlySession

if ($sessionA.SessionId -eq $sessionB.SessionId) {
    throw "Two independent logins unexpectedly received the same session ID."
}

$sessionsResponse = Invoke-RestMethod -Uri "$base/auth/sessions" -WebSession $sessionA.Jar
$sessions = @($sessionsResponse.sessions)
$current = $sessions | Where-Object { $_.id -eq $sessionA.SessionId -and $_.isCurrent } | Select-Object -First 1
$other = $sessions | Where-Object { $_.id -eq $sessionB.SessionId } | Select-Object -First 1

Write-Host "Active sessions visible: $($sessions.Count)"
if (-not $current) {
    throw "Session A was not returned as the current active session."
}
if (-not $other) {
    throw "Session B was not returned as an active session."
}

Write-Host "Both independent sessions were found."
Write-Host "Revoking session B..."
Invoke-RestMethod -Uri "$base/auth/sessions/$($sessionB.SessionId)" -Method Delete -WebSession $sessionA.Jar | Out-Null

$revokedAccessStatus = Get-HttpStatus {
    Invoke-WebRequest -Uri "$base/auth/me" -Headers @{ Cookie = "nomadly_access=$($sessionB.Access)" }
}
$revokedRefreshStatus = Get-RefreshStatus $sessionB
$currentStatus = Get-HttpStatus {
    Invoke-WebRequest -Uri "$base/auth/me" -WebSession $sessionA.Jar
}

Write-Host "Session B access token after revocation: HTTP $revokedAccessStatus (expected 401)"
Write-Host "Session B refresh token after revocation: HTTP $revokedRefreshStatus (expected 401)"
Write-Host "Session A /auth/me after revoking B: HTTP $currentStatus (expected 200)"

if ($revokedAccessStatus -ne 401 -or $revokedRefreshStatus -ne 401 -or $currentStatus -ne 200) {
    throw "Individual session revocation checks failed."
}

Write-Host "Testing logout-all..."
Invoke-RestMethod -Uri "$base/auth/logout-all" -Method Post -WebSession $sessionA.Jar | Out-Null

$allAccessStatus = Get-HttpStatus {
    Invoke-WebRequest -Uri "$base/auth/me" -Headers @{ Cookie = "nomadly_access=$($sessionA.Access)" }
}
$allRefreshStatus = Get-RefreshStatus $sessionA

Write-Host "Session A access token after logout-all: HTTP $allAccessStatus (expected 401)"
Write-Host "Session A refresh token after logout-all: HTTP $allRefreshStatus (expected 401)"

if ($allAccessStatus -ne 401 -or $allRefreshStatus -ne 401) {
    throw "Logout-all did not invalidate both access and refresh credentials."
}

Write-Host "Testing single-session logout..."
$sessionC = New-NomadlySession
Invoke-RestMethod -Uri "$base/auth/logout" -Method Post -WebSession $sessionC.Jar | Out-Null

$logoutAccessStatus = Get-HttpStatus {
    Invoke-WebRequest -Uri "$base/auth/me" -Headers @{ Cookie = "nomadly_access=$($sessionC.Access)" }
}
$logoutRefreshStatus = Get-RefreshStatus $sessionC

Write-Host "Session C access token after logout: HTTP $logoutAccessStatus (expected 401)"
Write-Host "Session C refresh token after logout: HTTP $logoutRefreshStatus (expected 401)"

if ($logoutAccessStatus -ne 401 -or $logoutRefreshStatus -ne 401) {
    throw "Single-session logout did not invalidate both access and refresh credentials."
}

Write-Host ""
Write-Host "PASS: Stage 3 session security checks completed successfully." -ForegroundColor Green

# Drop plaintext password from this script's scope as soon as tests finish.
$password = $null
