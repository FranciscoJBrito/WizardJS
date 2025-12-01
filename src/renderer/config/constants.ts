export const SETTINGS_KEY = "wizardjs-settings";
export const AUTO_RUN_DELAY = 1000; // ms
export const EXECUTION_TIMEOUT = 5000; // ms
export const MAX_OUTPUT_LINES = 1000;
export const DEFAULT_SETTINGS = {
  autoRunEnabled: true,
  theme: "github-dark",
  fontSize: 14,
  wordWrap: true,
  minimap: false,
  lineNumbers: false,
  tabSize: 2,
  fontFamily: "JetBrains Mono",
  language: "en",
} as const;
