//## Ahora actualizo el output handler para manejar correctamente los números de línea:
//typescript
// output.ts - ACTUALIZADO

type ValueType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "undefined"
  | "object"
  | "function";

interface OutputItem {
  text: string;
  type: ValueType;
}

// Estado para acumular outputs en la misma línea
const lineOutputs = new Map<string, Map<number, OutputItem[]>>();

function wrapTextSegments(text: string, max = 80): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += max) {
    out.push(text.slice(i, i + max));
  }
  return out;
}

function getValueType(val: any): ValueType {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "string") return "string";
  if (typeof val === "number") return "number";
  if (typeof val === "boolean") return "boolean";
  if (typeof val === "function") return "function";
  return "object";
}

function stringifyWithType(val: any): OutputItem {
  const type = getValueType(val);
  let text: string;

  switch (type) {
    case "null":
      text = "null";
      break;
    case "undefined":
      text = "undefined";
      break;
    case "string":
      text = `'${val}'`;
      break;
    case "boolean":
    case "number":
      text = String(val);
      break;
    case "function":
      text = "[Function]";
      break;
    case "object":
      try {
        text = JSON.stringify(val, null, 2);
      } catch {
        text = String(val);
      }
      break;
    default:
      text = String(val);
  }

  return { text, type };
}

/**
 * Punto de entrada principal para añadir output a la consola
 * Ahora maneja correctamente los números de línea
 */
export function appendOutput(tabId: string, type: string, args: any[]): void {
  const container = document.querySelector(
    `[data-tab-id="${tabId}"].output-container`
  ) as HTMLElement | null;

  if (!container) return;

  // Manejo especial de errores
  if (type === "error") {
    renderError(container, args[0]);
    return;
  }

  // Inicializar estado del tab
  if (!lineOutputs.has(tabId)) {
    lineOutputs.set(tabId, new Map());
  }

  const outputs = lineOutputs.get(tabId)!;

  // RESULT o MAGIC: primer argumento es el número de línea
  if ((type === "result" || type === "magic") && typeof args[0] === "number") {
    const lineNum = args[0];
    const value = args[1];

    if (!outputs.has(lineNum)) {
      outputs.set(lineNum, []);
    }

    outputs.get(lineNum)!.push(stringifyWithType(value));
    renderOutput(container, tabId);
    return;
  }

  // CONSOLE.LOG: primer argumento es el número de línea si está habilitado
  if (typeof args[0] === "number" && args.length > 1) {
    const lineNum = args[0];
    const realArgs = args.slice(1);

    if (!outputs.has(lineNum)) {
      outputs.set(lineNum, []);
    }

    for (const arg of realArgs) {
      outputs.get(lineNum)!.push(stringifyWithType(arg));
    }

    renderOutput(container, tabId);
    return;
  }

  // Sin número de línea - usar línea 1 por defecto
  if (!outputs.has(1)) {
    outputs.set(1, []);
  }

  for (const arg of args) {
    outputs.get(1)!.push(stringifyWithType(arg));
  }

  renderOutput(container, tabId);
}

function renderError(container: HTMLElement, errorMsg: string): void {
  container.innerHTML = "";

  const errorDiv = document.createElement("div");
  errorDiv.className = "output-error-container";

  const parts = String(errorMsg).split("\n\n");
  const mainMessage = parts[0] || errorMsg;
  const codeFrame = parts.slice(1).join("\n\n");

  const msgDiv = document.createElement("div");
  msgDiv.className = "output-error";
  msgDiv.textContent = mainMessage;
  errorDiv.appendChild(msgDiv);

  if (codeFrame.trim()) {
    const frameDiv = document.createElement("pre");
    frameDiv.className = "output-error-frame";
    frameDiv.textContent = codeFrame;
    errorDiv.appendChild(frameDiv);
  }

  container.appendChild(errorDiv);
}

function createOutputLine(
  lineNumber: string,
  item: OutputItem
): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "output-line";

  const lno = document.createElement("span");
  lno.className = "output-lno";
  lno.textContent = lineNumber;

  const content = document.createElement("div");
  content.className = "output-content";

  const span = document.createElement("span");
  span.className = `output-${item.type}`;
  span.textContent = item.text;

  content.appendChild(span);
  row.appendChild(lno);
  row.appendChild(content);

  return row;
}

function renderLineItems(
  container: HTMLElement,
  lineNumber: number,
  items: OutputItem[]
): void {
  if (items.length === 0) return;

  const segments: OutputItem[] = [];

  for (const item of items) {
    const wrappedLines = wrapTextSegments(item.text, 80);
    for (const wrappedText of wrappedLines) {
      segments.push({ text: wrappedText, type: item.type });
    }
  }

  if (segments.length > 0) {
    const mainRow = createOutputLine(String(lineNumber), segments[0]);
    container.appendChild(mainRow);
  }

  for (let i = 1; i < segments.length; i++) {
    const extraRow = createOutputLine("", segments[i]); // Sin número para líneas continuadas
    container.appendChild(extraRow);
  }
}

function renderOutput(container: HTMLElement, tabId: string): void {
  const outputs = lineOutputs.get(tabId);
  if (!outputs || outputs.size === 0) return;

  container.innerHTML = "";

  const maxLine = Math.max(...outputs.keys());

  for (let lineNum = 1; lineNum <= maxLine; lineNum++) {
    const items = outputs.get(lineNum);
    if (items && items.length > 0) {
      renderLineItems(container, lineNum, items);
    }
  }
}

export function clearOutput(tabId: string): void {
  const container = document.querySelector(
    `[data-tab-id="${tabId}"].output-container`
  ) as HTMLElement | null;

  if (container) {
    container.innerHTML = "";
  }

  lineOutputs.delete(tabId);
}

export const appendSecurity = (tabId: string, msg: string) => {
  const container = document.querySelector(
    `[data-tab-id="${tabId}"].output-container`
  ) as HTMLElement | null;

  if (!container) return;

  const line = document.createElement("div");
  line.className = "output-security-error";
  line.textContent = `🛡️ ${msg}`;
  container.appendChild(line);
};
