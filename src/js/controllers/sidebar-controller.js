import { Controller } from "@hotwired/stimulus";
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("sidebar");

export default class extends Controller {

  static classes = ["maximize"];
  static targets = ["maximize"];

  connect() {
    console.debug("connected");

    this.maximizeTargets.forEach((maximizer) => {
      maximizer.addEventListener("click", (e) => {
        this.maximizeToggle(e);
      })
    });
  }

  maximizeToggle(e) {
    this.element.classList.toggle(...this.maximizeClasses);
  }

  restore() {
    this.element.classList.remove(...this.maximizeClasses)
  }

  disconnect() {
    console.debug("disconnected");
  }
}
