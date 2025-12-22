/**
 * Instrumentación de código para WizardJS
 * Separa la lógica de instrumentación del engine principal
 */

import * as ts from "typescript";
import { createSource } from "../utils/tsHelpers";

export interface InstrumentationOptions {
  showLineNumbers: boolean;
  instrumentConsole: boolean;
  instrumentExpressions: boolean;
  instrumentMagicComments: boolean;
}

export interface MagicComment {
  line: number;
  expression: string;
  type: "inline" | "pipe";
}

export class CodeInstrumentation {
  /**
   * Extrae Magic Comments del código
   */
  extractMagicComments(code: string): MagicComment[] {
    const lines = code.split("\n");
    const magicComments: MagicComment[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Magic comment inline: //?
      const inlineMatch = line.match(/^(.+?)\s*\/\/\?\s*$/);
      if (inlineMatch) {
        let expression = inlineMatch[1].trim();

        // Si es declaración, extraer solo el nombre
        const declMatch = expression.match(
          /^(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+)$/
        );
        if (declMatch) {
          expression = declMatch[1];
        }

        magicComments.push({
          line: lineNum,
          expression,
          type: "inline",
        });
      }
    }

    return magicComments;
  }

  /**
   * Remueve magic comments del código
   */
  removeMagicComments(code: string): string {
    return code
      .split("\n")
      .map((line) => line.replace(/\s*\/\/\?\s*$/, "").trimEnd())
      .join("\n");
  }

  /**
   * Instrumenta magic comments
   */
  instrumentMagicComments(code: string, magicComments: MagicComment[]): string {
    if (magicComments.length === 0) return code;

    const lines = code.split("\n");

    for (const magic of magicComments) {
      const idx = magic.line - 1;
      const originalLine = lines[idx];
      lines[idx] =
        `${originalLine}; __recordMagic((${magic.expression}), ${magic.line});`;
    }

    return lines.join("\n");
  }

  /**
   * Instrumenta llamadas a console.*
   */
  instrumentConsoleCalls(code: string, showLineNumbers: boolean): string {
    if (!showLineNumbers) return code;

    const lines = code.split("\n");
    return lines
      .map((line, idx) => {
        const lineNo = idx + 1;
        const consoleRegex = /\b(console\s*\.\s*(?:log|warn|error|info))\s*\(/g;
        let result = line;
        let match;
        let offset = 0;

        while ((match = consoleRegex.exec(line)) !== null) {
          const methodEnd = consoleRegex.lastIndex;

          let depth = 1;
          let i = methodEnd;
          while (i < line.length && depth > 0) {
            if (line[i] === "(") depth++;
            else if (line[i] === ")") depth--;
            i++;
          }

          if (depth === 0) {
            const args = line.slice(methodEnd, i - 1);
            const lineArg = `${lineNo}`;
            const newCall = args.trim()
              ? `${match[1]}(${lineArg}, ${args})`
              : `${match[1]}(${lineArg})`;

            const before = result.slice(0, match.index! + offset);
            const after = result.slice(i + offset);
            result = before + newCall + after;
            offset += newCall.length - (i - match.index!);
          }
        }

        return result;
      })
      .join("\n");
  }

  /**
   * Instrumenta expresiones top-level
   */
  instrumentTopLevelExpressions(code: string): string {
    try {
      const source = createSource(code, ts.ScriptKind.TS);
      const statements = source.statements;
      if (!statements.length) return code;

      let out = "";
      let cursor = 0;

      for (const stmt of statements) {
        const start = stmt.getStart(source);
        const end = stmt.end;
        out += code.slice(cursor, start);

        if (stmt.kind === ts.SyntaxKind.ExpressionStatement) {
          const txt = code
            .slice(start, end)
            .trim()
            .replace(/;+\s*$/, "");
          const lineNum = source.getLineAndCharacterOfPosition(start).line + 1;

          // No instrumentar console.*, callbacks, o magic comments
          if (
            /^console\s*\./.test(txt) ||
            this.isInsideCallback(source, stmt) ||
            txt.includes("__recordMagic") ||
            txt.includes("__exports")
          ) {
            out += code.slice(start, end);
          } else {
            out += `__recordResult((${txt}), ${lineNum});`;
          }
        } else {
          out += code.slice(start, end);
        }
        cursor = end;
      }

      out += code.slice(cursor);
      return out;
    } catch {
      return code;
    }
  }

  /**
   * Detecta si una expresión está dentro de un callback
   */
  private isInsideCallback(source: ts.SourceFile, stmt: ts.Statement): boolean {
    let node: ts.Node | undefined = stmt;

    while (node) {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression)
      ) {
        const method = node.expression.name.getText(source);
        if (
          [
            "map",
            "forEach",
            "filter",
            "reduce",
            "find",
            "some",
            "every",
          ].includes(method)
        ) {
          return true;
        }
      }
      node = node.parent;
    }
    return false;
  }

  /**
   * Normaliza declaraciones en loops for...in/of
   */
  normalizeForDeclarations(src: string): string {
    return src
      .replace(
        /for\s*\(\s*(?!var|let|const)([A-Za-z_$][\w$]*)\s+of\s+([^)]*)\)/g,
        "for (let $1 of $2)"
      )
      .replace(
        /for\s*\(\s*(?!var|let|const)([A-Za-z_$][\w$]*)\s+in\s+([^)]*)\)/g,
        "for (let $1 in $2)"
      );
  }

  /**
   * Inyecta guardias de loop infinito
   */
  injectLoopGuards(code: string): string {
    let withGuards = code;

    // Guards en while loops
    withGuards = withGuards.replace(
      /\bwhile\s*\(([^)]*)\)\s*(\{|[^;\s])/g,
      (match, cond, body) => `while((__loopGuard()) && (${cond})) ${body}`
    );
    withGuards = withGuards.replace(
      /\bwhile\s*\(([^)]*)\)\s*;/g,
      (match, cond) => `while((__loopGuard()) && (${cond}));`
    );

    // Guards en for...in/of
    withGuards = this.injectForInOfGuards(withGuards);

    // Guards en for clásico
    withGuards = withGuards.replace(
      /\bfor\s*\(([^;]+);([^;]*);([^)]*)\)/g,
      (_m, init, cond, incr) => {
        if (/\b(in|of)\b/.test(init)) return _m;
        const c = (cond || "").trim();
        const gc = c ? `(__loopGuard()) && (${c})` : `(__loopGuard()) && true`;
        return `for(${init}; ${gc}; ${incr})`;
      }
    );

    return withGuards;
  }

  /**
   * Inyecta guardias específicos para for...in/of
   */
  private injectForInOfGuards(code: string): string {
    const forInOfRegex = /\bfor\s*\(/g;
    let result = "";
    let lastIndex = 0;
    let match;

    while ((match = forInOfRegex.exec(code)) !== null) {
      const afterParen = forInOfRegex.lastIndex;

      let depth = 1;
      let i = afterParen;
      while (i < code.length && depth > 0) {
        const ch = code[i];
        if (ch === "(" || ch === "[" || ch === "{") depth++;
        else if (ch === ")" || ch === "]" || ch === "}") depth--;
        i++;
      }

      const forContent = code.slice(afterParen, i - 1);

      if (!/\b(in|of)\b/.test(forContent) || forContent.includes(";")) {
        continue;
      }

      let bracePos = i;
      while (bracePos < code.length && /\s/.test(code[bracePos])) bracePos++;

      if (code[bracePos] === "{") {
        result += code.slice(lastIndex, bracePos + 1);
        result += " __loopGuard();";
        lastIndex = bracePos + 1;
      }

      forInOfRegex.lastIndex = bracePos + 1;
    }

    result += code.slice(lastIndex);
    return result;
  }
}
