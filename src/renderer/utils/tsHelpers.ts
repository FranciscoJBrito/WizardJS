import * as ts from "typescript";

export const transpileTS = (code: string) => {
  const res = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.None,
      isolatedModules: true,
    },
  });
  return (res.outputText || code)
    .replace(/^"use strict";?\s*/gm, "")
    .replace(/^\s*\n+/gm, "")
    .trim();
};

export const createSource = (
  code: string,
  kind: ts.ScriptKind = ts.ScriptKind.JS
) => ts.createSourceFile("tmp.ts", code, ts.ScriptTarget.ESNext, true, kind);
