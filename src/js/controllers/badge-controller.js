import { Controller } from "@hotwired/stimulus"
import { subscribe, unsubscribe } from "../utils/connection-helpers.js"
import postal from "../utils/postal-child";

export default class extends Controller {

  static targets = ["element"];

  badgeHandler = this.badge.bind(this);

  badge(args) {    
    // api call to get actual badge
    fetch("/api/conversations/badge").then(response => response.json())
      .then(json => {
        var count = json.private + json.rooms;        
        if (this.hasElementTarget) {
          this.elementTarget.innerText = count > 0 ? count.toString() : "";
        } 
        postal.postToParent({ name: "badge", count: count });
      });
  }

  connect() {
    // TODO: listen to other events and call badge api endpoint
    subscribe(null, "message_created", this.badgeHandler);
    subscribe(null, "conversation_marked", this.badgeHandler);
  }

  disconnect() {
    unsubscribe(null, "message_created", this.badgeHandler);
    unsubscribe(null, "conversation_marked", this.badgeHandler);
  }
}
