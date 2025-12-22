import { app, BrowserWindow, Menu, shell, dialog } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { autoUpdater } from "electron-updater";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "../build/icon.png"),
    show: false, // Don't show until ready
  });

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  // Create application menu
  createMenu();

  return mainWindow;
};

const createMenu = () => {
  const isMac = process.platform === "darwin";

  const template: any[] = [
    ...(isMac
      ? [
          {
            label: app.getName(),
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ] as Electron.MenuItemConstructorOptions[],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            // Send message to renderer to create new file
            BrowserWindow.getFocusedWindow()?.webContents.send("menu-new-file");
          },
        },
        {
          label: "Open...",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send(
              "menu-open-file"
            );
          },
        },
        {
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send(
              "menu-save-file"
            );
          },
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...(isMac
          ? [
              { role: "pasteAndMatchStyle" },
              { role: "delete" },
              { role: "selectAll" },
              { type: "separator" },
              {
                label: "Speech",
                submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
              },
            ]
          : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
      ],
    },
    {
      label: "Code",
      submenu: [
        {
          label: "Run",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send("menu-run-code");
          },
        },
        {
          label: "Clear Output",
          accelerator: "CmdOrCtrl+K",
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send(
              "menu-clear-output"
            );
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "close" },
        ...(isMac
          ? [
              { type: "separator" },
              { role: "front" },
              { type: "separator" },
              { role: "window" },
            ]
          : [{ role: "close" }]),
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "About WizardJS",
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send("menu-about");
          },
        },
        {
          label: "Learn More",
          click: async () => {
            await shell.openExternal(
              "https://github.com/FranciscoJBrito/WizardJS"
            );
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

// ============================================
// Auto-Update Configuration
// ============================================
function setupAutoUpdater() {
  // Configurar logging
  autoUpdater.logger = console;

  // No descargar automáticamente, preguntar primero
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for updates...");
  });

  autoUpdater.on("update-available", (info: { version: string }) => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Actualización disponible",
        message: `Una nueva versión (${info.version}) está disponible. ¿Deseas descargarla ahora?`,
        buttons: ["Descargar", "Más tarde"],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  autoUpdater.on("update-not-available", () => {
    console.log("No updates available.");
  });

  autoUpdater.on("download-progress", (progressObj: { percent: number }) => {
    console.log(`Download progress: ${progressObj.percent.toFixed(1)}%`);
  });

  autoUpdater.on("update-downloaded", (info: { version: string }) => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Actualización lista",
        message: `La versión ${info.version} se ha descargado. ¿Reiniciar ahora para instalar?`,
        buttons: ["Reiniciar", "Más tarde"],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on("error", (err: Error) => {
    console.error("Auto-updater error:", err);
  });

  // Verificar actualizaciones después de 3 segundos
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err: Error) => {
      console.error("Failed to check for updates:", err);
    });
  }, 3000);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();

  // Solo verificar actualizaciones en producción
  if (process.env.NODE_ENV !== "development") {
    setupAutoUpdater();
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
