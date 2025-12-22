import {
  containsDangerousCode,
  areBracketsBalanced,
  hasIncompleteStatement,
  looksLikeIncompleteTyping,
} from "../utils/codeGuards";
import { transpileTS, createSource } from "../utils/tsHelpers";
import * as ts from "typescript";
import { EXECUTION_TIMEOUT, MAX_OUTPUT_LINES } from "../config/constants";
import { codeFrameColumns } from "@babel/code-frame";

export type LogSink = (
  type: "log" | "error" | "warn" | "info" | "result" | "security" | "magic",
  args: any[]
) => void;

interface ExecutionOptions {
  showLineNumbers?: boolean;
  showUndefined?: boolean;
  magicComments?: boolean;
}

interface LocationInfo {
  line: number;
  column: number;
}

interface LoopDetection {
  type: string;
  line: number;
  column: number;
}

interface MagicComment {
  line: number;
  expression: string;
  type: "inline";
}

/**
 * Motor de ejecución de código JavaScript/TypeScript
 */
export class ExecutionEngine {
  private abortCtrl: AbortController | null = null;

  abort() {
    if (this.abortCtrl) {
      this.abortCtrl.abort();
      this.abortCtrl = null;
    }
  }

  isReady(code: string): boolean {
    const trimmed = code.trim();
    if (!trimmed) return false;
    if (hasIncompleteStatement(trimmed)) return false;
    if (!areBracketsBalanced(trimmed)) return false;
    if (looksLikeIncompleteTyping(trimmed)) return false;
    return true;
  }

  private isTS(code: string): boolean {
    return /\b(interface|type|enum|implements|extends|abstract|public|private|protected|readonly|declare)\b|:\s*(string|number|boolean|any|void|never|unknown)\b|<[^>]+>/.test(
      code
    );
  }

  private extractMagicComments(code: string): MagicComment[] {
    const lines = code.split("\n");
    const magicComments: MagicComment[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      const inlineMatch = line.match(/^(.+?)\s*\/\/\?\s*$/);
      if (inlineMatch) {
        let expression = inlineMatch[1].trim();

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

  private removeMagicComments(code: string): string {
    return code
      .split("\n")
      .map((line) => line.replace(/\s*\/\/\?\s*$/, "").trimEnd())
      .join("\n");
  }

  private instrumentMagicComments(
    code: string,
    magicComments: MagicComment[]
  ): string {
    if (magicComments.length === 0) return code;

    const lines = code.split("\n");

    for (const magic of magicComments) {
      const idx = magic.line - 1;
      const originalLine = lines[idx];
      lines[idx] =
        `${originalLine}; recordMagic((${magic.expression}), ${magic.line});`;
    }

    return lines.join("\n");
  }

  private normalizeForDeclarations(src: string): string {
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

  private instrumentConsoleCalls(
    code: string,
    showLineNumbers: boolean
  ): string {
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

  private instrumentTopLevelExpressions(code: string): string {
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

          if (
            /^console\s*\./.test(txt) ||
            this.isInsideCallback(source, stmt) ||
            txt.includes("recordMagic")
          ) {
            out += code.slice(start, end);
          } else {
            out += `recordResult((${txt}), ${lineNum});`;
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

  private wrap(code: string): { wrapped: string; userStartLine: number } {
    const normalized = this.normalizeForDeclarations(code);
    const USER_START = "/*__USER_CODE_START__*/";

    let withGuards = normalized;

    withGuards = withGuards.replace(
      /\bwhile\s*\(([^)]*)\)\s*(\{|[^;\s])/g,
      (match, cond, body) => `while((__loopGuard()) && (${cond})) ${body}`
    );
    withGuards = withGuards.replace(
      /\bwhile\s*\(([^)]*)\)\s*;/g,
      (match, cond) => `while((__loopGuard()) && (${cond}));`
    );

    withGuards = this.injectForInOfGuards(withGuards);

    withGuards = withGuards.replace(
      /\bfor\s*\(([^;]+);([^;]*);([^)]*)\)/g,
      (_m, init, cond, incr) => {
        if (/\b(in|of)\b/.test(init)) return _m;
        const c = (cond || "").trim();
        const gc = c ? `(__loopGuard()) && (${c})` : `(__loopGuard()) && true`;
        return `for(${init}; ${gc}; ${incr})`;
      }
    );

    const prefix = `
let __loopCount = 0;
const __maxLoops = 100000;
function __loopGuard() {
  if (++__loopCount >= __maxLoops) throw new Error('Bucle infinito detectado - ejecución detenida por seguridad');
  return true;
}
(function() {
${USER_START}
`;
    const suffix = `
})();
//# sourceURL=playground.js
`;

    const wrapped = `${prefix}${withGuards}\n${suffix}`.trim();
    const userStartLine = prefix.split("\n").length;
    return { wrapped, userStartLine };
  }

  async run(
    rawCode: string,
    sink: LogSink,
    options: ExecutionOptions = {}
  ): Promise<void> {
    const showLineNumbers = options.showLineNumbers ?? true;
    const showUndefined = options.showUndefined ?? false;
    const magicComments = options.magicComments ?? true;

    if (containsDangerousCode(rawCode)) {
      sink("security", ["Código potencialmente peligroso detectado"]);
      return;
    }

    const loopWithoutBody = this.detectLoopWithoutBody(rawCode);
    if (loopWithoutBody) {
      sink("error", [this.formatLoopError(rawCode, loopWithoutBody)]);
      return;
    }

    this.abortCtrl?.abort();
    const abortCtrl = new AbortController();
    this.abortCtrl = abortCtrl;

    try {
      const extractedMagicComments = magicComments
        ? this.extractMagicComments(rawCode)
        : [];
      const codeWithoutMagic = magicComments
        ? this.removeMagicComments(rawCode)
        : rawCode;

      const isTS = this.isTS(codeWithoutMagic);
      const withConsole = this.instrumentConsoleCalls(
        codeWithoutMagic,
        showLineNumbers
      );
      const withMagic =
        extractedMagicComments.length > 0
          ? this.instrumentMagicComments(withConsole, extractedMagicComments)
          : withConsole;
      const withExpressions = this.instrumentTopLevelExpressions(withMagic);
      const code = isTS ? transpileTS(withExpressions) : withExpressions;
      const { wrapped: safeCode, userStartLine } = this.wrap(code);

      const logs: Array<{ type: any; args: any[] }> = [];
      let lines = 0;
      const started = Date.now();

      const mockConsole = ["log", "error", "warn", "info"].reduce(
        (acc: any, method) => {
          acc[method] = (...args: any[]) => {
            if (showLineNumbers && typeof args[0] === "number") {
              const lineNo = args[0];
              const realArgs = args.slice(1);
              logs.push({ type: method, args: [lineNo, ...realArgs] });
            } else {
              logs.push({ type: method, args });
            }
          };
          return acc;
        },
        {}
      );

      const recordResult = (val: any, line?: number) => {
        if (abortCtrl.signal.aborted) return;
        if (!showUndefined && val === undefined) return;
        if (lines >= MAX_OUTPUT_LINES) {
          sink("security", [
            `Límite de output alcanzado (${MAX_OUTPUT_LINES} líneas)`,
          ]);
          abortCtrl.abort();
          return;
        }
        if (Date.now() - started > EXECUTION_TIMEOUT) {
          sink("security", ["Ejecución detenida por timeout"]);
          abortCtrl.abort();
          return;
        }
        logs.push({ type: "result", args: [line, val] });
        lines++;
      };

      const recordMagic = (val: any, line?: number) => {
        if (abortCtrl.signal.aborted) return;
        if (lines >= MAX_OUTPUT_LINES) {
          sink("security", [
            `Límite de output alcanzado (${MAX_OUTPUT_LINES} líneas)`,
          ]);
          abortCtrl.abort();
          return;
        }
        if (Date.now() - started > EXECUTION_TIMEOUT) {
          sink("security", ["Ejecución detenida por timeout"]);
          abortCtrl.abort();
          return;
        }
        logs.push({ type: "magic", args: [line, val] });
        lines++;
      };

      const timeout = setTimeout(() => {
        if (!abortCtrl.signal.aborted) {
          sink("security", [
            `Ejecución detenida por timeout (${EXECUTION_TIMEOUT / 1000}s)`,
          ]);
          abortCtrl.abort();
        }
      }, EXECUTION_TIMEOUT);

      const fn = new Function(
        "console",
        "AbortSignal",
        "recordResult",
        "recordMagic",
        safeCode
      );

      fn(mockConsole, abortCtrl.signal, recordResult, recordMagic);

      if (abortCtrl.signal.aborted) return;

      for (const log of logs) {
        sink(log.type, log.args);
      }

      clearTimeout(timeout);
    } catch (e) {
      sink("error", [this.friendly(e as Error, rawCode, 0)]);
    } finally {
      this.abortCtrl = null;
    }
  }

  private friendly(
    error: Error,
    rawCode: string,
    userStartLine?: number
  ): string {
    const msg = error.message || String(error);
    const errorName = error.name || "Error";

    if (
      msg.includes("Bucle infinito detectado") ||
      msg.includes("infinite loop")
    ) {
      return this.formatInfiniteLoopError(rawCode, errorName, msg);
    }

    const wrappedLoc = this.extractLocation(error);
    const loc = userStartLine
      ? this.mapWrappedToRaw(wrappedLoc, userStartLine) || wrappedLoc
      : wrappedLoc;

    if (this.isValidLocation(loc, rawCode)) {
      return this.formatErrorWithFrame(errorName, msg, rawCode, loc);
    }

    if (msg.includes("is not defined")) {
      return this.formatUndefinedVariableError(msg, rawCode);
    }

    if (
      msg.match(
        /Identifier ['"]?([A-Za-z_$][\w$]*)['"]? has already been declared/
      )
    ) {
      return this.formatRedeclarationError(msg, rawCode);
    }

    if (msg.includes("Unexpected token") || msg.includes("Unexpected end")) {
      return this.formatSyntaxError(msg, rawCode);
    }

    return `${errorName}: ${msg}`;
  }

  private formatInfiniteLoopError(
    rawCode: string,
    errorName: string,
    msg: string
  ): string {
    const loopLoc = this.findLoopLocation(rawCode);
    if (loopLoc) {
      const frame = codeFrameColumns(
        rawCode,
        { start: { line: loopLoc.line, column: loopLoc.column } },
        { linesAbove: 1, linesBelow: 1, highlightCode: false }
      );
      return `${errorName}: ${msg}\n\n${frame}`;
    }
    return `${errorName}: ${msg}`;
  }

  private formatUndefinedVariableError(msg: string, rawCode: string): string {
    const match = msg.match(/(\w+) is not defined/);
    if (!match) return `ReferenceError: ${msg}`;

    const varName = match[1];
    const varLoc = this.findVariableUsage(rawCode, varName);

    if (varLoc) {
      const frame = codeFrameColumns(
        rawCode,
        { start: { line: varLoc.line, column: varLoc.column } },
        { linesAbove: 1, linesBelow: 1, highlightCode: false }
      );
      return `ReferenceError: ${msg}\n\n${frame}`;
    }

    return `ReferenceError: '${varName}' is not defined`;
  }

  private formatRedeclarationError(msg: string, rawCode: string): string {
    const match = msg.match(
      /Identifier ['"]?([A-Za-z_$][\w$]*)['"]? has already been declared/
    );
    if (!match) return `SyntaxError: ${msg}`;

    const name = match[1];
    const declLoc = this.findLastDeclaration(rawCode, name);

    if (declLoc) {
      const frame = codeFrameColumns(
        rawCode,
        { start: { line: declLoc.line, column: declLoc.column } },
        { linesAbove: 1, linesBelow: 1, highlightCode: false }
      );
      return `SyntaxError: ${msg}\n\n${frame}`;
    }

    return `SyntaxError: ${msg}`;
  }

  private formatSyntaxError(msg: string, rawCode: string): string {
    const syntaxLoc = this.findSyntaxErrorLocation(rawCode, msg);
    if (syntaxLoc) {
      const frame = codeFrameColumns(
        rawCode,
        { start: { line: syntaxLoc.line, column: syntaxLoc.column } },
        { linesAbove: 1, linesBelow: 1, highlightCode: false }
      );
      return `SyntaxError: ${msg}\n\n${frame}`;
    }
    return `SyntaxError: ${msg}`;
  }

  private formatErrorWithFrame(
    errorName: string,
    msg: string,
    rawCode: string,
    loc: { line?: number; column?: number }
  ): string {
    try {
      const frame = codeFrameColumns(
        rawCode,
        { start: { line: loc.line!, column: Math.max(1, loc.column!) } },
        { linesAbove: 2, linesBelow: 2, highlightCode: false }
      );
      return `${errorName}: ${msg}\n\n${frame}`;
    } catch {
      return `${errorName}: ${msg}`;
    }
  }

  private isValidLocation(
    loc: { line?: number; column?: number },
    code: string
  ): boolean {
    return !!(
      loc?.line &&
      loc?.column &&
      loc.line > 0 &&
      loc.line <= code.split("\n").length
    );
  }

  private findLoopLocation(code: string): LocationInfo | null {
    const lines = code.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\b(while|for)\s*\(/);
      if (match) {
        return { line: i + 1, column: (match.index || 0) + 1 };
      }
    }
    return null;
  }

  private findVariableUsage(
    code: string,
    varName: string
  ): LocationInfo | null {
    const lines = code.split("\n");
    const regex = new RegExp(`\\b${varName}\\b`);

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(regex);
      if (match) {
        return { line: i + 1, column: (match.index || 0) + 1 };
      }
    }
    return null;
  }

  private findLastDeclaration(code: string, name: string): LocationInfo | null {
    const lines = code.split("\n");
    const declRx = new RegExp(`\\b(?:const|let|var)\\s+${name}\\b`);
    let result: LocationInfo | null = null;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(declRx);
      if (match) {
        result = { line: i + 1, column: (match.index || 0) + 1 };
      }
    }
    return result;
  }

  private findSyntaxErrorLocation(
    code: string,
    msg: string
  ): LocationInfo | null {
    const locMatch = msg.match(/\((\d+):(\d+)\)/);
    if (locMatch) {
      return { line: parseInt(locMatch[1]), column: parseInt(locMatch[2]) };
    }

    const lines = code.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim()) {
        return { line: i + 1, column: 1 };
      }
    }
    return { line: 1, column: 1 };
  }

  private extractLocation(error: any): { line?: number; column?: number } {
    const stack = String(error?.stack || "");

    const playgroundRegex = /playground\.js:(\d+):(\d+)/g;
    let match: RegExpExecArray | null;
    let lastMatch: RegExpExecArray | null = null;

    while ((match = playgroundRegex.exec(stack))) {
      lastMatch = match;
    }

    if (lastMatch) {
      return { line: Number(lastMatch[1]), column: Number(lastMatch[2]) };
    }

    const line = Number(error?.lineNumber ?? error?.line ?? error?.loc?.line);
    const column = Number(
      error?.columnNumber ?? error?.column ?? error?.loc?.column
    );

    if (Number.isFinite(line) && Number.isFinite(column)) {
      return { line, column };
    }

    const msgMatch = String(error?.message || "").match(/\((\d+):(\d+)\)/);
    if (msgMatch) {
      return { line: Number(msgMatch[1]), column: Number(msgMatch[2]) };
    }

    const stackMatch = stack.match(/:(\d+):(\d+)\b/);
    if (stackMatch) {
      return { line: Number(stackMatch[1]), column: Number(stackMatch[2]) };
    }

    return {};
  }

  private mapWrappedToRaw(
    loc: { line?: number; column?: number },
    userStartLine: number
  ): LocationInfo | null {
    if (!loc?.line || !loc?.column) return null;

    const rawLine = loc.line - userStartLine + 1;
    if (rawLine < 1) return null;

    return { line: rawLine, column: loc.column };
  }

  private detectLoopWithoutBody(code: string): LoopDetection | null {
    const lines = code.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      const whileMatch = trimmed.match(/^(while\s*\([^)]+\))\s*$/);
      if (whileMatch) {
        const nextLine = lines[i + 1]?.trim() || "";
        if (!nextLine.startsWith("{") && !nextLine.match(/^[a-zA-Z_$]/)) {
          return {
            type: "while",
            line: i + 1,
            column: (line.indexOf("while") || 0) + 1,
          };
        }
      }

      const forIncomplete = trimmed.match(/^for\s*(\(.*)?$/);
      if (forIncomplete && !trimmed.includes(")")) {
        return {
          type: "for",
          line: i + 1,
          column: (line.indexOf("for") || 0) + 1,
        };
      }
    }
    return null;
  }

  private formatLoopError(code: string, loc: LoopDetection): string {
    const msg =
      loc.type === "while"
        ? "SyntaxError: Loop infinito detectado - while sin cuerpo de ejecución"
        : "SyntaxError: Estructura de control incompleta";

    const frame = codeFrameColumns(
      code,
      { start: { line: loc.line, column: loc.column } },
      { linesAbove: 1, linesBelow: 1, highlightCode: false }
    );

    return `${msg}\n\n${frame}`;
  }

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
}
