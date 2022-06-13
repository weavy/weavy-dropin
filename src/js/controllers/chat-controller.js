import { Controller } from "@hotwired/stimulus"
import { renderStreamMessage } from "@hotwired/turbo";
import { subscribe, unsubscribe } from "../utils/connection-helpers.js"
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("chat");

export default class extends Controller {

  static values = {
    group: String,
    events: Array
  };

  connection = null;
  eventTarget = null;

  turboStream(html) {
    renderStreamMessage(html);
  }

  messageInserted(data) {
    fetch("/dropin/chat/turbostream-insert-message/" + data.id, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
      .then(response => response.text())
      .then(html => {
        renderStreamMessage(html);
      });
  }

  messageUpdated(data) {
    fetch("/dropin/chat/turbostream-update-message/" + data.parent.id, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
      .then(response => response.text())
      .then(html => {
        renderStreamMessage(html);
      });
  }

  connect() {
    this.updateConnection(true);
  }

  disconnect() {
    this.updateConnection(false);
  }

  updateConnection(isConnecting) {    

    if (this.eventsValue) {

      let that = this;

      this.eventsValue.forEach(function (event) {        
        let callback;
        let group = that.groupValue;

        switch (event) {
          case "turbo-stream":
            callback = that.turboStream;
            break;
          case "message-inserted":
            callback = that.messageInserted;
            break;
          case "reaction-deleted":
          case "reaction-inserted":
            callback = that.messageUpdated;
            break;
          default:
            console.error("Missing handler for event: " + event);
            return;
        }

        if (isConnecting) {
          subscribe(group, event, callback);
        } else {
          unsubscribe(group, event, callback);
        }
      });
    }
  }
}
