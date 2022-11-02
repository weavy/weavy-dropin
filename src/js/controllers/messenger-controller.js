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

  readBy(html) {
    renderStreamMessage(html);
  }

  appUpserted(data) {
    if (data.app.member_ids.some((id) => id === parseInt(document.body.dataset.userId) && (data.app.type === "edb400ac-839b-45a7-b2a8-6a01820d1c44" || data.app.type === "7e14f418-8f15-46f4-b182-f619b671e470"))) {
      fetch("/dropin/messenger/turbostream-get-conversation/" + data.app.id, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
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

  reactionChanged(data) {
    fetch("/dropin/turbostream-toggle-reaction/m" + data.entity.id + "/react", { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
      .then(response => response.text())
      .then(html => {
        renderStreamMessage(html);
      });
  }

  messageInserted(data) {

    // TODO: only in messages view
    fetch("/dropin/messenger/turbostream-insert-message/" + data.message.id, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
      .then(response => response.text())
      .then(html => {
        renderStreamMessage(html);
      });


    // TODO: only in conversation view
    
    fetch("/dropin/messenger/turbostream-get-conversation/" + data.message.app_id, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
      .then(response => response.text())
      .then(html => {
        renderStreamMessage(html);
      });
  }

  messageUpdated(data) {
    fetch("/dropin/messenger/turbostream-update-message/" + data.entity.id, { headers: { Accept: "text/vnd.turbo-stream.html" }, method: "GET" })
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
          case "member_added":
            callback = that.appUpserted;
            break;
          case "member_removed":
            callback = that.memberRemoved;
            break;
          case "app_created":
            callback = that.appUpserted;
            group = null;
            break;
          case "message_created":
            callback = that.messageInserted;
            break;
          case "reaction_added":
          case "reaction_removed":
            callback = that.reactionChanged;
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
