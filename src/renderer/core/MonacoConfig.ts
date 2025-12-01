import * as monaco from 'monaco-editor';


export function configureMonaco(){
monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({ noSyntaxValidation:true, noSemanticValidation:true, noSuggestionDiagnostics:true, diagnosticCodesToIgnore:[1,2,3,4,5,6,7,8,9,10] });
monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ noSyntaxValidation:true, noSemanticValidation:true, noSuggestionDiagnostics:true, diagnosticCodesToIgnore:[1,2,3,4,5,6,7,8,9,10] });
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(), target: monaco.languages.typescript.ScriptTarget.ES2020,
module: monaco.languages.typescript.ModuleKind.None, lib:['ES2020','DOM'], allowJs:true, checkJs:false, strict:false, skipLibCheck:true,
allowNonTsExtensions:true, moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs, noEmit:true, esModuleInterop:true,
});
}