import { Controller } from "@hotwired/stimulus"
import { delay } from "../helpers/timing-helpers"

export default class extends Controller {

  static values = {
    deferred: { type: Boolean, default: false },
  }

  connect() {
    console.debug("scroll:connected");
    if (!this.deferredValue) {
      this.toBottom();
    }
    
  }

  async toBottom() {
    await delay();
    document.scrollingElement.scrollTop = 99999999999;
    
    // show inital messages after scrolling to bottom
    document.getElementById("messages").classList.remove("invisible");
  }

  disconnect() {
    console.debug("scroll:disconnected");    
  }
}
