import { TabData, TabId } from "../config/types";

export class TabsManager {
  private tabCounter = 1;
  private activeTabId: TabId = "tab-1";
  private data = new Map<TabId, TabData>();

  initFirstTab(content: string) {
    this.data.set("tab-1", {
      title: "Untitled-1",
      content,
      isDirty: false,
      file: null,
    });
    return "tab-1" as TabId;
  }
  active() {
    return this.activeTabId;
  }
  setActive(id: TabId) {
    this.activeTabId = id;
  }
  get(id: TabId) {
    return this.data.get(id);
  }
  set(id: TabId, td: Partial<TabData>) {
    const cur = this.data.get(id);
    if (cur) this.data.set(id, { ...cur, ...td });
  }
  allIds() {
    return Array.from(this.data.keys());
  }
  create() {
    this.tabCounter++;
    const id = `tab-${this.tabCounter}` as TabId;
    this.data.set(id, {
      title: `Untitled-${this.tabCounter}`,
      content: "",
      isDirty: false,
      file: null,
    });
    return id;
  }
  remove(id: TabId) {
    this.data.delete(id);
  }
  size() {
    return this.data.size;
  }
}
