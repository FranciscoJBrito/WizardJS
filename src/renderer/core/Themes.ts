import * as monaco from "monaco-editor";
import { getSchemeCSS } from "../utils/utilsCss";
export function registerThemes() {
  const schemeCSS = getSchemeCSS(); // <-- aquí ya existen los valores

  function formatHex(color: string) {
    return color.replace("#", "").padStart(6, "0");
  }

  monaco.editor.defineTheme("github-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      {
        token: "comment",
        foreground: schemeCSS["--text-secondary"],
        fontStyle: "italic",
      },
      {
        token: "keyword",
        foreground: schemeCSS["--accent-purple"],
      },
      {
        token: "string",
        foreground: schemeCSS["--accent-blue"],
      },
      {
        token: "number",
        foreground: schemeCSS["--accent-orange"],
      },
      {
        token: "regexp",
        foreground: schemeCSS["--accent-red"],
      },
      { token: "operator", foreground: schemeCSS["--accent-red"] },
      { token: "namespace", foreground: schemeCSS["--accent-yellow"] },
      { token: "type", foreground: schemeCSS["--accent-yellow"] },
      { token: "class", foreground: schemeCSS["--accent-yellow"] },
      { token: "function", foreground: schemeCSS["--accent-purple"] },
    ],
    colors: {
      "editor.background": schemeCSS["--bg-primary"],
      "editor.foreground": schemeCSS["--text-primary"],
      "editor.selectionBackground": schemeCSS["--bg-active"],
      "editorCursor.foreground": schemeCSS["--text-primary"],
      "editor.lineHighlightBackground": schemeCSS["--bg-secondary"] + "50",
    },
  });
}
