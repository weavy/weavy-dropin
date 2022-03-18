import { Controller } from "@hotwired/stimulus"
import { delay } from "../helpers/timing-helpers"
import WeavyConsole from '@weavy/dropin-js/src/common/console';

const console = new WeavyConsole("scroll");

export default class extends Controller {

  static values = {
    deferred: { type: Boolean, default: false },
  }

  connect() {
    console.debug("connected");
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
    console.debug("disconnected");    
  }
}
