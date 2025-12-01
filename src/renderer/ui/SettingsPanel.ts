import { SettingsStore } from "../services/SettingsStore";
import { I18n } from "../services/I18n";

export function mountSettingsUI(
  store: SettingsStore,
  i18n: I18n,
  onChange: () => void
) {
  const $ = (id: string) => document.getElementById(id)!;
  $("settingsBtn")?.addEventListener("click", () =>
    $("settingsPanel")?.classList.add("open")
  );
  $("closeSettingsBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    $("settingsPanel")?.classList.remove("open");
  });
  $("settingsPanel")?.addEventListener("click", (e) => {
    if (e.target === $("settingsPanel"))
      $("settingsPanel")?.classList.remove("open");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("settingsPanel")?.classList.contains("open"))
      $("settingsPanel")?.classList.remove("open");
  });

  const s = store.get();
  const theme = $("theme-select") as HTMLSelectElement;
  theme.value = s.theme;
  theme.onchange = () => {
    store.save({ theme: theme.value });
    onChange();
  };
  const fs = $("font-size-input") as HTMLInputElement;
  fs.value = String(s.fontSize);
  fs.onchange = () => {
    const val = Math.min(32, Math.max(8, parseInt(fs.value, 10) || 14));
    fs.value = String(val);
    store.save({ fontSize: val });
    onChange();
  };
  const wrap = $("word-wrap-toggle") as HTMLInputElement;
  wrap.checked = s.wordWrap;
  wrap.onchange = () => {
    store.save({ wordWrap: wrap.checked });
    onChange();
  };
  const mini = $("minimap-toggle") as HTMLInputElement;
  mini.checked = s.minimap;
  mini.onchange = () => {
    store.save({ minimap: mini.checked });
    onChange();
  };
  const ln = $("line-numbers-toggle") as HTMLInputElement;
  ln.checked = s.lineNumbers;
  ln.onchange = () => {
    store.save({ lineNumbers: ln.checked });
    onChange();
  };
  const tr = $("auto-run-toggle") as HTMLInputElement;
  tr.checked = s.autoRunEnabled;
  tr.onchange = () => {
    store.save({ autoRunEnabled: tr.checked });
  };
  const tab = $("tab-size-select") as HTMLSelectElement;
  tab.value = String(s.tabSize);
  tab.onchange = () => {
    store.save({ tabSize: parseInt(tab.value, 10) });
    onChange();
  };
  const lang = $("language-select") as HTMLSelectElement;
  lang.value = s.language;
  lang.onchange = () => {
    store.save({ language: lang.value as any });
    i18n.setLanguage(lang.value as any);
  };
  const ff = $("font-family-select") as HTMLSelectElement;
  ff.value = s.fontFamily;
  ff.onchange = () => {
    store.save({ fontFamily: ff.value });
    onChange();
  };
}
