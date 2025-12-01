// Tipo de valor para colorear
type ValueType = 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'object' | 'function';

interface OutputItem {
  text: string;
  type: ValueType;
}

function getValueType(val: any): ValueType {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') return 'string';
  if (typeof val === 'number') return 'number';
  if (typeof val === 'boolean') return 'boolean';
  if (typeof val === 'function') return 'function';
  return 'object';
}

function stringifyWithType(val: any): OutputItem {
  const type = getValueType(val);
  let text: string;
  
  switch (type) {
    case 'null': text = 'null'; break;
    case 'undefined': text = 'undefined'; break;
    case 'string': text = `'${val}'`; break;
    case 'boolean': text = String(val); break;
    case 'number': text = String(val); break;
    case 'function': text = '[Function]'; break;
    case 'object':
      try { text = JSON.stringify(val); } 
      catch { text = String(val); }
      break;
    default: text = String(val);
  }
  
  return { text, type };
}

// Estado para acumular outputs en la misma línea
const lineOutputs = new Map<string, Map<number, OutputItem[]>>();
let lastResultLine = new Map<string, number>();

export function appendOutput(tabId: string, type: string, args: any[]) {
  const c = document.querySelector(
    `[data-tab-id="${tabId}"].output-container`
  ) as HTMLElement | null;
  if (!c) return;

  // Manejar errores de forma especial (con code-frame)
  if (type === "error") {
    renderError(c, args[0]);
    return;
  }

  // Inicializar estado si no existe
  if (!lineOutputs.has(tabId)) {
    lineOutputs.set(tabId, new Map());
    lastResultLine.set(tabId, 0);
  }
  const outputs = lineOutputs.get(tabId)!;

  // Resultado con número de línea (expresiones top-level)
  if (type === "result" && typeof args?.[0] === "number") {
    const resultLine = args[0] as number;
    const val = args[1];
    
    if (!outputs.has(resultLine)) {
      outputs.set(resultLine, []);
    }
    outputs.get(resultLine)!.push(stringifyWithType(val));
    lastResultLine.set(tabId, resultLine);
    
    renderOutput(c, tabId);
    return;
  }

  // Console.log - verificar si tiene número de línea como primer argumento
  let consoleLine: number | undefined;
  let realArgs = args;
  
  if (typeof args[0] === "number") {
    consoleLine = args[0];
    realArgs = args.slice(1);
  }
  
  const targetLine = consoleLine || lastResultLine.get(tabId) || 1;
  
  if (!outputs.has(targetLine)) {
    outputs.set(targetLine, []);
  }
  
  // Añadir cada argumento con su tipo
  for (const arg of realArgs) {
    outputs.get(targetLine)!.push(stringifyWithType(arg));
  }
  
  renderOutput(c, tabId);
}

// Renderizar error con code-frame
function renderError(container: HTMLElement, errorMsg: string) {
  // Limpiar output anterior
  container.innerHTML = "";
  
  const errorDiv = document.createElement("div");
  errorDiv.className = "output-error-container";
  
  // Separar el mensaje del frame
  const parts = String(errorMsg).split('\n\n');
  const mainMessage = parts[0] || errorMsg;
  const codeFrame = parts.slice(1).join('\n\n');
  
  // Mensaje principal del error
  const msgDiv = document.createElement("div");
  msgDiv.className = "output-error";
  msgDiv.textContent = mainMessage;
  errorDiv.appendChild(msgDiv);
  
  // Code frame si existe
  if (codeFrame) {
    const frameDiv = document.createElement("pre");
    frameDiv.className = "output-error-frame";
    frameDiv.textContent = codeFrame;
    errorDiv.appendChild(frameDiv);
  }
  
  container.appendChild(errorDiv);
}

function renderOutput(container: HTMLElement, tabId: string) {
  const outputs = lineOutputs.get(tabId);
  if (!outputs) return;
  
  // Limpiar y re-renderizar
  container.innerHTML = "";
  
  // Obtener la línea máxima
  const maxLine = outputs.size > 0 ? Math.max(...outputs.keys()) : 0;
  
  for (let i = 1; i <= maxLine; i++) {
    const row = document.createElement("div");
    row.className = "output-line";
    
    const lno = document.createElement("span");
    lno.className = "output-lno";
    lno.textContent = String(i);
    
    const content = document.createElement("div");
    content.className = "output-content";
    
    const lineContent = outputs.get(i);
    if (lineContent && lineContent.length > 0) {
      // Crear spans coloreados para cada valor
      lineContent.forEach((item, idx) => {
        if (idx > 0) {
          content.appendChild(document.createTextNode("  "));
        }
        const span = document.createElement("span");
        span.className = `output-${item.type}`;
        span.textContent = item.text;
        content.appendChild(span);
      });
    }
    
    row.appendChild(lno);
    row.appendChild(content);
    container.appendChild(row);
  }
}

export function clearOutput(tabId: string) {
  const c = document.querySelector(
    `[data-tab-id="${tabId}"].output-container`
  ) as HTMLElement | null;
  if (c) c.innerHTML = "";
  
  // Limpiar estado
  lineOutputs.delete(tabId);
  lastResultLine.delete(tabId);
}

export const appendSecurity = (tabId: string, msg: string) => {
  const c = document.querySelector(
    `[data-tab-id="${tabId}"].output-container`
  ) as HTMLElement | null;
  if (!c) return;
  const line = document.createElement("div");
  line.className = "output-security-error";
  line.textContent = `🛡️ ${msg}`;
  c.appendChild(line);
};
