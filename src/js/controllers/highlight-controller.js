import { Controller } from "@hotwired/stimulus";
import hljs from "../lib/highlight";

export default class extends Controller {

  connect() {
    console.debug("highlight:connected");
    hljs.highlightElement(this.element);
  }

  disconnect() {
    console.debug("highligh:disconnected");
  }
}
