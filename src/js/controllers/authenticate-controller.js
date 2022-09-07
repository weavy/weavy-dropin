import { Controller } from "@hotwired/stimulus"
import { subscribe, unsubscribe } from "../utils/connection-helpers.js"
import postal from "../utils/postal-child";
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("authenticate");

export default class extends Controller {

  authenticate() {
    console.debug("authenticate command received from realtime")
    postal.postToParent({ name: "authenticate" });
  }

  connect() {
    console.debug("connected");
    subscribe(null, "authenticate", this.authenticate);
  }

  disconnect() {
    console.debug("disconnected");
    unsubscribe(null, "authenticate", this.autheticate);
  }
}
