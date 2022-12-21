import { Controller } from "@hotwired/stimulus"
import { delay } from "../utils/timing-helpers";
import { getNextPositionedChild, scrollParentToBottom } from "../utils/scroll-position";
import WeavyConsole from "../utils/console";

const console = new WeavyConsole("message-toast");

export default class extends Controller {

  static values = {
    id: String,
    messageId: Number
  }

  focusCallback;

  connect() {

    console.debug("connected:" + this.idValue);

    let modifier = 28;
    let toasterId = "message_toaster";
    let messageReference = document.getElementById(this.idValue);
    let documentHeight = document.body.scrollHeight;
    let elementHeight = 0;

    // TODO: turbo-frame reports offsetHeight = 0
    for (let i = 0; i < messageReference.children.length; i++) {
      elementHeight += messageReference.children[i].offsetHeight;
    }

    let currentScroll = window.scrollY + window.innerHeight + elementHeight;

    if (currentScroll + modifier >= documentHeight) {
      this.toBottom();
    } else {
      // get existing toaster in conversation
      let toaster = document.getElementById(toasterId);

      if (!toaster) {
        // get the last toast from turbo stream
        let lastToast = document.getElementById("message_toast");
        if (lastToast) {

          // get the element of the inserted message
          if (messageReference) {
            let parent = messageReference.parentNode;
            // create new toast
            let toast = document.createElement("div");
            toast.className = "wy-toast wy-toast-action";
            toast.id = toasterId;
            toast.innerHTML = lastToast.innerHTML;
            toast.addEventListener("click", () => {
              getNextPositionedChild(toast)?.scrollIntoView({ block: "start", behavior: "smooth" })
              //this.toBottom()
            });
            // insert toast before last new message
            parent.insertBefore(toast, messageReference);
          }
        }
      }
    }

    if (document.hasFocus()) {
      this.setRead(this.messageIdValue);
    } else {
      let that = this;
      this.focusCallback = function () { that.setRead(that.messageIdValue) };
      window.addEventListener("focus", this.focusCallback, { once: true });
    }
  }

  async toBottom() {
    await delay();
    //document.scrollingElement.scrollTop = 99999999999;
    scrollParentToBottom(this.element, true);
  }

  setRead(messageId) {
    fetch("/dropin/messenger/" + document.querySelector("body").dataset.appId + "/read/" + messageId, {
      method: "POST", headers: {
        "Content-Type": "application/json"
      }
    }).then((response) => {
      if (!response.ok) {
        throw Error(response.statusText);
      }
    })
  }

  disconnect() {
    if (this.focusCallback !== null) {
      window.removeEventListener("focus", this.focusCallback);
    }
  }
}
