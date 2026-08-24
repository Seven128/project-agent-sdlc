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
        {
            if (argument == null)
                throw new ArgumentException("formal_process_supervisor_argv");
            result.Append(' ').Append(QuoteWindowsArgument(argument));
        }
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

    public static void AssertUniqueJsonObjectKeys(string json)
    {
        if (json == null) throw new FormatException("formal_process_supervisor_request_json");
        int index = 0;
        ParseJsonValue(json, ref index);
        SkipJsonWhitespace(json, ref index);
        if (index != json.Length)
            throw new FormatException("formal_process_supervisor_request_json");
    }

    private static void ParseJsonValue(string json, ref int index)
    {
        SkipJsonWhitespace(json, ref index);
        if (index >= json.Length)
            throw new FormatException("formal_process_supervisor_request_json");
        char token = json[index];
        if (token == '{') { ParseJsonObject(json, ref index); return; }
        if (token == '[') { ParseJsonArray(json, ref index); return; }
        if (token == '"') { ParseJsonString(json, ref index); return; }
        if (token == 't') { ConsumeJsonLiteral(json, ref index, "true"); return; }
        if (token == 'f') { ConsumeJsonLiteral(json, ref index, "false"); return; }
        if (token == 'n') { ConsumeJsonLiteral(json, ref index, "null"); return; }
        ParseJsonNumber(json, ref index);
    }

    private static void ParseJsonObject(string json, ref int index)
    {
        index++;
        HashSet<string> keys = new HashSet<string>(StringComparer.Ordinal);
        SkipJsonWhitespace(json, ref index);
        if (ConsumeJsonCharacter(json, ref index, '}')) return;
        while (true)
        {
            SkipJsonWhitespace(json, ref index);
            string key = ParseJsonString(json, ref index);
            if (!keys.Add(key))
                throw new InvalidOperationException("formal_process_supervisor_request_duplicate_field:" + key);
            SkipJsonWhitespace(json, ref index);
            RequireJsonCharacter(json, ref index, ':');
            ParseJsonValue(json, ref index);
            SkipJsonWhitespace(json, ref index);
            if (ConsumeJsonCharacter(json, ref index, '}')) return;
            RequireJsonCharacter(json, ref index, ',');
        }
    }

    private static void ParseJsonArray(string json, ref int index)
    {
        index++;
        SkipJsonWhitespace(json, ref index);
        if (ConsumeJsonCharacter(json, ref index, ']')) return;
        while (true)
        {
            ParseJsonValue(json, ref index);
            SkipJsonWhitespace(json, ref index);
            if (ConsumeJsonCharacter(json, ref index, ']')) return;
            RequireJsonCharacter(json, ref index, ',');
        }
    }

    private static string ParseJsonString(string json, ref int index)
    {
        RequireJsonCharacter(json, ref index, '"');
        StringBuilder value = new StringBuilder();
        while (index < json.Length)
        {
            char character = json[index++];
            if (character == '"') return value.ToString();
            if (character < 0x20)
                throw new FormatException("formal_process_supervisor_request_json");
            if (character != '\\') { value.Append(character); continue; }
            if (index >= json.Length)
                throw new FormatException("formal_process_supervisor_request_json");
            char escaped = json[index++];
            if (escaped == '"' || escaped == '\\' || escaped == '/') value.Append(escaped);
            else if (escaped == 'b') value.Append('\b');
            else if (escaped == 'f') value.Append('\f');
            else if (escaped == 'n') value.Append('\n');
            else if (escaped == 'r') value.Append('\r');
            else if (escaped == 't') value.Append('\t');
            else if (escaped == 'u') value.Append(ParseJsonUnicodeEscape(json, ref index));
            else throw new FormatException("formal_process_supervisor_request_json");
        }
        throw new FormatException("formal_process_supervisor_request_json");
    }

    private static char ParseJsonUnicodeEscape(string json, ref int index)
    {
        if (index + 4 > json.Length)
            throw new FormatException("formal_process_supervisor_request_json");
        int value = 0;
        for (int offset = 0; offset < 4; offset++)
        {
            char digit = json[index++];
            int part = digit >= '0' && digit <= '9' ? digit - '0'
                : digit >= 'a' && digit <= 'f' ? digit - 'a' + 10
                : digit >= 'A' && digit <= 'F' ? digit - 'A' + 10
                : -1;
            if (part < 0)
                throw new FormatException("formal_process_supervisor_request_json");
            value = value * 16 + part;
        }
        return (char)value;
    }

    private static void ParseJsonNumber(string json, ref int index)
    {
        int start = index;
        if (ConsumeJsonCharacter(json, ref index, '-')) { }
        if (index >= json.Length)
            throw new FormatException("formal_process_supervisor_request_json");
        if (json[index] == '0') index++;
        else
        {
            if (json[index] < '1' || json[index] > '9')
                throw new FormatException("formal_process_supervisor_request_json");
            while (index < json.Length && json[index] >= '0' && json[index] <= '9') index++;
        }
        if (ConsumeJsonCharacter(json, ref index, '.'))
        {
            int fraction = index;
            while (index < json.Length && json[index] >= '0' && json[index] <= '9') index++;
            if (fraction == index)
                throw new FormatException("formal_process_supervisor_request_json");
        }
        if (index < json.Length && (json[index] == 'e' || json[index] == 'E'))
        {
            index++;
            if (index < json.Length && (json[index] == '+' || json[index] == '-')) index++;
            int exponent = index;
            while (index < json.Length && json[index] >= '0' && json[index] <= '9') index++;
            if (exponent == index)
                throw new FormatException("formal_process_supervisor_request_json");
        }
        if (start == index)
            throw new FormatException("formal_process_supervisor_request_json");
    }

    private static void ConsumeJsonLiteral(string json, ref int index, string literal)
    {
        if (index + literal.Length > json.Length ||
            String.CompareOrdinal(json, index, literal, 0, literal.Length) != 0)
            throw new FormatException("formal_process_supervisor_request_json");
        index += literal.Length;
    }

    private static void SkipJsonWhitespace(string json, ref int index)
    {
        while (index < json.Length &&
            (json[index] == ' ' || json[index] == '\t' || json[index] == '\r' || json[index] == '\n')) index++;
    }

    private static bool ConsumeJsonCharacter(string json, ref int index, char expected)
    {
        if (index >= json.Length || json[index] != expected) return false;
        index++;
        return true;
    }

    private static void RequireJsonCharacter(string json, ref int index, char expected)
    {
        if (!ConsumeJsonCharacter(json, ref index, expected))
            throw new FormatException("formal_process_supervisor_request_json");
    }
}
