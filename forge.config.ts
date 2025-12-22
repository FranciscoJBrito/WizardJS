import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerAppImage } from "@reforged/maker-appimage";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import os from "os";

// Detectar distro Linux y devolver el maker correcto
function getLinuxMaker() {
  const release = os.release().toLowerCase();
  const type = os.type().toLowerCase();

  // Debian / Ubuntu
  if (
    release.includes("ubuntu") ||
    release.includes("debian") ||
    type.includes("linux")
  ) {
    try {
      // Verificar si dpkg y fakeroot existen
      require("child_process").execSync("dpkg --version");
      require("child_process").execSync("fakeroot --version");
      return new MakerDeb({
        options: {
          name: "wizardjs",
          productName: "WizardJS",
          genericName: "JavaScript Playground",
          description:
            "WizardJS - The Ultimate JavaScript & TypeScript Playground",
          categories: ["Development"],
          icon: "./build/icon.png",
          section: "devel",
          priority: "optional",
          maintainer: "Francisco Brito <francisco.brito.developer@gmail.com>",
          homepage: "https://github.com/FranciscoJBrito/WizardJS",
          // CORREGIDO: bin debe coincidir con executableName
          bin: "WizardJS",
        },
      });
    } catch {
      // Si dpkg o fakeroot no existen → fallback a AppImage
      return new MakerAppImage({
        options: {
          name: "WizardJS",
          // CORREGIDO: bin es requerido en AppImage
          bin: "WizardJS",
          icon: "./build/icon.png",
          // AÑADIDO: categories para mejor integración en menús
          categories: ["Development"],
        },
      });
    }
  }

  // RedHat / Fedora / CentOS
  if (
    release.includes("fedora") ||
    release.includes("redhat") ||
    release.includes("centos")
  ) {
    return new MakerRpm({
      options: {
        name: "wizardjs",
        productName: "WizardJS",
        description:
          "WizardJS - The Ultimate JavaScript & TypeScript Playground",
        categories: ["Development"],
        icon: "./build/icon.png",
        license: "MIT",
        homepage: "https://github.com/FranciscoJBrito/WizardJS",
        // CORREGIDO: bin debe coincidir con executableName
        bin: "WizardJS",
      },
    });
  }

  // Otras distros → AppImage
  return new MakerAppImage({
    options: {
      name: "WizardJS",
      bin: "WizardJS",
      icon: "./build/icon.png",
      categories: ["Development"],
    },
  });
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: "./build/icon",
    name: "WizardJS",
    executableName: "WizardJS",
    appBundleId: "com.franciscobrito.wizardjs",
    appCategoryType: "public.app-category.developer-tools",
    protocols: [
      {
        name: "WizardJS",
        schemes: ["wizardjs"],
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    // macOS ZIP (por falta de Apple Developer ID)
    new MakerZIP({}, ["darwin"]),

    // Windows Installer
    new MakerSquirrel({
      // CORREGIDO: name debe ser CamelCase sin espacios (para NuGet)
      name: "WizardJS",
      setupIcon: "./build/icon.ico",
      // CORREGIDO: setupExe no admite interpolación de variables ${version}
      // Se genera automáticamente como: ${appName}-${version} Setup.exe
      // Si lo quieres personalizar, usa un string literal sin variables
      setupExe: "WizardJS-Setup.exe",
      // AÑADIDO: metadata requerida para Squirrel.Windows
      authors: "Francisco Brito",
      description: "WizardJS - The Ultimate JavaScript & TypeScript Playground",
    }),

    // Linux según distro
    getLinuxMaker(),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
