import { Controller } from "@hotwired/stimulus"
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("link");

export default class extends Controller {

  connect() {
    console.debug("connected");

    // fix buttons etc inside a[href]
    this.element.addEventListener("click", (e) => {
      if (e.target.closest("a[href], input, button") !== this.element) {
        let nearestDropdown = e.target.closest(".dropdown-menu");
        if (nearestDropdown) {
          nearestDropdown.classList.remove("show");
          try {
            let dropdownButton = nearestDropdown.parentElement.querySelector("[data-bs-toggle='dropdown']");
            dropdownButton.classList.remove("show");
            dropdownButton.setAttribute("aria-expanded", "false");

          } catch(e) { /* no worries */  }
        }
        e.stopPropagation();
      }
    });
  }
}

