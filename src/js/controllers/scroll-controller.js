import { Controller } from "@hotwired/stimulus"
import { delay } from "../utils/timing-helpers"
import WeavyConsole from '../utils/console';

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
    
    // show initial messages after scrolling to bottom
    document.getElementById("messages").style.visibility = null;
  }

  disconnect() {
    console.debug("disconnected");    
  }
}
