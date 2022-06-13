import { Controller } from "@hotwired/stimulus"
import { subscribe, unsubscribe } from "../utils/connection-helpers.js"
import WeavyConsole from "../utils/console";
import { prefix } from "../utils/styles";

const console = new WeavyConsole("presence");

export default class extends Controller {

  onlineChanged(data) {
    // TODO: smarter way of doing this?
    if (Array.isArray(data)) {
      document.querySelectorAll(prefix(".presence")).forEach(function (item) {
        item.classList.remove(prefix("presence-active"));
      });

      data.forEach(function (id) {        
        document.querySelectorAll("[data-presence-id='" + id + "']").forEach(function (item) {
          item.classList.add(prefix("presence-active"));
        });
      });
    } else {
      document.querySelectorAll("[data-presence-id='" + data + "']").forEach(function (item) {
        item.classList.add(prefix("presence-active"));
      });            
    }
  }

  async connect() {
    console.debug("connected");
    subscribe("online", "online", this.onlineChanged);
  }

  disconnect() {
    console.debug("disconnected");
    unsubscribe("online", "online", this.onlineChanged);
  }
}
