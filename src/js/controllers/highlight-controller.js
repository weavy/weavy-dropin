import { Controller } from "@hotwired/stimulus";
import hljs from "../lib/highlight";
import WeavyConsole from '@weavy/dropin-js/src/common/console';

const console = new WeavyConsole("highlight");

export default class extends Controller {

  connect() {
    console.debug("connected");
    hljs.highlightElement(this.element);
  }

  disconnect() {
    console.debug("disconnected");
  }
}
