import { Controller } from "@hotwired/stimulus"
import { renderStreamMessage } from "@hotwired/turbo";
import { subscribe, unsubscribe } from "../utils/connection-helpers.js"
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("messenger");

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

  appUpserted(data) {
    //var app = event.app ? event.app : event;

    if (data.member_ids.some((id) => id === parseInt(document.body.dataset.userId) && (data.type === "edb400ac-839b-45a7-b2a8-6a01820d1c44" || data.type === "7e14f418-8f15-46f4-b182-f619b671e470"))) {
      fetch("/dropin/messenger/turbostream-insert-conversation/" + data.id, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
        .then(response => response.text())
        .then(html => {
          renderStreamMessage(html);
        });
    }
  }

  memberRemoved(data) {
    if (data.member.id.toString() === document.body.dataset.userId) {
      fetch("/dropin/messenger/turbostream-remove-conversation/" + data.app.id, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
        .then(response => response.text())
        .then(html => {
          renderStreamMessage(html);
        });
    }
  }

  messageInserted(data) {
    fetch("/dropin/messenger/turbostream-insert-message/" + data.id, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
      .then(response => response.text())
      .then(html => {
        renderStreamMessage(html);
      });
  }

  messageUpdated(data) {
    fetch("/dropin/messenger/turbostream-update-message/" + data.parent.id, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
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
          case "app-updated":
            callback = that.appUpserted;
            break;
          case "member-added":
            callback = that.appUpserted;
            break;
          case "member-removed":
            callback = that.memberRemoved;
            break;
          case "app-inserted":
            callback = that.appUpserted;
            group = null;
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
