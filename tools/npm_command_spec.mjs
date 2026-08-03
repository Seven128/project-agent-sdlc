export function npmCommandSpec(
  args,
  { platform = process.platform, environment = process.env } = {},
) {
  if (platform === "win32") {
    return {
      command: environment.ComSpec || environment.COMSPEC || "cmd.exe",
      args: ["/d", "/s", "/c", "call", "npm", ...args],
    };
  }
  return { command: "npm", args: [...args] };
}
