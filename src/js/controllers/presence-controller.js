import { Controller } from "@hotwired/stimulus"
import { subscribe, unsubscribe } from "../utils/connection-helpers.js"

export default class extends Controller {

  onlineChanged(data) {
    // TODO: smarter way of doing this?
    if (Array.isArray(data)) {
      document.querySelectorAll(".wy-presence").forEach(function (item) {
        item.classList.remove("wy-presence-active");
      });

      data.forEach(function (id) {        
        document.querySelectorAll("[data-presence-id='" + id + "']").forEach(function (item) {
          item.classList.add("wy-presence-active");
        });
      });
    } else {
      document.querySelectorAll("[data-presence-id='" + data + "']").forEach(function (item) {
        item.classList.add("wy-presence-active");
      });            
    }
  }

  async connect() {
    subscribe(null, "online", this.onlineChanged);
  }

  disconnect() {
    unsubscribe(null, "online", this.onlineChanged);
  }
}
