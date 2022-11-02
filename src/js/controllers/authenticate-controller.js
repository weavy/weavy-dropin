import { Controller } from "@hotwired/stimulus"
import { subscribe, unsubscribe } from "../utils/connection-helpers.js"
import postal from "../utils/postal-child";

export default class extends Controller {

  authenticate() {
    postal.postToParent({ name: "authenticate" });
  }

  connect() {
    subscribe(null, "authenticate", this.authenticate);
  }

  disconnect() {
    unsubscribe(null, "authenticate", this.autheticate);
  }
}
