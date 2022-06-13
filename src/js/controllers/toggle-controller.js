import { Controller } from "@hotwired/stimulus";
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("toggle");

export default class extends Controller {
  
  static targets = ["button", "toggled"];
  static classes = ["active"];

  connect() {
    console.debug("connected");

    this.buttonTarget.addEventListener("click", () => {
      this.toggle();
    });
  }

  add() {
    let target = this.hasToggledTarget && this.toggledTarget || this.element;
    let className = this.buttonTarget.dataset.activeClass || this.hasActiveClass && this.activeClass || "active";
    target.classList.add(className);
  }

  remove() {
    let target = this.hasToggledTarget && this.toggledTarget || this.element;
    let className = this.buttonTarget.dataset.activeClass || this.hasActiveClass && this.activeClass || "active";
    target.classList.remove(className);
  }

  toggle() {
    let target = this.hasToggledTarget && this.toggledTarget || this.element;
    let className = this.buttonTarget.dataset.activeClass || this.hasActiveClass && this.activeClass || "active";
    target.classList.toggle(className);
  }
}
