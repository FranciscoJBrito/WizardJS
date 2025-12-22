import { SettingsStore } from "../services/SettingsStore";
import { configureMonaco } from "../core/MonacoConfig";
import { registerThemes } from "../core/Themes";
import { EditorManager } from "../core/EditorManager";
import { TabsManager } from "../core/TabsManager";
import { mountSettingsUI } from "../ui/SettingsPanel";
import { mountToolbar } from "../ui/Toolbar";
import { mountSplitResizer } from "../ui/SplitResizer";
import {
  addPaneDom,
  addTabDom,
  mountTabsHandlers,
  removeTabDom,
  switchTo,
} from "../ui/TabsView";
import { appendOutput, clearOutput, appendSecurity } from "../ui/Output";
import { AUTO_RUN_DELAY } from "../config/constants";
import { ExecutionEngine } from "../core/executionEngine";
import "../config/electron.d.ts";
import { mountLanguageHandler } from "../services/I18n";

export class WizardJSApp {
  private store = new SettingsStore();
  private editors = new EditorManager(() => this.store.get());
  private tabs = new TabsManager();
  private engine = new ExecutionEngine();
  private autoRunTimeout = new Map<string, any>();

  constructor() {
    configureMonaco();
    registerThemes();

    // Configurar callback global para auto-run en todos los editores
    this.editors.setOnContentChange((tabId) => this.scheduleAutoRun(tabId));

    const first = this.tabs.initFirstTab(this.getWelcomeCode());
    addTabDom(first, "Untitled-1");
    addPaneDom(first);
    setTimeout(() => {
      this.editors.create(first, this.tabs.get(first)!.content);
      this.switchTo(first);
      this.applyEditorSettings();
    }, 10);

    mountToolbar(
      () => this.executeCode(),
      () => clearOutput(this.tabs.active()),
      () => this.newFile(),
      () => this.openFile(),
      () => this.saveFile(),
      () => this.stopExecution()
    );

    // Inicializar split resizer (usa event delegation, funciona con elementos dinámicos)
    mountSplitResizer();
    mountLanguageHandler();
    mountSettingsUI(this.store, () => this.applyEditorSettings());
    mountTabsHandlers(
      this.tabs,
      this.editors,
      (id) => this.switchTo(id),
      (id) => this.closeTab(id)
    );
    this.setupKeyboardShortcuts();
    this.setupMenuListeners();
  }

  private setupMenuListeners() {
    const api = window.electronAPI;
    if (!api) return; // No disponible fuera de Electron

    api.onMenuNewFile(() => this.newFile());
    api.onMenuOpenFile(() => this.openFile());
    api.onMenuSaveFile(() => this.saveFile());
    api.onMenuRunCode(() => this.executeCode());
    api.onMenuClearOutput(() => clearOutput(this.tabs.active()));
    api.onMenuAbout(() => this.showAbout());
  }

  private showAbout() {
    // Modal simple de About
    const version = "1.0.0";
    alert(
      `WizardJS v${version}\n\nThe Ultimate JavaScript & TypeScript Playground\n\nCreado por Francisco Brito`
    );
  }

  private applyEditorSettings() {
    const s = this.store.get();
    const lineHeight = 24; // Fijo para consistencia

    this.editors.forEach((e) => {
      e.updateOptions({
        theme: s.theme,
        fontSize: s.fontSize,
        fontFamily: s.fontFamily,
        lineHeight: lineHeight,
        wordWrap: s.wordWrap ? "on" : "off",
        minimap: { enabled: s.minimap },
        lineNumbers: s.lineNumbers ? "on" : "off",
        tabSize: s.tabSize,
      });
    });

    // Sincroniza el panel de salida con tipografía y altura de línea del editor
    document.querySelectorAll(".output-container").forEach((el) => {
      const h = el as HTMLElement;
      // Envolver font-family en comillas para CSS
      h.style.setProperty(
        "--editor-font-family",
        `"${s.fontFamily}", monospace`
      );
      h.style.setProperty("--editor-font-size", `${s.fontSize}px`);
      h.style.setProperty("--editor-line-height", `${lineHeight}px`);
    });
  }

  private scheduleAutoRun(tabId: string) {
    const t = this.autoRunTimeout.get(tabId);
    if (t) clearTimeout(t);
    const handle = setTimeout(() => {
      const ed = this.editors.get(tabId);
      if (!ed) return;
      const code = ed.getValue();
      if (this.store.get().autoRunEnabled && this.engine.isReady(code))
        this.executeCode();
    }, AUTO_RUN_DELAY);
    this.autoRunTimeout.set(tabId, handle);
  }

  private switchTo(id: string) {
    this.tabs.setActive(id);
    switchTo(id);
    setTimeout(() => {
      this.editors.get(id)?.layout?.();
      // Actualiza variables de tipografía del panel de salida según el editor activo
      this.applyEditorSettings();
    }, 50);
  }

  private newFile() {
    const id = this.tabs.create();
    addTabDom(id, `Untitled-${id.split("-")[1]}`);
    addPaneDom(id);
    setTimeout(() => {
      this.editors.create(id, "");
      this.switchTo(id);
    }, 50);
  }

  private closeTab(id: string) {
    if (this.tabs.size() <= 1) return;
    const td = this.tabs.get(id);
    if (
      td?.isDirty &&
      !confirm(`¿Quieres guardar los cambios en ${td.title}?`)
    ) {
      // user chose not to save, proceed to close
    }
    this.editors.dispose(id);
    this.tabs.remove(id);
    removeTabDom(id);
    if (this.tabs.active() === id) {
      const rest = this.tabs.allIds();
      if (rest.length) this.switchTo(rest[0]);
    }
  }

  private executeCode() {
    const ed = this.editors.get(this.tabs.active());
    if (!ed) return;
    const code = ed.getValue();
    clearOutput(this.tabs.active());
    this.engine.run(code, (type, args) => {
      if (type === "security")
        appendSecurity(this.tabs.active(), String(args[0]));
      else appendOutput(this.tabs.active(), type, args);
    });
  }

  private stopExecution() {
    this.engine.abort();
    appendSecurity(this.tabs.active(), "Ejecución detenida por el usuario");
  }

  private async openFile() {
    try {
      // File System Access API
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: "JavaScript/TypeScript Files",
            accept: {
              "text/javascript": [".js", ".mjs"],
              "text/typescript": [".ts", ".tsx"],
            },
          },
          {
            description: "All Files",
            accept: { "*/*": [] },
          },
        ],
        multiple: false,
      });
      const file = await fileHandle.getFile();
      const content = await file.text();
      const name = file.name;

      // Crear nuevo tab con el contenido del archivo
      const id = this.tabs.create();
      this.tabs.set(id, { title: name, content, isDirty: false, file: name });
      addTabDom(id, name);
      addPaneDom(id);
      setTimeout(() => {
        this.editors.create(id, content);
        this.switchTo(id);
        // Actualizar título del tab en el DOM
        const tabEl = document.querySelector(
          `[data-tab-id="${id}"].tab .tab-title`
        );
        if (tabEl) tabEl.textContent = name;
      }, 50);
    } catch (err: any) {
      // Usuario canceló o error
      if (err.name !== "AbortError") {
        console.error("Error opening file:", err);
      }
    }
  }

  private async saveFile() {
    const activeId = this.tabs.active();
    const ed = this.editors.get(activeId);
    const td = this.tabs.get(activeId);
    if (!ed || !td) return;

    const content = ed.getValue();
    const suggestedName = td.file || td.title || "untitled.ts";

    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "TypeScript File",
            accept: { "text/typescript": [".ts"] },
          },
          {
            description: "JavaScript File",
            accept: { "text/javascript": [".js"] },
          },
        ],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      // Actualizar estado del tab
      const fileName = fileHandle.name;
      this.tabs.set(activeId, {
        title: fileName,
        file: fileName,
        isDirty: false,
      });

      // Actualizar título en el DOM
      const tabEl = document.querySelector(
        `[data-tab-id="${activeId}"].tab .tab-title`
      );
      if (tabEl) tabEl.textContent = fileName;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Error saving file:", err);
      }
    }
  }
  private setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (cmdOrCtrl && e.key === "r") {
        e.preventDefault();
        this.executeCode();
      } else if (cmdOrCtrl && e.key === "t") {
        e.preventDefault();
        this.newFile();
      } else if (cmdOrCtrl && e.key === ".") {
        e.preventDefault();
        this.stopExecution();
      }
    });
  }

  private getWelcomeCode() {
    return `// Welcome to WizardJS! 🧙‍♂️
// Write JavaScript or TypeScript and see results instantly

function greet(name: string): string {
  return \`Hello, \${name}! Welcome to WizardJS.\`;
}

const message = greet("Developer");
console.log(message);

// Try editing this code - it runs automatically!
const numbers = [1, 2, 3, 4, 5] //?
const doubled = numbers.map(n => n * 2);
doubled`;
  }
}
