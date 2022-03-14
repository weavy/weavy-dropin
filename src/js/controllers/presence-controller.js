import { Controller } from "@hotwired/stimulus"
import { subscribe, unsubscribe } from "../helpers/connection-helpers.js"

export default class extends Controller {

  onlineChanged(data) {
    // TODO: smarter way of doing this?
    if (Array.isArray(data)) {
      document.querySelectorAll(".presence").forEach(function (item) {
        item.classList.remove("presence-active");
      });

      data.forEach(function (id) {        
        document.querySelectorAll("[data-presence-id='" + id + "']").forEach(function (item) {
          item.classList.add("presence-active");
        });
      });
    } else {
      document.querySelectorAll("[data-presence-id='" + data + "']").forEach(function (item) {
        item.classList.add("presence-active");
      });            
    }
  }

  async connect() {
    console.debug("presence:connected");
    subscribe("online", "online", this.onlineChanged);
  }

  disconnect() {
    console.debug("presence:disconnected");
    unsubscribe("online", "online", this.onlineChanged);
  }
}
