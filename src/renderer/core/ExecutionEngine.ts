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
  type: "log" | "error" | "warn" | "info" | "result" | "security",
  args: any[]
) => void;

export class ExecutionEngine {
  private abortCtrl: AbortController | null = null;

  // Método público para abortar la ejecución actual
  abort() {
    if (this.abortCtrl) {
      this.abortCtrl.abort();
      this.abortCtrl = null;
    }
  }

  isReady(code: string) {
    const c = code.trim();
    if (!c) return false;
    if (hasIncompleteStatement(c)) return false;
    if (!areBracketsBalanced(c)) return false;
    if (looksLikeIncompleteTyping(c)) return false;
    return true;
  }

  private isTS(code: string) {
    return /\b(interface|type|enum|implements|extends|abstract|public|private|protected|readonly|declare)\b|:\s*(string|number|boolean|any|void|never|unknown)\b|<[^>]+>/.test(
      code
    );
  }

  private normalizeForDeclarations(src: string) {
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
    // Buscar for...in/of y añadir guard después de la llave de apertura
    const forInOfRegex = /\bfor\s*\(/g;
    let result = "";
    let lastIndex = 0;
    let match;
    
    while ((match = forInOfRegex.exec(code)) !== null) {
      const afterParen = forInOfRegex.lastIndex; // posición después del (
      
      // Encontrar el paréntesis de cierre balanceado
      let depth = 1;
      let i = afterParen;
      while (i < code.length && depth > 0) {
        const ch = code[i];
        if (ch === '(' || ch === '[' || ch === '{') depth++;
        else if (ch === ')' || ch === ']' || ch === '}') depth--;
        i++;
      }
      
      // Extraer el contenido del for(...)
      const forContent = code.slice(afterParen, i - 1);
      
      // Verificar si es for...in o for...of (no for clásico con ;)
      if (!/\b(in|of)\b/.test(forContent) || forContent.includes(';')) {
        continue; // Es un for clásico, lo manejamos con el otro regex
      }
      
      // Buscar la llave de apertura {
      let bracePos = i;
      while (bracePos < code.length && /\s/.test(code[bracePos])) bracePos++;
      
      if (code[bracePos] === '{') {
        // Añadir el código hasta después de la llave, luego el guard
        result += code.slice(lastIndex, bracePos + 1);
        result += " __loopGuard();";
        lastIndex = bracePos + 1;
      }
      
      forInOfRegex.lastIndex = bracePos + 1;
    }
    
    result += code.slice(lastIndex);
    return result;
  }

  // Instrumentar TODOS los console.log/warn/error/info para incluir número de línea
  private instrumentConsoleCalls(code: string): string {
    const lines = code.split('\n');
    return lines.map((line, idx) => {
      const lineNo = idx + 1;
      // Buscar console.log/warn/error/info y encontrar el paréntesis de cierre correcto
      const consoleRegex = /\b(console\s*\.\s*(?:log|warn|error|info))\s*\(/g;
      let result = line;
      let match;
      let offset = 0;
      
      while ((match = consoleRegex.exec(line)) !== null) {
        const methodEnd = consoleRegex.lastIndex; // posición después del (
        
        // Encontrar el paréntesis de cierre balanceado
        let depth = 1;
        let i = methodEnd;
        while (i < line.length && depth > 0) {
          if (line[i] === '(') depth++;
          else if (line[i] === ')') depth--;
          i++;
        }
        
        if (depth === 0) {
          const args = line.slice(methodEnd, i - 1);
          const lineArg = `{__line:${lineNo}}`;
          const newCall = args.trim()
            ? `${match[1]}(${lineArg}, ${args})`
            : `${match[1]}(${lineArg})`;
          
          const before = result.slice(0, match.index + offset);
          const after = result.slice(i + offset);
          result = before + newCall + after;
          offset += newCall.length - (i - match.index);
        }
      }
      
      return result;
    }).join('\n');
  }

  // Instrumentar expresiones top-level en código TypeScript/JavaScript original
  // Se ejecuta ANTES de transpilar para preservar números de línea
  private instrumentTopLevelExpressions(code: string) {
    try {
      // Usar ScriptKind.TS para soportar TypeScript
      const source = createSource(code, ts.ScriptKind.TS);
      const statements = source.statements;
      if (!statements.length) return code;
      let out = "";
      let cursor = 0;
      for (const stmt of statements) {
        const start = stmt.getStart(source),
          end = stmt.end;
        out += code.slice(cursor, start);
        if (stmt.kind === ts.SyntaxKind.ExpressionStatement) {
          const txt = code
            .slice(start, end)
            .trim()
            .replace(/;+\s*$/, "");
          const lc = source.getLineAndCharacterOfPosition(start).line + 1;
          
          // No instrumentar console.* (ya se instrumentó en instrumentConsoleCalls)
          if (/^console\s*\./.test(txt)) {
            out += code.slice(start, end);
          } 
          // No instrumentar llamadas a funciones simples (evitar undefined)
          else if (this.isVoidFunctionCall(txt)) {
            out += code.slice(start, end);
          } else {
            out += `recordResult(${txt}, ${lc});`;
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

  // Detectar si es una llamada a función que probablemente no retorna valor
  private isVoidFunctionCall(txt: string): boolean {
    const simpleCallPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/;
    const methodCallPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\.\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/;
    
    if (simpleCallPattern.test(txt) || methodCallPattern.test(txt)) {
      // Excepciones: constructores y funciones que típicamente retornan valor
      const exceptions = /^(new\s|Array|Object|String|Number|Boolean|Date|Math\.|JSON\.|parseInt|parseFloat|eval|prompt|confirm)/;
      if (!exceptions.test(txt)) {
        return true;
      }
    }
    return false;
  }

  private wrap(code: string): { wrapped: string; userStartLine: number } {
    const normalized = this.normalizeForDeclarations(code);
    // La instrumentación de console.log y expresiones ya se hizo antes de transpilar (en run())
    const USER_START = "/*__USER_CODE_START__*/";
    
    let withGuards = normalized;
    
    // 1. Inyectar guard en while loops
    // Solo reemplazar si el while tiene un cuerpo (seguido de { o una statement)
    withGuards = withGuards.replace(
      /\bwhile\s*\(([^)]*)\)\s*(\{|[^;\s])/g, 
      (match, cond, body) => `while((__loopGuard()) && (${cond})) ${body}`
    );
    // Manejar while sin cuerpo explícito (while(cond);)
    withGuards = withGuards.replace(
      /\bwhile\s*\(([^)]*)\)\s*;/g,
      (match, cond) => `while((__loopGuard()) && (${cond}));`
    );
    
    // 2. Inyectar guard en for...in/of loops
    // Usamos una función para encontrar el paréntesis de cierre correcto (manejando arrays/objetos anidados)
    withGuards = this.injectForInOfGuards(withGuards);
    
    // 3. Inyectar guard en for clásico (init; cond; incr)
    withGuards = withGuards.replace(
      /\bfor\s*\(([^;]+);([^;]*);([^)]*)\)/g, 
      (_m, init, cond, incr) => {
        // Verificar que no sea un for...in/of mal capturado
        if (/\b(in|of)\b/.test(init)) return _m;
        const c = (cond || "").trim();
        const gc = c ? `(__loopGuard()) && (${c})` : `(__loopGuard()) && true`;
        return `for(${init}; ${gc}; ${incr})`;
      }
    );

    const prefix = `
let __loopCount=0;
const __maxLoops=100000;
function __loopGuard(){
  if(++__loopCount>=__maxLoops) throw new Error('Bucle infinito detectado - ejecución detenida por seguridad');
  return true;
}
const __original = function(){
${USER_START}
`;
    const suffix = `
};
try { __original(); } catch(e){ throw e; }
//# sourceURL=playground.js
`;
    const wrapped = `${prefix}${withGuards}\n${suffix}`.trim();
    const userStartLine = prefix.split("\n").length; // primera línea del usuario (1-based)
    return { wrapped, userStartLine };
  }

  async run(rawCode: string, sink: LogSink) {
    if (containsDangerousCode(rawCode)) {
      sink("security", ["Código potencialmente peligroso detectado"]);
      return;
    }
    
    // Detectar loops sin cuerpo (ej: while(true) solo)
    const loopWithoutBody = this.detectLoopWithoutBody(rawCode);
    if (loopWithoutBody) {
      sink("error", [this.formatLoopError(rawCode, loopWithoutBody)]);
      return;
    }
    
    // abort anterior
    this.abortCtrl?.abort();
    const abortCtrl = new AbortController();
    this.abortCtrl = abortCtrl;

    const isTS = this.isTS(rawCode);
    // Instrumentar ANTES de transpilar para preservar números de línea originales
    const withConsoleInstrumented = this.instrumentConsoleCalls(rawCode);
    const withExpressionsInstrumented = this.instrumentTopLevelExpressions(withConsoleInstrumented);
    const code = isTS ? transpileTS(withExpressionsInstrumented) : withExpressionsInstrumented;
    const { wrapped: safeCode, userStartLine } = this.wrap(code);

    const logs: Array<{ type: any; args: any[] }> = [];
    let lines = 0;
    const started = Date.now();
    const mockConsole = ["log", "error", "warn", "info"].reduce(
      (acc: any, k) => {
        acc[k] = (...args: any[]) => {
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
          
          // Extraer línea del primer argumento si es nuestro marcador
          let lineNo: number | undefined;
          let realArgs = args;
          if (args[0] && typeof args[0] === "object" && "__line" in args[0]) {
            lineNo = args[0].__line;
            realArgs = args.slice(1);
          }
          
          logs.push({ type: k, args: lineNo !== undefined ? [lineNo, ...realArgs] : realArgs });
          lines++;
        };
        return acc;
      },
      {}
    );
    const recordResult = (val: any, line?: number) => {
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
      logs.push({ type: "result", args: [line, val] });
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

    try {
      const fn = new Function(
        "console",
        "AbortSignal",
        "recordResult",
        safeCode
      );
      fn(mockConsole, abortCtrl.signal, recordResult);
      if (abortCtrl.signal.aborted) return;
      for (const l of logs) sink(l.type, l.args);
    } catch (e) {
      const err = e as any; // si querés trabajarlo como any
      sink("error", [this.friendly(err, rawCode, userStartLine)]);
    } finally {
      clearTimeout(timeout);
      this.abortCtrl = null;
    }
  }

  private friendly(error: Error, rawCode: string, userStartLine?: number) {
    const msg = error.message || String(error);
    const errorName = error.name || 'Error';
    
    // Detectar error de bucle infinito (nuestro guard)
    if (msg.includes('Bucle infinito detectado') || msg.includes('infinite loop')) {
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

    // Intentar extraer ubicación del error
    const wrappedLoc = this.extractLocation(error);
    const mapped = userStartLine ? this.mapWrappedToRaw(wrappedLoc, userStartLine) : null;
    const loc = mapped || wrappedLoc;
    
    if (loc?.line && loc?.column && loc.line > 0 && loc.line <= rawCode.split('\n').length) {
      try {
        const frame = codeFrameColumns(
          rawCode,
          { start: { line: loc.line, column: Math.max(1, loc.column) } },
          { linesAbove: 2, linesBelow: 2, highlightCode: false }
        );
        return `${errorName}: ${msg}\n\n${frame}`;
      } catch {
        // fallback
      }
    }

    // Buscar variable no definida
    const notDefined = msg.match(/(\w+) is not defined/);
    if (notDefined) {
      const varName = notDefined[1];
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

    // Redeclaración de variable
    const redecl = msg.match(/Identifier ['"]?([A-Za-z_$][\w$]*)['"]? has already been declared/);
    if (redecl) {
      const name = redecl[1];
      const declLoc = this.findLastDeclaration(rawCode, name);
      if (declLoc) {
        const frame = codeFrameColumns(
          rawCode,
          { start: { line: declLoc.line, column: declLoc.column } },
          { linesAbove: 1, linesBelow: 1, highlightCode: false }
        );
        return `SyntaxError: ${msg}\n\n${frame}`;
      }
    }

    // Error de sintaxis - buscar token problemático
    if (msg.includes("Unexpected token") || msg.includes("Unexpected end")) {
      const syntaxLoc = this.findSyntaxErrorLocation(rawCode, msg);
      if (syntaxLoc) {
        const frame = codeFrameColumns(
          rawCode,
          { start: { line: syntaxLoc.line, column: syntaxLoc.column } },
          { linesAbove: 1, linesBelow: 1, highlightCode: false }
        );
        return `SyntaxError: ${msg}\n\n${frame}`;
      }
    }

    // Fallback genérico
    return `${errorName}: ${msg}`;
  }

  // Encontrar la ubicación de un loop (while, for)
  private findLoopLocation(code: string): { line: number; column: number } | null {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/\b(while|for)\s*\(/);
      if (match) {
        return { line: i + 1, column: (match.index || 0) + 1 };
      }
    }
    return null;
  }

  // Encontrar uso de una variable
  private findVariableUsage(code: string, varName: string): { line: number; column: number } | null {
    const lines = code.split('\n');
    const regex = new RegExp(`\\b${varName}\\b`);
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(regex);
      if (match) {
        return { line: i + 1, column: (match.index || 0) + 1 };
      }
    }
    return null;
  }

  // Encontrar última declaración de variable
  private findLastDeclaration(code: string, name: string): { line: number; column: number } | null {
    const lines = code.split('\n');
    const declRx = new RegExp(`\\b(?:const|let|var)\\s+${name}\\b`);
    let result: { line: number; column: number } | null = null;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(declRx);
      if (match) {
        result = { line: i + 1, column: (match.index || 0) + 1 };
      }
    }
    return result;
  }

  // Encontrar ubicación de error de sintaxis
  private findSyntaxErrorLocation(code: string, msg: string): { line: number; column: number } | null {
    // Intentar extraer (line:column) del mensaje
    const locMatch = msg.match(/\((\d+):(\d+)\)/);
    if (locMatch) {
      return { line: parseInt(locMatch[1]), column: parseInt(locMatch[2]) };
    }
    // Si no hay ubicación, apuntar a la última línea no vacía
    const lines = code.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim()) {
        return { line: i + 1, column: 1 };
      }
    }
    return { line: 1, column: 1 };
  }

  private extractLocation(error: any): { line?: number; column?: number } {
    const st = String(error?.stack || "");
    // Preferir frames que apunten a nuestro script nombrado
    const re = /playground\.js:(\d+):(\d+)/g;
    let m: RegExpExecArray | null;
    let last: RegExpExecArray | null = null;
    while ((m = re.exec(st))) last = m;
    if (last) return { line: Number(last[1]), column: Number(last[2]) };

    // 1) Vía propiedades directas
    const ln = Number((error?.lineNumber ?? error?.line ?? error?.loc?.line));
    const cn = Number((error?.columnNumber ?? error?.column ?? error?.loc?.column));
    if (Number.isFinite(ln) && Number.isFinite(cn)) return { line: ln, column: cn };

    // 2) Mensaje con patrón "(line:column)"
    const msg = String(error?.message || "");
    const mm = msg.match(/\((\d+):(\d+)\)/);
    if (mm) return { line: Number(mm[1]), column: Number(mm[2]) };

    // 3) Stack genérico con patrón ":line:column"
    const s = st.match(/:(\d+):(\d+)\b/);
    if (s) return { line: Number(s[1]), column: Number(s[2]) };

    return {};
  }

  private mapWrappedToRaw(
    loc: { line?: number; column?: number },
    userStartLine: number
  ): { line: number; column: number } | null {
    if (!loc?.line || !loc?.column) return null;
    const rawLine = loc.line - userStartLine + 1; // convertir desde inicio del bloque usuario
    if (rawLine < 1) return null;
    return { line: rawLine, column: loc.column };
  }

  // Detectar loops sin cuerpo (while(true), for(...) sin {})
  private detectLoopWithoutBody(code: string): { type: string; line: number; column: number } | null {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Detectar while(...) o for(...) al final de línea sin cuerpo
      const whileMatch = trimmed.match(/^(while\s*\([^)]+\))\s*$/);
      if (whileMatch) {
        // Verificar si la siguiente línea tiene el cuerpo
        const nextLine = lines[i + 1]?.trim() || '';
        if (!nextLine.startsWith('{') && !nextLine.match(/^[a-zA-Z_$]/)) {
          return { type: 'while', line: i + 1, column: (line.indexOf('while') || 0) + 1 };
        }
      }
      
      // Detectar for incompleto
      const forIncomplete = trimmed.match(/^for\s*(\(.*)?$/);
      if (forIncomplete && !trimmed.includes(')')) {
        return { type: 'for', line: i + 1, column: (line.indexOf('for') || 0) + 1 };
      }
    }
    return null;
  }

  // Formatear error de loop sin cuerpo
  private formatLoopError(code: string, loc: { type: string; line: number; column: number }): string {
    const msg = loc.type === 'while' 
      ? 'SyntaxError: Loop infinito detectado - while sin cuerpo de ejecución'
      : 'SyntaxError: Estructura de control incompleta';
    
    const frame = codeFrameColumns(
      code,
      { start: { line: loc.line, column: loc.column } },
      { linesAbove: 1, linesBelow: 1, highlightCode: false }
    );
    
    return `${msg}\n\n${frame}`;
  }
}
