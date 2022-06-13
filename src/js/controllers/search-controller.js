import { Controller } from "@hotwired/stimulus"
import { debounce } from "../utils/timing-helpers"

export default class extends Controller {

  static targets = ["input", "submit", "reset"];
  static classes = ["searching"];

  connect() {
    //console.debug("search:connected");
    this.inputTarget.oninput = (e) => {
      if (e.target.value.length > 0) {
        this.element.classList.add(this.searchingClass);
      } else {
        this.element.classList.remove(this.searchingClass);
      }
      debounce(() => this.submitTarget.click(), e.target.value.length === 0 ? 0 : 400);
    }

    this.resetTarget.onclick = () => {
      this.element.classList.remove(this.searchingClass);
      this.inputTarget.value = "";
      this.submitTarget.click();
    }
  }
}
