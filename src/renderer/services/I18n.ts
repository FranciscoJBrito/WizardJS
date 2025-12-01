type Dict = Record<string, string>;

const en: Dict = {
  file: "File",
  new: "New",
  open: "Open",
  save: "Save",
  settings: "Settings",
  theme: "Theme",
  fontSize: "Font Size",
  fontFamily: "Font Family",
  language: "Language",
  lineNumbers: "Line Numbers",
  run: "Run",
  clear: "Clear",
  runTooltip: "Run (⌘R)",
  newTooltip: "New file (⌘N)",
  openTooltip: "Open file (⌘O)",
  saveTooltip: "Save (⌘S)",
  clearTooltip: "Clear output (⌘K)",
  settingsTooltip: "Settings (⌘,)",
  general: "General",
  appearance: "Appearance",
  editor: "Editor",
  font: "Font",
  tabSize: "Tab Size",
  wordWrap: "Word Wrap",
  minimap: "Show Minimap",
  autoRun: "Real-time Auto-execution",
  shortcuts: "Keyboard Shortcuts",
  runCode: "Run code:",
  newTab: "New tab:",
  saveFile: "Save:",
  openSettings: "Settings:",
};

const es: Dict = {
  file: "Archivo",
  new: "Nuevo",
  open: "Abrir",
  save: "Guardar",
  settings: "Configuración",
  theme: "Tema",
  fontSize: "Tamaño de Fuente",
  fontFamily: "Familia de Fuente",
  language: "Idioma",
  lineNumbers: "Números de Línea",
  run: "Ejecutar",
  clear: "Limpiar",
  runTooltip: "Ejecutar (⌘R)",
  newTooltip: "Nuevo archivo (⌘N)",
  openTooltip: "Abrir archivo (⌘O)",
  saveTooltip: "Guardar (⌘S)",
  clearTooltip: "Limpiar salida (⌘K)",
  settingsTooltip: "Configuración (⌘,)",
  general: "General",
  appearance: "Apariencia",
  editor: "Editor",
  font: "Fuente",
  tabSize: "Tamaño de Tab",
  wordWrap: "Ajuste de línea automático",
  minimap: "Mostrar minimap",
  autoRun: "Auto-ejecución en tiempo real",
  shortcuts: "Atajos de teclado",
  runCode: "Ejecutar código:",
  newTab: "Nuevo tab:",
  saveFile: "Guardar:",
  openSettings: "Configuraciones:",
};

export class I18n {
  constructor(private lang: "en" | "es" = "en") {}
  setLanguage(l: "en" | "es") {
    this.lang = l;
  }
  t(key: string) {
    return (this.lang === "es" ? es[key] : en[key]) ?? key;
  }
}
