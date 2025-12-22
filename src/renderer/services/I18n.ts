import { use, t, changeLanguage, InitOptions } from "i18next";
import Backend from "i18next-http-backend";
import { SettingsStore } from "./SettingsStore";

function updateContent() {
  document.querySelectorAll("[data-i18n]").forEach((element: Element) => {
    const htmlElement = element as HTMLElement;
    const key = htmlElement.getAttribute("data-i18n");
    htmlElement.innerText = t(key ?? "???"); // if the selector matches, there is also a key
  });

  document.querySelectorAll("[data-title-i18n]").forEach((element: Element) => {
    const htmlElement = element as HTMLElement;
    const key = htmlElement.getAttribute("data-title-i18n");
    htmlElement.title = t(key ?? "???"); // if the selector matches, there is also a key
  });
}

export function mountLanguageHandler() {
  const store = new SettingsStore();
  const initialLanguage = store.load().language ?? "en";

  const config: InitOptions = {
    fallbackLng: "en",
    lng: initialLanguage,
    debug: true,
    backend: {
      loadPath: "./locales/{{lng}}/{{ns}}.json",
    },
  };

  use(Backend).init(config, (error) => {
    if (error) {
      // TODO: handling error
      return console.error(error);
    }
    updateContent();
  });

  const languageSelector = document.getElementById(
    "language-select"
  ) as HTMLSelectElement;

  if (languageSelector) {
    languageSelector.value = initialLanguage;

    languageSelector.addEventListener("change", (event: Event) => {
      const element = event.target as HTMLSelectElement;
      const selectedLanguage = element.value;

      changeLanguage(selectedLanguage, () => {
        updateContent();
      });

      store.save({
        language: selectedLanguage,
      });
    });
  }
}
