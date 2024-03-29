import { Controller } from '@hotwired/stimulus';
import { scrollParentToBottom } from "../utils/scroll-position";

export default class extends Controller {

  static targets = ["container", "placeholder"]

  static values = {
    app: Number
  }

  // notify server that authenticated user is typing a message
  notifyTyping() {
    if (this.appValue) {
      fetch("/api/apps/" + this.appValue + "/messages/typing/", { method: "PUT" }).catch(err => { console.warn(err); });
    }
  }

  // inject a placeholder message that will be visible during the submit phase
  showPlaceholder(data) {

    // clone placeholder
    let clone = this.placeholderTarget.cloneNode(true);
    // copy domid from placeholder data-id attribute to clone.id
    clone.id = this.placeholderTarget.dataset.id;

    // split content into words and wrap in span.wy-placeholder
    var text = data.detail.content.trim();
    if (text.length) {
      const lines = text.split(/(\n+)/);
      const html = lines.map((l) => {
        const words = l.split(/(\s+)/);
        return `<div>${words.map(str => `<span class="wy-placeholder">${str}</span>`).join(" ")}</div>`;
      }).join(" ");
      clone.querySelector(".wy-content").innerHTML = html;
    } else {
      // keep default "lorem ipsum..."
    }

    // append clone to container
    this.containerTarget.appendChild(clone);

    // show cloned placeholder
    clone.hidden = false;

    // scroll to bottom
    //document.scrollingElement.scrollTop = 99999999999;
    scrollParentToBottom(clone, true);
  }

}
