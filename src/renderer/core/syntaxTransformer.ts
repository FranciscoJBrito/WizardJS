/**
 * Transformador de sintaxis para WizardJS
 * Maneja la transformación de imports/exports y otras características
 */

export interface TransformOptions {
  moduleId: string;
  enableImports?: boolean;
  enableExports?: boolean;
}

export class SyntaxTransformer {
  /**
   * Transforma imports ES6 a llamadas al module system
   */
  transformImports(code: string): string {
    let transformed = code;

    // import { x, y } from 'module'
    transformed = transformed.replace(
      /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
      (match, imports, moduleName) => {
        const cleanImports = imports
          .split(",")
          .map((i: string) => i.trim())
          .filter(Boolean);

        return `const { ${cleanImports.join(", ")} } = __moduleSystem.resolve('${moduleName}');`;
      }
    );

    // import * as name from 'module'
    transformed = transformed.replace(
      /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
      (match, name, moduleName) => {
        return `const ${name} = __moduleSystem.resolve('${moduleName}');`;
      }
    );

    // import defaultExport from 'module'
    transformed = transformed.replace(
      /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
      (match, name, moduleName) => {
        return `const ${name} = __moduleSystem.resolve('${moduleName}').default || __moduleSystem.resolve('${moduleName}');`;
      }
    );

    // import 'module' (side effects only)
    transformed = transformed.replace(
      /import\s+['"]([^'"]+)['"]/g,
      (match, moduleName) => {
        return `__moduleSystem.resolve('${moduleName}');`;
      }
    );

    return transformed;
  }

  /**
   * Transforma exports ES6 a asignaciones al objeto __exports
   */
  transformExports(code: string): string {
    let transformed = code;

    // export const/let/var x = ...
    transformed = transformed.replace(
      /export\s+(const|let|var)\s+(\w+)\s*=\s*([^;]+);?/g,
      (match, keyword, name, value) => {
        return `${keyword} ${name} = ${value}; __exports.${name} = ${name};`;
      }
    );

    // export function name() {}
    transformed = transformed.replace(
      /export\s+function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
      (match, name, params) => {
        return `function ${name}(${params}) {`;
      }
    );

    // Encontrar el cierre de la función y añadir la exportación
    transformed = transformed.replace(
      /function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g,
      (match, name) => {
        if (match.startsWith("export")) {
          return `${match}\n__exports.${name} = ${name};`;
        }
        return match;
      }
    );

    // export class Name {}
    transformed = transformed.replace(
      /export\s+class\s+(\w+)\s*\{/g,
      (match, name) => {
        return `class ${name} {`;
      }
    );

    // export { x, y, z }
    transformed = transformed.replace(
      /export\s+\{([^}]+)\}/g,
      (match, exports) => {
        const exportNames = exports
          .split(",")
          .map((e: string) => e.trim())
          .filter(Boolean);

        return exportNames
          .map((name: any) => `__exports.${name} = ${name};`)
          .join("\n");
      }
    );

    // export default expression
    transformed = transformed.replace(
      /export\s+default\s+(.+);?/g,
      (match, expression) => {
        return `__exports.default = ${expression};`;
      }
    );

    return transformed;
  }

  /**
   * Aplica todas las transformaciones
   */
  transform(code: string, options: TransformOptions): string {
    let transformed = code;

    if (options.enableImports !== false) {
      transformed = this.transformImports(transformed);
    }

    if (options.enableExports !== false) {
      transformed = this.transformExports(transformed);
    }

    return transformed;
  }

  /**
   * Extrae los imports de un código
   */
  extractImports(code: string): string[] {
    const imports: string[] = [];
    const importRegex =
      /import\s+(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Extrae los exports de un código
   */
  extractExports(code: string): string[] {
    const exports: string[] = [];

    // export const/let/var name
    const varExports = code.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g);
    for (const match of varExports) {
      exports.push(match[1]);
    }

    // export function name
    const funcExports = code.matchAll(/export\s+function\s+(\w+)/g);
    for (const match of funcExports) {
      exports.push(match[1]);
    }

    // export class Name
    const classExports = code.matchAll(/export\s+class\s+(\w+)/g);
    for (const match of classExports) {
      exports.push(match[1]);
    }

    // export { x, y, z }
    const namedExports = code.matchAll(/export\s+\{([^}]+)\}/g);
    for (const match of namedExports) {
      const names = match[1]
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      exports.push(...names);
    }

    // export default
    if (/export\s+default\s/.test(code)) {
      exports.push("default");
    }

    return exports;
  }
}
