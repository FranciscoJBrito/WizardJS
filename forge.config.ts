import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './build/icon',
    name: 'WizardJS',
    executableName: 'WizardJS',
    appBundleId: 'com.franciscobrito.wizardjs',
    appCategoryType: 'public.app-category.developer-tools',
    protocols: [{
      name: 'WizardJS',
      schemes: ['wizardjs']
    }],
  },
  rebuildConfig: {},
  makers: [
    // macOS ZIP (por falta de Apple Developer ID)
    new MakerZIP({}, ['darwin']),
    
    // Windows Installer
    new MakerSquirrel({
      name: 'WizardJS',
      setupIcon: './build/icon.ico',
      setupExe: 'WizardJS-Setup-${version}.exe'
    }),
    
    // Linux DEB (Debian/Ubuntu)
    new MakerDeb({
      options: {
        name: 'wizardjs',
        productName: 'WizardJS',
        genericName: 'JavaScript Playground',
        description: 'WizardJS - The Ultimate JavaScript & TypeScript Playground',
        categories: ['Development'],
        icon: './build/icon.png',
        section: 'devel',
        priority: 'optional',
        maintainer: 'Francisco Brito <francisco.brito.developer@gmail.com>',
        homepage: 'https://github.com/FranciscoJBrito/WizardJS',
        bin: 'WizardJS'
      }
    }),
    
    // Linux RPM (RedHat/Fedora/SUSE)
    new MakerRpm({
      options: {
        name: 'wizardjs',
        productName: 'WizardJS',
        description: 'WizardJS - The Ultimate JavaScript & TypeScript Playground',
        categories: ['Development'],
        icon: './build/icon.png',
        license: 'MIT',
        homepage: 'https://github.com/FranciscoJBrito/WizardJS',
        bin: 'WizardJS'
      }
    })
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
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
