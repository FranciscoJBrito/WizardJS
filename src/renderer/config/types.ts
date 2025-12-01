export interface AppSettings {
  autoRunEnabled: boolean;
  theme: string;
  fontSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  tabSize: number;
  fontFamily: string;
  language: string;
}

export interface ThemeDefinition {
  name: string;
  displayName: string;
  colors: {
    background: string;
    foreground: string;
    selection: string;
    lineHighlight: string;
    cursor: string;
  };
}

export type TabId = string;

export interface TabData {
  title: string;
  content: string;
  isDirty: boolean;
  file: string | null;
}
