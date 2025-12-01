import * as monaco from "monaco-editor";

export function registerThemes() {
  monaco.editor.defineTheme("github-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7d8590" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "string", foreground: "a5d6ff" },
      { token: "number", foreground: "79c0ff" },
      { token: "regexp", foreground: "7ee787" },
      { token: "operator", foreground: "ff7b72" },
      { token: "namespace", foreground: "ffa657" },
      { token: "type", foreground: "ffa657" },
      { token: "class", foreground: "ffa657" },
      { token: "function", foreground: "d2a8ff" },
    ],
    colors: {
      "editor.background": "#000000",
      "editor.foreground": "#e6edf3",
      "editor.selectionBackground": "#264f78",
      "editorCursor.foreground": "#e6edf3",
      "editor.lineHighlightBackground": "#21262d50",
    },
  });

  monaco.editor.defineTheme("tomorrow-night-bright", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "969896", fontStyle: "italic" },
      { token: "keyword", foreground: "d54e53" },
      { token: "string", foreground: "b9ca4a" },
    ],
    colors: {
      "editor.background": "#000000",
      "editor.foreground": "#eaeaea",
      "editor.selectionBackground": "#424242",
      "editor.lineHighlightBackground": "#2a2a2a",
    },
  });
}
