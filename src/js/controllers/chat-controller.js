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

  readBy(html) {
    renderStreamMessage(html);
  }

  messageInserted(data) {
    fetch("/dropin/chat/turbostream-insert-message/" + data.message.id, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
      .then(response => response.text())
      .then(html => {
        renderStreamMessage(html);
      });
  }

  messageUpdated(data) {
    fetch("/dropin/chat/turbostream-update-message/" + data.entity.id, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
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
          case "read_by":
            callback = that.readBy;
            break;
          case "message_created":
            callback = that.messageInserted;
            break;
          case "reaction_added":
          case "reaction_removed":
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
