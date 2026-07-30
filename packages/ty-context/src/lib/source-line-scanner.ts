export type SourceLineVisitor = (
  line: string,
  startOffset: number,
  endOffset: number,
  nextOffset: number,
  lineNumber: number,
) => void;

export function forEachSourceLine(
  content: string,
  visit: SourceLineVisitor,
): void {
  let startOffset = 0;
  let lineNumber = 1;
  while (startOffset <= content.length) {
    let endOffset = startOffset;
    while (endOffset < content.length) {
      const code = content.charCodeAt(endOffset);
      if (code === 10 || code === 13) break;
      endOffset += 1;
    }
    let nextOffset = endOffset;
    if (nextOffset < content.length) {
      if (
        content.charCodeAt(nextOffset) === 13 &&
        content.charCodeAt(nextOffset + 1) === 10
      )
        nextOffset += 2;
      else nextOffset += 1;
    }
    visit(
      content.slice(startOffset, endOffset),
      startOffset,
      endOffset,
      nextOffset,
      lineNumber,
    );
    if (endOffset === content.length) break;
    startOffset = nextOffset;
    lineNumber += 1;
  }
}

export function formalBlockBody(
  content: string,
  bodyStartOffset: number,
  closingLineStartOffset: number,
  preserveClosingSeparator = false,
): string {
  let bodyEndOffset = closingLineStartOffset;
  if (
    !preserveClosingSeparator &&
    bodyEndOffset > bodyStartOffset &&
    content.charCodeAt(bodyEndOffset - 1) === 10
  ) {
    bodyEndOffset -= 1;
    if (
      bodyEndOffset > bodyStartOffset &&
      content.charCodeAt(bodyEndOffset - 1) === 13
    )
      bodyEndOffset -= 1;
  } else if (
    !preserveClosingSeparator &&
    bodyEndOffset > bodyStartOffset &&
    content.charCodeAt(bodyEndOffset - 1) === 13
  )
    bodyEndOffset -= 1;
  return content.slice(bodyStartOffset, bodyEndOffset).replace(/\r\n?/gu, "\n");
}
