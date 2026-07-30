export interface PythonFunctionMetric {
  symbol: string;
  line: number;
  statements: number;
  branches: number;
}

interface PythonFunctionBody {
  symbol: string;
  line: number;
  body: string;
}

type PythonQuote = "'" | '"' | "'''" | '"""';

export function analyzePythonFunctions(
  content: string,
): PythonFunctionMetric[] {
  const code = sanitizePython(content);
  return pythonFunctionBodies(code).map((body) => ({
    symbol: body.symbol,
    line: body.line,
    statements: pythonStatementCount(body.body),
    branches: pythonBranchComplexity(body.body),
  }));
}

function sanitizePython(content: string): string {
  let result = "";
  let quote: PythonQuote | undefined;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (quote) {
      if (character === "\\") {
        result += " ";
        if (index + 1 < content.length) {
          index += 1;
          result += isLineBreak(content[index]) ? content[index] : " ";
        }
        continue;
      }
      if (content.startsWith(quote, index)) {
        result += " ".repeat(quote.length);
        index += quote.length - 1;
        quote = undefined;
        continue;
      }
      result += isLineBreak(character) ? character : " ";
      continue;
    }

    if (character === "#") {
      while (index < content.length && !isLineBreak(content[index])) {
        result += " ";
        index += 1;
      }
      if (index < content.length) {
        result += content[index];
      }
      continue;
    }
    if (content.startsWith("'''", index) || content.startsWith('"""', index)) {
      quote = content.slice(index, index + 3) as PythonQuote;
      result += "   ";
      index += 2;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      result += " ";
      continue;
    }
    result += character;
  }
  return result;
}

function pythonFunctionBodies(code: string): PythonFunctionBody[] {
  const lines = code.split(/\r\n|\n|\r/u);
  const bodies: PythonFunctionBody[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(\s*)(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\b/u.exec(
      lines[index],
    );
    if (!match) {
      continue;
    }

    const indentation = indentationWidth(match[1]);
    const header = findHeaderEnd(lines, index);
    if (!header) {
      continue;
    }
    const bodyLines: string[] = [];
    const inlineBody = lines[header.line].slice(header.colon + 1).trim();
    if (inlineBody) {
      bodyLines.push(inlineBody);
    }
    for (let cursor = header.line + 1; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      if (!line.trim()) {
        bodyLines.push(line);
        continue;
      }
      const leading = /^\s*/u.exec(line)?.[0] ?? "";
      if (indentationWidth(leading) <= indentation) {
        break;
      }
      bodyLines.push(line);
    }
    bodies.push({
      symbol: match[2],
      line: index + 1,
      body: bodyLines.join("\n"),
    });
  }
  return bodies;
}

function findHeaderEnd(
  lines: string[],
  start: number,
): { line: number; colon: number } | undefined {
  let delimiterDepth = 0;
  for (let line = start; line < lines.length; line += 1) {
    for (let column = 0; column < lines[line].length; column += 1) {
      const character = lines[line][column];
      if (character === "(" || character === "[" || character === "{") {
        delimiterDepth += 1;
      } else if (character === ")" || character === "]" || character === "}") {
        delimiterDepth = Math.max(0, delimiterDepth - 1);
      } else if (character === ":" && delimiterDepth === 0) {
        return { line, colon: column };
      }
    }
  }
  return undefined;
}

function pythonStatementCount(body: string): number {
  let statements = 0;
  let delimiterDepth = 0;
  let explicitContinuation = false;
  for (const line of body.split(/\r\n|\n|\r/u)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const startsLogicalStatement =
      delimiterDepth === 0 && !explicitContinuation;
    if (startsLogicalStatement) {
      statements += 1 + topLevelSemicolonCount(line);
      if (hasInlineSuite(line)) {
        statements += 1;
      }
    }
    delimiterDepth = delimiterDepthAfter(line, delimiterDepth);
    explicitContinuation = delimiterDepth === 0 && /\\\s*$/u.test(line);
  }
  return statements;
}

function pythonBranchComplexity(body: string): number {
  const branches =
    body.match(/\b(?:if|elif|for|while|except|case|and|or)\b/gu)?.length ?? 0;
  return 1 + branches;
}

function topLevelSemicolonCount(line: string): number {
  let count = 0;
  let depth = 0;
  for (const character of line) {
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
    } else if (character === ")" || character === "]" || character === "}") {
      depth = Math.max(0, depth - 1);
    } else if (character === ";" && depth === 0) {
      count += 1;
    }
  }
  return count;
}

function hasInlineSuite(line: string): boolean {
  if (
    !/^\s*(?:async\s+)?(?:if|elif|else|for|while|try|except|finally|with|match|case)\b/u.test(
      line,
    )
  ) {
    return false;
  }
  let depth = 0;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
    } else if (character === ")" || character === "]" || character === "}") {
      depth = Math.max(0, depth - 1);
    } else if (character === ":" && depth === 0) {
      return line.slice(index + 1).trim().length > 0;
    }
  }
  return false;
}

function delimiterDepthAfter(line: string, initialDepth: number): number {
  let depth = initialDepth;
  for (const character of line) {
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
    } else if (character === ")" || character === "]" || character === "}") {
      depth = Math.max(0, depth - 1);
    }
  }
  return depth;
}

function indentationWidth(value: string): number {
  return [...value].reduce(
    (width, character) => width + (character === "\t" ? 4 : 1),
    0,
  );
}

function isLineBreak(character: string): boolean {
  return character === "\n" || character === "\r";
}
