import { Controller } from "@hotwired/stimulus"
import { connectStreamSource, disconnectStreamSource, renderStreamMessage } from "@hotwired/turbo";
import { subscribe, unsubscribe } from "../helpers/connection-helpers.js"

export default class extends Controller {

  static values = { app: Number };

  connection = null;
  eventTarget = null;

  // TODO: make sure user is added to group after reconnect

  turboStream(html) {
    renderStreamMessage(html);
  }

  turboFetch(url) {
    console.debug("turbo-fetch:", url)
    fetch(url, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
      .then(response => response.text())
      .then(html => {
        renderStreamMessage(html);
      });
  }

  connect() {
    console.debug("turbo-stream:connected:app:" + this.appValue);
    this.eventTarget = new EventTarget();
    connectStreamSource(this.eventTarget);
    subscribe(this.appValue + ":ui", "turbo-fetch", this.turboFetch);
    subscribe(this.appValue + ":ui", "turbo-stream", this.turboStream);
  }

  disconnect() {
    disconnectStreamSource(this.eventTarget);
    unsubscribe(this.appValue + ":ui", "turbo-fetch", this.turboFetch);
    unsubscribe(this.appValue + ":ui", "turbo-stream", this.turboStream);
  }

}
