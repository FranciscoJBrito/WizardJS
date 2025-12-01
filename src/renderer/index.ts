import "../index.css";
import { WizardJSApp } from "./app/WizardJSApp";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new WizardJSApp());
} else {
  new WizardJSApp();
}
