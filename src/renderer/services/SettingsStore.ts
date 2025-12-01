import { AppSettings } from "../config/types";
import { DEFAULT_SETTINGS, SETTINGS_KEY } from "../config/constants";

export class SettingsStore {
  private settings: AppSettings = { ...DEFAULT_SETTINGS } as AppSettings;

  load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) this.settings = { ...this.settings, ...JSON.parse(raw) };
    } catch {
      /* noop */
    }
    return this.settings;
  }

  save(partial: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...partial };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    return this.settings;
  }

  get(): AppSettings {
    return this.settings;
  }
}
