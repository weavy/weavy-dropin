import { Controller } from "@hotwired/stimulus"
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("sheet");

export default class extends Controller {

  static values = {
    openOnConnect: { type: Boolean, default: true}
  }  

  #showing;

  connect() {
    console.debug("connected");

    let sheetInstance = this;
    sheetInstance.#showing = false;

    window.addEventListener("keydown", (e) => {
      if (sheetInstance.#showing && e.code === "Escape") {        
        e.preventDefault();
        e.stopImmediatePropagation();
        sheetInstance.close();
      }
    }, true);

    if (this.openOnConnectValue) {
      this.open();
    }
    
  }

  open() {
    let sheet = this.element;

    this.#showing = true;
    sheet.hidden = false;
    this.element.tabIndex = 0;
    this.element.focus();

    requestAnimationFrame(() => {
      this.#showing = true;
      sheet.classList.add("wy-show");
    });
  }

  close() {
    let sheet = this.element;

    this.element.tabIndex = -1;
    this.#showing = false;
    sheet.classList.remove("wy-show");

    requestAnimationFrame(() => {
      sheet.addEventListener("transitionend", () => {
        sheet.hidden = true;
      }, { once: true})
    })
  }

  toggle() {
    this.#showing ? this.close() : this.open();
  }
}

