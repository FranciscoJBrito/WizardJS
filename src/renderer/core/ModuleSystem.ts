/**
 * Sistema de módulos para WizardJS
 * Maneja imports/exports entre tabs y paquetes externos
 */

interface ModuleExports {
  [key: string]: any;
}

interface ModuleMetadata {
  id: string;
  exports: ModuleExports;
  loaded: boolean;
  loading: boolean;
  error?: Error;
}

export class ModuleSystem {
  private modules: Map<string, ModuleMetadata> = new Map();
  private externalPackages: Map<string, any> = new Map();

  /**
   * Registra los exports de un módulo (tab)
   */
  registerModule(moduleId: string, exports: ModuleExports): void {
    this.modules.set(moduleId, {
      id: moduleId,
      exports,
      loaded: true,
      loading: false,
    });
  }

  /**
   * Obtiene los exports de un módulo
   */
  getModule(moduleId: string): ModuleExports | null {
    const module = this.modules.get(moduleId);
    return module?.exports || null;
  }

  /**
   * Limpia un módulo específico
   */
  clearModule(moduleId: string): void {
    this.modules.delete(moduleId);
  }

  /**
   * Limpia todos los módulos
   */
  clearAllModules(): void {
    this.modules.clear();
  }

  /**
   * Verifica si un módulo está cargado
   */
  isModuleLoaded(moduleId: string): boolean {
    return this.modules.get(moduleId)?.loaded || false;
  }

  /**
   * Lista todos los módulos disponibles
   */
  listModules(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Registra un paquete externo (npm)
   */
  registerExternalPackage(packageName: string, packageExports: any): void {
    this.externalPackages.set(packageName, packageExports);
  }

  /**
   * Obtiene un paquete externo
   */
  getExternalPackage(packageName: string): any | null {
    return this.externalPackages.get(packageName) || null;
  }

  /**
   * Resuelve un import - puede ser un módulo local o paquete externo
   */
  resolve(specifier: string): any {
    // Intentar resolver como módulo local primero
    const localModule = this.getModule(specifier);
    if (localModule) {
      return localModule;
    }

    // Intentar resolver como paquete externo
    const externalPackage = this.getExternalPackage(specifier);
    if (externalPackage) {
      return externalPackage;
    }

    throw new Error(
      `Cannot find module '${specifier}'. Make sure the module is loaded or the package is available.`
    );
  }
}
