param(
    [string]$BaseUrl = "http://localhost:4000/api/v1"
)

$ErrorActionPreference = "Stop"

function Invoke-ApiStatus {
    param(
        [Parameter(Mandatory = $true)][string]$Uri,
        [Parameter(Mandatory = $true)][string]$Email,
        [Parameter(Mandatory = $true)][string]$Password
    )

    $body = @{ email = $Email; password = $Password } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri $Uri -Method Post -ContentType "application/json" `
        -Body $body -SkipHttpErrorCheck
    return $response
}

Write-Host "Checking API health..."
$health = Invoke-WebRequest -Uri "$BaseUrl/health" -SkipHttpErrorCheck
if ($health.StatusCode -ne 200) {
    throw "API health check failed: HTTP $($health.StatusCode)"
}
Write-Host "API health: HTTP 200"

# Use a fresh synthetic address so earlier test runs do not consume this
# email+IP bucket. No account is created by the login endpoint.
$email = "rate-limit-$([guid]::NewGuid().ToString('N'))@example.invalid"
$password = "IntentionallyWrong-RateLimit-Test-Only"
$loginUri = "$BaseUrl/auth/login"

Write-Host "Testing the per-IP+email login limit (10 requests / 15 minutes)..."
$statuses = @()
$blockedResponse = $null
for ($attempt = 1; $attempt -le 11; $attempt++) {
    $response = Invoke-ApiStatus -Uri $loginUri -Email $email -Password $password
    $statuses += [int]$response.StatusCode
    if ($attempt -eq 11) { $blockedResponse = $response }
}

$firstTen = $statuses | Select-Object -First 10
if (@($firstTen | Where-Object { $_ -ne 401 }).Count -gt 0) {
    throw "Expected the first 10 invalid login attempts to return HTTP 401. Actual: $($statuses -join ', ')"
}
if ($statuses[10] -ne 429) {
    throw "Expected login attempt 11 to return HTTP 429. Actual: $($statuses[10])"
}

$retryAfter = $blockedResponse.Headers["Retry-After"]
if (-not $retryAfter) {
    throw "HTTP 429 response did not include the Retry-After header."
}

Write-Host "Login attempts 1-10: HTTP 401 (expected)"
Write-Host "Login attempt 11: HTTP 429 (expected)"
Write-Host "Retry-After header: $retryAfter seconds"

Write-Host "Checking that a different email has an independent email+IP bucket..."
$otherEmail = "rate-limit-other-$([guid]::NewGuid().ToString('N'))@example.invalid"
$otherResponse = Invoke-ApiStatus -Uri $loginUri -Email $otherEmail -Password $password
if ($otherResponse.StatusCode -ne 401) {
    throw "Expected a fresh email+IP bucket to reach credential validation (HTTP 401). Actual: HTTP $($otherResponse.StatusCode)"
}
Write-Host "Different email, same IP: HTTP 401 (expected; not blocked by the first email bucket)"

Write-Host ""
Write-Host "PASS: Stage 4.1 login rate-limit checks completed." -ForegroundColor Green
Write-Host "Note: registration, refresh, logout, and Redis-outage checks are documented in README-STAGE-4.1.md."
