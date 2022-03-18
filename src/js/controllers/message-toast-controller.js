import { Controller } from "@hotwired/stimulus"
import { delay } from "../helpers/timing-helpers"
import WeavyConsole from '@weavy/dropin-js/src/common/console';

const console = new WeavyConsole("message-toast");

export default class extends Controller {

  static values = {
    id: String
  }

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
            toast.className = "message-toaster";
            toast.id = toasterId;
            toast.innerHTML = lastToast.innerHTML;
            toast.addEventListener("click", () => {
              this.toBottom();
              this.setRead();
            });
            // insert toast before last new message
            parent.insertBefore(toast, messageReference);
          }
        }
      }
    }

    if (document.hasFocus()) {
      this.setRead();
    } else {
      let that = this;
      window.addEventListener("focus", that.setRead, { once: true });
    }
  }

  async toBottom() {
    await delay();

    document.scrollingElement.scrollTop = 99999999999;
  }

  setRead() {
    fetch("/dropin/messenger/" + document.querySelector("body").dataset.appId + "/read", {
      method: "POST", headers: {
        "Content-Type": "application/json"
      }
    }).then((response) => {
      if (!response.ok) {
        throw Error(response.statusText);
      }
    })
  }
}
