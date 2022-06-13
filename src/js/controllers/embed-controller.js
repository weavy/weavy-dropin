import { Controller } from "@hotwired/stimulus";
import WeavyConsole from "../utils/console";
import { prefix } from "../utils/styles";

const console = new WeavyConsole("embed-controller");

export default class extends Controller {

  initialize() {
    this.element.classList.add(prefix("loading"));
  }

  connect() {
    console.debug("connected");

    this.element.addEventListener('load', this.embedLoaded, true); // needs capturing
    let el = this.element;

    this.fallbackTimeout = setTimeout(function () {
      console.log("fallback");
      el.classList.add(prefix("fallback"));
    }, 2500)
  }

  embedLoaded(event) {
    var obj = event.target;
    if (obj.tagName === 'OBJECT' && obj.classList.contains(prefix("loading")) && !obj.classList.contains(prefix("loaded"))) {
      console.log("loaded");
      obj.classList.add(prefix("loaded"));
      clearTimeout(this.fallbackTimeout);
    }
  }

  disconnect() {
    console.debug("disconnected");
    this.element.removeEventListener('load', this.embedLoaded, true); // needs capturing
    clearTimeout(this.fallbackTimeout);
  }
}
