import { Controller } from "@hotwired/stimulus"
import WeavyConsole from "../utils/console";

const console = new WeavyConsole("readby");

export default class extends Controller {

  static values = { who: String };

  connect() {
    console.debug("connected");

    // remove any existing readat indicator
    var existing = document.querySelector("[id='readby-" + this.whoValue + "']:not([hidden])");
    if (existing !== null) {
      existing.remove();
    }

    // show read at indicator
    if (this.whoValue !== document.body.dataset.userId) {
      this.element.hidden = false;
    }
  }
}
