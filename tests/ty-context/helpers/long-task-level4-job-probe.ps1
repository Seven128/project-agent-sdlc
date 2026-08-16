param(
    [Parameter(Mandatory = $true)]
    [string]$CommandExecutable
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -Path (Join-Path $PSScriptRoot 'long-task-level4-job-probe.cs')
[Console]::Out.WriteLine([Level4JobProbe]::Run($CommandExecutable))
[Console]::Out.Flush()
