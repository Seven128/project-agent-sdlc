using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

public static partial class FormalProcessSupervisor
{
    public static FormalProcessSupervisorResult Run(
        string requestId,
        string executable,
        string[] argv,
        string cwd,
        string stdoutPath,
        string stderrPath,
        int timeoutMilliseconds,
        long combinedOutputLimit,
        string[] environment)
    {
        if (String.IsNullOrWhiteSpace(requestId) || String.IsNullOrWhiteSpace(executable))
            throw new ArgumentException("formal_process_supervisor_request");
        if (argv == null || environment == null || timeoutMilliseconds <= 0 || combinedOutputLimit <= 0)
            throw new ArgumentException("formal_process_supervisor_limits");
        if (File.Exists(stdoutPath) || File.Exists(stderrPath))
            throw new IOException("formal_process_supervisor_log_preexisting");

        IntPtr job = IntPtr.Zero;
        IntPtr stdoutRead = IntPtr.Zero;
        IntPtr stdoutWrite = IntPtr.Zero;
        IntPtr stderrRead = IntPtr.Zero;
        IntPtr stderrWrite = IntPtr.Zero;
        IntPtr stdinRead = IntPtr.Zero;
        IntPtr stdinWrite = IntPtr.Zero;
        IntPtr environmentBlock = IntPtr.Zero;
        PROCESS_INFORMATION process = new PROCESS_INFORMATION();
        CaptureState captureState = null;
        Task<long> stdoutTask = null;
        Task<long> stderrTask = null;
        bool timedOut = false;
        long startedUnixMs = 0;
        long startedTicks = 0;
        try
        {
            job = CreateJobObject(IntPtr.Zero, null);
            CheckHandle(job, "create_job");
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            Check(SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                ref limits,
                (uint)Marshal.SizeOf<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>()),
                "set_job_limits");

            SECURITY_ATTRIBUTES pipeAttributes = new SECURITY_ATTRIBUTES();
            pipeAttributes.nLength = Marshal.SizeOf<SECURITY_ATTRIBUTES>();
            pipeAttributes.bInheritHandle = true;
            Check(CreatePipe(out stdoutRead, out stdoutWrite, ref pipeAttributes, 0), "stdout_pipe");
            Check(CreatePipe(out stderrRead, out stderrWrite, ref pipeAttributes, 0), "stderr_pipe");
            Check(CreatePipe(out stdinRead, out stdinWrite, ref pipeAttributes, 0), "stdin_pipe");
            Check(SetHandleInformation(stdoutRead, HANDLE_FLAG_INHERIT, 0), "stdout_parent_handle");
            Check(SetHandleInformation(stderrRead, HANDLE_FLAG_INHERIT, 0), "stderr_parent_handle");
            Check(SetHandleInformation(stdinWrite, HANDLE_FLAG_INHERIT, 0), "stdin_parent_handle");

            STARTUPINFO startup = new STARTUPINFO();
            startup.cb = Marshal.SizeOf<STARTUPINFO>();
            startup.dwFlags = STARTF_USESTDHANDLES;
            startup.hStdInput = stdinRead;
            startup.hStdOutput = stdoutWrite;
            startup.hStdError = stderrWrite;
            environmentBlock = BuildEnvironmentBlock(environment);
            StringBuilder commandLine = new StringBuilder(BuildCommandLine(executable, argv));
            Check(CreateProcessW(
                executable,
                commandLine,
                IntPtr.Zero,
                IntPtr.Zero,
                true,
                CREATE_SUSPENDED | CREATE_NO_WINDOW | CREATE_UNICODE_ENVIRONMENT,
                environmentBlock,
                cwd,
                ref startup,
                out process),
                "create_process");
            Check(AssignProcessToJobObject(job, process.hProcess), "assign_process_to_job");

            CloseHandle(stdoutWrite); stdoutWrite = IntPtr.Zero;
            CloseHandle(stderrWrite); stderrWrite = IntPtr.Zero;
            CloseHandle(stdinRead); stdinRead = IntPtr.Zero;
            CloseHandle(stdinWrite); stdinWrite = IntPtr.Zero;

            captureState = new CaptureState { CombinedBytes = 0, Overflow = 0, Limit = combinedOutputLimit, Job = job };
            stdoutTask = CaptureAsync(stdoutRead, stdoutPath, captureState);
            stdoutRead = IntPtr.Zero;
            stderrTask = CaptureAsync(stderrRead, stderrPath, captureState);
            stderrRead = IntPtr.Zero;

            startedUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            startedTicks = Stopwatch.GetTimestamp();
            if (ResumeThread(process.hThread) == UInt32.MaxValue)
                ThrowLastError("resume_process");
            CloseHandle(process.hThread); process.hThread = IntPtr.Zero;

            Stopwatch elapsed = Stopwatch.StartNew();
            JOBOBJECT_BASIC_ACCOUNTING_INFORMATION accounting;
            while (true)
            {
                accounting = QueryAccounting(job);
                if (accounting.ActiveProcesses == 0) break;
                if (Volatile.Read(ref captureState.Overflow) != 0)
                {
                    TerminateJobObject(job, 0xE0000002);
                }
                else if (elapsed.ElapsedMilliseconds > timeoutMilliseconds)
                {
                    timedOut = true;
                    TerminateJobObject(job, 0xE0000001);
                }
                if (timedOut || Volatile.Read(ref captureState.Overflow) != 0)
                {
                    Stopwatch cleanup = Stopwatch.StartNew();
                    while (QueryAccounting(job).ActiveProcesses != 0 && cleanup.ElapsedMilliseconds <= CleanupWaitMilliseconds)
                        Thread.Sleep(10);
                    break;
                }
                Thread.Sleep(10);
            }

            accounting = QueryAccounting(job);
            if (accounting.ActiveProcesses != 0)
                throw new InvalidOperationException("formal_process_supervisor_descendants_alive");
            Task.WaitAll(stdoutTask, stderrTask);
            long completedTicks = Stopwatch.GetTimestamp();
            long completedUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            uint rawExitCode;
            Check(GetExitCodeProcess(process.hProcess, out rawExitCode), "process_exit_code");
            if (rawExitCode == STILL_ACTIVE)
                throw new InvalidOperationException("formal_process_supervisor_root_alive");
            return new FormalProcessSupervisorResult
            {
                RequestId = requestId,
                ProcessId = checked((int)process.dwProcessId),
                ExitCode = unchecked((int)rawExitCode),
                TimedOut = timedOut,
                OutputOverflow = Volatile.Read(ref captureState.Overflow) != 0,
                DescendantsCleaned = accounting.ActiveProcesses == 0,
                StdoutBytes = stdoutTask.Result,
                StderrBytes = stderrTask.Result,
                StartedUnixMs = startedUnixMs,
                CompletedUnixMs = completedUnixMs,
                MonotonicStartedNs = TicksToNanoseconds(startedTicks).ToString(),
                MonotonicCompletedNs = TicksToNanoseconds(completedTicks).ToString(),
                MonotonicClockId = "windows-stopwatch-qpc-v1",
                WallClockId = "unix-epoch-ms-v1",
                UserCpu100Ns = accounting.TotalUserTime,
                KernelCpu100Ns = accounting.TotalKernelTime,
                TotalCpu100Ns = checked(accounting.TotalUserTime + accounting.TotalKernelTime),
                TotalProcesses = accounting.TotalProcesses,
                ActiveProcessesAtResult = accounting.ActiveProcesses,
                TotalTerminatedProcesses = accounting.TotalTerminatedProcesses,
                AccountingSourceKind = "windows-job-object-accounting-v1",
                Error = null,
            };
        }
        catch
        {
            if (job != IntPtr.Zero) TerminateJobObject(job, 0xE0000003);
            if (process.hProcess != IntPtr.Zero)
            {
                TerminateProcess(process.hProcess, 0xE0000003);
                WaitForSingleObject(process.hProcess, CleanupWaitMilliseconds);
            }
            try
            {
                if (stdoutTask != null) stdoutTask.Wait(CleanupWaitMilliseconds);
                if (stderrTask != null) stderrTask.Wait(CleanupWaitMilliseconds);
            }
            catch { }
            throw;
        }
        finally
        {
            if (process.hThread != IntPtr.Zero) CloseHandle(process.hThread);
            if (process.hProcess != IntPtr.Zero) CloseHandle(process.hProcess);
            if (stdoutRead != IntPtr.Zero) CloseHandle(stdoutRead);
            if (stdoutWrite != IntPtr.Zero) CloseHandle(stdoutWrite);
            if (stderrRead != IntPtr.Zero) CloseHandle(stderrRead);
            if (stderrWrite != IntPtr.Zero) CloseHandle(stderrWrite);
            if (stdinRead != IntPtr.Zero) CloseHandle(stdinRead);
            if (stdinWrite != IntPtr.Zero) CloseHandle(stdinWrite);
            if (environmentBlock != IntPtr.Zero) Marshal.FreeHGlobal(environmentBlock);
            if (job != IntPtr.Zero) CloseHandle(job);
        }
    }
}
