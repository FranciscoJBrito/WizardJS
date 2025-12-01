export function areBracketsBalanced(code: string): boolean {
  const brackets: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const stack: string[] = [];
  let inStr = false;
  let str = "";
  let inComment = false;
  for (let i = 0; i < code.length; i++) {
    const c = code[i],
      n = code[i + 1];
    if (!inStr && c === "/" && n === "/") {
      inComment = true;
      continue;
    }
    if (inComment && c === "\n") {
      inComment = false;
      continue;
    }
    if (inComment) continue;
    if (!inStr && (c === '"' || c === "'" || c === "`")) {
      inStr = true;
      str = c;
      continue;
    }
    if (inStr && c === str && code[i - 1] !== "\\") {
      inStr = false;
      str = "";
      continue;
    }
    if (inStr) continue;
    if (c in brackets) stack.push(c);
    else if (Object.values(brackets).includes(c)) {
      const last = stack.pop();
      if (!last || brackets[last] !== c) return false;
    }
  }
  return stack.length === 0;
}

export function hasIncompleteStatement(code: string) {
  const trimmed = code.trim();
  const p = [
    /\bif\s*\(.*\)\s*$/,
    /\belse\s*$/,
    /\bfor\s*\(.*\)\s*$/,
    /\bfor\s*\(?[^)]*$/,           // for incompleto (sin cerrar paréntesis)
    /\bfor\s*$/,                    // solo "for"
    /\bwhile\s*\(.*\)\s*$/,
    /\bwhile\s*\(?[^)]*$/,         // while incompleto
    /\bwhile\s*$/,                  // solo "while"
    /\bfunction\s+\w*\s*\([^)]*\)\s*$/,
    /\bfunction\s*$/,               // solo "function"
    /\b(const|let|var)\s+\w+\s*=\s*$/,
    /\b(const|let|var)\s*$/,        // solo const/let/var
    /\w+\s*=\s*$/,
    /\w+\s*\(\s*$/,
    /\w+\s*\.\s*$/,
    /\binterface\s+\w*\s*$/,
    /\btype\s+\w+\s*=\s*$/,
    /\bclass\s+\w*\s*$/,            // solo "class"
    /\bswitch\s*\(?[^)]*$/,         // switch incompleto
    /\btry\s*$/,                    // solo "try"
    /\bcatch\s*\(?[^)]*$/,          // catch incompleto
  ];
  return p.some((rx) => rx.test(trimmed));
}

export function looksLikeIncompleteTyping(code: string) {
  const last = code.split("\n").at(-1)!.trim();
  const p = [
    /^\w+$/,
    /^\w+\s*\.$/,
    /^\w+\s*\($/,
    /^\w+\s*\[$/,
    /^\w+\s*\{$/,
    /^\w+\s*:\s*$/,
    /^\s*\.\w*$/,
    /^(while|for|if)\s*\([^)]*\)\s*$/,  // loop/if sin cuerpo
  ];
  return p.some((rx) => rx.test(last));
}

export function containsDangerousCode(code: string) {
  return [
    /setInterval|setTimeout/gi,
    /XMLHttpRequest|fetch/gi,
    /localStorage|sessionStorage/gi,
    /document\.|window\.|global\./gi,
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /import\s|require\s*\(/gi,
  ].some((rx) => rx.test(code));
}
