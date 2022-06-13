import { Controller } from "@hotwired/stimulus"
import WeavyConsole from "../utils/console";
import { prefix } from "../utils/styles";

const console = new WeavyConsole("readby");

export default class extends Controller {

  static values = { who: String, when: Number };

  connect() {
    console.debug("connected");

    // remove data-controller attribute to prevent subsequent actions when elements are moved arount in the DOM.
    this.element.removeAttribute("data-controller");

    let messages = [].slice.call(document.querySelectorAll(prefix(".readby-status") + "[data-createdat]"));

    let when = this.whenValue;

    let lastReadMessage = messages.find(function (element) {
      return element.dataset.createdat >= when;
    });

    // later than the newest message?
    if (typeof (lastReadMessage) === "undefined" && messages[0].dataset.createdat < this.whenValue) {
      lastReadMessage = messages[messages.length - 1];
    }

    // remove any existing readat indicator
    var existing = document.querySelector("[data-readby-who-value='" + this.whoValue + "']:not([hidden])");
    if (existing !== null) {
      existing.remove();
    }

    // move new readat indicator to correct location - only if not myself
    if (this.whoValue !== document.body.dataset.userId) {
      this.element.hidden = false;
      lastReadMessage.appendChild(this.element);
    }
  }
}
