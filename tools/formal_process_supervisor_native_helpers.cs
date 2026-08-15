using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Win32.SafeHandles;

public static partial class FormalProcessSupervisor
{
    private static Task<long> CaptureAsync(IntPtr readHandle, string targetPath, CaptureState state)
    {
        return Task.Run(() => Capture(readHandle, targetPath, state));
    }

    private static long Capture(IntPtr readHandle, string targetPath, CaptureState state)
    {
        long retained = 0;
        using (SafeFileHandle safe = new SafeFileHandle(readHandle, true))
        using (FileStream input = new FileStream(safe, FileAccess.Read, 65536, false))
        using (FileStream output = new FileStream(targetPath, FileMode.CreateNew, FileAccess.Write, FileShare.Read, 65536, false))
        {
            byte[] buffer = new byte[65536];
            while (true)
            {
                int count = input.Read(buffer, 0, buffer.Length);
                if (count == 0) break;
                long before = Interlocked.Add(ref state.CombinedBytes, count) - count;
                int allowed = before >= state.Limit ? 0 : (int)Math.Min(count, state.Limit - before);
                if (allowed > 0)
                {
                    output.Write(buffer, 0, allowed);
                    retained += allowed;
                }
                if (allowed != count && Interlocked.Exchange(ref state.Overflow, 1) == 0)
                    TerminateJobObject(state.Job, 0xE0000002);
            }
            output.Flush(true);
        }
        return retained;
    }

    private static JOBOBJECT_BASIC_ACCOUNTING_INFORMATION QueryAccounting(IntPtr job)
    {
        JOBOBJECT_BASIC_ACCOUNTING_INFORMATION information;
        Check(QueryInformationJobObject(
            job,
            JobObjectBasicAccountingInformation,
            out information,
            (uint)Marshal.SizeOf<JOBOBJECT_BASIC_ACCOUNTING_INFORMATION>(),
            IntPtr.Zero),
            "query_job_accounting");
        return information;
    }

    private static IntPtr BuildEnvironmentBlock(string[] entries)
    {
        SortedDictionary<string, string> values = new SortedDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (string entry in entries)
        {
            if (entry == null) throw new ArgumentException("formal_process_supervisor_environment");
            int separator = entry.IndexOf('=');
            if (separator <= 0 || entry.IndexOf('\0') >= 0)
                throw new ArgumentException("formal_process_supervisor_environment");
            string key = entry.Substring(0, separator);
            string value = entry.Substring(separator + 1);
            if (key.IndexOf('=') >= 0 || key.IndexOf('\r') >= 0 || key.IndexOf('\n') >= 0 || value.IndexOf('\r') >= 0 || value.IndexOf('\n') >= 0)
                throw new ArgumentException("formal_process_supervisor_environment");
            values[key] = value;
        }
        StringBuilder block = new StringBuilder();
        foreach (KeyValuePair<string, string> item in values)
            block.Append(item.Key).Append('=').Append(item.Value).Append('\0');
        block.Append('\0');
        byte[] bytes = Encoding.Unicode.GetBytes(block.ToString());
        IntPtr pointer = Marshal.AllocHGlobal(bytes.Length);
        Marshal.Copy(bytes, 0, pointer, bytes.Length);
        return pointer;
    }

    private static string BuildCommandLine(string executable, string[] argv)
    {
        StringBuilder result = new StringBuilder(QuoteWindowsArgument(executable));
        foreach (string argument in argv)
            result.Append(' ').Append(QuoteWindowsArgument(argument ?? throw new ArgumentException("formal_process_supervisor_argv")));
        return result.ToString();
    }

    private static string QuoteWindowsArgument(string value)
    {
        if (value.Length > 0 && value.IndexOfAny(new[] { ' ', '\t', '\n', '\v', '"' }) < 0)
            return value;
        StringBuilder result = new StringBuilder("\"");
        int slashes = 0;
        foreach (char character in value)
        {
            if (character == '\\') { slashes++; continue; }
            if (character == '"')
            {
                result.Append('\\', slashes * 2 + 1).Append('"');
                slashes = 0;
                continue;
            }
            result.Append('\\', slashes).Append(character);
            slashes = 0;
        }
        result.Append('\\', slashes * 2).Append('"');
        return result.ToString();
    }

    private static long TicksToNanoseconds(long ticks)
    {
        return checked((long)((decimal)ticks * 1000000000m / Stopwatch.Frequency));
    }

    private static void Check(bool value, string operation)
    {
        if (!value) ThrowLastError(operation);
    }

    private static void CheckHandle(IntPtr value, string operation)
    {
        if (value == IntPtr.Zero || value == new IntPtr(-1)) ThrowLastError(operation);
    }

    private static void ThrowLastError(string operation)
    {
        throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "formal_process_supervisor_" + operation);
    }
}
