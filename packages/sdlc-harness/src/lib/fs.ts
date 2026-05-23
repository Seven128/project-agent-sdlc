import { promises as fs } from "node:fs";
import path from "node:path";

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function readText(target: string): Promise<string> {
  return fs.readFile(target, "utf8");
}

export async function ensureDir(target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
}

export async function writeTextIfChanged(target: string, content: string): Promise<boolean> {
  if ((await pathExists(target)) && (await readText(target)) === content) {
    return false;
  }
  await ensureDir(path.dirname(target));
  await fs.writeFile(target, content, "utf8");
  return true;
}

export async function listFiles(root: string): Promise<string[]> {
  if (!(await pathExists(root))) {
    return [];
  }
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function copyTree(
  sourceRoot: string,
  destinationRoot: string,
  options: { skipGitkeep?: boolean } = {}
): Promise<string[]> {
  const changed: string[] = [];
  for (const source of await listFiles(sourceRoot)) {
    if (options.skipGitkeep && path.basename(source) === ".gitkeep") {
      continue;
    }
    const relative = path.relative(sourceRoot, source);
    const destination = path.join(destinationRoot, relative);
    if (await writeTextIfChanged(destination, await readText(source))) {
      changed.push(destination);
    }
  }
  return changed;
}
