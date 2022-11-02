import { Controller } from "@hotwired/stimulus"
import { delay } from "../utils/timing-helpers"
/*import { scrollParentToBottom } from "../utils/scroll-position";*/
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

  async toBottom(smooth) {

    // BUG: funkar inte i chat appen i vissa lägen - await scrollParentToBottom(this.element, smooth) resolvar aldrig som scrollad till botten
    await delay();
//    await scrollParentToBottom(this.element, smooth);
    document.scrollingElement.scrollTop = 99999999999;
    
    // show initial messages after scrolling to bottom
    document.getElementById("messages").style.visibility = null;

    this.dispatch("at-bottom", { detail: { scrollTarget: this.element } })
  }

  disconnect() {
    console.debug("disconnected");    
  }
}
