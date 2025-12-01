import { TabsManager } from "../core/TabsManager";
import { EditorManager } from "../core/EditorManager";

export function mountTabsHandlers(
  tabs: TabsManager,
  editors: EditorManager,
  onSwitch: (id: string) => void,
  onClose: (id: string) => void
) {
  document.querySelector(".add-tab-btn")?.addEventListener("click", () => {
    const id = tabs.create();
    addTabDom(id, `Untitled-${id.split("-")[1]}`);
    addPaneDom(id);
    setTimeout(() => {
      editors.create(id, "");
      onSwitch(id);
    }, 50);
  });
  document.querySelector(".tabs-list")?.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const tab = target.closest(".tab") as HTMLElement | null;
    if (!tab) return;
    const id = tab.getAttribute("data-tab-id")!;
    if (target.closest(".tab-close")) onClose(id);
    else onSwitch(id);
  });
}

export function addTabDom(id: string, title: string) {
  const container = document.querySelector(".tabs-list")!;
  const el = document.createElement("div");
  el.className = "tab";
  el.setAttribute("data-tab-id", id);
  el.innerHTML = `<span class="tab-title">${title}</span><button class="tab-close" title="Cerrar tab"><i class="fas fa-times"></i></button>`;
  container.appendChild(el);
}

export function addPaneDom(id: string) {
  const tabsContent = document.querySelector(".tabs-content")!;
  const pane = document.createElement("div");
  pane.className = "tab-pane";
  pane.setAttribute("data-tab-id", id);
  pane.innerHTML = `<div class="split-view"><div class="split-panel editor-panel"><div class="editor-container" data-tab-id="${id}"></div></div><div class="split-divider"></div><div class="split-panel output-panel"><div class="output-container" data-tab-id="${id}"></div></div></div>`;
  tabsContent.appendChild(pane);
}

export function switchTo(id: string) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-pane")
    .forEach((p) => p.classList.remove("active"));
  document.querySelector(`[data-tab-id="${id}"].tab`)?.classList.add("active");
  document
    .querySelector(`[data-tab-id="${id}"].tab-pane`)
    ?.classList.add("active");
  setTimeout(() => {
    (window as any).activeEditor = id;
  }, 50);
}

export function removeTabDom(id: string) {
  document.querySelector(`[data-tab-id="${id}"].tab`)?.remove();
  document.querySelector(`[data-tab-id="${id}"].tab-pane`)?.remove();
}
