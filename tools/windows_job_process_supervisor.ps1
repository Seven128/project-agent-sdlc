Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $IsWindows) {
    throw 'formal_process_supervisor_platform_unsupported'
}

$nativeSources = @(
    Join-Path $PSScriptRoot 'formal_process_supervisor_native_types.cs'
    Join-Path $PSScriptRoot 'formal_process_supervisor_native_run.cs'
    Join-Path $PSScriptRoot 'formal_process_supervisor_native_helpers.cs'
)
Add-Type -Path $nativeSources

while (($line = [Console]::In.ReadLine()) -ne $null) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $request = $null
    try {
        $request = $line | ConvertFrom-Json -AsHashtable
        $expected = @('schema_version', 'request_id', 'executable', 'argv', 'cwd', 'stdout_path', 'stderr_path', 'timeout_ms', 'combined_output_limit_bytes', 'environment')
        $actual = @($request.Keys | Sort-Object)
        if (@(Compare-Object ($expected | Sort-Object) $actual).Count -ne 0 -or $request.schema_version -ne 'formal-process-supervisor-request-v1') {
            throw 'formal_process_supervisor_request_shape'
        }
        $environment = @(
            $request.environment.GetEnumerator() |
                Sort-Object Key |
                ForEach-Object { '{0}={1}' -f $_.Key, $_.Value }
        )
        $result = [FormalProcessSupervisor]::Run(
            [string]$request.request_id,
            [string]$request.executable,
            [string[]]$request.argv,
            [string]$request.cwd,
            [string]$request.stdout_path,
            [string]$request.stderr_path,
            [int]$request.timeout_ms,
            [long]$request.combined_output_limit_bytes,
            [string[]]$environment
        )
        [Console]::Out.WriteLine(($result | ConvertTo-Json -Compress -Depth 8))
        [Console]::Out.Flush()
    }
    catch {
        $failure = [ordered]@{
            RequestId = if ($null -ne $request -and $request.ContainsKey('request_id')) { [string]$request.request_id } else { $null }
            Error = [string]$_.Exception.Message
        }
        [Console]::Out.WriteLine(($failure | ConvertTo-Json -Compress))
        [Console]::Out.Flush()
    }
}
