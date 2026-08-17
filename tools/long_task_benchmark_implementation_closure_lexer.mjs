export function tokenizeImplementationSource(source, repositoryPath) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (/\s/u.test(character)) {
      index += 1;
      continue;
    }
    if (character === "/" && source[index + 1] === "/") {
      index = skipLineComment(source, index + 2);
      continue;
    }
    if (character === "/" && source[index + 1] === "*") {
      index = skipBlockComment(source, index + 2, repositoryPath);
      continue;
    }
    if (character === "/" && regexCanStart(tokens.at(-1))) {
      index = skipRegularExpression(source, index + 1, repositoryPath);
      tokens.push({ type: "regular_expression", value: null });
      continue;
    }
    if (character === '"' || character === "'") {
      const parsed = readString(source, index, repositoryPath);
      tokens.push({
        type: "string",
        value: parsed.value,
        escaped: parsed.escaped,
      });
      index = parsed.next;
      continue;
    }
    if (character === "`") {
      const parsed = readTemplate(source, index, repositoryPath);
      tokens.push({ type: "template", value: parsed.value });
      index = parsed.next;
      continue;
    }
    if (/[A-Za-z_$]/u.test(character)) {
      const start = index;
      index += 1;
      while (/[A-Za-z0-9_$]/u.test(source[index] ?? "")) index += 1;
      tokens.push({ type: "identifier", value: source.slice(start, index) });
      continue;
    }
    tokens.push({ type: "punctuator", value: character });
    index += 1;
  }
  return tokens;
}

export function firstStringBeforeBoundary(tokens, start) {
  for (let index = start; index < tokens.length; index += 1) {
    if (tokens[index].type === "string") return tokens[index];
    if (isBoundary(tokens[index])) return null;
  }
  return null;
}

export function findIdentifierBeforeBoundary(tokens, start, value) {
  for (let index = start; index < tokens.length; index += 1) {
    if (isIdentifier(tokens[index], value)) return index;
    if (isBoundary(tokens[index])) return -1;
  }
  return -1;
}

export function findPunctuatorBeforeBoundary(tokens, start, value) {
  for (let index = start; index < tokens.length; index += 1) {
    if (isPunctuator(tokens[index], value)) return index;
    if (isPunctuator(tokens[index], ")")) return -1;
  }
  return -1;
}

export function isImportMetaUrl(tokens, start) {
  return (
    isIdentifier(tokens[start], "import") &&
    isPunctuator(tokens[start + 1], ".") &&
    isIdentifier(tokens[start + 2], "meta") &&
    isPunctuator(tokens[start + 3], ".") &&
    isIdentifier(tokens[start + 4], "url")
  );
}

export function isIdentifier(token, value) {
  return token?.type === "identifier" && token.value === value;
}

export function isPunctuator(token, value) {
  return token?.type === "punctuator" && token.value === value;
}

export function relativeSpecifier(value) {
  return (
    typeof value === "string" &&
    /^(?:\.\/|\.\.\/|\.\\|\.\.\\)/u.test(value)
  );
}

export function tokenSignature(token) {
  if (token?.type === "identifier") return `i:${token.value}`;
  if (token?.type === "punctuator") return `p:${token.value}`;
  if (token?.type === "string") return `s:${token.value}`;
  return `${token?.type ?? "unknown"}:${token?.value ?? ""}`;
}

function readString(source, start, repositoryPath) {
  const quote = source[start];
  let index = start + 1;
  let value = "";
  let escaped = false;
  while (index < source.length) {
    const character = source[index];
    if (character === quote)
      return { value, escaped, next: index + 1 };
    if (character === "\\") {
      if (index + 1 >= source.length) break;
      escaped = true;
      value += source.slice(index, index + 2);
      index += 2;
      continue;
    }
    if (character === "\n" || character === "\r") break;
    value += character;
    index += 1;
  }
  throw new Error(
    `benchmark_implementation_closure_string:${repositoryPath}:${start}`,
  );
}

function readTemplate(source, start, repositoryPath) {
  let index = start + 1;
  let value = "";
  while (index < source.length) {
    const character = source[index];
    if (character === "`") return { value, next: index + 1 };
    if (character === "\\") {
      index += 2;
      continue;
    }
    value += character;
    index += 1;
  }
  throw new Error(
    `benchmark_implementation_closure_template:${repositoryPath}`,
  );
}

function skipLineComment(source, index) {
  while (index < source.length && source[index] !== "\n") index += 1;
  return index;
}

function skipBlockComment(source, index, repositoryPath) {
  while (index < source.length - 1) {
    if (source[index] === "*" && source[index + 1] === "/") return index + 2;
    index += 1;
  }
  throw new Error(
    `benchmark_implementation_closure_comment:${repositoryPath}`,
  );
}

function skipRegularExpression(source, index, repositoryPath) {
  let inCharacterClass = false;
  while (index < source.length) {
    const character = source[index];
    if (character === "\\") {
      index += 2;
      continue;
    }
    if (character === "[") inCharacterClass = true;
    else if (character === "]") inCharacterClass = false;
    else if (character === "/" && !inCharacterClass) {
      index += 1;
      while (/[A-Za-z]/u.test(source[index] ?? "")) index += 1;
      return index;
    }
    if (character === "\n" || character === "\r") break;
    index += 1;
  }
  throw new Error(
    `benchmark_implementation_closure_regex:${repositoryPath}`,
  );
}

function regexCanStart(previous) {
  if (!previous) return true;
  if (
    previous.type === "identifier" &&
    ["await", "case", "return", "throw", "yield"].includes(previous.value)
  )
    return true;
  return (
    previous.type === "punctuator" &&
    ["(", "[", "{", ",", ";", ":", "=", "!", "?", "&", "|"].includes(
      previous.value,
    )
  );
}

function isBoundary(token) {
  return isPunctuator(token, ";");
}
