Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8

if ([System.Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) {
    throw 'formal_process_supervisor_platform_unsupported'
}

$nativeSources = @(
    Join-Path $PSScriptRoot 'formal_process_supervisor_native_types.cs'
    Join-Path $PSScriptRoot 'formal_process_supervisor_native_run.cs'
    Join-Path $PSScriptRoot 'formal_process_supervisor_native_helpers.cs'
)
Add-Type -Path $nativeSources

function Get-ExactProperty {
    param(
        [Parameter(Mandatory = $true)] [object] $Object,
        [Parameter(Mandatory = $true)] [string] $Name
    )
    $matches = @($Object.PSObject.Properties | Where-Object { $_.Name -ceq $Name })
    if ($matches.Count -ne 1) { throw 'formal_process_supervisor_request_shape' }
    return $matches[0]
}

while (($line = [Console]::In.ReadLine()) -ne $null) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $request = $null
    $requestId = $null
    $requestStage = 'json'
    try {
        [FormalProcessSupervisor]::AssertUniqueJsonObjectKeys($line)
        $request = $line | ConvertFrom-Json
        if ($null -eq $request -or $request -is [System.Array] -or $request -is [string]) {
            throw 'formal_process_supervisor_request_shape'
        }
        $expected = @('schema_version', 'request_id', 'executable', 'argv', 'cwd', 'stdout_path', 'stderr_path', 'timeout_ms', 'combined_output_limit_bytes', 'environment')
        $actual = @($request.PSObject.Properties | ForEach-Object { $_.Name } | Sort-Object)
        $requestStage = 'fields'
        if (@(Compare-Object ($expected | Sort-Object) $actual -CaseSensitive).Count -ne 0) {
            throw 'formal_process_supervisor_request_shape'
        }
        $requestStage = 'properties'
        $schemaVersion = (Get-ExactProperty $request 'schema_version').Value
        $requestId = (Get-ExactProperty $request 'request_id').Value
        $executable = (Get-ExactProperty $request 'executable').Value
        $argv = (Get-ExactProperty $request 'argv').Value
        $cwd = (Get-ExactProperty $request 'cwd').Value
        $stdoutPath = (Get-ExactProperty $request 'stdout_path').Value
        $stderrPath = (Get-ExactProperty $request 'stderr_path').Value
        $timeoutMs = (Get-ExactProperty $request 'timeout_ms').Value
        $combinedOutputLimit = (Get-ExactProperty $request 'combined_output_limit_bytes').Value
        $environmentObject = (Get-ExactProperty $request 'environment').Value
        $requestStage = 'values'
        if ($schemaVersion -isnot [string] -or $schemaVersion -cne 'formal-process-supervisor-request-v1' -or
            $requestId -isnot [string] -or $executable -isnot [string] -or $cwd -isnot [string] -or
            $stdoutPath -isnot [string] -or $stderrPath -isnot [string] -or
            $argv -isnot [System.Array] -or
            (($timeoutMs -isnot [int]) -and ($timeoutMs -isnot [long])) -or
            (($combinedOutputLimit -isnot [int]) -and ($combinedOutputLimit -isnot [long])) -or
            $null -eq $environmentObject -or $environmentObject -is [System.Array] -or $environmentObject -is [string]) {
            throw 'formal_process_supervisor_request_shape'
        }
        foreach ($argument in $argv) {
            if ($argument -isnot [string]) { throw 'formal_process_supervisor_request_shape' }
        }
        $requestStage = 'environment'
        $seenEnvironment = @{}
        $environment = @(
            $environmentObject.PSObject.Properties |
                Sort-Object Name |
                ForEach-Object {
                    $environmentName = [string]$_.Name
                    if ($seenEnvironment.ContainsKey($environmentName)) {
                        throw ('formal_process_supervisor_request_shape:environment_duplicate:{0}' -f $environmentName)
                    }
                    if ([string]::IsNullOrEmpty($environmentName) -or
                        $environmentName.IndexOf([char]61) -ge 0 -or
                        $environmentName.IndexOf([char]0) -ge 0 -or
                        $environmentName.IndexOf([char]13) -ge 0 -or
                        $environmentName.IndexOf([char]10) -ge 0) {
                        throw ('formal_process_supervisor_request_shape:environment_name:{0}' -f $environmentName)
                    }
                    if ($_.Value -isnot [string]) {
                        throw ('formal_process_supervisor_request_shape:environment_value:{0}:{1}' -f $environmentName, $_.Value.GetType().FullName)
                    }
                    $seenEnvironment[$environmentName] = $true
                    '{0}={1}' -f $environmentName, $_.Value
                }
        )
        $requestStage = 'native_run'
        $result = [FormalProcessSupervisor]::Run(
            [string]$requestId,
            [string]$executable,
            [string[]]$argv,
            [string]$cwd,
            [string]$stdoutPath,
            [string]$stderrPath,
            [int]$timeoutMs,
            [long]$combinedOutputLimit,
            [string[]]$environment
        )
        [Console]::Out.WriteLine(($result | ConvertTo-Json -Compress -Depth 8))
        [Console]::Out.Flush()
    }
    catch {
        $failure = [ordered]@{
            RequestId = if ($requestId -is [string]) { [string]$requestId } else { $null }
            Error = '{0}:{1}' -f $requestStage, [string]$_.Exception.Message
        }
        [Console]::Out.WriteLine(($failure | ConvertTo-Json -Compress))
        [Console]::Out.Flush()
    }
}
