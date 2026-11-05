$ErrorActionPreference = 'Stop'
$target = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../.audit/tls'))
New-Item -ItemType Directory -Force -Path $target | Out-Null
$rsa = [System.Security.Cryptography.RSA]::Create(2048)
try {
    $request = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=localhost', $rsa, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
    $names = [System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
    $names.AddDnsName('localhost')
    $names.AddIpAddress([System.Net.IPAddress]::Loopback)
    $request.CertificateExtensions.Add($names.Build())
    $certificate = $request.CreateSelfSigned([DateTimeOffset]::UtcNow.AddMinutes(-5), [DateTimeOffset]::UtcNow.AddDays(1))
    $base64 = [Convert]::ToBase64String($certificate.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert), [Base64FormattingOptions]::InsertLineBreaks)
    [System.IO.File]::WriteAllText((Join-Path $target 'certificate.pem'), "-----BEGIN CERTIFICATE-----`n$base64`n-----END CERTIFICATE-----`n")
    function Convert-Base64Url([byte[]] $bytes) { [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_') }
    $parameters = $rsa.ExportParameters($true)
    $key = @{ kty = 'RSA'; n = Convert-Base64Url $parameters.Modulus; e = Convert-Base64Url $parameters.Exponent; d = Convert-Base64Url $parameters.D; p = Convert-Base64Url $parameters.P; q = Convert-Base64Url $parameters.Q; dp = Convert-Base64Url $parameters.DP; dq = Convert-Base64Url $parameters.DQ; qi = Convert-Base64Url $parameters.InverseQ }
    [System.IO.File]::WriteAllText((Join-Path $target 'private-key.jwk'), ($key | ConvertTo-Json -Compress))
    Write-Output 'Created a one-day localhost test certificate without adding it to a trust store.'
} finally { $rsa.Dispose() }
