export function mountToolbar(
  onRun: () => void,
  onClear: () => void,
  onNew: () => void,
  onOpen: () => void,
  onSave: () => void,
  onStop?: () => void
) {
  document.getElementById("runBtn")?.addEventListener("click", onRun);
  document.getElementById("stopBtn")?.addEventListener("click", () => onStop?.());
  document.getElementById("clearBtn")?.addEventListener("click", onClear);
  document.getElementById("newBtn")?.addEventListener("click", onNew);
  document.getElementById("openBtn")?.addEventListener("click", onOpen);
  document.getElementById("saveBtn")?.addEventListener("click", onSave);
}
