import { Controller } from "@hotwired/stimulus"
import { subscribe, unsubscribe } from "../utils/connection-helpers.js"
import postal from "../utils/postal";
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("badge");

export default class extends Controller {

  static targets = ["element"];

  badgeHandler = this.badge.bind(this);

  badge(conversationsBadge) {
    var count = conversationsBadge.private + conversationsBadge.rooms;

    if (count > 0 && this.hasElementTarget) {
      this.elementTarget.innerText = count.toString();
    }
    postal.postToParent({ name: "badge", count: count });
  }

  connect() {
    console.debug("connected");
    subscribe(null, "conversation-badge", this.badgeHandler);
  }

  disconnect() {
    console.debug("disconnected");
    unsubscribe(null, "conversation-badge", this.badgeHandler);
  }
}
