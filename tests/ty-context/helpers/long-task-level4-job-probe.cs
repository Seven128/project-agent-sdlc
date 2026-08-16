using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

public static class Level4JobProbe
{
    private const uint CreateSuspended = 0x00000004;
    private const uint CreateBreakawayFromJob = 0x01000000;
    private const uint CreateNoWindow = 0x08000000;
    private const int JobObjectBasicLimitInformationClass = 2;
    private const uint JobObjectLimitActiveProcess = 0x00000008;

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct StartupInfo
    {
        public uint cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public uint dwX;
        public uint dwY;
        public uint dwXSize;
        public uint dwYSize;
        public uint dwXCountChars;
        public uint dwYCountChars;
        public uint dwFillAttribute;
        public uint dwFlags;
        public ushort wShowWindow;
        public ushort cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct ProcessInformation
    {
        public IntPtr hProcess;
        public IntPtr hThread;
        public uint dwProcessId;
        public uint dwThreadId;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JobObjectBasicLimitInformation
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [DllImport("kernel32.dll")]
    private static extern IntPtr GetCurrentProcess();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool IsProcessInJob(
        IntPtr process,
        IntPtr job,
        out bool result);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CreateProcessW(
        string applicationName,
        StringBuilder commandLine,
        IntPtr processAttributes,
        IntPtr threadAttributes,
        bool inheritHandles,
        uint creationFlags,
        IntPtr environment,
        string currentDirectory,
        ref StartupInfo startupInfo,
        out ProcessInformation processInformation);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateJobObjectW(IntPtr attributes, string name);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(
        IntPtr job,
        int informationClass,
        ref JobObjectBasicLimitInformation information,
        uint informationLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool TerminateProcess(IntPtr process, uint exitCode);

    [DllImport("kernel32.dll")]
    private static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

    [DllImport("kernel32.dll")]
    private static extern bool CloseHandle(IntPtr handle);

    public static string Run(string executable)
    {
        bool inJob;
        Check(IsProcessInJob(GetCurrentProcess(), IntPtr.Zero, out inJob),
            "is_process_in_job");

        ProcessInformation breakaway = Create(
            executable,
            CreateBreakawayFromJob | CreateNoWindow,
            out bool breakawayCreated,
            out int breakawayError);
        DisposeProcess(ref breakaway, breakawayCreated);

        IntPtr incompatibleJob = CreateJobObjectW(IntPtr.Zero, null);
        if (incompatibleJob == IntPtr.Zero)
            throw new Win32Exception(Marshal.GetLastWin32Error(), "create_incompatible_job");
        ProcessInformation anchor = new ProcessInformation();
        ProcessInformation child = new ProcessInformation();
        bool anchorCreated = false;
        bool childCreated = false;
        bool assigned = false;
        int assignmentError = 0;
        try
        {
            JobObjectBasicLimitInformation restrictions =
                new JobObjectBasicLimitInformation {
                    LimitFlags = JobObjectLimitActiveProcess,
                    ActiveProcessLimit = 1
                };
            Check(SetInformationJobObject(
                incompatibleJob,
                JobObjectBasicLimitInformationClass,
                ref restrictions,
                (uint)Marshal.SizeOf<JobObjectBasicLimitInformation>()),
                "set_incompatible_job_limits");
            anchor = Create(
                executable,
                CreateSuspended | CreateNoWindow,
                out anchorCreated,
                out int anchorError);
            if (!anchorCreated)
                throw new Win32Exception(anchorError, "create_assignment_anchor");
            Check(AssignProcessToJobObject(incompatibleJob, anchor.hProcess),
                "assign_anchor_to_limited_job");
            child = Create(
                executable,
                CreateSuspended | CreateNoWindow,
                out childCreated,
                out int createError);
            if (!childCreated)
                throw new Win32Exception(createError, "create_assignment_child");
            assigned = AssignProcessToJobObject(incompatibleJob, child.hProcess);
            assignmentError = assigned ? 0 : Marshal.GetLastWin32Error();
        }
        finally
        {
            DisposeProcess(ref child, childCreated);
            DisposeProcess(ref anchor, anchorCreated);
            CloseHandle(incompatibleJob);
        }

        return "{" +
            "\"in_job\":" + inJob.ToString().ToLowerInvariant() + "," +
            "\"breakaway_created\":" + breakawayCreated.ToString().ToLowerInvariant() + "," +
            "\"breakaway_error\":" + breakawayError + "," +
            "\"incompatible_assignment\":" + assigned.ToString().ToLowerInvariant() + "," +
            "\"assignment_error\":" + assignmentError +
            "}";
    }

    private static ProcessInformation Create(
        string executable,
        uint flags,
        out bool created,
        out int error)
    {
        StartupInfo startup = new StartupInfo();
        startup.cb = (uint)Marshal.SizeOf<StartupInfo>();
        ProcessInformation process;
        created = CreateProcessW(
            executable,
            new StringBuilder("\"" + executable + "\" /d /c exit 0"),
            IntPtr.Zero,
            IntPtr.Zero,
            false,
            flags,
            IntPtr.Zero,
            null,
            ref startup,
            out process);
        error = created ? 0 : Marshal.GetLastWin32Error();
        return process;
    }

    private static void DisposeProcess(ref ProcessInformation process, bool created)
    {
        if (!created) return;
        TerminateProcess(process.hProcess, 0xE0000004);
        WaitForSingleObject(process.hProcess, 5000);
        if (process.hThread != IntPtr.Zero) CloseHandle(process.hThread);
        if (process.hProcess != IntPtr.Zero) CloseHandle(process.hProcess);
        process = new ProcessInformation();
    }

    private static void Check(bool value, string operation)
    {
        if (!value)
            throw new Win32Exception(Marshal.GetLastWin32Error(), operation);
    }
}
